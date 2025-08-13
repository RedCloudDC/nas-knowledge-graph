/**
 * Enhanced Graph View Component
 * Advanced D3.js-based graph renderer with comprehensive features
 */
import { store } from '../core/store.js';

export class GraphView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.edges = [];
        this.hiddenNodes = new Set();
        this.clusteredNodes = new Map(); // Maps parent -> [children]

        // D3 selections
        this.nodeSelection = null;
        this.edgeSelection = null;
        this.nodeGroup = null;
        this.edgeGroup = null;
        this.linkGroup = null;
        this.labelGroup = null;

        // View state
        this.zoom = null;
        this.transform = { x: 0, y: 0, k: 1 };
        this.tooltip = null;

        // Interaction state
        this.selectedNodes = new Set();
        this.highlightedNodes = new Set();
        this.isDragging = false;

        // Configuration with enhanced visual settings
        this.config = {
            width: 800,
            height: 600,
            nodeRadius: {
                small: 12,
                medium: 18,
                large: 24,
                cluster: 30
            },
            edgeLength: {
                default: 100,
                cluster: 150,
                strong: 80
            },
            nodeColors: {
                'faa_stars_terminal': '#e74c3c',
                'approach_control': '#3498db',
                'faa_eram_terminal': '#2ecc71',
                'geographic_location': '#f39c12',
                'radar_equipment': '#9b59b6',
                'communication_equipment': '#e67e22',
                'default': '#95a5a6',
                'cluster': '#34495e'
            },
            nodeIcons: {
                'faa_stars_terminal': '🏢',
                'approach_control': '🛫',
                'faa_eram_terminal': '📡',
                'geographic_location': '📍',
                'radar_equipment': '📊',
                'communication_equipment': '📻',
                'default': '◉',
                'cluster': '⚪'
            },
            edgeTypes: {
                'LOCATED_AT': { color: '#3498db', width: 2 },
                'CONNECTED_TO': { color: '#2ecc71', width: 2 },
                'CONTAINS': { color: '#e74c3c', width: 3 },
                'default': { color: '#bdc3c7', width: 1.5 }
            },
            forces: {
                charge: -800,
                collide: 35,
                centerStrength: 0.1,
                linkStrength: 0.7
            },
            transitions: {
                duration: 750,
                ease: 'cubic-in-out'
            },
            clustering: {
                enabled: true,
                threshold: 5, // min connections to create cluster
                maxDistance: 100
            }
        };

        this.init();
        this.setupSubscriptions();
    }

    /**
     * Initialize the graph view
     */
    init() {
        if (!this.container) {
            throw new Error(`Container with ID '${this.containerId}' not found`);
        }

        // Clear container
        this.container.innerHTML = '';

        // Create SVG
        this.svg = this.createSVG();

        // Create groups for edges and nodes (edges first for z-ordering)
        this.edgeGroup = this.svg.append('g').attr('class', 'edges');
        this.nodeGroup = this.svg.append('g').attr('class', 'nodes');

        // Setup zoom behavior
        this.setupZoom();

        // Initialize simulation
        this.setupSimulation();

        console.log('GraphView initialized');
    }

    /**
     * Create SVG element
     */
    createSVG() {
        const svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
            .style('background-color', '#fafafa');

        return svg;
    }

    /**
     * Setup zoom behavior
     */
    setupZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.transform = event.transform;
                this.nodeGroup.attr('transform', event.transform);
                this.edgeGroup.attr('transform', event.transform);

                // Update store with zoom state
                store.setState({
                    graphView: {
                        ...store.getState().graphView,
                        zoom: event.transform.k,
                        center: { x: -event.transform.x, y: -event.transform.y }
                    }
                });
            });

        this.svg.call(this.zoom);
    }

    /**
     * Setup D3 force simulation
     */
    setupSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink()
                .id(d => d.id)
                .distance(this.config.edgeLength)
            )
            .force('charge', d3.forceManyBody()
                .strength(-300)
            )
            .force('center', d3.forceCenter(
                this.config.width / 2,
                this.config.height / 2
            ))
            .force('collision', d3.forceCollide()
                .radius(this.config.nodeRadius + 5)
            );

        this.simulation.on('tick', () => {
            this.updatePositions();
        });
    }

    /**
     * Setup store subscriptions
     */
    setupSubscriptions() {
        // Subscribe to node changes
        store.subscribe('nodes', (nodes) => {
            this.nodes = [...nodes];
            this.updateNodes();
        });

        // Subscribe to edge changes
        store.subscribe('edges', (edges) => {
            this.edges = [...edges];
            this.updateEdges();
        });

        // Subscribe to selection changes
        store.subscribe('selectedNode', (selectedNode) => {
            this.highlightNode(selectedNode);
        });

        // Subscribe to layout changes
        store.subscribe('graphView', (graphView) => {
            this.handleLayoutChange(graphView.layout);
        });
    }

    /**
     * Enhanced node visualization with smooth transitions and clustering
     */
    updateNodes() {
        // Filter visible nodes (excluding hidden ones)
        const visibleNodes = this.nodes.filter(n => !this.hiddenNodes.has(n.id));

        // Bind data with smooth transitions
        this.nodeSelection = this.nodeGroup
            .selectAll('.node')
            .data(visibleNodes, d => d.id);

        // Remove old nodes with smooth exit transition
        this.nodeSelection.exit()
            .transition()
            .duration(this.config.transitions.duration)
            .style('opacity', 0)
            .attr('transform', d => `translate(${d.x},${d.y}) scale(0)`)
            .remove();

        // Add new nodes with smooth enter transition
        const nodeEnter = this.nodeSelection
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x || this.config.width/2},${d.y || this.config.height/2}) scale(0)`)
            .style('opacity', 0)
            .call(this.setupNodeDrag())
            .call(this.setupNodeInteractions());

        // Enhanced node structure with icons and labels
        this.createNodeElements(nodeEnter);

        // Merge enter and update selections
        this.nodeSelection = nodeEnter.merge(this.nodeSelection);

        // Animate new nodes in
        nodeEnter
            .transition()
            .duration(this.config.transitions.duration)
            .style('opacity', 1)
            .attr('transform', d => `translate(${d.x || this.config.width/2},${d.y || this.config.height/2}) scale(1)`);

        // Update existing nodes
        this.nodeSelection
            .select('circle')
            .transition()
            .duration(this.config.transitions.duration / 2)
            .attr('r', d => this.getNodeRadius(d))
            .attr('fill', d => this.getNodeColor(d.type))
            .attr('stroke-width', d => this.selectedNodes.has(d.id) ? 4 : 2);

        // Update simulation with current nodes
        this.simulation.nodes(visibleNodes);
        this.simulation.alpha(0.3).restart();
    }

    /**
     * Update edge visualization
     */
    updateEdges() {
        // Bind data
        this.edgeSelection = this.edgeGroup
            .selectAll('.edge')
            .data(this.edges, d => d.id);

        // Remove old edges
        this.edgeSelection.exit().remove();

        // Add new edges
        const edgeEnter = this.edgeSelection
            .enter()
            .append('g')
            .attr('class', 'edge');

        // Add line
        edgeEnter.append('line')
            .attr('stroke', '#bdc3c7')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');

        // Add label
        edgeEnter.append('text')
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#7f8c8d')
            .style('pointer-events', 'none')
            .text(d => d.label);

        // Merge selections
        this.edgeSelection = edgeEnter.merge(this.edgeSelection);

        // Setup click handlers
        this.edgeSelection
            .on('click', (event, d) => {
                event.stopPropagation();
                this.selectEdge(d);
            });

        // Update simulation links
        this.simulation.force('link').links(this.edges);
        this.simulation.alpha(0.3).restart();

        // Add arrow markers
        this.addArrowMarkers();
    }

    /**
     * Update positions during simulation
     */
    updatePositions() {
        // Update node positions
        if (this.nodeSelection) {
            this.nodeSelection
                .attr('transform', d => `translate(${d.x},${d.y})`);
        }

        // Update edge positions
        if (this.edgeSelection) {
            this.edgeSelection.select('line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            this.edgeSelection.select('text')
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);
        }
    }

    /**
     * Setup node dragging
     */
    setupNodeDrag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) {this.simulation.alphaTarget(0.3).restart();}
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) {this.simulation.alphaTarget(0);}
                d.fx = null;
                d.fy = null;
            });
    }

    /**
     * Add arrow markers for directed edges
     */
    addArrowMarkers() {
        const defs = this.svg.select('defs').empty()
            ? this.svg.append('defs')
            : this.svg.select('defs');

        if (defs.select('#arrowhead').empty()) {
            defs.append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 13)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 13)
                .attr('markerHeight', 13)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#bdc3c7')
                .style('stroke', 'none');
        }
    }

    /**
     * Get node color based on type
     */
    getNodeColor(type) {
        return this.config.nodeColors[type] || this.config.nodeColors.default;
    }

    /**
     * Select a node
     */
    selectNode(node) {
        store.setState({ selectedNode: node });
    }

    /**
     * Select an edge
     */
    selectEdge(edge) {
        store.setState({ selectedEdge: edge });
    }

    /**
     * Highlight selected node
     */
    highlightNode(selectedNode) {
        if (this.nodeSelection) {
            this.nodeSelection.select('circle')
                .attr('stroke', d =>
                    selectedNode && d.id === selectedNode.id ? '#f39c12' : '#2c3e50'
                )
                .attr('stroke-width', d =>
                    selectedNode && d.id === selectedNode.id ? 4 : 2
                );
        }
    }

    /**
     * Show node tooltip
     */
    showNodeTooltip(event, node) {
        // Simple tooltip implementation
        const tooltip = d3.select('body')
            .selectAll('.graph-tooltip')
            .data([node]);

        tooltip.enter()
            .append('div')
            .attr('class', 'graph-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        d3.select('.graph-tooltip')
            .html(`
                <strong>${node.label}</strong><br/>
                Type: ${node.type}<br/>
                ID: ${node.id}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .style('opacity', 1);
    }

    /**
     * Hide node tooltip
     */
    hideNodeTooltip() {
        d3.select('.graph-tooltip').remove();
    }

    /**
     * Handle layout changes
     */
    handleLayoutChange(layout) {
        if (layout === 'force') {
            this.simulation.alpha(0.3).restart();
        }
    }

    /**
     * Resize the view
     */
    resize(width, height) {
        this.config.width = width || this.config.width;
        this.config.height = height || this.config.height;

        this.svg
            .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`);

        this.simulation
            .force('center', d3.forceCenter(
                this.config.width / 2,
                this.config.height / 2
            ))
            .alpha(0.3)
            .restart();
    }

    /**
     * Reset zoom and pan
     */
    resetView() {
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity);
    }

    /**
     * Fit graph to view
     */
    fitToView() {
        if (this.nodes.length === 0) {return;}

        const bounds = this.getGraphBounds();
        const fullWidth = this.config.width;
        const fullHeight = this.config.height;
        const width = bounds.width;
        const height = bounds.height;
        const midX = bounds.x + width / 2;
        const midY = bounds.y + height / 2;

        if (width === 0 || height === 0) {return;}

        const scale = Math.min(fullWidth / width, fullHeight / height) * 0.9;
        const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }

    /**
     * Get bounds of all nodes
     */
    getGraphBounds() {
        const xs = this.nodes.map(d => d.x);
        const ys = this.nodes.map(d => d.y);

        return {
            x: Math.min(...xs) - this.config.nodeRadius,
            y: Math.min(...ys) - this.config.nodeRadius,
            width: Math.max(...xs) - Math.min(...xs) + 2 * this.config.nodeRadius,
            height: Math.max(...ys) - Math.min(...ys) + 2 * this.config.nodeRadius
        };
    }

    /**
     * Create enhanced node elements with icons and improved styling
     */
    createNodeElements(nodeEnter) {
        // Main circle with gradient
        nodeEnter.append('circle')
            .attr('class', 'node-circle')
            .attr('r', d => this.getNodeRadius(d))
            .attr('fill', d => this.getNodeColor(d.type))
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');

        // Icon text (emoji or symbol)
        nodeEnter.append('text')
            .attr('class', 'node-icon')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', d => this.getNodeRadius(d) + 'px')
            .style('fill', 'white')
            .style('pointer-events', 'none')
            .style('user-select', 'none')
            .text(d => this.getNodeIcon(d.type));

        // Node label
        nodeEnter.append('text')
            .attr('class', 'node-label')
            .attr('dy', d => this.getNodeRadius(d) + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .style('pointer-events', 'none')
            .style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)')
            .text(d => this.truncateLabel(d.name || d.label || d.id));

        // Cluster indicator (for clustered nodes)
        nodeEnter.append('circle')
            .attr('class', 'cluster-indicator')
            .attr('r', 6)
            .attr('cx', d => this.getNodeRadius(d) - 8)
            .attr('cy', -this.getNodeRadius(d) + 8)
            .attr('fill', '#f39c12')
            .attr('stroke', '#e67e22')
            .attr('stroke-width', 1)
            .style('opacity', d => this.clusteredNodes.has(d.id) ? 1 : 0)
            .style('pointer-events', 'none');

        // Connection count badge
        nodeEnter.append('text')
            .attr('class', 'connection-count')
            .attr('x', d => this.getNodeRadius(d) - 8)
            .attr('y', -this.getNodeRadius(d) + 12)
            .attr('text-anchor', 'middle')
            .style('font-size', '8px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .style('pointer-events', 'none')
            .style('opacity', d => this.clusteredNodes.has(d.id) ? 1 : 0)
            .text(d => this.getNodeDegree(d));
    }

    /**
     * Setup enhanced node interactions
     */
    setupNodeInteractions() {
        return (selection) => {
            selection
                .on('click', (event, d) => {
                    event.stopPropagation();
                    this.handleNodeClick(event, d);
                })
                .on('dblclick', (event, d) => {
                    event.stopPropagation();
                    this.handleNodeDoubleClick(event, d);
                })
                .on('mouseover', (event, d) => {
                    this.handleNodeHover(event, d);
                })
                .on('mouseout', (event, d) => {
                    this.handleNodeHoverEnd(event, d);
                })
                .on('contextmenu', (event, d) => {
                    event.preventDefault();
                    this.handleNodeRightClick(event, d);
                });
        };
    }

    /**
     * Handle single click on node
     */
    handleNodeClick(event, node) {
        // Toggle selection
        if (this.selectedNodes.has(node.id)) {
            this.selectedNodes.delete(node.id);
            store.setState({ selectedNode: null });
        } else {
            // Clear previous selection if not holding Ctrl/Cmd
            if (!event.ctrlKey && !event.metaKey) {
                this.selectedNodes.clear();
            }
            this.selectedNodes.add(node.id);
            store.setState({ selectedNode: node });
        }

        this.updateNodeSelection();
        this.highlightConnectedNodes(node.id);
    }

    /**
     * Handle double click on node - expand/collapse clusters
     */
    handleNodeDoubleClick(event, node) {
        if (this.clusteredNodes.has(node.id)) {
            this.expandCluster(node.id);
        } else if (this.canClusterNode(node)) {
            this.collapseIntoCluster(node.id);
        } else {
            // Show detailed neighbors
            this.showNodeNeighbors(node.id, 2);
        }
    }

    /**
     * Handle node hover - show enhanced tooltip and highlight
     */
    handleNodeHover(event, node) {
        this.showEnhancedTooltip(event, node);
        this.highlightNode(node, true);
        this.highlightConnectedEdges(node.id, true);
    }

    /**
     * Handle node hover end
     */
    handleNodeHoverEnd(event, node) {
        this.hideEnhancedTooltip();
        if (!this.selectedNodes.has(node.id)) {
            this.highlightNode(node, false);
        }
        this.highlightConnectedEdges(node.id, false);
    }

    /**
     * Handle right click - show context menu
     */
    handleNodeRightClick(event, node) {
        this.showContextMenu(event, node);
    }

    /**
     * Get appropriate node radius based on type and connections
     */
    getNodeRadius(node) {
        const degree = this.getNodeDegree(node);
        const baseRadius = this.config.nodeRadius.medium;

        if (this.clusteredNodes.has(node.id)) {
            return this.config.nodeRadius.cluster;
        }

        // Scale radius based on connections
        if (degree > 10) {return this.config.nodeRadius.large;}
        if (degree < 3) {return this.config.nodeRadius.small;}
        return baseRadius;
    }

    /**
     * Get node icon based on type
     */
    getNodeIcon(type) {
        return this.config.nodeIcons[type] || this.config.nodeIcons.default;
    }

    /**
     * Get node degree (number of connections)
     */
    getNodeDegree(node) {
        return this.edges.filter(edge =>
            edge.source === node.id ||
            edge.target === node.id ||
            edge.source.id === node.id ||
            edge.target.id === node.id
        ).length;
    }

    /**
     * Truncate long labels
     */
    truncateLabel(label, maxLength = 20) {
        return label && label.length > maxLength ?
            label.substring(0, maxLength) + '...' : label;
    }

    /**
     * Expand cluster to show hidden nodes
     */
    expandCluster(clusterId) {
        const hiddenNodes = this.clusteredNodes.get(clusterId);
        if (!hiddenNodes) {return;}

        // Remove nodes from hidden set
        hiddenNodes.forEach(nodeId => {
            this.hiddenNodes.delete(nodeId);
        });

        // Remove cluster
        this.clusteredNodes.delete(clusterId);

        // Animate expansion
        this.updateNodes();
        this.updateEdges();

        // Focus on expanded area
        this.focusOnNodes(hiddenNodes);
    }

    /**
     * Collapse nodes into a cluster
     */
    collapseIntoCluster(centerNodeId) {
        const neighbors = this.getConnectedNodes(centerNodeId, 1);
        if (neighbors.length < this.config.clustering.threshold) {return;}

        // Find nodes to cluster based on proximity
        const nodesToCluster = this.findClusterCandidates(centerNodeId, neighbors);

        if (nodesToCluster.length > 0) {
            // Hide clustered nodes
            nodesToCluster.forEach(nodeId => {
                this.hiddenNodes.add(nodeId);
            });

            // Mark as clustered
            this.clusteredNodes.set(centerNodeId, nodesToCluster);

            // Update visualization
            this.updateNodes();
            this.updateEdges();
        }
    }

    /**
     * Show enhanced tooltip with detailed information
     */
    showEnhancedTooltip(event, node) {
        const tooltip = d3.select('body')
            .selectAll('.enhanced-tooltip')
            .data([node]);

        const tooltipEnter = tooltip.enter()
            .append('div')
            .attr('class', 'enhanced-tooltip')
            .style('position', 'absolute')
            .style('background', 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(44,62,80,0.9))')
            .style('color', 'white')
            .style('padding', '12px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '2000')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
            .style('border', '1px solid rgba(255,255,255,0.1)')
            .style('max-width', '300px')
            .style('opacity', 0);

        const connections = this.getNodeDegree(node);
        const nodeType = node.type || 'unknown';

        tooltipEnter.merge(tooltip)
            .html(`
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 20px; margin-right: 8px;">${this.getNodeIcon(nodeType)}</span>
                    <strong style="font-size: 16px;">${node.name || node.label || node.id}</strong>
                </div>
                <div style="margin-bottom: 6px;"><strong>Type:</strong> ${nodeType}</div>
                <div style="margin-bottom: 6px;"><strong>ID:</strong> ${node.id}</div>
                <div style="margin-bottom: 6px;"><strong>Connections:</strong> ${connections}</div>
                ${node.properties ? `<div style="margin-bottom: 6px;"><strong>Location:</strong> ${node.properties.city || 'Unknown'}</div>` : ''}
                ${this.clusteredNodes.has(node.id) ? '<div style="color: #f39c12; font-weight: bold;">📁 Cluster Node - Double-click to expand</div>' : ''}
                <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">Click to select • Double-click to expand</div>
            `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .transition()
            .duration(200)
            .style('opacity', 1);
    }

    /**
     * Hide enhanced tooltip
     */
    hideEnhancedTooltip() {
        d3.selectAll('.enhanced-tooltip')
            .transition()
            .duration(200)
            .style('opacity', 0)
            .remove();
    }

    /**
     * Highlight connected nodes
     */
    highlightConnectedNodes(nodeId, highlight = true) {
        const connectedNodeIds = this.getConnectedNodeIds(nodeId);

        if (this.nodeSelection) {
            this.nodeSelection
                .select('.node-circle')
                .style('stroke', d => {
                    if (d.id === nodeId || connectedNodeIds.has(d.id)) {
                        return highlight ? '#f39c12' : '#2c3e50';
                    }
                    return '#2c3e50';
                })
                .style('stroke-width', d => {
                    if (d.id === nodeId) {return highlight ? 5 : 2;}
                    if (connectedNodeIds.has(d.id)) {return highlight ? 3 : 2;}
                    return 2;
                });
        }
    }

    /**
     * Highlight connected edges
     */
    highlightConnectedEdges(nodeId, highlight = true) {
        if (this.edgeSelection) {
            this.edgeSelection
                .select('line')
                .style('stroke', d => {
                    const isConnected = d.source.id === nodeId || d.target.id === nodeId;
                    return isConnected && highlight ? '#f39c12' : this.getEdgeColor(d.type);
                })
                .style('stroke-width', d => {
                    const isConnected = d.source.id === nodeId || d.target.id === nodeId;
                    return isConnected && highlight ? 4 : this.getEdgeWidth(d.type);
                })
                .style('opacity', d => {
                    const isConnected = d.source.id === nodeId || d.target.id === nodeId;
                    return highlight ? (isConnected ? 1 : 0.3) : 1;
                });
        }
    }

    /**
     * Get connected node IDs
     */
    getConnectedNodeIds(nodeId) {
        const connected = new Set();
        this.edges.forEach(edge => {
            if (edge.source.id === nodeId || edge.source === nodeId) {
                connected.add(edge.target.id || edge.target);
            }
            if (edge.target.id === nodeId || edge.target === nodeId) {
                connected.add(edge.source.id || edge.source);
            }
        });
        return connected;
    }

    /**
     * Get edge color based on type
     */
    getEdgeColor(type) {
        return this.config.edgeTypes[type]?.color || this.config.edgeTypes.default.color;
    }

    /**
     * Get edge width based on type
     */
    getEdgeWidth(type) {
        return this.config.edgeTypes[type]?.width || this.config.edgeTypes.default.width;
    }

    /**
     * Update visual selection state
     */
    updateNodeSelection() {
        if (this.nodeSelection) {
            this.nodeSelection
                .select('.node-circle')
                .style('stroke', d => this.selectedNodes.has(d.id) ? '#f39c12' : '#2c3e50')
                .style('stroke-width', d => this.selectedNodes.has(d.id) ? 4 : 2);
        }
    }

    /**
     * Enhanced edge visualization with smooth transitions
     */
    updateEdges() {
        // Filter visible edges (connected to visible nodes)
        const visibleEdges = this.edges.filter(edge => {
            const sourceVisible = !this.hiddenNodes.has(edge.source.id || edge.source);
            const targetVisible = !this.hiddenNodes.has(edge.target.id || edge.target);
            return sourceVisible && targetVisible;
        });

        // Bind data with transitions
        this.edgeSelection = this.edgeGroup
            .selectAll('.edge')
            .data(visibleEdges, d => d.id);

        // Remove old edges with transition
        this.edgeSelection.exit()
            .transition()
            .duration(this.config.transitions.duration)
            .style('opacity', 0)
            .remove();

        // Add new edges
        const edgeEnter = this.edgeSelection
            .enter()
            .append('g')
            .attr('class', 'edge')
            .style('opacity', 0);

        // Create enhanced edge structure
        this.createEdgeElements(edgeEnter);

        // Merge selections
        this.edgeSelection = edgeEnter.merge(this.edgeSelection);

        // Animate new edges in
        edgeEnter
            .transition()
            .duration(this.config.transitions.duration)
            .style('opacity', 1);

        // Update simulation links
        this.simulation.force('link').links(visibleEdges);
        this.simulation.alpha(0.3).restart();

        // Update arrow markers
        this.addEnhancedArrowMarkers();
    }

    /**
     * Create enhanced edge elements
     */
    createEdgeElements(edgeEnter) {
        // Main edge line
        edgeEnter.append('line')
            .attr('class', 'edge-line')
            .attr('stroke', d => this.getEdgeColor(d.type))
            .attr('stroke-width', d => this.getEdgeWidth(d.type))
            .attr('marker-end', 'url(#arrowhead)')
            .style('opacity', 0.8);

        // Edge label background
        edgeEnter.append('rect')
            .attr('class', 'edge-label-bg')
            .attr('fill', 'rgba(255,255,255,0.9)')
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1)
            .attr('rx', 3)
            .style('opacity', 0);

        // Edge label text
        edgeEnter.append('text')
            .attr('class', 'edge-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .text(d => d.type || d.label || '');

        // Setup edge interactions
        edgeEnter
            .on('click', (event, d) => {
                event.stopPropagation();
                this.selectEdge(d);
            })
            .on('mouseover', (event, d) => {
                this.highlightEdge(d, true);
            })
            .on('mouseout', (event, d) => {
                this.highlightEdge(d, false);
            });
    }

    /**
     * Add enhanced arrow markers with different styles
     */
    addEnhancedArrowMarkers() {
        const defs = this.svg.select('defs').empty()
            ? this.svg.append('defs')
            : this.svg.select('defs');

        // Standard arrowhead
        if (defs.select('#arrowhead').empty()) {
            defs.append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 13)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 13)
                .attr('markerHeight', 13)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#bdc3c7')
                .style('stroke', 'none');
        }

        // Highlighted arrowhead
        if (defs.select('#arrowhead-highlight').empty()) {
            defs.append('marker')
                .attr('id', 'arrowhead-highlight')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 13)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 15)
                .attr('markerHeight', 15)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#f39c12')
                .style('stroke', 'none');
        }
    }

    /**
     * Highlight individual edge
     */
    highlightEdge(edge, highlight = true) {
        const edgeElement = this.edgeSelection.filter(d => d.id === edge.id);

        edgeElement.select('.edge-line')
            .style('stroke', highlight ? '#f39c12' : this.getEdgeColor(edge.type))
            .style('stroke-width', highlight ? this.getEdgeWidth(edge.type) + 2 : this.getEdgeWidth(edge.type))
            .attr('marker-end', highlight ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)');

        edgeElement.select('.edge-label')
            .style('opacity', highlight ? 1 : 0);

        edgeElement.select('.edge-label-bg')
            .style('opacity', highlight ? 0.9 : 0);
    }

    /**
     * Destroy the graph view
     */
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        // Clean up tooltips
        d3.selectAll('.graph-tooltip, .enhanced-tooltip').remove();

        // Clear internal state
        this.hiddenNodes.clear();
        this.clusteredNodes.clear();
        this.selectedNodes.clear();
        this.highlightedNodes.clear();
    }
}

// Mock D3 functionality for development without D3 library
// In production, this would be replaced by importing actual D3
const d3 = window.d3 || {
    select: (selector) => ({
        append: (tag) => ({
            attr: () => ({ style: () => ({}) }),
            style: () => ({})
        }),
        selectAll: () => ({ data: () => ({ enter: () => ({}), exit: () => ({}) }) }),
        call: () => ({}),
        transition: () => ({ duration: () => ({ call: () => ({}) }) })
    }),
    forceSimulation: () => ({
        force: () => ({}),
        nodes: () => ({}),
        alpha: () => ({ restart: () => ({}) }),
        alphaTarget: () => ({ restart: () => ({}) }),
        stop: () => ({}),
        on: () => ({})
    }),
    forceLink: () => ({ id: () => ({}), distance: () => ({}) }),
    forceManyBody: () => ({ strength: () => ({}) }),
    forceCenter: () => ({}),
    forceCollide: () => ({ radius: () => ({}) }),
    zoom: () => ({ scaleExtent: () => ({ on: () => ({}) }) }),
    drag: () => ({ on: () => ({}) }),
    zoomIdentity: { translate: () => ({ scale: () => ({}) }) }
};

// Export for use
export { d3 };
