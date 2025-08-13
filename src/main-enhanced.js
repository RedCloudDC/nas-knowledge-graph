/**
 * Enhanced Knowledge Graph Application
 * Main entry point with D3.js integration and advanced features
 */

import { store } from './core/store.js';
import { dataLoader } from './services/dataLoader.js';
import D3EnhancedGraphView from './ui/d3-graph-enhanced.js';
import { DashboardUI } from './ui/dashboardUI.js';

// Import new data exploration components
import GlobalSearch from './components/GlobalSearch.js';
import AdvancedFilters from './components/AdvancedFilters.js';
import NeighborhoodExplorer from './components/NeighborhoodExplorer.js';
import PathFinder from './components/PathFinder.js';
import URLStateManager from './utils/urlStateManager.js';
import performanceMonitor from './utils/performanceMonitor.js';

class EnhancedKnowledgeGraphApp {
    constructor() {
        this.graphView = null;
        this.initialized = false;
        this.currentLayout = 'force';
        
        // Data exploration components
        this.globalSearch = null;
        this.advancedFilters = null;
        this.neighborhoodExplorer = null;
        this.pathFinder = null;
        this.urlStateManager = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('🚀 Initializing Enhanced Knowledge Graph Application...');
            
            // Create enhanced graph view with performance monitoring
            const graphStartTime = performance.now();
            document.dispatchEvent(new CustomEvent('graph-render-start', {
                detail: { startTime: graphStartTime }
            }));
            
            this.graphView = new D3EnhancedGraphView('graph-container');
            
            // Setup performance monitoring for graph events
            this.setupGraphPerformanceMonitoring();
            
            // Initialize data exploration components
            await this.initializeDataExplorationComponents();
            
            // Setup UI event handlers
            this.setupEventHandlers();
            
            // Setup store subscriptions for UI updates
            this.setupStoreSubscriptions();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup component integration
            this.setupComponentIntegration();
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            this.initialized = true;
            console.log('✅ Enhanced Knowledge Graph Application with Data Exploration initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Setup UI event handlers
     */
    setupEventHandlers() {
        // Control buttons
        const resetViewBtn = document.getElementById('reset-view');
        const fitViewBtn = document.getElementById('fit-view');
        const expandAllBtn = document.getElementById('expand-all');
        const collapseAllBtn = document.getElementById('collapse-all');
        const layoutSelect = document.getElementById('layout-select');

        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                if (this.graphView && this.graphView.resetView) {
                    this.graphView.resetView();
                }
            });
        }

        if (fitViewBtn) {
            fitViewBtn.addEventListener('click', () => {
                if (this.graphView && this.graphView.fitToView) {
                    this.graphView.fitToView();
                }
            });
        }

        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => {
                this.expandAllClusters();
            });
        }

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => {
                this.collapseAllNodes();
            });
        }

        if (layoutSelect) {
            layoutSelect.addEventListener('change', (event) => {
                this.changeLayout(event.target.value);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Clear selection on background click
        document.addEventListener('click', (event) => {
            if (event.target === document.body || event.target.closest('#graph-container')) {
                // Only clear if clicking on background, not on nodes/edges
                if (!event.target.closest('.node') && !event.target.closest('.edge')) {
                    store.setState({ selectedNode: null, selectedEdge: null });
                }
            }
        });

        // Dashboard event listeners
        this.setupDashboardEventListeners();
    }

    /**
     * Setup dashboard event listeners
     */
    setupDashboardEventListeners() {
        // Listen for dashboard events from DashboardUI
        document.addEventListener('searchGraph', (event) => {
            this.handleGraphSearch(event.detail.query);
        });

        document.addEventListener('filtersChanged', (event) => {
            this.handleFiltersChanged(event.detail);
        });

        document.addEventListener('rangeChanged', (event) => {
            this.handleRangeChanged(event.detail.type, event.detail.value);
        });

        document.addEventListener('graphControl', (event) => {
            this.handleGraphControl(event.detail.action);
        });

        document.addEventListener('layoutChange', (event) => {
            this.changeLayout(event.detail.layout);
        });

        document.addEventListener('dashboardResize', () => {
            this.handleResize();
        });
    }

    /**
     * Handle graph search
     */
    handleGraphSearch(query) {
        console.log(`🔍 Searching for: "${query}"`);
        // This would filter/highlight nodes based on the search query
        if (this.graphView && typeof this.graphView.search === 'function') {
            this.graphView.search(query);
        }
        
        // Update search results in dashboard
        const matchingNodes = store.getState().nodes.filter(node => 
            node.name?.toLowerCase().includes(query.toLowerCase()) ||
            node.label?.toLowerCase().includes(query.toLowerCase()) ||
            node.id?.toLowerCase().includes(query.toLowerCase())
        );
        
        // Announce results to dashboard UI
        if (window.dashboardUI) {
            window.dashboardUI.announceToScreenReader(
                `Found ${matchingNodes.length} matching nodes`
            );
        }
    }

    /**
     * Handle filter changes
     */
    handleFiltersChanged(filters) {
        console.log('🔽 Filters changed:', filters);
        // This would filter the graph based on node types and connections
        if (this.graphView && typeof this.graphView.applyFilters === 'function') {
            this.graphView.applyFilters(filters);
        }
        
        // Update store with current filters
        store.setState({
            filters: filters
        });
    }

    /**
     * Handle range slider changes
     */
    handleRangeChanged(type, value) {
        console.log(`📊 ${type} changed to: ${value}`);
        // This would update visual properties of the graph
        if (this.graphView) {
            if (type === 'node-size' && typeof this.graphView.setNodeSize === 'function') {
                this.graphView.setNodeSize(value);
            }
            if (type === 'link-strength' && typeof this.graphView.setLinkStrength === 'function') {
                this.graphView.setLinkStrength(value);
            }
        }
    }

    /**
     * Handle graph control actions
     */
    handleGraphControl(action) {
        console.log(`🎮 Graph control: ${action}`);
        switch (action) {
            case 'resetview':
                if (this.graphView && this.graphView.resetView) {
                    this.graphView.resetView();
                }
                break;
            case 'fitview':
                if (this.graphView && this.graphView.fitToView) {
                    this.graphView.fitToView();
                }
                break;
            case 'expandall':
                this.expandAllClusters();
                break;
            case 'collapseall':
                this.collapseAllNodes();
                break;
        }
    }

    /**
     * Setup store subscriptions for UI updates
     */
    setupStoreSubscriptions() {
        // Update node details panel
        store.subscribe('selectedNode', (selectedNode) => {
            this.updateNodeDetailsPanel(selectedNode);
        });

        // Update statistics
        store.subscribe('nodes', (nodes) => {
            this.updateStatistics();
        });

        store.subscribe('edges', (edges) => {
            this.updateStatistics();
        });
    }

    /**
     * Load initial sample data with performance optimizations
     */
    async loadInitialData() {
        try {
            console.log('📊 Loading sample data with optimizations...');
            
            // Use optimized lazy loading with spinner and progress tracking
            const data = await dataLoader.loadSampleDataLazy({
                chunkSize: 500, // Process in smaller chunks
                container: 'graph-container',
                progressCallback: (progress) => {
                    console.log(`Data loading progress: ${progress.progress || 0}%`);
                    
                    // Update loading indicator if available
                    const loadingElement = document.querySelector('.loading p');
                    if (loadingElement) {
                        if (progress.phase === 'downloading') {
                            loadingElement.textContent = `Downloading data... ${Math.round(progress.progress || 0)}%`;
                        } else if (progress.phase === 'complete') {
                            loadingElement.textContent = 'Initializing graph...';
                        }
                    }
                }
            });
            
            console.log(`📊 Data loaded in ${performance.now()}ms`);
            
            // Transform data for better visualization with performance monitoring
            const startTransform = performance.now();
            const transformedData = this.transformDataForVisualization(data);
            const transformTime = performance.now() - startTransform;
            
            console.log(`🔄 Data transformation took ${transformTime.toFixed(2)}ms`);
            
            // Load into store with batching to prevent UI blocking
            await this.loadDataIntoStore(transformedData);
            
            // Log performance metrics
            console.log(`✅ Loaded ${transformedData.nodes.length} nodes and ${transformedData.edges.length} edges`);
            console.log('📈 Data Loader Performance:', dataLoader.getPerformanceStats());
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            // Load with empty data to prevent crashes
            store.setState({ nodes: [], edges: [] });
        }
    }
    
    /**
     * Load data into store with batching to prevent UI blocking
     */
    async loadDataIntoStore(data) {
        const batchSize = 200;
        
        // Load nodes in batches
        for (let i = 0; i < data.nodes.length; i += batchSize) {
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    const batch = data.nodes.slice(i, i + batchSize);
                    const currentNodes = store.getState().nodes || [];
                    
                    store.setState({
                        nodes: [...currentNodes, ...batch]
                    });
                    
                    resolve();
                });
            });
        }
        
        // Load edges in batches
        for (let i = 0; i < data.edges.length; i += batchSize) {
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    const batch = data.edges.slice(i, i + batchSize);
                    const currentEdges = store.getState().edges || [];
                    
                    store.setState({
                        edges: [...currentEdges, ...batch]
                    });
                    
                    resolve();
                });
            });
        }
    }

    /**
     * Transform data for better visualization
     */
    transformDataForVisualization(data) {
        const nodes = data.nodes.map(node => ({
            ...node,
            // Add display name
            name: node.name || node.label || node.id,
            // Ensure position properties exist
            x: node.x || Math.random() * 800,
            y: node.y || Math.random() * 600
        }));

        const edges = data.edges.map(edge => ({
            ...edge,
            // Ensure edge has proper ID
            id: edge.id || `${edge.source}-${edge.target}-${edge.type || 'default'}`,
            // Add display label
            label: edge.label || edge.type || '',
            // Ensure source/target are strings
            source: typeof edge.source === 'object' ? edge.source.id : edge.source,
            target: typeof edge.target === 'object' ? edge.target.id : edge.target
        }));

        return { nodes, edges };
    }

    /**
     * Update node details panel
     */
    updateNodeDetailsPanel(selectedNode) {
        const nodeDetailsElement = document.getElementById('node-details');
        if (!nodeDetailsElement) return;

        if (!selectedNode) {
            nodeDetailsElement.innerHTML = `
                <div class="no-selection">
                    <p>🖱️ Click on a node to view details</p>
                    <p>🖱️ Double-click to expand/cluster</p>
                    <p>🖱️ Right-click for context menu</p>
                    <p>🖱️ Drag nodes to reposition</p>
                    <p>🖱️ Use mouse wheel to zoom</p>
                </div>
            `;
            return;
        }

        const nodeIcon = this.getNodeIcon(selectedNode.type);
        const degree = this.getNodeDegree(selectedNode);
        
        nodeDetailsElement.innerHTML = `
            <div class="node-details-content">
                <div class="node-details-header">
                    <span class="node-icon-large">${nodeIcon}</span>
                    <div>
                        <h4 class="node-title">${selectedNode.name || selectedNode.label || selectedNode.id}</h4>
                        <p class="node-subtitle">${selectedNode.type || 'Unknown Type'}</p>
                    </div>
                </div>
                <div class="node-properties">
                    <div class="node-property">
                        <span class="property-label">ID:</span>
                        <span class="property-value">${selectedNode.id}</span>
                    </div>
                    <div class="node-property">
                        <span class="property-label">Type:</span>
                        <span class="property-value">${selectedNode.type || 'Unknown'}</span>
                    </div>
                    <div class="node-property">
                        <span class="property-label">Connections:</span>
                        <span class="property-value">${degree}</span>
                    </div>
                    ${selectedNode.address?.city ? `
                        <div class="node-property">
                            <span class="property-label">Location:</span>
                            <span class="property-value">${selectedNode.address.city}, ${selectedNode.address.state}</span>
                        </div>
                    ` : ''}
                    ${selectedNode.capacity?.equipmentCount ? `
                        <div class="node-property">
                            <span class="property-label">Equipment:</span>
                            <span class="property-value">${selectedNode.capacity.equipmentCount}</span>
                        </div>
                    ` : ''}
                    ${selectedNode.capacity?.personnelCount ? `
                        <div class="node-property">
                            <span class="property-label">Personnel:</span>
                            <span class="property-value">${selectedNode.capacity.personnelCount}</span>
                        </div>
                    ` : ''}
                    ${selectedNode.operatingHours ? `
                        <div class="node-property">
                            <span class="property-label">24/7 Operation:</span>
                            <span class="property-value">${selectedNode.operatingHours['24x7'] ? '✅ Yes' : '❌ No'}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Update statistics panel
     */
    updateStatistics() {
        const state = store.getState();
        const nodesCount = document.getElementById('nodes-count');
        const edgesCount = document.getElementById('edges-count');
        const clustersCount = document.getElementById('clusters-count');

        if (nodesCount) nodesCount.textContent = state.nodes.length || 0;
        if (edgesCount) edgesCount.textContent = state.edges.length || 0;
        if (clustersCount) {
            // Count clusters from graph view if available
            const clusters = this.graphView?.clusteredNodes?.size || 0;
            clustersCount.textContent = clusters;
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'r':
                    event.preventDefault();
                    if (this.graphView && this.graphView.resetView) {
                        this.graphView.resetView();
                    }
                    break;
                case 'f':
                    event.preventDefault();
                    if (this.graphView && this.graphView.fitToView) {
                        this.graphView.fitToView();
                    }
                    break;
                case 'e':
                    event.preventDefault();
                    this.expandAllClusters();
                    break;
                case 'c':
                    event.preventDefault();
                    this.collapseAllNodes();
                    break;
            }
        }

        if (event.key === 'Escape') {
            store.setState({ selectedNode: null, selectedEdge: null });
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.graphView && typeof this.graphView.resize === 'function') {
            const container = document.getElementById('graph-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                this.graphView.resize(rect.width, rect.height);
            }
        }
    }

    /**
     * Change graph layout
     */
    changeLayout(layoutType) {
        this.currentLayout = layoutType;
        // This would be implemented in the graph view
        console.log(`🔄 Changing layout to: ${layoutType}`);
        
        // Update store
        store.setState({
            graphView: {
                ...store.getState().graphView,
                layout: layoutType
            }
        });
    }

    /**
     * Expand all clusters
     */
    expandAllClusters() {
        console.log('📂 Expanding all clusters...');
        if (this.graphView && this.graphView.clusteredNodes) {
            const clusterIds = Array.from(this.graphView.clusteredNodes.keys());
            clusterIds.forEach(clusterId => {
                if (typeof this.graphView.expandCluster === 'function') {
                    this.graphView.expandCluster(clusterId);
                }
            });
        }
    }

    /**
     * Collapse all nodes into clusters
     */
    collapseAllNodes() {
        console.log('🗂️ Creating clusters...');
        // This would implement automatic clustering algorithm
        if (this.graphView && typeof this.graphView.autoCluster === 'function') {
            this.graphView.autoCluster();
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('graph-container');
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #e74c3c; text-align: center; padding: 20px;">
                    <div>
                        <h3>❌ Error</h3>
                        <p>${message}</p>
                        <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Refresh Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Utility methods
     */
    getNodeIcon(type) {
        const icons = {
            'faa_stars_terminal': '🏢',
            'approach_control': '🛫',
            'faa_eram_terminal': '📡',
            'geographic_location': '📍',
            'radar_equipment': '📊',
            'communication_equipment': '📻',
            'default': '◉'
        };
        return icons[type] || icons.default;
    }

    getNodeDegree(node) {
        const state = store.getState();
        return state.edges.filter(edge => 
            edge.source === node.id || edge.target === node.id
        ).length;
    }

    /**
     * Initialize data exploration components
     */
    async initializeDataExplorationComponents() {
        console.log('🔍 Initializing data exploration components...');
        
        try {
            // Initialize global search
            this.globalSearch = new GlobalSearch('.header-center');
            
            // Initialize advanced filters
            this.advancedFilters = new AdvancedFilters('.sidebar-filters');
            
            // Initialize neighborhood explorer (context menu)
            this.neighborhoodExplorer = new NeighborhoodExplorer();
            
            // Initialize path finder
            this.pathFinder = new PathFinder();
            
            // Initialize URL state manager
            this.urlStateManager = new URLStateManager();
            
            console.log('✅ Data exploration components initialized');
        } catch (error) {
            console.error('❌ Failed to initialize data exploration components:', error);
            throw error;
        }
    }

    /**
     * Setup component integration and event handling
     */
    setupComponentIntegration() {
        console.log('🔗 Setting up component integration...');
        
        // Global search integration
        document.addEventListener('globalSearch', (e) => {
            this.handleGlobalSearch(e.detail);
        });
        
        document.addEventListener('globalSearchClear', () => {
            this.clearSearchHighlights();
        });
        
        // Advanced filters integration
        document.addEventListener('filtersApplied', (e) => {
            this.handleAdvancedFilters(e.detail);
        });
        
        // Neighborhood explorer integration
        document.addEventListener('showNeighborhood', (e) => {
            this.handleNeighborhoodExploration(e.detail);
        });
        
        document.addEventListener('showAllConnected', (e) => {
            this.handleShowAllConnected(e.detail);
        });
        
        document.addEventListener('focusOnNode', (e) => {
            this.handleFocusOnNode(e.detail);
        });
        
        document.addEventListener('hideOtherNodes', (e) => {
            this.handleHideOtherNodes(e.detail);
        });
        
        document.addEventListener('filterByNodeType', (e) => {
            this.handleFilterByNodeType(e.detail);
        });
        
        // Path finder integration
        document.addEventListener('showShortestPath', (e) => {
            this.handleShowShortestPath(e.detail);
        });
        
        document.addEventListener('pathNotFound', (e) => {
            this.handlePathNotFound(e.detail);
        });
        
        document.addEventListener('clearAllPaths', () => {
            this.clearPathHighlights();
        });
        
        // URL state integration
        document.addEventListener('urlCopied', (e) => {
            this.showNotification('URL copied to clipboard!', 'success');
        });
        
        console.log('✅ Component integration setup complete');
    }

    /**
     * Handle global search events
     */
    handleGlobalSearch(detail) {
        const { query, scope } = detail;
        
        if (this.graphView && typeof this.graphView.highlightSearch === 'function') {
            this.graphView.highlightSearch(query, scope);
        }
        
        console.log(`🔍 Global search: "${query}" in scope: ${scope}`);
    }

    /**
     * Handle advanced filter events
     */
    handleAdvancedFilters(detail) {
        const { filteredData, filterState } = detail;
        
        if (this.graphView && typeof this.graphView.applyAdvancedFilters === 'function') {
            this.graphView.applyAdvancedFilters(filteredData);
        }
        
        console.log('🔽 Applied advanced filters:', filterState);
    }

    /**
     * Handle neighborhood exploration
     */
    handleNeighborhoodExploration(detail) {
        const { sourceNode, neighbors, hops, highlightClass } = detail;
        
        if (this.graphView && typeof this.graphView.highlightNeighborhood === 'function') {
            this.graphView.highlightNeighborhood(sourceNode, neighbors, highlightClass);
        }
        
        // Update info panel
        this.showNeighborhoodInfo(sourceNode, neighbors, hops);
        
        console.log(`🌐 Neighborhood exploration: ${hops}-hop from ${sourceNode.name || sourceNode.id}`);
    }

    /**
     * Handle show all connected nodes
     */
    handleShowAllConnected(detail) {
        const { sourceNode, connectedNodes } = detail;
        
        if (this.graphView && typeof this.graphView.highlightConnectedComponent === 'function') {
            this.graphView.highlightConnectedComponent(sourceNode, connectedNodes);
        }
        
        this.showConnectedComponentInfo(sourceNode, connectedNodes);
        
        console.log(`🌐 Showing all connected: ${connectedNodes.length} nodes`);
    }

    /**
     * Handle focus on node
     */
    handleFocusOnNode(detail) {
        const { node, centerAndZoom } = detail;
        
        if (this.graphView && typeof this.graphView.focusOnNode === 'function') {
            this.graphView.focusOnNode(node, centerAndZoom);
        }
        
        // Update selection
        store.setState({ selectedNode: node });
        
        console.log(`🎯 Focused on node: ${node.name || node.id}`);
    }

    /**
     * Handle hide other nodes
     */
    handleHideOtherNodes(detail) {
        const { visibleNodeIds, sourceNode } = detail;
        
        if (this.graphView && typeof this.graphView.hideOtherNodes === 'function') {
            this.graphView.hideOtherNodes(visibleNodeIds);
        }
        
        console.log(`👁️ Hiding others, showing ${visibleNodeIds.size} nodes`);
    }

    /**
     * Handle filter by node type
     */
    handleFilterByNodeType(detail) {
        const { nodeType, sourceNode } = detail;
        
        if (this.advancedFilters) {
            // Trigger filter update in advanced filters component
            document.dispatchEvent(new CustomEvent('setTypeFilter', {
                detail: { nodeType }
            }));
        }
        
        console.log(`🔧 Filtering by node type: ${nodeType}`);
    }

    /**
     * Handle shortest path display
     */
    handleShowShortestPath(detail) {
        const { path, distance, algorithm, sourceId, targetId } = detail;
        
        if (this.graphView && typeof this.graphView.highlightPath === 'function') {
            this.graphView.highlightPath(path, 'shortest-path');
        }
        
        // Show path info
        this.showPathInfo(path, distance, algorithm, sourceId, targetId);
        
        console.log(`🛣️ Shortest path: ${path.length} nodes, distance: ${distance}`);
    }

    /**
     * Handle path not found
     */
    handlePathNotFound(detail) {
        const { sourceId, targetId, algorithm } = detail;
        
        this.showNotification(
            `No path found between nodes using ${algorithm}`, 
            'warning'
        );
        
        console.log(`❌ No path found: ${sourceId} → ${targetId}`);
    }

    /**
     * Clear search highlights
     */
    clearSearchHighlights() {
        if (this.graphView && typeof this.graphView.clearSearchHighlights === 'function') {
            this.graphView.clearSearchHighlights();
        }
    }

    /**
     * Clear path highlights
     */
    clearPathHighlights() {
        if (this.graphView && typeof this.graphView.clearPathHighlights === 'function') {
            this.graphView.clearPathHighlights();
        }
    }

    /**
     * Show neighborhood information
     */
    showNeighborhoodInfo(sourceNode, neighbors, hops) {
        const infoPanel = document.getElementById('analysis-content');
        if (infoPanel) {
            const infoHtml = `
                <div class="neighborhood-info">
                    <h4>🌐 ${hops}-Hop Neighborhood</h4>
                    <div class="info-item">
                        <span class="info-label">Center Node:</span>
                        <span class="info-value">${sourceNode.name || sourceNode.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Neighbors:</span>
                        <span class="info-value">${neighbors.length}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Hops:</span>
                        <span class="info-value">${hops}</span>
                    </div>
                </div>
            `;
            infoPanel.innerHTML += infoHtml;
        }
    }

    /**
     * Show connected component information
     */
    showConnectedComponentInfo(sourceNode, connectedNodes) {
        const infoPanel = document.getElementById('analysis-content');
        if (infoPanel) {
            const infoHtml = `
                <div class="component-info">
                    <h4>🌐 Connected Component</h4>
                    <div class="info-item">
                        <span class="info-label">Source Node:</span>
                        <span class="info-value">${sourceNode.name || sourceNode.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Connected Nodes:</span>
                        <span class="info-value">${connectedNodes.length}</span>
                    </div>
                </div>
            `;
            infoPanel.innerHTML += infoHtml;
        }
    }

    /**
     * Show path information
     */
    showPathInfo(path, distance, algorithm, sourceId, targetId) {
        const infoPanel = document.getElementById('analysis-content');
        if (infoPanel) {
            const infoHtml = `
                <div class="path-info">
                    <h4>🛣️ Shortest Path</h4>
                    <div class="info-item">
                        <span class="info-label">Algorithm:</span>
                        <span class="info-value">${algorithm.toUpperCase()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Path Length:</span>
                        <span class="info-value">${path.length} nodes</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Distance:</span>
                        <span class="info-value">${distance.toFixed(2)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Path:</span>
                        <span class="info-value">${path.join(' → ')}</span>
                    </div>
                </div>
            `;
            infoPanel.innerHTML += infoHtml;
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 400px;
            font-family: system-ui, sans-serif;
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Handle close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
    }

    /**
     * Hide notification
     */
    hideNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get notification color based on type
     */
    getNotificationColor(type) {
        const colors = {
            'info': '#3498db',
            'success': '#2ecc71',
            'warning': '#f39c12',
            'error': '#e74c3c'
        };
        return colors[type] || colors.info;
    }

    /**
     * Get data exploration components
     */
    getDataExplorationComponents() {
        return {
            globalSearch: this.globalSearch,
            advancedFilters: this.advancedFilters,
            neighborhoodExplorer: this.neighborhoodExplorer,
            pathFinder: this.pathFinder,
            urlStateManager: this.urlStateManager
        };
    }

    /**
     * Public API methods
     */
    getGraphView() {
        return this.graphView;
    }

    isInitialized() {
        return this.initialized;
    }

    getState() {
        return {
            initialized: this.initialized,
            currentLayout: this.currentLayout,
            store: store.getState(),
            dataExploration: this.getDataExplorationComponents()
        };
    }

    /**
     * Setup graph performance monitoring
     */
    setupGraphPerformanceMonitoring() {
        // Listen for graph render completion from D3 enhanced view
        document.addEventListener('graph-render-complete', (event) => {
            const { nodeCount, edgeCount, renderTime, layoutType } = event.detail;
            
            console.log(`📊 Graph rendered: ${nodeCount} nodes, ${edgeCount} edges in ${renderTime?.toFixed(2)}ms`);
            
            // Record performance metric
            performanceMonitor.recordMetric('graph-render', renderTime, {
                nodeCount,
                edgeCount,
                layoutType: layoutType || this.currentLayout
            });
            
            // Check if performance target is met (2 seconds)
            if (renderTime > 2000) {
                console.warn(`⚠️ Graph render exceeded target: ${renderTime}ms > 2000ms`);
                this.showNotification(
                    `Graph rendering took ${(renderTime/1000).toFixed(1)}s (target: 2s)`, 
                    'warning'
                );
            }
        });
        
        // Monitor search performance
        document.addEventListener('search-start', (event) => {
            event.detail.startTime = performance.now();
        });
        
        document.addEventListener('search-complete', (event) => {
            const searchTime = performance.now() - event.detail.startTime;
            
            performanceMonitor.recordMetric('search-performance', searchTime, {
                query: event.detail.query,
                resultCount: event.detail.resultCount,
                scope: event.detail.scope
            });
            
            // Check search performance target (500ms)
            if (searchTime > 500) {
                console.warn(`⚠️ Search exceeded target: ${searchTime}ms > 500ms`);
            }
        });
        
        // Monitor data loading performance
        document.addEventListener('data-load-start', (event) => {
            event.detail.startTime = performance.now();
        });
        
        document.addEventListener('data-load-complete', (event) => {
            const loadTime = performance.now() - event.detail.startTime;
            
            performanceMonitor.recordMetric('data-load', loadTime, {
                source: event.detail.source,
                size: event.detail.size,
                cached: event.detail.cached || false
            });
        });
        
        // Setup periodic performance reporting
        setInterval(() => {
            const targets = performanceMonitor.checkPerformanceTargets();
            
            // Log performance summary
            console.group('📈 Performance Summary');
            Object.entries(targets).forEach(([metric, data]) => {
                const status = data.met ? '✅' : '❌';
                console.log(`${status} ${metric}: ${data.value?.toFixed(2)}ms (target: ${data.target}ms)`);
            });
            console.groupEnd();
            
            // Show warnings for consistently poor performance
            const failedTargets = Object.entries(targets)
                .filter(([_, data]) => !data.met && data.value > data.target * 1.5)
                .map(([metric]) => metric);
                
            if (failedTargets.length > 0) {
                console.warn(`⚠️ Consistently poor performance in: ${failedTargets.join(', ')}`);
            }
        }, 60000); // Check every minute
        
        console.log('📊 Graph performance monitoring setup complete');
    }
}

// Initialize the application
const app = new EnhancedKnowledgeGraphApp();

// Make it globally accessible for debugging
window.knowledgeGraphApp = app;

// Export for module usage
export default app;
