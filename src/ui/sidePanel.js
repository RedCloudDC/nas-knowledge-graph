/**
 * Side Panel Component
 * Displays node/edge details, filters, and analysis controls
 */
import { store } from '../core/store.js';

export class SidePanel {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.activeTab = 'details';

        if (!this.container) {
            throw new Error(`Container with ID '${this.containerId}' not found`);
        }

        this.init();
        this.setupSubscriptions();
    }

    /**
     * Initialize the side panel
     */
    init() {
        this.container.className = 'side-panel';
        this.render();
        console.log('SidePanel initialized');
    }

    /**
     * Setup store subscriptions
     */
    setupSubscriptions() {
        // Subscribe to selected node changes
        store.subscribe('selectedNode', (selectedNode) => {
            this.updateDetailsTab(selectedNode);
        });

        // Subscribe to selected edge changes
        store.subscribe('selectedEdge', (selectedEdge) => {
            this.updateDetailsTab(null, selectedEdge);
        });

        // Subscribe to side panel state changes
        store.subscribe('sidePanel', (sidePanel) => {
            this.updateVisibility(sidePanel.visible);
            this.switchTab(sidePanel.activeTab);
        });

        // Subscribe to nodes for filter updates
        store.subscribe('nodes', (nodes) => {
            this.updateFiltersTab(nodes);
        });
    }

    /**
     * Render the side panel structure
     */
    render() {
        this.container.innerHTML = `
            <div class="side-panel-header">
                <div class="side-panel-tabs">
                    <button class="tab-button active" data-tab="details">Details</button>
                    <button class="tab-button" data-tab="filters">Filters</button>
                    <button class="tab-button" data-tab="analysis">Analysis</button>
                </div>
                <button class="side-panel-close" title="Close Panel">&times;</button>
            </div>
            <div class="side-panel-content">
                <div class="tab-content active" data-tab="details">
                    <div id="details-content">
                        <p class="empty-state">Select a node or edge to view details</p>
                    </div>
                </div>
                <div class="tab-content" data-tab="filters">
                    <div id="filters-content">
                        <div class="filter-section">
                            <h4>Search</h4>
                            <input type="text" id="search-input" placeholder="Search nodes..." />
                        </div>
                        <div class="filter-section">
                            <h4>Node Types</h4>
                            <div id="node-type-filters"></div>
                        </div>
                        <div class="filter-section">
                            <h4>Actions</h4>
                            <button id="clear-filters">Clear All Filters</button>
                            <button id="reset-view">Reset View</button>
                        </div>
                    </div>
                </div>
                <div class="tab-content" data-tab="analysis">
                    <div id="analysis-content">
                        <div class="analysis-section">
                            <h4>Graph Statistics</h4>
                            <div id="graph-stats"></div>
                        </div>
                        <div class="analysis-section">
                            <h4>Layout Options</h4>
                            <select id="layout-select">
                                <option value="force">Force-directed</option>
                                <option value="circular">Circular</option>
                                <option value="hierarchical">Hierarchical</option>
                            </select>
                        </div>
                        <div class="analysis-section">
                            <h4>Export</h4>
                            <button id="export-json">Export JSON</button>
                            <button id="export-csv">Export CSV</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.updateGraphStats();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        this.container.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.switchTab(tab);

                // Update store
                store.setState({
                    sidePanel: {
                        ...store.getState().sidePanel,
                        activeTab: tab
                    }
                });
            });
        });

        // Close panel
        const closeButton = this.container.querySelector('.side-panel-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.togglePanel();
            });
        }

        // Search input
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Clear filters
        const clearFiltersButton = this.container.querySelector('#clear-filters');
        if (clearFiltersButton) {
            clearFiltersButton.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Reset view
        const resetViewButton = this.container.querySelector('#reset-view');
        if (resetViewButton) {
            resetViewButton.addEventListener('click', () => {
                this.resetView();
            });
        }

        // Layout selection
        const layoutSelect = this.container.querySelector('#layout-select');
        if (layoutSelect) {
            layoutSelect.addEventListener('change', (e) => {
                this.changeLayout(e.target.value);
            });
        }

        // Export buttons
        const exportJsonButton = this.container.querySelector('#export-json');
        const exportCsvButton = this.container.querySelector('#export-csv');

        if (exportJsonButton) {
            exportJsonButton.addEventListener('click', () => {
                this.exportData('json');
            });
        }

        if (exportCsvButton) {
            exportCsvButton.addEventListener('click', () => {
                this.exportData('csv');
            });
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab buttons
        this.container.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tabName);
        });

        // Update tab content
        this.container.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.getAttribute('data-tab') === tabName);
        });

        // Update content based on active tab
        switch (tabName) {
        case 'analysis':
            this.updateGraphStats();
            break;
        case 'filters':
            this.updateFiltersTab(store.getState().nodes);
            break;
        }
    }

    /**
     * Update details tab with node/edge information
     */
    updateDetailsTab(selectedNode = null, selectedEdge = null) {
        const detailsContent = this.container.querySelector('#details-content');
        if (!detailsContent) {return;}

        if (selectedNode) {
            detailsContent.innerHTML = this.renderNodeDetails(selectedNode);
        } else if (selectedEdge) {
            detailsContent.innerHTML = this.renderEdgeDetails(selectedEdge);
        } else {
            detailsContent.innerHTML = '<p class=\"empty-state\">Select a node or edge to view details</p>';
        }
    }

    /**
     * Render node details
     */
    renderNodeDetails(node) {
        const { nodes, edges } = store.getState();
        const connectedEdges = edges.filter(edge =>
            edge.source === node.id || edge.target === node.id
        );

        const connections = connectedEdges.map(edge => {
            const isSource = edge.source === node.id;
            const connectedNodeId = isSource ? edge.target : edge.source;
            const connectedNode = nodes.find(n => n.id === connectedNodeId);
            const direction = isSource ? '→' : '←';

            return `
                <div class="connection-item">
                    <span class="connection-direction">${direction}</span>
                    <span class="connection-label">${edge.label || 'unlabeled'}</span>
                    <span class="connection-node">${connectedNode ? connectedNode.label : connectedNodeId}</span>
                </div>
            `;
        }).join('');

        const properties = Object.entries(node.properties || {}).map(([key, value]) =>
            `<div class="property-item"><strong>${key}:</strong> ${value}</div>`
        ).join('');

        return `
            <div class="details-section">
                <h3>${node.label}</h3>
                <div class="detail-group">
                    <h4>Basic Information</h4>
                    <div class="property-item"><strong>ID:</strong> ${node.id}</div>
                    <div class="property-item"><strong>Type:</strong> ${node.type}</div>
                    <div class="property-item"><strong>Connections:</strong> ${connectedEdges.length}</div>
                </div>
                ${properties ? `
                <div class="detail-group">
                    <h4>Properties</h4>
                    ${properties}
                </div>
                ` : ''}
                ${connections ? `
                <div class="detail-group">
                    <h4>Connections</h4>
                    <div class="connections-list">
                        ${connections}
                    </div>
                </div>
                ` : ''}
                <div class="detail-actions">
                    <button onclick="window.sidePanel.focusNode('${node.id}')">Focus</button>
                    <button onclick="window.sidePanel.expandNode('${node.id}')">Expand</button>
                </div>
            </div>
        `;
    }

    /**
     * Render edge details
     */
    renderEdgeDetails(edge) {
        const { nodes } = store.getState();
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        const properties = Object.entries(edge.properties || {}).map(([key, value]) =>
            `<div class="property-item"><strong>${key}:</strong> ${value}</div>`
        ).join('');

        return `
            <div class="details-section">
                <h3>Edge: ${edge.label || 'Unlabeled'}</h3>
                <div class="detail-group">
                    <h4>Basic Information</h4>
                    <div class="property-item"><strong>ID:</strong> ${edge.id}</div>
                    <div class="property-item"><strong>Type:</strong> ${edge.type}</div>
                    <div class="property-item"><strong>Source:</strong> ${sourceNode ? sourceNode.label : edge.source}</div>
                    <div class="property-item"><strong>Target:</strong> ${targetNode ? targetNode.label : edge.target}</div>
                </div>
                ${properties ? `
                <div class="detail-group">
                    <h4>Properties</h4>
                    ${properties}
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Update filters tab
     */
    updateFiltersTab(nodes) {
        const nodeTypeFilters = this.container.querySelector('#node-type-filters');
        if (!nodeTypeFilters) {return;}

        // Get unique node types
        const nodeTypes = [...new Set(nodes.map(node => node.type))];
        const currentFilters = store.getState().filters.nodeTypes;

        nodeTypeFilters.innerHTML = nodeTypes.map(type => `
            <label class="filter-checkbox">
                <input type="checkbox" value="${type}" ${currentFilters.includes(type) ? 'checked' : ''} />
                <span class="checkmark"></span>
                ${type} (${nodes.filter(n => n.type === type).length})
            </label>
        `).join('');

        // Add event listeners to checkboxes
        nodeTypeFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleNodeTypeFilter(e.target.value, e.target.checked);
            });
        });
    }

    /**
     * Update graph statistics
     */
    updateGraphStats() {
        const statsContainer = this.container.querySelector('#graph-stats');
        if (!statsContainer) {return;}

        const { nodes, edges } = store.getState();
        const nodeTypes = [...new Set(nodes.map(n => n.type))];

        // Calculate degree statistics
        const degrees = nodes.map(node => {
            return edges.filter(edge =>
                edge.source === node.id || edge.target === node.id
            ).length;
        });

        const avgDegree = degrees.length > 0 ?
            (degrees.reduce((sum, deg) => sum + deg, 0) / degrees.length).toFixed(2) : 0;
        const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;

        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Nodes:</span>
                <span class="stat-value">${nodes.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Edges:</span>
                <span class="stat-value">${edges.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Node Types:</span>
                <span class="stat-value">${nodeTypes.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Degree:</span>
                <span class="stat-value">${avgDegree}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Max Degree:</span>
                <span class="stat-value">${maxDegree}</span>
            </div>
        `;
    }

    /**
     * Handle search input
     */
    handleSearch(searchTerm) {
        store.setState({
            filters: {
                ...store.getState().filters,
                searchTerm: searchTerm.toLowerCase()
            }
        });

        // Apply search highlighting or filtering
        this.applyFilters();
    }

    /**
     * Handle node type filter changes
     */
    handleNodeTypeFilter(nodeType, checked) {
        const currentFilters = store.getState().filters.nodeTypes;
        let newFilters;

        if (checked) {
            newFilters = [...currentFilters, nodeType];
        } else {
            newFilters = currentFilters.filter(type => type !== nodeType);
        }

        store.setState({
            filters: {
                ...store.getState().filters,
                nodeTypes: newFilters
            }
        });

        this.applyFilters();
    }

    /**
     * Apply current filters
     */
    applyFilters() {
        const { nodes, filters } = store.getState();
        const { searchTerm, nodeTypes } = filters;

        // Filter nodes based on search term and node types
        const filteredNodes = nodes.filter(node => {
            const matchesSearch = !searchTerm ||
                node.label.toLowerCase().includes(searchTerm) ||
                node.type.toLowerCase().includes(searchTerm);

            const matchesType = nodeTypes.length === 0 || nodeTypes.includes(node.type);

            return matchesSearch && matchesType;
        });

        // Emit filter event (could be handled by graph view)
        this.container.dispatchEvent(new CustomEvent('filtersChanged', {
            detail: { filteredNodes, filters }
        }));
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        store.setState({
            filters: {
                nodeTypes: [],
                searchTerm: '',
                dateRange: null
            }
        });

        // Reset UI
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {searchInput.value = '';}

        this.updateFiltersTab(store.getState().nodes);
        this.applyFilters();
    }

    /**
     * Reset view
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
    }

    /**
     * Change layout
     */
    changeLayout(layout) {
        store.setState({
            graphView: {
                ...store.getState().graphView,
                layout: layout
            }
        });
    }

    /**
     * Export data
     */
    exportData(format) {
        // Import dataLoader for export functionality
        import('../services/dataLoader.js').then(({ dataLoader }) => {
            const data = dataLoader.exportData(format);
            this.downloadFile(data, `graph-export.${format}`,
                format === 'json' ? 'application/json' : 'text/csv');
        });
    }

    /**
     * Download file
     */
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Toggle panel visibility
     */
    togglePanel() {
        const currentState = store.getState().sidePanel;
        store.setState({
            sidePanel: {
                ...currentState,
                visible: !currentState.visible
            }
        });
    }

    /**
     * Update panel visibility
     */
    updateVisibility(visible) {
        this.container.style.display = visible ? 'flex' : 'none';
    }

    /**
     * Focus on a specific node
     */
    focusNode(nodeId) {
        const node = store.getState().nodes.find(n => n.id == nodeId);
        if (node) {
            store.setState({ selectedNode: node });

            // Emit focus event for graph view
            this.container.dispatchEvent(new CustomEvent('focusNode', {
                detail: { nodeId }
            }));
        }
    }

    /**
     * Expand node connections
     */
    expandNode(nodeId) {
        // Emit expand event for graph view
        this.container.dispatchEvent(new CustomEvent('expandNode', {
            detail: { nodeId }
        }));
    }
}

// Make sidePanel available globally for inline event handlers
window.sidePanel = null;
