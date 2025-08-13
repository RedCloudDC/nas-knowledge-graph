/**
 * Knowledge Graph Application Entry Point
 * Wires together all modules and initializes the application
 */

// Core modules
import { store } from './core/store.js';
import { graph } from './core/graph.js';

// Services
import { dataLoader } from './services/dataLoader.js';

// UI Components
import { GraphView } from './ui/graphView.js';
import { SidePanel } from './ui/sidePanel.js';

// Analysis modules
import { charts } from './ui/analysis/charts.js';

// Utilities
import { debounce, searchDebounce, resizeDebounce } from './utils/debounce.js';
import { search } from './utils/search.js';
import { filter } from './utils/filter.js';

/**
 * Main Application Class
 * Orchestrates all components and manages application lifecycle
 */
export class KnowledgeGraphApp {
    constructor(config = {}) {
        this.config = {
            containerId: 'app',
            graphContainerId: 'graph-container',
            sidePanelContainerId: 'side-panel',
            autoLoad: true,
            initialData: null,
            debug: false,
            ...config
        };
        
        // Component instances
        this.graphView = null;
        this.sidePanel = null;
        
        // Debounced methods
        this.debouncedResize = resizeDebounce(() => this.handleResize());
        this.debouncedSearch = searchDebounce((query) => this.handleSearch(query));
        
        // Application state
        this.initialized = false;
        this.loading = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            this.log('Initializing Knowledge Graph Application...');
            
            // Initialize core systems
            await this.initializeCore();
            
            // Initialize UI components
            await this.initializeUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data if configured
            if (this.config.autoLoad) {
                await this.loadInitialData();
            }
            
            this.initialized = true;
            this.log('Application initialized successfully');
            
            // Emit initialization complete event
            this.emit('initialized');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            throw error;
        }
    }

    /**
     * Initialize core systems
     */
    async initializeCore() {
        this.log('Initializing core systems...');
        
        // Initialize graph system
        await graph.init();
        
        // Setup store subscriptions for debugging
        if (this.config.debug) {
            store.subscribe('*', (newState, oldState) => {
                this.log('Store updated:', { newState, oldState });
            });
        }
        
        this.log('Core systems initialized');
    }

    /**
     * Initialize UI components
     */
    async initializeUI() {
        this.log('Initializing UI components...');
        
        // Initialize graph view
        try {
            this.graphView = new GraphView(this.config.graphContainerId);
            this.log('Graph view initialized');
        } catch (error) {
            console.error('Failed to initialize graph view:', error);
            throw error;
        }
        
        // Initialize side panel
        try {
            this.sidePanel = new SidePanel(this.config.sidePanelContainerId);
            
            // Make side panel globally accessible for inline handlers
            window.sidePanel = this.sidePanel;
            
            this.log('Side panel initialized');
        } catch (error) {
            console.error('Failed to initialize side panel:', error);
            throw error;
        }
        
        // Setup component interactions
        this.setupComponentInteractions();
        
        this.log('UI components initialized');
    }

    /**
     * Setup interactions between components
     */
    setupComponentInteractions() {
        // Handle side panel events
        const sidePanelContainer = document.getElementById(this.config.sidePanelContainerId);
        
        if (sidePanelContainer) {
            // Handle filter changes
            sidePanelContainer.addEventListener('filtersChanged', (event) => {
                this.handleFiltersChanged(event.detail);
            });
            
            // Handle node focus requests
            sidePanelContainer.addEventListener('focusNode', (event) => {
                this.handleNodeFocus(event.detail.nodeId);
            });
            
            // Handle node expansion requests
            sidePanelContainer.addEventListener('expandNode', (event) => {
                this.handleNodeExpansion(event.detail.nodeId);
            });
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.debouncedResize);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboard(event);
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
        
        // Global click handler for deselection
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.node') && !event.target.closest('.edge')) {
                store.setState({ selectedNode: null, selectedEdge: null });
            }
        });
        
        this.log('Event listeners setup complete');
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        this.log('Loading initial data...');
        this.loading = true;
        
        try {
            let data;
            
            if (this.config.initialData) {
                // Use provided initial data
                data = this.config.initialData;
                this.log('Using provided initial data');
            } else {
                // Load sample data
                data = await dataLoader.loadSampleData();
                this.log('Loaded sample data');
            }
            
            // Load data into graph system
            await graph.loadData(data.nodes, data.edges);
            
            // Apply initial layout
            setTimeout(() => {
                graph.applyLayout('force');
            }, 100);
            
            this.log('Initial data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            
            // Try to continue with empty data
            graph.loadData([], []);
            
        } finally {
            this.loading = false;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.graphView) {
            const container = document.getElementById(this.config.graphContainerId);
            if (container) {
                const rect = container.getBoundingClientRect();
                this.graphView.resize(rect.width, rect.height);
            }
        }
    }

    /**
     * Handle search queries
     */
    handleSearch(query) {
        if (!query) {
            // Clear search results
            this.clearSearchHighlight();
            return;
        }
        
        // Perform search
        const results = search.textSearch(query);
        
        // Update UI with results
        this.displaySearchResults(results);
        
        // Emit search event
        this.emit('search', { query, results });
    }

    /**
     * Handle filter changes from side panel
     */
    handleFiltersChanged(filterData) {
        const { filteredNodes, filters } = filterData;
        
        // Apply visual filtering to graph view
        this.graphView.applyFilter?.(filteredNodes);
        
        // Update store with filter state
        store.setState({ filters });
        
        this.log('Filters applied:', filters);
    }

    /**
     * Handle node focus requests
     */
    handleNodeFocus(nodeId) {
        const { nodes } = store.getState();
        const node = nodes.find(n => n.id == nodeId);
        
        if (node && this.graphView) {
            // Center view on node
            this.graphView.fitToView?.();
            
            // Select the node
            store.setState({ selectedNode: node });
        }
    }

    /**
     * Handle node expansion requests
     */
    handleNodeExpansion(nodeId) {
        // Find connected nodes
        const connectedNodes = search.findConnectedNodes(nodeId, { maxDepth: 2 });
        
        if (connectedNodes.length > 0) {
            // Highlight connected nodes
            this.highlightNodes(connectedNodes.map(n => n.id));
            
            this.log(`Expanded node ${nodeId}, found ${connectedNodes.length} connections`);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        // Ctrl/Cmd + shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'f':
                    event.preventDefault();
                    this.focusSearchInput();
                    break;
                case 's':
                    event.preventDefault();
                    this.exportData();
                    break;
                case 'r':
                    event.preventDefault();
                    this.resetView();
                    break;
            }
        }
        
        // Escape key
        if (event.key === 'Escape') {
            store.setState({ selectedNode: null, selectedEdge: null });
            this.clearSearchHighlight();
        }
    }

    /**
     * Handle browser navigation
     */
    handlePopState(event) {
        // Handle browser back/forward navigation
        // Could restore previous view state, selections, etc.
        this.log('Navigation state changed', event.state);
    }

    /**
     * Search and filtering methods
     */
    displaySearchResults(results) {
        if (results.length === 0) {
            this.clearSearchHighlight();
            return;
        }
        
        // Highlight matching nodes
        const nodeIds = results
            .filter(r => r.type === 'node')
            .map(r => r.data.id);
            
        this.highlightNodes(nodeIds);
    }

    highlightNodes(nodeIds) {
        // This would be implemented in the graph view
        // For now, just log the action
        this.log('Highlighting nodes:', nodeIds);
    }

    clearSearchHighlight() {
        this.log('Clearing search highlight');
    }

    focusSearchInput() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Data management methods
     */
    async loadData(data, format = 'json') {
        this.loading = true;
        
        try {
            let processedData;
            
            switch (format) {
                case 'json':
                    processedData = dataLoader.validateDataStructure(data);
                    break;
                case 'csv':
                    processedData = dataLoader.processCsvData(data);
                    break;
                case 'url':
                    processedData = await dataLoader.loadFromUrl(data);
                    break;
                default:
                    throw new Error(`Unsupported data format: ${format}`);
            }
            
            await graph.loadData(processedData.nodes, processedData.edges);
            
            // Apply layout after a short delay
            setTimeout(() => {
                graph.applyLayout('force');
            }, 100);
            
            this.emit('dataLoaded', processedData);
            this.log('Data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load data:', error);
            throw error;
        } finally {
            this.loading = false;
        }
    }

    exportData(format = 'json') {
        try {
            const data = dataLoader.exportData(format);
            
            // Create download
            const blob = new Blob([data], { 
                type: format === 'json' ? 'application/json' : 'text/csv' 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `knowledge-graph.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.log(`Data exported as ${format}`);
            
        } catch (error) {
            console.error('Failed to export data:', error);
        }
    }

    /**
     * View control methods
     */
    resetView() {
        store.setState({
            selectedNode: null,
            selectedEdge: null,
            graphView: {
                zoom: 1,
                center: { x: 400, y: 300 },
                layout: 'force'
            }
        });
        
        if (this.graphView) {
            this.graphView.resetView?.();
        }
        
        this.clearSearchHighlight();
        this.log('View reset');
    }

    fitToView() {
        if (this.graphView) {
            this.graphView.fitToView?.();
        }
    }

    setLayout(layoutType) {
        graph.applyLayout(layoutType);
        this.log(`Layout changed to ${layoutType}`);
    }

    /**
     * Analysis methods
     */
    generateAnalysis() {
        const { nodes, edges } = store.getState();
        
        // Create charts if containers exist
        const chartContainers = ['node-type-chart', 'degree-chart', 'connectivity-chart'];
        chartContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                switch (containerId) {
                    case 'node-type-chart':
                        charts.createNodeTypeChart(containerId);
                        break;
                    case 'degree-chart':
                        charts.createDegreeDistributionChart(containerId);
                        break;
                    case 'connectivity-chart':
                        charts.createConnectivityChart(containerId);
                        break;
                }
            }
        });
        
        this.log('Analysis generated');
    }

    /**
     * Utility methods
     */
    emit(event, data = null) {
        const customEvent = new CustomEvent(`kg-${event}`, { detail: data });
        document.dispatchEvent(customEvent);
    }

    log(message, data = null) {
        if (this.config.debug) {
            console.log(`[KnowledgeGraph] ${message}`, data || '');
        }
    }

    getState() {
        return {
            store: store.getState(),
            initialized: this.initialized,
            loading: this.loading,
            config: this.config
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.debouncedResize);
        
        // Destroy components
        if (this.graphView) {
            this.graphView.destroy?.();
        }
        
        if (this.sidePanel) {
            // Clean up side panel if needed
        }
        
        // Clear global references
        window.sidePanel = null;
        
        this.initialized = false;
        this.log('Application destroyed');
    }
}

/**
 * Factory function to create and initialize the application
 */
export async function createKnowledgeGraph(config = {}) {
    const app = new KnowledgeGraphApp(config);
    await app.init();
    return app;
}

/**
 * Auto-initialize if running in browser with default containers
 */
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Check if default containers exist
        const graphContainer = document.getElementById('graph-container');
        const sidePanelContainer = document.getElementById('side-panel');
        
        if (graphContainer && sidePanelContainer) {
            try {
                window.knowledgeGraph = await createKnowledgeGraph({
                    debug: true
                });
                console.log('Knowledge Graph application auto-initialized');
            } catch (error) {
                console.error('Failed to auto-initialize Knowledge Graph:', error);
            }
        }
    });
} else if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    // Document already loaded, initialize immediately if containers exist
    const graphContainer = document.getElementById('graph-container');
    const sidePanelContainer = document.getElementById('side-panel');
    
    if (graphContainer && sidePanelContainer && !window.knowledgeGraph) {
        createKnowledgeGraph({ debug: true })
            .then(app => {
                window.knowledgeGraph = app;
                console.log('Knowledge Graph application initialized');
            })
            .catch(error => {
                console.error('Failed to initialize Knowledge Graph:', error);
            });
    }
}

// Export for module usage
export { store, graph, dataLoader, search, filter, charts };
export default KnowledgeGraphApp;
