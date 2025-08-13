/**
 * Neighborhood Explorer Component
 * Context menu for exploring node neighborhoods with 1-hop and 2-hop functionality
 */

import { search } from '../utils/search.js';
import { store } from '../core/store.js';

export class NeighborhoodExplorer {
    constructor() {
        this.contextMenu = null;
        this.currentNode = null;
        this.exploredNodes = new Set();
        this.explorationHistory = [];
        this.maxHistorySize = 20;

        this.init();
        this.setupEventListeners();
    }

    /**
     * Initialize the neighborhood explorer
     */
    init() {
        this.createContextMenu();
        this.addExplorerStyles();
    }

    /**
     * Create the context menu structure
     */
    createContextMenu() {
        // Remove existing context menu if any
        if (this.contextMenu) {
            document.body.removeChild(this.contextMenu);
        }

        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'neighborhood-context-menu';
        this.contextMenu.className = 'neighborhood-context-menu';
        this.contextMenu.style.display = 'none';

        this.contextMenu.innerHTML = `
            <div class="context-menu-header">
                <div class="context-node-info">
                    <span class="context-node-icon">🔍</span>
                    <div class="context-node-details">
                        <div class="context-node-name">Node Explorer</div>
                        <div class="context-node-type">Select exploration option</div>
                    </div>
                </div>
            </div>
            
            <div class="context-menu-section">
                <div class="context-menu-title">🌐 Explore Neighborhood</div>
                <div class="context-menu-items">
                    <button class="context-menu-item" data-action="show-1-hop">
                        <span class="menu-icon">🔵</span>
                        <div class="menu-content">
                            <div class="menu-label">Show 1-Hop</div>
                            <div class="menu-description">Direct connections</div>
                        </div>
                        <span class="menu-shortcut">1</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="show-2-hop">
                        <span class="menu-icon">🔷</span>
                        <div class="menu-content">
                            <div class="menu-label">Show 2-Hop</div>
                            <div class="menu-description">Extended neighborhood</div>
                        </div>
                        <span class="menu-shortcut">2</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="show-all-connected">
                        <span class="menu-icon">🌐</span>
                        <div class="menu-content">
                            <div class="menu-label">Show All Connected</div>
                            <div class="menu-description">Complete component</div>
                        </div>
                        <span class="menu-shortcut">A</span>
                    </button>
                </div>
            </div>
            
            <div class="context-menu-section">
                <div class="context-menu-title">🎯 Focus & Filter</div>
                <div class="context-menu-items">
                    <button class="context-menu-item" data-action="focus-on-node">
                        <span class="menu-icon">🎯</span>
                        <div class="menu-content">
                            <div class="menu-label">Focus on Node</div>
                            <div class="menu-description">Center and zoom</div>
                        </div>
                        <span class="menu-shortcut">F</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="hide-others">
                        <span class="menu-icon">👁️</span>
                        <div class="menu-content">
                            <div class="menu-label">Hide Others</div>
                            <div class="menu-description">Show only this neighborhood</div>
                        </div>
                        <span class="menu-shortcut">H</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="filter-by-type">
                        <span class="menu-icon">🔧</span>
                        <div class="menu-content">
                            <div class="menu-label">Filter by Type</div>
                            <div class="menu-description">Show similar nodes</div>
                        </div>
                        <span class="menu-shortcut">T</span>
                    </button>
                </div>
            </div>
            
            <div class="context-menu-section">
                <div class="context-menu-title">🛣️ Pathfinding</div>
                <div class="context-menu-items">
                    <button class="context-menu-item" data-action="start-path-finding">
                        <span class="menu-icon">📍</span>
                        <div class="menu-content">
                            <div class="menu-label">Find Path From Here</div>
                            <div class="menu-description">Set as source node</div>
                        </div>
                        <span class="menu-shortcut">P</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="end-path-finding">
                        <span class="menu-icon">🎯</span>
                        <div class="menu-content">
                            <div class="menu-label">Find Path To Here</div>
                            <div class="menu-description">Set as target node</div>
                        </div>
                        <span class="menu-shortcut">E</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="clear-paths" id="clear-paths-item">
                        <span class="menu-icon">🧹</span>
                        <div class="menu-content">
                            <div class="menu-label">Clear Paths</div>
                            <div class="menu-description">Remove all path highlights</div>
                        </div>
                        <span class="menu-shortcut">C</span>
                    </button>
                </div>
            </div>
            
            <div class="context-menu-section">
                <div class="context-menu-title">📊 Analysis</div>
                <div class="context-menu-items">
                    <button class="context-menu-item" data-action="show-node-details">
                        <span class="menu-icon">ℹ️</span>
                        <div class="menu-content">
                            <div class="menu-label">Node Details</div>
                            <div class="menu-description">View properties & stats</div>
                        </div>
                        <span class="menu-shortcut">I</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="analyze-centrality">
                        <span class="menu-icon">📈</span>
                        <div class="menu-content">
                            <div class="menu-label">Centrality Analysis</div>
                            <div class="menu-description">Compute node importance</div>
                        </div>
                        <span class="menu-shortcut">N</span>
                    </button>
                    
                    <button class="context-menu-item" data-action="export-neighborhood">
                        <span class="menu-icon">💾</span>
                        <div class="menu-content">
                            <div class="menu-label">Export Neighborhood</div>
                            <div class="menu-description">Save as JSON/CSV</div>
                        </div>
                        <span class="menu-shortcut">S</span>
                    </button>
                </div>
            </div>

            <div class="context-menu-footer">
                <div class="exploration-status">
                    <span class="status-label">Explored:</span>
                    <span class="explored-count">0</span>
                    <span class="status-separator">•</span>
                    <button class="clear-exploration-btn" data-action="clear-exploration">
                        Clear History
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.contextMenu);
    }

    /**
     * Add comprehensive styles for the neighborhood explorer
     */
    addExplorerStyles() {
        if (document.querySelector('#neighborhood-explorer-styles')) {return;}

        const style = document.createElement('style');
        style.id = 'neighborhood-explorer-styles';
        style.textContent = `
            .neighborhood-context-menu {
                position: fixed;
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                border: 1px solid #e1e8ed;
                border-radius: 12px;
                box-shadow: 0 12px 36px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5);
                z-index: 10000;
                min-width: 280px;
                max-width: 320px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                user-select: none;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            .context-menu-header {
                padding: 16px;
                border-bottom: 1px solid #f0f0f0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }

            .context-node-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .context-node-icon {
                font-size: 24px;
                opacity: 0.9;
            }

            .context-node-name {
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 2px;
            }

            .context-node-type {
                font-size: 12px;
                opacity: 0.8;
            }

            .context-menu-section {
                padding: 12px 0;
                border-bottom: 1px solid #f0f0f0;
            }

            .context-menu-section:last-of-type {
                border-bottom: none;
            }

            .context-menu-title {
                font-size: 11px;
                font-weight: 700;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                padding: 0 16px 8px;
                margin-bottom: 4px;
            }

            .context-menu-items {
                display: flex;
                flex-direction: column;
            }

            .context-menu-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                background: none;
                border: none;
                cursor: pointer;
                transition: all 0.15s ease;
                color: #2c3e50;
                text-align: left;
                position: relative;
            }

            .context-menu-item:hover {
                background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
            }

            .context-menu-item:active {
                background: #e9ecef;
                transform: scale(0.98);
            }

            .context-menu-item:focus {
                outline: 2px solid #3498db;
                outline-offset: -2px;
            }

            .menu-icon {
                font-size: 18px;
                margin-right: 12px;
                width: 24px;
                text-align: center;
                opacity: 0.8;
            }

            .menu-content {
                flex: 1;
                min-width: 0;
            }

            .menu-label {
                font-weight: 500;
                font-size: 14px;
                margin-bottom: 2px;
                color: #2c3e50;
            }

            .menu-description {
                font-size: 11px;
                color: #6c757d;
                line-height: 1.3;
            }

            .menu-shortcut {
                font-size: 11px;
                color: #6c757d;
                background: #f8f9fa;
                padding: 3px 6px;
                border-radius: 4px;
                font-weight: 600;
                margin-left: 8px;
            }

            .context-menu-footer {
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 0 0 12px 12px;
                border-top: 1px solid #e9ecef;
            }

            .exploration-status {
                display: flex;
                align-items: center;
                font-size: 11px;
                color: #6c757d;
            }

            .status-label {
                font-weight: 600;
                margin-right: 4px;
            }

            .explored-count {
                color: #3498db;
                font-weight: 600;
            }

            .status-separator {
                margin: 0 8px;
                opacity: 0.5;
            }

            .clear-exploration-btn {
                background: none;
                border: none;
                color: #e74c3c;
                font-size: 11px;
                cursor: pointer;
                text-decoration: underline;
                padding: 0;
            }

            .clear-exploration-btn:hover {
                color: #c0392b;
            }

            /* Disabled state */
            .context-menu-item:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .context-menu-item:disabled:hover {
                background: none;
                transform: none;
            }

            /* Special highlighting for active path finding mode */
            .context-menu-item[data-action="start-path-finding"].active,
            .context-menu-item[data-action="end-path-finding"].active {
                background: linear-gradient(90deg, #e3f2fd 0%, #bbdefb 100%);
                color: #1976d2;
            }

            .context-menu-item[data-action="start-path-finding"].active .menu-icon,
            .context-menu-item[data-action="end-path-finding"].active .menu-icon {
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
            }

            /* Dark theme support */
            .theme-dark .neighborhood-context-menu {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                border-color: #4a5c6b;
                color: #ecf0f1;
            }

            .theme-dark .context-menu-header {
                background: linear-gradient(135deg, #8e44ad 0%, #3498db 100%);
            }

            .theme-dark .context-menu-section {
                border-bottom-color: #4a5c6b;
            }

            .theme-dark .context-menu-item {
                color: #ecf0f1;
            }

            .theme-dark .context-menu-item:hover {
                background: linear-gradient(90deg, #34495e 0%, #4a5c6b 100%);
            }

            .theme-dark .menu-label {
                color: #ecf0f1;
            }

            .theme-dark .menu-shortcut {
                background: #34495e;
                color: #bdc3c7;
            }

            .theme-dark .context-menu-footer {
                background: #34495e;
                border-top-color: #4a5c6b;
            }

            /* Animation for context menu appearance */
            .neighborhood-context-menu {
                animation: contextMenuSlide 0.2s ease-out;
                transform-origin: top left;
            }

            @keyframes contextMenuSlide {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            /* Path finding mode indicators */
            .path-finding-source {
                outline: 3px solid #4caf50 !important;
                outline-offset: 2px;
                animation: pathSourcePulse 2s infinite;
            }

            .path-finding-target {
                outline: 3px solid #f44336 !important;
                outline-offset: 2px;
                animation: pathTargetPulse 2s infinite;
            }

            @keyframes pathSourcePulse {
                0%, 100% { outline-color: #4caf50; }
                50% { outline-color: #81c784; }
            }

            @keyframes pathTargetPulse {
                0%, 100% { outline-color: #f44336; }
                50% { outline-color: #e57373; }
            }

            /* Neighborhood highlight styles */
            .neighborhood-1-hop {
                stroke: #2196f3 !important;
                stroke-width: 3px !important;
                filter: drop-shadow(0 0 6px rgba(33, 150, 243, 0.5));
            }

            .neighborhood-2-hop {
                stroke: #ff9800 !important;
                stroke-width: 2px !important;
                stroke-dasharray: 5,5;
                filter: drop-shadow(0 0 4px rgba(255, 152, 0, 0.3));
            }

            .neighborhood-hidden {
                opacity: 0.1 !important;
                transition: opacity 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup event listeners for the explorer
     */
    setupEventListeners() {
        // Global click handler to hide context menu
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Context menu item clicks
        this.contextMenu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem) {
                const action = menuItem.dataset.action;
                this.handleMenuAction(action);
                e.stopPropagation();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.contextMenu.style.display === 'block') {
                this.handleKeyboardShortcut(e);
            }
        });

        // Listen for graph node right-clicks
        document.addEventListener('contextmenu', (e) => {
            const nodeElement = e.target.closest('.node, [data-node-id]');
            if (nodeElement) {
                e.preventDefault();
                this.showContextMenu(e, this.getNodeFromElement(nodeElement));
            }
        });

        // Store subscriptions for data updates
        store.subscribe('nodes', () => this.updateExplorationCount());
        store.subscribe('selectedNode', (node) => {
            if (node) {
                this.currentNode = node;
                this.updateContextMenuHeader();
            }
        });
    }

    /**
     * Show context menu at specified position
     */
    showContextMenu(event, node) {
        if (!node) {return;}

        this.currentNode = node;
        this.updateContextMenuHeader();
        this.updateMenuStates();

        // Position context menu
        const x = event.pageX;
        const y = event.pageY;

        // Ensure menu stays within viewport
        const menuRect = this.contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let finalX = x;
        let finalY = y;

        if (x + menuRect.width > viewportWidth) {
            finalX = x - menuRect.width;
        }

        if (y + menuRect.height > viewportHeight) {
            finalY = y - menuRect.height;
        }

        this.contextMenu.style.left = `${finalX}px`;
        this.contextMenu.style.top = `${finalY}px`;
        this.contextMenu.style.display = 'block';

        // Focus first menu item for keyboard navigation
        const firstItem = this.contextMenu.querySelector('.context-menu-item');
        if (firstItem) {
            setTimeout(() => firstItem.focus(), 100);
        }
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.currentNode = null;
    }

    /**
     * Update context menu header with current node info
     */
    updateContextMenuHeader() {
        if (!this.currentNode) {return;}

        const nodeIcon = this.getNodeIcon(this.currentNode.type);
        const nodeName = this.currentNode.name || this.currentNode.label || this.currentNode.id;
        const nodeType = this.currentNode.type || 'Unknown';

        const iconElement = this.contextMenu.querySelector('.context-node-icon');
        const nameElement = this.contextMenu.querySelector('.context-node-name');
        const typeElement = this.contextMenu.querySelector('.context-node-type');

        if (iconElement) {iconElement.textContent = nodeIcon;}
        if (nameElement) {nameElement.textContent = nodeName;}
        if (typeElement) {typeElement.textContent = nodeType;}
    }

    /**
     * Update menu item states based on current context
     */
    updateMenuStates() {
        // Update path finding states
        const sourceBtn = this.contextMenu.querySelector('[data-action="start-path-finding"]');
        const targetBtn = this.contextMenu.querySelector('[data-action="end-path-finding"]');
        const clearBtn = this.contextMenu.querySelector('[data-action="clear-paths"]');

        if (this.pathFindingMode) {
            if (this.pathFindingMode.source) {
                sourceBtn?.classList.add('active');
            }
            if (this.pathFindingMode.target) {
                targetBtn?.classList.add('active');
            }
            if (clearBtn) {clearBtn.disabled = false;}
        } else {
            sourceBtn?.classList.remove('active');
            targetBtn?.classList.remove('active');
            if (clearBtn) {clearBtn.disabled = true;}
        }
    }

    /**
     * Handle menu action selection
     */
    handleMenuAction(action) {
        if (!this.currentNode && !['clear-exploration', 'clear-paths'].includes(action)) {
            return;
        }

        switch (action) {
        case 'show-1-hop':
            this.showNeighborhood(1);
            break;
        case 'show-2-hop':
            this.showNeighborhood(2);
            break;
        case 'show-all-connected':
            this.showAllConnected();
            break;
        case 'focus-on-node':
            this.focusOnNode();
            break;
        case 'hide-others':
            this.hideOthers();
            break;
        case 'filter-by-type':
            this.filterByType();
            break;
        case 'start-path-finding':
            this.startPathFinding();
            break;
        case 'end-path-finding':
            this.endPathFinding();
            break;
        case 'clear-paths':
            this.clearPaths();
            break;
        case 'show-node-details':
            this.showNodeDetails();
            break;
        case 'analyze-centrality':
            this.analyzeCentrality();
            break;
        case 'export-neighborhood':
            this.exportNeighborhood();
            break;
        case 'clear-exploration':
            this.clearExploration();
            break;
        }

        this.hideContextMenu();
    }

    /**
     * Show neighborhood with specified hop count
     */
    showNeighborhood(hops = 1) {
        const neighbors = search.findConnectedNodes(this.currentNode.id, { maxDepth: hops });

        // Add current node to exploration history
        this.exploredNodes.add(this.currentNode.id);
        this.explorationHistory.push({
            action: `show-${hops}-hop`,
            nodeId: this.currentNode.id,
            nodeName: this.currentNode.name || this.currentNode.id,
            timestamp: Date.now(),
            neighborCount: neighbors.length
        });

        // Trim history if needed
        if (this.explorationHistory.length > this.maxHistorySize) {
            this.explorationHistory = this.explorationHistory.slice(-this.maxHistorySize);
        }

        // Highlight the neighborhood
        this.highlightNeighborhood(this.currentNode, neighbors, hops);

        // Emit event for graph visualization
        document.dispatchEvent(new CustomEvent('showNeighborhood', {
            detail: {
                sourceNode: this.currentNode,
                neighbors,
                hops,
                highlightClass: `neighborhood-${hops}-hop`
            }
        }));

        this.updateExplorationCount();

        console.log(`🔍 Showing ${hops}-hop neighborhood for "${this.currentNode.name || this.currentNode.id}": ${neighbors.length} neighbors`);
    }

    /**
     * Show all connected nodes in the same component
     */
    showAllConnected() {
        const allConnected = search.findConnectedNodes(this.currentNode.id, { maxDepth: Infinity });

        this.exploredNodes.add(this.currentNode.id);
        this.explorationHistory.push({
            action: 'show-all-connected',
            nodeId: this.currentNode.id,
            nodeName: this.currentNode.name || this.currentNode.id,
            timestamp: Date.now(),
            neighborCount: allConnected.length
        });

        // Highlight entire connected component
        this.highlightNeighborhood(this.currentNode, allConnected, 'all');

        document.dispatchEvent(new CustomEvent('showAllConnected', {
            detail: {
                sourceNode: this.currentNode,
                connectedNodes: allConnected
            }
        }));

        this.updateExplorationCount();

        console.log(`🌐 Showing all connected nodes for "${this.currentNode.name || this.currentNode.id}": ${allConnected.length} total`);
    }

    /**
     * Focus on the selected node
     */
    focusOnNode() {
        document.dispatchEvent(new CustomEvent('focusOnNode', {
            detail: {
                node: this.currentNode,
                centerAndZoom: true
            }
        }));

        console.log(`🎯 Focusing on node: ${this.currentNode.name || this.currentNode.id}`);
    }

    /**
     * Hide all other nodes except neighborhood
     */
    hideOthers() {
        const neighbors = search.findConnectedNodes(this.currentNode.id, { maxDepth: 2 });
        const visibleNodeIds = new Set([this.currentNode.id, ...neighbors.map(n => n.id)]);

        document.dispatchEvent(new CustomEvent('hideOtherNodes', {
            detail: {
                visibleNodeIds,
                sourceNode: this.currentNode
            }
        }));

        console.log(`👁️ Hiding others, showing only neighborhood of ${neighbors.length + 1} nodes`);
    }

    /**
     * Filter nodes by the same type as current node
     */
    filterByType() {
        if (!this.currentNode.type) {
            console.warn('Node has no type property');
            return;
        }

        document.dispatchEvent(new CustomEvent('filterByNodeType', {
            detail: {
                nodeType: this.currentNode.type,
                sourceNode: this.currentNode
            }
        }));

        console.log(`🔧 Filtering by type: ${this.currentNode.type}`);
    }

    /**
     * Start path finding mode (set as source)
     */
    startPathFinding() {
        if (!this.pathFindingMode) {
            this.pathFindingMode = {};
        }

        this.pathFindingMode.source = this.currentNode;

        // Visual indicator
        document.dispatchEvent(new CustomEvent('setPathFindingSource', {
            detail: { sourceNode: this.currentNode }
        }));

        console.log(`📍 Set path finding source: ${this.currentNode.name || this.currentNode.id}`);

        // Check if we can complete a path
        if (this.pathFindingMode.target) {
            this.findPath();
        }
    }

    /**
     * End path finding mode (set as target)
     */
    endPathFinding() {
        if (!this.pathFindingMode) {
            this.pathFindingMode = {};
        }

        this.pathFindingMode.target = this.currentNode;

        // Visual indicator
        document.dispatchEvent(new CustomEvent('setPathFindingTarget', {
            detail: { targetNode: this.currentNode }
        }));

        console.log(`🎯 Set path finding target: ${this.currentNode.name || this.currentNode.id}`);

        // Check if we can complete a path
        if (this.pathFindingMode.source) {
            this.findPath();
        }
    }

    /**
     * Find and highlight shortest path
     */
    findPath() {
        if (!this.pathFindingMode?.source || !this.pathFindingMode?.target) {
            return;
        }

        const path = search.findPath(
            this.pathFindingMode.source.id,
            this.pathFindingMode.target.id
        );

        if (path) {
            document.dispatchEvent(new CustomEvent('showShortestPath', {
                detail: {
                    path,
                    sourceNode: this.pathFindingMode.source,
                    targetNode: this.pathFindingMode.target
                }
            }));

            console.log(`🛣️ Found path: ${path.length} nodes, ${path.length - 1} edges`);
        } else {
            document.dispatchEvent(new CustomEvent('pathNotFound', {
                detail: {
                    sourceNode: this.pathFindingMode.source,
                    targetNode: this.pathFindingMode.target
                }
            }));

            console.log('❌ No path found between nodes');
        }
    }

    /**
     * Clear all path finding highlights
     */
    clearPaths() {
        this.pathFindingMode = null;

        document.dispatchEvent(new CustomEvent('clearPathHighlights'));

        console.log('🧹 Cleared all path highlights');
    }

    /**
     * Show detailed node information
     */
    showNodeDetails() {
        // Select the node to update details panel
        store.setState({ selectedNode: this.currentNode });

        // Also emit event for any custom detail views
        document.dispatchEvent(new CustomEvent('showNodeDetails', {
            detail: {
                node: this.currentNode,
                expandedView: true
            }
        }));

        console.log(`ℹ️ Showing details for: ${this.currentNode.name || this.currentNode.id}`);
    }

    /**
     * Analyze node centrality measures
     */
    analyzeCentrality() {
        const { nodes, edges } = store.getState();

        // Calculate basic centrality measures
        const degree = edges.filter(e =>
            e.source === this.currentNode.id || e.target === this.currentNode.id
        ).length;

        const neighbors = search.findConnectedNodes(this.currentNode.id, { maxDepth: 1 });
        const twoHopNeighbors = search.findConnectedNodes(this.currentNode.id, { maxDepth: 2 });

        const centralityData = {
            node: this.currentNode,
            degree,
            closeness: neighbors.length / (nodes.length - 1), // Simplified closeness
            betweenness: this.calculateBetweennessCentrality(this.currentNode.id),
            clustering: this.calculateClusteringCoefficient(this.currentNode.id),
            neighborhoodSizes: {
                oneHop: neighbors.length,
                twoHop: twoHopNeighbors.length
            }
        };

        document.dispatchEvent(new CustomEvent('showCentralityAnalysis', {
            detail: centralityData
        }));

        console.log(`📈 Centrality analysis for ${this.currentNode.name || this.currentNode.id}:`, centralityData);
    }

    /**
     * Export neighborhood data
     */
    exportNeighborhood() {
        const neighbors = search.findConnectedNodes(this.currentNode.id, { maxDepth: 2 });
        const { edges } = store.getState();

        // Get edges within the neighborhood
        const nodeIds = new Set([this.currentNode.id, ...neighbors.map(n => n.id)]);
        const neighborhoodEdges = edges.filter(edge =>
            nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );

        const exportData = {
            centerNode: this.currentNode,
            neighbors,
            edges: neighborhoodEdges,
            metadata: {
                exportedAt: new Date().toISOString(),
                totalNodes: neighbors.length + 1,
                totalEdges: neighborhoodEdges.length
            }
        };

        document.dispatchEvent(new CustomEvent('exportNeighborhoodData', {
            detail: exportData
        }));

        // Also trigger download
        this.downloadNeighborhoodData(exportData);

        console.log(`💾 Exported neighborhood data: ${exportData.metadata.totalNodes} nodes, ${exportData.metadata.totalEdges} edges`);
    }

    /**
     * Download neighborhood data as JSON
     */
    downloadNeighborhoodData(data) {
        const filename = `neighborhood_${this.currentNode.id}_${Date.now()}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
     * Clear exploration history
     */
    clearExploration() {
        this.exploredNodes.clear();
        this.explorationHistory = [];

        // Clear all visual highlights
        document.dispatchEvent(new CustomEvent('clearAllHighlights'));

        this.updateExplorationCount();

        console.log('🧹 Cleared exploration history');
    }

    /**
     * Handle keyboard shortcuts in context menu
     */
    handleKeyboardShortcut(e) {
        const key = e.key.toLowerCase();

        const actionMap = {
            '1': 'show-1-hop',
            '2': 'show-2-hop',
            'a': 'show-all-connected',
            'f': 'focus-on-node',
            'h': 'hide-others',
            't': 'filter-by-type',
            'p': 'start-path-finding',
            'e': 'end-path-finding',
            'c': 'clear-paths',
            'i': 'show-node-details',
            'n': 'analyze-centrality',
            's': 'export-neighborhood'
        };

        if (actionMap[key]) {
            e.preventDefault();
            this.handleMenuAction(actionMap[key]);
        } else if (e.key === 'Escape') {
            this.hideContextMenu();
        }
    }

    /**
     * Highlight neighborhood visually
     */
    highlightNeighborhood(centerNode, neighbors, hops) {
        // This would integrate with the graph visualization
        const highlightClass = hops === 'all' ? 'neighborhood-all' : `neighborhood-${hops}-hop`;

        // Emit event for graph to handle visual highlighting
        document.dispatchEvent(new CustomEvent('highlightGraphNeighborhood', {
            detail: {
                centerNode,
                neighbors,
                highlightClass,
                hops
            }
        }));
    }

    /**
     * Update exploration count display
     */
    updateExplorationCount() {
        const countElement = this.contextMenu.querySelector('.explored-count');
        if (countElement) {
            countElement.textContent = this.exploredNodes.size;
        }
    }

    /**
     * Get node icon based on type
     */
    getNodeIcon(nodeType) {
        const icons = {
            'faa_stars_terminal': '🏢',
            'approach_control': '🛫',
            'faa_eram_terminal': '📡',
            'geographic_location': '📍',
            'radar_equipment': '📊',
            'communication_equipment': '📻'
        };

        return icons[nodeType] || '◉';
    }

    /**
     * Extract node data from DOM element
     */
    getNodeFromElement(element) {
        // This would depend on how the graph is implemented
        const nodeId = element.dataset.nodeId || element.getAttribute('data-node-id');
        if (!nodeId) {return null;}

        const { nodes } = store.getState();
        return nodes.find(node => node.id.toString() === nodeId.toString());
    }

    /**
     * Calculate betweenness centrality (simplified)
     */
    calculateBetweennessCentrality(nodeId) {
        // Simplified betweenness calculation
        // In a full implementation, this would use proper shortest-path algorithms
        const neighbors = search.findConnectedNodes(nodeId, { maxDepth: 1 });
        return neighbors.length > 1 ? neighbors.length / 10 : 0; // Placeholder
    }

    /**
     * Calculate clustering coefficient
     */
    calculateClusteringCoefficient(nodeId) {
        const neighbors = search.findConnectedNodes(nodeId, { maxDepth: 1 });
        if (neighbors.length < 2) {return 0;}

        const { edges } = store.getState();
        const neighborIds = new Set(neighbors.map(n => n.id));

        // Count edges between neighbors
        let edgesBetweenNeighbors = 0;
        edges.forEach(edge => {
            if (neighborIds.has(edge.source) && neighborIds.has(edge.target)) {
                edgesBetweenNeighbors++;
            }
        });

        const possibleEdges = (neighbors.length * (neighbors.length - 1)) / 2;
        return possibleEdges > 0 ? edgesBetweenNeighbors / possibleEdges : 0;
    }

    /**
     * Get exploration history
     */
    getExplorationHistory() {
        return [...this.explorationHistory];
    }

    /**
     * Get currently explored nodes
     */
    getExploredNodes() {
        return new Set(this.exploredNodes);
    }

    /**
     * Destroy the neighborhood explorer
     */
    destroy() {
        if (this.contextMenu && document.body.contains(this.contextMenu)) {
            document.body.removeChild(this.contextMenu);
        }

        this.exploredNodes.clear();
        this.explorationHistory = [];
        this.pathFindingMode = null;
        this.currentNode = null;
    }
}

export default NeighborhoodExplorer;
