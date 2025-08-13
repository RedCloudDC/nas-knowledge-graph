/**
 * Data Loader Service
 * Handles loading and processing of graph data from various sources
 * Optimized for performance with lazy loading and progress tracking
 */
import { store } from '../core/store.js';
import LoadingSpinner from '../components/LoadingSpinner.js';

export class DataLoader {
    constructor() {
        this.cache = new Map();
        this.baseUrl = '/data';
        this.loadingSpinners = new Map();
        this.abortControllers = new Map();
        this.progressCallbacks = new Map();

        // Performance monitoring
        this.loadTimes = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * Load data from URL with lazy loading and progress tracking
     */
    async loadFromUrl(url, options = {}) {
        const {
            useCache = true,
            transform = null,
            showSpinner = true,
            container = null,
            progressCallback = null,
            abortable = true
        } = options;

        const loadId = `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = performance.now();

        // Check cache first
        if (useCache && this.cache.has(url)) {
            this.cacheHits++;
            return this.cache.get(url);
        }

        this.cacheMisses++;

        // Setup spinner if requested
        let spinner = null;
        if (showSpinner) {
            spinner = new LoadingSpinner(container || document.body, {
                message: 'Loading data...',
                overlay: true
            });
            spinner.show();
            this.loadingSpinners.set(loadId, spinner);
        }

        // Setup abort controller if requested
        let abortController = null;
        if (abortable) {
            abortController = new AbortController();
            this.abortControllers.set(loadId, abortController);
        }

        try {
            store.setState({ loading: { ...store.getState().loading, data: true } });

            if (spinner) {
                spinner.updateMessage('Fetching data...');
            }

            const response = await fetch(url, {
                signal: abortController?.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (spinner) {
                spinner.updateMessage('Processing data...');
            }

            // Handle streamed/chunked responses for large files
            let data;
            if (response.headers.get('content-length')) {
                const contentLength = parseInt(response.headers.get('content-length'));
                data = await this.readWithProgress(response, contentLength, progressCallback, spinner);
            } else {
                data = await response.json();
            }

            if (spinner) {
                spinner.updateMessage('Validating data...');
            }

            // Apply transform if provided
            if (transform && typeof transform === 'function') {
                data = transform(data);
            }

            // Validate data structure
            const validatedData = this.validateDataStructure(data);

            // Cache the result
            if (useCache) {
                this.cache.set(url, validatedData);
            }

            // Track load time
            const loadTime = performance.now() - startTime;
            this.loadTimes.set(url, loadTime);

            if (progressCallback) {
                progressCallback({
                    phase: 'complete',
                    loaded: 100,
                    total: 100,
                    loadTime: loadTime
                });
            }

            return validatedData;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Data loading aborted for:', url);
                throw new Error('Loading cancelled by user');
            }
            console.error('Error loading data from URL:', error);
            throw error;
        } finally {
            // Clean up
            if (spinner) {
                spinner.hide();
                this.loadingSpinners.delete(loadId);
            }

            if (abortController) {
                this.abortControllers.delete(loadId);
            }

            store.setState({ loading: { ...store.getState().loading, data: false } });
        }
    }

    /**
     * Read response with progress tracking
     */
    async readWithProgress(response, contentLength, progressCallback, spinner) {
        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {break;}

                chunks.push(value);
                loaded += value.length;

                const progress = (loaded / contentLength) * 100;

                if (progressCallback) {
                    progressCallback({
                        phase: 'downloading',
                        loaded: loaded,
                        total: contentLength,
                        progress: progress
                    });
                }

                if (spinner) {
                    spinner.updateMessage(`Loading data... ${Math.round(progress)}%`);
                }
            }

            // Combine chunks and parse JSON
            const combinedChunks = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                combinedChunks.set(chunk, position);
                position += chunk.length;
            }

            const text = new TextDecoder().decode(combinedChunks);
            return JSON.parse(text);

        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Load sample data
     */
    async loadSampleData() {
        try {
            const data = await this.loadFromUrl(`${this.baseUrl}/sample-data.json`);
            const relations = await this.loadFromUrl(`${this.baseUrl}/sample-relations.json`);

            return this.mergeSampleData(data, relations);
        } catch (error) {
            console.warn('Could not load sample data files, using fallback data');
            return this.getFallbackData();
        }
    }

    /**
     * Load data from file input
     */
    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const validatedData = this.validateDataStructure(data);
                    resolve(validatedData);
                } catch (error) {
                    reject(new Error('Invalid JSON file'));
                }
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    /**
     * Load schema definitions
     */
    async loadSchema(schemaType) {
        try {
            const schemaUrl = `${this.baseUrl}/schema/${schemaType}.schema.json`;
            const schema = await this.loadFromUrl(schemaUrl, { useCache: true });
            return schema;
        } catch (error) {
            console.error(`Error loading schema for ${schemaType}:`, error);
            return null;
        }
    }

    /**
     * Process CSV data and convert to graph format
     */
    processCsvData(csvText, config = {}) {
        const {
            nodeColumns = ['id', 'label', 'type'],
            edgeColumns = ['source', 'target', 'label'],
            delimiter = ',',
            hasHeaders = true
        } = config;

        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = hasHeaders ? lines.shift().split(delimiter) : null;

        const nodes = [];
        const edges = [];
        const nodeSet = new Set();

        lines.forEach((line, index) => {
            const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));

            if (values.length < 2) {return;} // Skip invalid lines

            const record = {};
            if (headers) {
                headers.forEach((header, i) => {
                    record[header.trim()] = values[i] || '';
                });
            } else {
                values.forEach((value, i) => {
                    record[`col_${i}`] = value;
                });
            }

            // Try to extract nodes and edges based on configuration
            if (this.looksLikeEdgeRecord(record, edgeColumns)) {
                const edge = this.recordToEdge(record, edgeColumns, index);
                if (edge) {
                    edges.push(edge);

                    // Create nodes from edge endpoints if not seen before
                    [edge.source, edge.target].forEach(nodeId => {
                        if (!nodeSet.has(nodeId)) {
                            nodes.push({
                                id: nodeId,
                                label: nodeId,
                                type: 'auto-generated'
                            });
                            nodeSet.add(nodeId);
                        }
                    });
                }
            } else if (this.looksLikeNodeRecord(record, nodeColumns)) {
                const node = this.recordToNode(record, nodeColumns);
                if (node && !nodeSet.has(node.id)) {
                    nodes.push(node);
                    nodeSet.add(node.id);
                }
            }
        });

        return this.validateDataStructure({ nodes, edges });
    }

    /**
     * Merge sample data and relations
     */
    mergeSampleData(sampleData, relations) {
        const nodes = Array.isArray(sampleData) ? sampleData : sampleData.nodes || [];
        const edges = Array.isArray(relations) ? relations : relations.edges || sampleData.edges || [];

        return this.validateDataStructure({ nodes, edges });
    }

    /**
     * Validate data structure
     */
    validateDataStructure(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }

        const { nodes = [], edges = [] } = data;

        if (!Array.isArray(nodes)) {
            throw new Error('Nodes must be an array');
        }

        if (!Array.isArray(edges)) {
            throw new Error('Edges must be an array');
        }

        // Validate nodes
        const validatedNodes = nodes.map(node => {
            if (!node.id) {
                throw new Error('Each node must have an id');
            }
            return {
                id: node.id,
                label: node.label || String(node.id),
                type: node.type || 'default',
                properties: node.properties || {},
                position: node.position || { x: 0, y: 0 },
                ...node
            };
        });

        // Validate edges
        const nodeIds = new Set(validatedNodes.map(n => n.id));
        const validatedEdges = edges.map(edge => {
            if (!edge.source || !edge.target) {
                throw new Error('Each edge must have source and target');
            }

            if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
                throw new Error(`Edge references non-existent node: ${edge.source} -> ${edge.target}`);
            }

            return {
                id: edge.id || `${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                label: edge.label || '',
                type: edge.type || 'default',
                properties: edge.properties || {},
                ...edge
            };
        });

        return {
            nodes: validatedNodes,
            edges: validatedEdges,
            metadata: data.metadata || {}
        };
    }

    /**
     * Check if record looks like an edge
     */
    looksLikeEdgeRecord(record, edgeColumns) {
        return edgeColumns.every(col => record.hasOwnProperty(col) && record[col]);
    }

    /**
     * Check if record looks like a node
     */
    looksLikeNodeRecord(record, nodeColumns) {
        return nodeColumns.some(col => record.hasOwnProperty(col) && record[col]);
    }

    /**
     * Convert record to edge
     */
    recordToEdge(record, edgeColumns, index) {
        const [sourceCol, targetCol, labelCol] = edgeColumns;

        const source = record[sourceCol];
        const target = record[targetCol];

        if (!source || !target) {return null;}

        return {
            id: record.id || `edge_${index}`,
            source: source,
            target: target,
            label: record[labelCol] || '',
            type: record.type || 'default',
            properties: { ...record }
        };
    }

    /**
     * Convert record to node
     */
    recordToNode(record, nodeColumns) {
        const [idCol, labelCol, typeCol] = nodeColumns;

        const id = record[idCol];
        if (!id) {return null;}

        return {
            id: id,
            label: record[labelCol] || id,
            type: record[typeCol] || 'default',
            properties: { ...record }
        };
    }

    /**
     * Get fallback data when sample files are not available
     */
    getFallbackData() {
        return {
            nodes: [
                { id: 1, label: 'NAS Device', type: 'hardware', position: { x: 200, y: 150 } },
                { id: 2, label: 'RAID Configuration', type: 'concept', position: { x: 400, y: 100 } },
                { id: 3, label: 'Network Protocol', type: 'protocol', position: { x: 300, y: 250 } },
                { id: 4, label: 'Storage Pool', type: 'concept', position: { x: 500, y: 200 } },
                { id: 5, label: 'Backup Strategy', type: 'process', position: { x: 150, y: 300 } }
            ],
            edges: [
                { id: 'e1', source: 1, target: 2, label: 'uses' },
                { id: 'e2', source: 1, target: 3, label: 'communicates via' },
                { id: 'e3', source: 2, target: 4, label: 'creates' },
                { id: 'e4', source: 1, target: 5, label: 'implements' }
            ],
            metadata: {
                source: 'fallback',
                generated: new Date().toISOString()
            }
        };
    }

    /**
     * Lazy load sample data with chunking for large datasets
     */
    async loadSampleDataLazy(options = {}) {
        const {
            chunkSize = 1000,
            container = null,
            progressCallback = null
        } = options;

        const spinner = new LoadingSpinner(container || 'graph-container', {
            message: 'Loading sample data...',
            size: 'large'
        });

        try {
            spinner.show();

            // Load data in chunks to prevent UI blocking
            const data = await this.loadFromUrl(`${this.baseUrl}/sample-data.json`, {
                showSpinner: false, // We're managing our own spinner
                progressCallback: (progress) => {
                    if (progressCallback) {progressCallback(progress);}
                    if (progress.phase === 'downloading') {
                        spinner.updateMessage(`Loading data... ${Math.round(progress.progress || 0)}%`);
                    }
                }
            });

            const relations = await this.loadFromUrl(`${this.baseUrl}/sample-relations.json`, {
                showSpinner: false
            });

            spinner.updateMessage('Processing data...');

            // Process data in chunks to avoid blocking
            const result = await this.processDataInChunks(
                this.mergeSampleData(data, relations),
                chunkSize,
                spinner
            );

            return result;

        } catch (error) {
            console.warn('Could not load sample data files, using fallback data');
            spinner.updateMessage('Using fallback data...');

            // Even fallback data should be processed in chunks for consistency
            return await this.processDataInChunks(
                this.getFallbackData(),
                chunkSize,
                spinner
            );
        } finally {
            spinner.hide();
        }
    }

    /**
     * Process data in chunks to avoid blocking the UI
     */
    async processDataInChunks(data, chunkSize = 1000, spinner = null) {
        const { nodes, edges } = data;
        const processedNodes = [];
        const processedEdges = [];

        // Process nodes in chunks
        for (let i = 0; i < nodes.length; i += chunkSize) {
            const chunk = nodes.slice(i, i + chunkSize);

            // Process chunk
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    chunk.forEach(node => {
                        // Add any additional processing here
                        processedNodes.push({
                            ...node,
                            processed: true,
                            processedAt: Date.now()
                        });
                    });
                    resolve();
                });
            });

            if (spinner) {
                const progress = Math.round(((i + chunkSize) / nodes.length) * 50); // 50% for nodes
                spinner.updateMessage(`Processing nodes... ${progress}%`);
            }
        }

        // Process edges in chunks
        for (let i = 0; i < edges.length; i += chunkSize) {
            const chunk = edges.slice(i, i + chunkSize);

            // Process chunk
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    chunk.forEach(edge => {
                        // Add any additional processing here
                        processedEdges.push({
                            ...edge,
                            processed: true,
                            processedAt: Date.now()
                        });
                    });
                    resolve();
                });
            });

            if (spinner) {
                const progress = 50 + Math.round(((i + chunkSize) / edges.length) * 50); // 50% + 50% for edges
                spinner.updateMessage(`Processing edges... ${progress}%`);
            }
        }

        return {
            nodes: processedNodes,
            edges: processedEdges,
            metadata: {
                ...data.metadata,
                chunked: true,
                chunkSize: chunkSize,
                processedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Abort all active loading operations
     */
    abortAllLoading() {
        // Abort all fetch requests
        for (const [loadId, controller] of this.abortControllers) {
            controller.abort();
            this.abortControllers.delete(loadId);
        }

        // Hide all spinners
        for (const [loadId, spinner] of this.loadingSpinners) {
            spinner.hide();
            this.loadingSpinners.delete(loadId);
        }

        console.log('All loading operations aborted');
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const totalRequests = this.cacheHits + this.cacheMisses;
        const cacheHitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

        const loadTimes = Array.from(this.loadTimes.values());
        const avgLoadTime = loadTimes.length > 0
            ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
            : 0;

        return {
            cacheSize: this.cache.size,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            totalRequests: totalRequests,
            averageLoadTime: Math.round(avgLoadTime * 100) / 100,
            activeLoads: this.loadingSpinners.size,
            loadTimes: Object.fromEntries(this.loadTimes)
        };
    }

    /**
     * Preload data for better performance
     */
    async preloadData(urls = []) {
        const defaultUrls = [
            `${this.baseUrl}/sample-data.json`,
            `${this.baseUrl}/sample-relations.json`
        ];

        const urlsToLoad = urls.length > 0 ? urls : defaultUrls;

        const preloadPromises = urlsToLoad.map(url =>
            this.loadFromUrl(url, {
                useCache: true,
                showSpinner: false,
                abortable: true
            }).catch(error => {
                console.warn(`Failed to preload ${url}:`, error.message);
                return null;
            })
        );

        const results = await Promise.allSettled(preloadPromises);
        const successful = results.filter(result => result.status === 'fulfilled' && result.value !== null);

        console.log(`Preloaded ${successful.length}/${urlsToLoad.length} data files`);
        return successful.map(result => result.value);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.loadTimes.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        console.log('Cache cleared');
    }

    /**
     * Export data in various formats
     */
    exportData(format = 'json') {
        const { nodes, edges } = store.getState();

        switch (format.toLowerCase()) {
        case 'json':
            return JSON.stringify({ nodes, edges }, null, 2);
        case 'csv':
            return this.exportToCsv(nodes, edges);
        case 'cytoscape':
            return this.exportToCytoscape(nodes, edges);
        default:
            throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export to CSV format
     */
    exportToCsv(nodes, edges) {
        const nodesCsv = [
            'id,label,type,' + Object.keys(nodes[0]?.properties || {}).join(','),
            ...nodes.map(node =>
                `${node.id},"${node.label}",${node.type},` +
                Object.values(node.properties || {}).map(v => `"${v}"`).join(',')
            )
        ].join('\n');

        const edgesCsv = [
            'source,target,label,type,' + Object.keys(edges[0]?.properties || {}).join(','),
            ...edges.map(edge =>
                `${edge.source},${edge.target},"${edge.label}",${edge.type},` +
                Object.values(edge.properties || {}).map(v => `"${v}"`).join(',')
            )
        ].join('\n');

        return `NODES:\n${nodesCsv}\n\nEDGES:\n${edgesCsv}`;
    }

    /**
     * Export to Cytoscape format
     */
    exportToCytoscape(nodes, edges) {
        return JSON.stringify({
            elements: [
                ...nodes.map(node => ({
                    data: { id: node.id, label: node.label, type: node.type, ...node.properties },
                    position: node.position
                })),
                ...edges.map(edge => ({
                    data: {
                        id: edge.id,
                        source: edge.source,
                        target: edge.target,
                        label: edge.label,
                        type: edge.type,
                        ...edge.properties
                    }
                }))
            ]
        }, null, 2);
    }
}

// Create and export singleton data loader instance
export const dataLoader = new DataLoader();
