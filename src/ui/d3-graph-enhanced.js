/**
 * Complete D3.js Enhanced Graph Visualization
 * Full-featured implementation with clustering, smooth transitions, and advanced interactions
 */

import { store } from '../core/store.js';

export class D3EnhancedGraphView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);

        if (!this.container) {
            throw new Error(`Container with ID '${this.containerId}' not found`);
        }

        // Initialize D3 if available
        this.d3 = window.d3;
        if (!this.d3) {
            console.warn('D3.js not loaded. Loading from CDN...');
            this.loadD3().then(() => {
                this.init();
            });
            return;
        }

        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.edges = [];
        this.hiddenNodes = new Set();
        this.clusteredNodes = new Map();

        // D3 selections
        this.nodeSelection = null;
        this.edgeSelection = null;
        this.nodeGroup = null;
        this.edgeGroup = null;

        // Interaction state
        this.selectedNodes = new Set();
        this.highlightedNodes = new Set();
        this.focusedNodeIndex = -1;
        this.keyboardNavigationMode = false;
        this.isDragging = false;
        this.transform = { x: 0, y: 0, k: 1 };

        // Accessibility features
        this.focusableNodes = [];
        this.nodeDescriptions = new Map();

        // Enhanced configuration
        this.config = {
            width: 1000,
            height: 700,
            nodeRadius: {
                small: 15,
                medium: 20,
                large: 28,
                cluster: 35
            },
            edgeLength: {
                default: 120,
                cluster: 180,
                strong: 90
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
                'LOCATED_AT': { color: '#3498db', width: 2.5, dash: null },
                'CONNECTED_TO': { color: '#2ecc71', width: 2, dash: null },
                'CONTAINS': { color: '#e74c3c', width: 3, dash: null },
                'default': { color: '#bdc3c7', width: 1.8, dash: null }
            },
            forces: {
                charge: -1200,
                chargeDistance: 400,
                collide: 40,
                centerStrength: 0.05,
                linkStrength: 0.8,
                linkDistance: 120
            },
            transitions: {
                duration: 900,
                stagger: 50,
                ease: this.d3?.easeCubicInOut || 'cubic-in-out'
            },
            clustering: {
                enabled: true,
                threshold: 4,
                maxDistance: 150,
                minClusterSize: 3
            },
            performance: {
                maxSimulationIterations: 300, // Cap simulation iterations
                simulationCooldown: 0.1, // Stop early when energy is low
                renderThrottle: 16, // ~60fps for rendering
                batchSize: 100, // Process nodes in batches
                enableLOD: true, // Level of detail rendering
                maxVisibleNodes: 1000, // Limit visible nodes for performance
                useOffscreen: false, // Use offscreen canvas for heavy operations
                enableWebGL: false // Use WebGL for better performance (if available)
            }
        };

        // Performance monitoring
        this.performanceStats = {
            frameCount: 0,
            lastFpsUpdate: performance.now(),
            fps: 0,
            renderTime: 0,
            simulationIterations: 0
        };

        // Animation frame management
        this.animationFrameId = null;
        this.isAnimating = false;
        this.pendingUpdates = new Set();

        // Level of detail management
        this.lodNodes = new Map();
        this.lodEdges = new Map();
        this.currentZoomLevel = 1;

        this.init();
        this.setupSubscriptions();
        this.setupAccessibilityFeatures();
    }

    /**
     * Load D3.js from CDN if not available
     */
    async loadD3() {
        return new Promise((resolve, reject) => {
            if (window.d3) {
                this.d3 = window.d3;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            script.onload = () => {
                this.d3 = window.d3;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize the enhanced graph view
     */
    init() {
        if (!this.d3) {
            console.error('D3.js not available');
            return;
        }

        // Clear container
        this.container.innerHTML = '';

        // Create responsive SVG
        this.createResponsiveSVG();

        // Setup zoom and pan
        this.setupZoomBehavior();

        // Initialize force simulation
        this.setupForceSimulation();

        // Create definition section for patterns and gradients
        this.createDefinitions();

        console.log('D3 Enhanced Graph View initialized');
    }

    /**
     * Create responsive SVG container
     */
    createResponsiveSVG() {
        const containerRect = this.container.getBoundingClientRect();
        this.config.width = containerRect.width || this.config.width;
        this.config.height = containerRect.height || this.config.height;

        this.svg = this.d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
            .style('background', 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)')
            .style('border-radius', '8px');

        // Create main group for zoomable content
        this.zoomGroup = this.svg.append('g').attr('class', 'zoom-group');

        // Create ordered groups for proper layering
        this.edgeGroup = this.zoomGroup.append('g').attr('class', 'edges');
        this.nodeGroup = this.zoomGroup.append('g').attr('class', 'nodes');
    }

    /**
     * Setup enhanced zoom and pan behavior
     */
    setupZoomBehavior() {
        this.zoom = this.d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                this.transform = event.transform;
                this.zoomGroup.attr('transform', event.transform);

                // Update store with zoom state
                store.setState({
                    graphView: {
                        ...store.getState().graphView,
                        zoom: event.transform.k,
                        center: { x: -event.transform.x, y: -event.transform.y }
                    }
                });

                // Adjust visual elements based on zoom level
                this.adjustElementsForZoom(event.transform.k);
            });

        this.svg.call(this.zoom);

        // Double-click to reset zoom
        this.svg.on('dblclick.zoom', () => {
            this.resetView();
        });

        // Keyboard navigation for graph container
        this.setupGraphKeyboardNavigation();
    }

    /**
     * Setup advanced force simulation with performance optimizations
     */
    setupForceSimulation() {
        this.simulation = this.d3.forceSimulation()
            .force('link', this.d3.forceLink()
                .id(d => d.id)
                .distance(d => this.getLinkDistance(d))
                .strength(this.config.forces.linkStrength)
            )
            .force('charge', this.d3.forceManyBody()
                .strength(this.config.forces.charge)
                .distanceMax(this.config.forces.chargeDistance)
            )
            .force('center', this.d3.forceCenter(
                this.config.width / 2,
                this.config.height / 2
            ).strength(this.config.forces.centerStrength))
            .force('collision', this.d3.forceCollide()
                .radius(d => this.getNodeRadius(d) + this.config.forces.collide)
                .strength(0.8)
            )
            .force('x', this.d3.forceX(this.config.width / 2).strength(0.02))
            .force('y', this.d3.forceY(this.config.height / 2).strength(0.02));

        // Performance-optimized tick handling
        this.simulation.on('tick', () => {
            this.handleSimulationTick();
        });

        // Monitor simulation performance
        this.simulation.on('end', () => {
            console.log(`Simulation completed in ${this.performanceStats.simulationIterations} iterations`);
        });

        // Cap simulation iterations for performance
        this.simulationIterationCount = 0;
    }

    /**
     * Optimized simulation tick handling with requestAnimationFrame
     */
    handleSimulationTick() {
        this.simulationIterationCount++;
        this.performanceStats.simulationIterations = this.simulationIterationCount;

        // Cap simulation iterations
        if (this.simulationIterationCount > this.config.performance.maxSimulationIterations) {
            this.simulation.stop();
            console.log('Simulation stopped due to iteration limit');
            return;
        }

        // Early termination based on energy
        if (this.simulation.alpha() < this.config.performance.simulationCooldown) {
            this.simulation.stop();
            console.log('Simulation stopped due to low energy');
            return;
        }

        // Use requestAnimationFrame for smooth updates
        if (!this.isAnimating) {
            this.isAnimating = true;

            this.animationFrameId = requestAnimationFrame(() => {
                const startTime = performance.now();

                this.updatePositionsOptimized();

                const endTime = performance.now();
                this.performanceStats.renderTime = endTime - startTime;

                this.updateFPS();
                this.isAnimating = false;
            });
        }
    }

    /**
     * Optimized position updates with batching
     */
    updatePositionsOptimized() {
        const batchSize = this.config.performance.batchSize;

        // Update nodes in batches
        if (this.nodeSelection) {
            const nodeData = this.nodeSelection.data();

            // Process nodes in batches to avoid blocking
            for (let i = 0; i < nodeData.length; i += batchSize) {
                const batch = nodeData.slice(i, i + batchSize);

                // Update positions for this batch
                this.nodeSelection
                    .filter((d, index) => index >= i && index < i + batchSize)
                    .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
            }
        }

        // Update edges with level of detail
        if (this.edgeSelection) {
            this.updateEdgePositionsLOD();
        }
    }

    /**
     * Level of detail edge position updates
     */
    updateEdgePositionsLOD() {
        const currentZoom = this.transform.k;

        if (this.config.performance.enableLOD) {
            // Only update visible edges at low zoom levels
            if (currentZoom < 0.5) {
                // At very low zoom, only update major edges
                this.edgeSelection
                    .filter(d => d.type === 'CONTAINS' || d.type === 'CONNECTED_TO')
                    .select('.edge-line')
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
            } else {
                // At normal zoom, update all edges
                this.edgeSelection.select('.edge-line')
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                this.edgeSelection.select('.edge-bg')
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                // Only show edge labels at high zoom
                if (currentZoom > 1.5) {
                    this.edgeSelection.select('.edge-label-group')
                        .style('opacity', 1)
                        .attr('transform', d => {
                            const midX = (d.source.x + d.target.x) / 2;
                            const midY = (d.source.y + d.target.y) / 2;
                            const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
                            return `translate(${midX},${midY}) rotate(${angle * 180 / Math.PI})`;
                        });
                } else {
                    this.edgeSelection.select('.edge-label-group')
                        .style('opacity', 0);
                }
            }
        } else {
            // Standard update without LOD
            this.updatePositions();
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS() {
        this.performanceStats.frameCount++;
        const now = performance.now();

        if (now - this.performanceStats.lastFpsUpdate > 1000) {
            this.performanceStats.fps = Math.round(
                (this.performanceStats.frameCount * 1000) /
                (now - this.performanceStats.lastFpsUpdate)
            );

            this.performanceStats.frameCount = 0;
            this.performanceStats.lastFpsUpdate = now;

            // Log performance stats occasionally
            if (this.simulationIterationCount % 100 === 0) {
                console.log('Graph Performance:', {
                    fps: this.performanceStats.fps,
                    renderTime: Math.round(this.performanceStats.renderTime * 100) / 100 + 'ms',
                    simulationIterations: this.performanceStats.simulationIterations,
                    visibleNodes: this.nodes.length - this.hiddenNodes.size,
                    visibleEdges: this.edges.length
                });
            }
        }
    }

    /**
     * Adjust visual elements based on zoom level for performance
     */
    adjustElementsForZoom(zoomLevel) {
        this.currentZoomLevel = zoomLevel;

        if (!this.config.performance.enableLOD) {return;}

        // Adjust node detail based on zoom
        if (this.nodeSelection) {
            if (zoomLevel < 0.3) {
                // Very low zoom - minimal detail
                this.nodeSelection.select('.node-label-group').style('opacity', 0);
                this.nodeSelection.select('.degree-indicator').style('opacity', 0);
                this.nodeSelection.select('.cluster-badge').style('opacity', 0);
            } else if (zoomLevel < 0.8) {
                // Low zoom - some detail
                this.nodeSelection.select('.node-label-group').style('opacity', 0.7);
                this.nodeSelection.select('.degree-indicator').style('opacity', 0);
                this.nodeSelection.select('.cluster-badge').style('opacity', d => this.clusteredNodes.has(d.id) ? 0.8 : 0);
            } else {
                // Normal zoom - full detail
                this.nodeSelection.select('.node-label-group').style('opacity', 1);
                this.nodeSelection.select('.degree-indicator').style('opacity', 0.8);
                this.nodeSelection.select('.cluster-badge').style('opacity', d => this.clusteredNodes.has(d.id) ? 1 : 0);
            }
        }

        // Adjust edge detail
        if (this.edgeSelection) {
            if (zoomLevel < 0.5) {
                this.edgeSelection.select('.edge-bg').style('opacity', 0);
            } else {
                this.edgeSelection.select('.edge-bg').style('opacity', 0.3);
            }
        }
    }

    /**
     * Throttled rendering for better performance
     */
    scheduleRender(renderFunction) {
        if (this.pendingRender) {return;}

        this.pendingRender = true;

        requestAnimationFrame(() => {
            renderFunction();
            this.pendingRender = false;
        });
    }

    /**
     * Optimized visualization update with performance monitoring
     */
    updateVisualizationOptimized() {
        const startTime = performance.now();

        // Limit visible nodes for performance
        if (this.nodes.length > this.config.performance.maxVisibleNodes) {
            console.warn(`Large dataset detected (${this.nodes.length} nodes). Consider using clustering or filtering.`);
        }

        this.scheduleRender(() => {
            this.updateNodes();
            this.updateEdges();

            const endTime = performance.now();
            console.log(`Visualization update took ${endTime - startTime}ms`);
        });
    }

    /**
     * Create SVG definitions for gradients, patterns, and markers
     */
    createDefinitions() {
        const defs = this.svg.append('defs');

        // Create gradients for nodes
        Object.entries(this.config.nodeColors).forEach(([type, color]) => {
            const gradient = defs.append('radialGradient')
                .attr('id', `gradient-${type}`)
                .attr('cx', '30%')
                .attr('cy', '30%');

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', this.d3.color(color).brighter(0.5));

            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', color);
        });

        // Create enhanced arrow markers
        this.createArrowMarkers(defs);

        // Create filter effects
        this.createFilterEffects(defs);
    }

    /**
     * Create various arrow markers for different edge types
     */
    createArrowMarkers(defs) {
        // Standard arrow
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 18)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .append('path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#7f8c8d');

        // Highlighted arrow
        defs.append('marker')
            .attr('id', 'arrowhead-highlight')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 18)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .append('path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#f39c12');

        // Large arrow for thick edges
        defs.append('marker')
            .attr('id', 'arrowhead-large')
            .attr('viewBox', '-0 -6 12 12')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .append('path')
            .attr('d', 'M 0,-6 L 12,0 L 0,6')
            .attr('fill', '#e74c3c');
    }

    /**
     * Create filter effects for visual enhancements
     */
    createFilterEffects(defs) {
        // Drop shadow filter
        const dropShadow = defs.append('filter')
            .attr('id', 'drop-shadow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');

        dropShadow.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 2)
            .attr('result', 'blur');

        dropShadow.append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 2)
            .attr('dy', 2)
            .attr('result', 'offsetBlur');

        dropShadow.append('feFlood')
            .attr('flood-color', '#000000')
            .attr('flood-opacity', 0.3);

        dropShadow.append('feComposite')
            .attr('in2', 'offsetBlur')
            .attr('operator', 'in');

        const feMerge = dropShadow.append('feMerge');
        feMerge.append('feMergeNode');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Glow effect for selected nodes
        const glow = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');

        glow.append('feGaussianBlur')
            .attr('stdDeviation', 4)
            .attr('result', 'coloredBlur');

        const glowMerge = glow.append('feMerge');
        glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
        glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    /**
     * Setup store subscriptions
     */
    setupSubscriptions() {
        // Subscribe to data changes
        store.subscribe('nodes', (nodes) => {
            this.nodes = [...nodes];
            this.updateVisualization();
        });

        store.subscribe('edges', (edges) => {
            this.edges = [...edges];
            this.updateVisualization();
        });

        // Subscribe to selection changes
        store.subscribe('selectedNode', (selectedNode) => {
            this.handleNodeSelection(selectedNode);
        });
    }

    /**
     * Update the complete visualization with smooth transitions
     */
    updateVisualization() {
        this.updateNodes();
        this.updateEdges();
    }

    /**
     * Enhanced node visualization with advanced features
     */
    updateNodes() {
        if (!this.d3) {return;}

        // Filter visible nodes
        const visibleNodes = this.nodes.filter(n => !this.hiddenNodes.has(n.id));

        // Data binding with key function
        this.nodeSelection = this.nodeGroup
            .selectAll('.node')
            .data(visibleNodes, d => d.id);

        // EXIT: Remove old nodes with staggered animation
        this.nodeSelection.exit()
            .transition()
            .duration(this.config.transitions.duration)
            .delay((d, i) => i * this.config.transitions.stagger)
            .style('opacity', 0)
            .attr('transform', d => `translate(${d.x || 0},${d.y || 0}) scale(0)`)
            .remove();

        // ENTER: Create new nodes
        const nodeEnter = this.nodeSelection
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x || this.config.width/2},${d.y || this.config.height/2}) scale(0)`)
            .style('opacity', 0)
            .call(this.setupDragBehavior())
            .call(this.setupNodeInteractions());

        // Create node structure
        this.createEnhancedNodeStructure(nodeEnter);

        // UPDATE + ENTER: Merge selections
        this.nodeSelection = nodeEnter.merge(this.nodeSelection);

        // Animate new nodes
        nodeEnter
            .transition()
            .duration(this.config.transitions.duration)
            .delay((d, i) => i * this.config.transitions.stagger)
            .style('opacity', 1)
            .attr('transform', d => `translate(${d.x || this.config.width/2},${d.y || this.config.height/2}) scale(1)`);

        // Update existing nodes
        this.updateExistingNodes();

        // Update simulation
        this.simulation.nodes(visibleNodes);
        this.simulation.alpha(0.3).restart();
    }

    /**
     * Create enhanced node structure with all visual elements
     */
    createEnhancedNodeStructure(nodeEnter) {
        // Background circle for depth
        nodeEnter.append('circle')
            .attr('class', 'node-bg')
            .attr('r', d => this.getNodeRadius(d) + 4)
            .attr('fill', '#ffffff')
            .attr('fill-opacity', 0.4)
            .attr('filter', 'url(#drop-shadow)');

        // Main node circle with gradient
        nodeEnter.append('circle')
            .attr('class', 'node-circle')
            .attr('r', d => this.getNodeRadius(d))
            .attr('fill', d => `url(#gradient-${d.type || 'default'})`)
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 2.5)
            .style('cursor', 'pointer');

        // Node icon/symbol
        nodeEnter.append('text')
            .attr('class', 'node-icon')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', d => `${Math.max(12, this.getNodeRadius(d) * 0.8)}px`)
            .style('fill', '#ffffff')
            .style('font-weight', 'bold')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)')
            .style('pointer-events', 'none')
            .style('user-select', 'none')
            .text(d => this.getNodeIcon(d.type));

        // Node label with background
        const labelGroup = nodeEnter.append('g')
            .attr('class', 'node-label-group')
            .attr('transform', d => `translate(0, ${this.getNodeRadius(d) + 25})`);

        // Label background
        labelGroup.append('rect')
            .attr('class', 'label-bg')
            .attr('fill', 'rgba(255, 255, 255, 0.95)')
            .attr('stroke', '#bdc3c7')
            .attr('stroke-width', 1)
            .attr('rx', 4)
            .attr('ry', 4)
            .style('filter', 'url(#drop-shadow)');

        // Label text
        labelGroup.append('text')
            .attr('class', 'node-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .style('pointer-events', 'none')
            .text(d => this.truncateLabel(d.name || d.label || d.id, 18));

        // Position and size label background
        labelGroup.selectAll('.label-bg')
            .each(function(d) {
                const textBox = d3.select(this.parentNode).select('.node-label').node().getBBox();
                d3.select(this)
                    .attr('x', textBox.x - 4)
                    .attr('y', textBox.y - 2)
                    .attr('width', textBox.width + 8)
                    .attr('height', textBox.height + 4);
            });

        // Cluster indicator badge
        const clusterBadge = nodeEnter.append('g')
            .attr('class', 'cluster-badge')
            .attr('transform', d => `translate(${this.getNodeRadius(d) - 8}, ${-this.getNodeRadius(d) + 8})`)
            .style('opacity', d => this.clusteredNodes.has(d.id) ? 1 : 0);

        clusterBadge.append('circle')
            .attr('r', 8)
            .attr('fill', '#f39c12')
            .attr('stroke', '#e67e22')
            .attr('stroke-width', 2);

        clusterBadge.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .text(d => this.getClusterSize(d.id));

        // Connection degree indicator
        const degreeIndicator = nodeEnter.append('g')
            .attr('class', 'degree-indicator')
            .attr('transform', d => `translate(${-this.getNodeRadius(d) + 8}, ${-this.getNodeRadius(d) + 8})`);

        degreeIndicator.append('circle')
            .attr('r', 6)
            .attr('fill', '#3498db')
            .attr('stroke', '#2980b9')
            .attr('stroke-width', 1)
            .style('opacity', 0.8);

        degreeIndicator.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', '8px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .text(d => this.getNodeDegree(d));
    }

    /**
     * Update existing nodes with current data
     */
    updateExistingNodes() {
        // Update node circles
        this.nodeSelection.select('.node-circle')
            .transition()
            .duration(this.config.transitions.duration / 2)
            .attr('r', d => this.getNodeRadius(d))
            .attr('stroke', d => this.selectedNodes.has(d.id) ? '#f39c12' : '#2c3e50')
            .attr('stroke-width', d => this.selectedNodes.has(d.id) ? 4 : 2.5)
            .style('filter', d => this.selectedNodes.has(d.id) ? 'url(#glow)' : null);

        // Update cluster badges
        this.nodeSelection.select('.cluster-badge')
            .transition()
            .duration(this.config.transitions.duration / 2)
            .style('opacity', d => this.clusteredNodes.has(d.id) ? 1 : 0);

        // Update degree indicators
        this.nodeSelection.select('.degree-indicator text')
            .text(d => this.getNodeDegree(d));
    }

    /**
     * Enhanced edge visualization
     */
    updateEdges() {
        if (!this.d3) {return;}

        // Filter visible edges
        const visibleEdges = this.edges.filter(edge => {
            const sourceVisible = !this.hiddenNodes.has(edge.source.id || edge.source);
            const targetVisible = !this.hiddenNodes.has(edge.target.id || edge.target);
            return sourceVisible && targetVisible;
        });

        // Data binding
        this.edgeSelection = this.edgeGroup
            .selectAll('.edge')
            .data(visibleEdges, d => d.id);

        // EXIT
        this.edgeSelection.exit()
            .transition()
            .duration(this.config.transitions.duration)
            .style('opacity', 0)
            .remove();

        // ENTER
        const edgeEnter = this.edgeSelection
            .enter()
            .append('g')
            .attr('class', 'edge')
            .style('opacity', 0)
            .call(this.setupEdgeInteractions());

        // Create edge structure
        this.createEdgeStructure(edgeEnter);

        // MERGE
        this.edgeSelection = edgeEnter.merge(this.edgeSelection);

        // Animate new edges
        edgeEnter
            .transition()
            .duration(this.config.transitions.duration)
            .style('opacity', 1);

        // Update simulation links
        this.simulation.force('link').links(visibleEdges);
        this.simulation.alpha(0.3).restart();
    }

    /**
     * Create comprehensive edge structure
     */
    createEdgeStructure(edgeEnter) {
        // Background line for glow effect
        edgeEnter.append('line')
            .attr('class', 'edge-bg')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', d => this.getEdgeWidth(d.type) + 4)
            .attr('stroke-opacity', 0.3);

        // Main edge line
        edgeEnter.append('line')
            .attr('class', 'edge-line')
            .attr('stroke', d => this.getEdgeColor(d.type))
            .attr('stroke-width', d => this.getEdgeWidth(d.type))
            .attr('stroke-dasharray', d => this.getEdgeDash(d.type))
            .attr('marker-end', d => this.getMarkerEnd(d.type))
            .style('opacity', 0.8);

        // Edge label group
        const labelGroup = edgeEnter.append('g')
            .attr('class', 'edge-label-group')
            .style('opacity', 0);

        // Label background
        labelGroup.append('rect')
            .attr('class', 'edge-label-bg')
            .attr('fill', 'rgba(255, 255, 255, 0.95)')
            .attr('stroke', '#bdc3c7')
            .attr('stroke-width', 1)
            .attr('rx', 3);

        // Label text
        labelGroup.append('text')
            .attr('class', 'edge-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .style('pointer-events', 'none')
            .text(d => d.type || d.label || '');
    }

    /**
     * Setup advanced drag behavior
     */
    setupDragBehavior() {
        return this.d3.drag()
            .on('start', (event, d) => {
                if (!event.active) {this.simulation.alphaTarget(0.3).restart();}
                d.fx = d.x;
                d.fy = d.y;
                this.isDragging = true;

                // Visual feedback
                this.d3.select(event.sourceEvent.target.parentNode)
                    .select('.node-circle')
                    .transition()
                    .attr('r', this.getNodeRadius(d) + 5)
                    .style('filter', 'url(#glow)');
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) {this.simulation.alphaTarget(0);}
                this.isDragging = false;

                // Reset visual feedback
                this.d3.select(event.sourceEvent.target.parentNode)
                    .select('.node-circle')
                    .transition()
                    .attr('r', this.getNodeRadius(d))
                    .style('filter', this.selectedNodes.has(d.id) ? 'url(#glow)' : null);

                // Allow node to move freely if not fixed
                if (!event.active) {
                    d.fx = null;
                    d.fy = null;
                }
            });
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
                .on('mouseenter', (event, d) => {
                    this.handleNodeMouseEnter(event, d);
                })
                .on('mouseleave', (event, d) => {
                    this.handleNodeMouseLeave(event, d);
                })
                .on('contextmenu', (event, d) => {
                    event.preventDefault();
                    this.showContextMenu(event, d);
                });
        };
    }

    /**
     * Setup edge interactions
     */
    setupEdgeInteractions() {
        return (selection) => {
            selection
                .on('click', (event, d) => {
                    event.stopPropagation();
                    this.handleEdgeClick(event, d);
                })
                .on('mouseenter', (event, d) => {
                    this.highlightEdge(d, true);
                })
                .on('mouseleave', (event, d) => {
                    this.highlightEdge(d, false);
                });
        };
    }

    /**
     * Handle node click with advanced selection logic
     */
    handleNodeClick(event, node) {
        if (this.selectedNodes.has(node.id)) {
            if (event.ctrlKey || event.metaKey) {
                this.selectedNodes.delete(node.id);
                if (this.selectedNodes.size === 0) {
                    store.setState({ selectedNode: null });
                }
            } else {
                // Single selection
                this.selectedNodes.clear();
                this.selectedNodes.add(node.id);
                store.setState({ selectedNode: node });
            }
        } else {
            if (!event.ctrlKey && !event.metaKey) {
                this.selectedNodes.clear();
            }
            this.selectedNodes.add(node.id);
            store.setState({ selectedNode: node });
        }

        this.updateNodeSelection();
        this.highlightConnectedElements(node.id);
    }

    /**
     * Handle node double-click for cluster expansion
     */
    handleNodeDoubleClick(event, node) {
        if (this.clusteredNodes.has(node.id)) {
            this.expandCluster(node.id);
        } else {
            const neighbors = this.getNodeNeighbors(node.id);
            if (neighbors.length >= this.config.clustering.minClusterSize) {
                this.createCluster(node.id, neighbors);
            } else {
                // Focus on node and its immediate connections
                this.focusOnNode(node.id);
            }
        }
    }

    /**
     * Enhanced mouse enter with tooltip and highlights
     */
    handleNodeMouseEnter(event, node) {
        this.showEnhancedTooltip(event, node);
        this.highlightNodeNeighborhood(node.id, true);
    }

    /**
     * Handle mouse leave
     */
    handleNodeMouseLeave(event, node) {
        this.hideEnhancedTooltip();
        if (!this.selectedNodes.has(node.id)) {
            this.highlightNodeNeighborhood(node.id, false);
        }
    }

    /**
     * Update position during simulation
     */
    updatePositions() {
        // Update node positions
        if (this.nodeSelection) {
            this.nodeSelection
                .attr('transform', d => `translate(${d.x},${d.y})`);
        }

        // Update edge positions
        if (this.edgeSelection) {
            this.edgeSelection.select('.edge-line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            this.edgeSelection.select('.edge-bg')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            // Update edge labels
            this.edgeSelection.select('.edge-label-group')
                .attr('transform', d => {
                    const midX = (d.source.x + d.target.x) / 2;
                    const midY = (d.source.y + d.target.y) / 2;
                    const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
                    return `translate(${midX},${midY}) rotate(${angle * 180 / Math.PI})`;
                });
        }
    }

    // Utility methods for node and edge properties
    getNodeRadius(node) {
        const degree = this.getNodeDegree(node);
        if (this.clusteredNodes.has(node.id)) {return this.config.nodeRadius.cluster;}
        if (degree > 8) {return this.config.nodeRadius.large;}
        if (degree < 3) {return this.config.nodeRadius.small;}
        return this.config.nodeRadius.medium;
    }

    getNodeColor(type) {
        return this.config.nodeColors[type] || this.config.nodeColors.default;
    }

    getNodeIcon(type) {
        return this.config.nodeIcons[type] || this.config.nodeIcons.default;
    }

    getNodeDegree(node) {
        return this.edges.filter(edge =>
            edge.source === node.id || edge.target === node.id ||
            edge.source.id === node.id || edge.target.id === node.id
        ).length;
    }

    getEdgeColor(type) {
        return this.config.edgeTypes[type]?.color || this.config.edgeTypes.default.color;
    }

    getEdgeWidth(type) {
        return this.config.edgeTypes[type]?.width || this.config.edgeTypes.default.width;
    }

    getEdgeDash(type) {
        return this.config.edgeTypes[type]?.dash;
    }

    getLinkDistance(edge) {
        const edgeConfig = this.config.edgeTypes[edge.type] || this.config.edgeTypes.default;
        return this.config.edgeLength[edgeConfig.distance] || this.config.edgeLength.default;
    }

    getMarkerEnd(type) {
        if (type === 'CONTAINS') {return 'url(#arrowhead-large)';}
        return 'url(#arrowhead)';
    }

    getClusterSize(nodeId) {
        const cluster = this.clusteredNodes.get(nodeId);
        return cluster ? cluster.length : 0;
    }

    truncateLabel(text, maxLength = 20) {
        return text && text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Enhanced tooltip system
    showEnhancedTooltip(event, node) {
        // Remove existing tooltip
        this.d3.selectAll('.enhanced-tooltip').remove();

        const tooltip = this.d3.select('body')
            .append('div')
            .attr('class', 'enhanced-tooltip')
            .style('position', 'absolute')
            .style('background', 'linear-gradient(135deg, rgba(44,62,80,0.95), rgba(52,73,94,0.95))')
            .style('color', 'white')
            .style('padding', '15px')
            .style('border-radius', '10px')
            .style('font-size', '13px')
            .style('font-family', 'system-ui, -apple-system, sans-serif')
            .style('pointer-events', 'none')
            .style('z-index', '3000')
            .style('box-shadow', '0 8px 25px rgba(0,0,0,0.3)')
            .style('border', '1px solid rgba(255,255,255,0.1)')
            .style('max-width', '350px')
            .style('backdrop-filter', 'blur(5px)')
            .style('opacity', 0);

        const degree = this.getNodeDegree(node);
        const isCluster = this.clusteredNodes.has(node.id);
        const clusterSize = isCluster ? this.getClusterSize(node.id) : 0;

        tooltip.html(`
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 24px; margin-right: 10px;">${this.getNodeIcon(node.type)}</span>
                <div>
                    <div style="font-weight: bold; font-size: 16px;">${node.name || node.label || node.id}</div>
                    <div style="font-size: 11px; opacity: 0.8;">${node.type || 'Unknown Type'}</div>
                </div>
            </div>
            <div style="margin-bottom: 8px;"><strong>ID:</strong> ${node.id}</div>
            <div style="margin-bottom: 8px;"><strong>Connections:</strong> ${degree}</div>
            ${node.address?.city ? `<div style="margin-bottom: 8px;"><strong>Location:</strong> ${node.address.city}, ${node.address.state}</div>` : ''}
            ${isCluster ? `<div style="margin-bottom: 8px; color: #f39c12;"><strong>📁 Cluster:</strong> ${clusterSize} hidden nodes</div>` : ''}
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; opacity: 0.7;">
                Click to select • Double-click to ${isCluster ? 'expand' : 'cluster'} • Right-click for options
            </div>
        `);

        // Position tooltip
        const tooltipNode = tooltip.node();
        const tooltipRect = tooltipNode.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let left = event.pageX + 15;
        let top = event.pageY - 10;

        // Adjust position to keep tooltip in viewport
        if (left + tooltipRect.width > windowWidth) {
            left = event.pageX - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > windowHeight) {
            top = event.pageY - tooltipRect.height + 10;
        }

        tooltip
            .style('left', left + 'px')
            .style('top', top + 'px')
            .transition()
            .duration(200)
            .style('opacity', 1);
    }

    hideEnhancedTooltip() {
        this.d3.selectAll('.enhanced-tooltip')
            .transition()
            .duration(200)
            .style('opacity', 0)
            .remove();
    }

    // Clustering methods
    getNodeNeighbors(nodeId, depth = 1) {
        const neighbors = new Set();
        const visited = new Set();
        const queue = [{ id: nodeId, currentDepth: 0 }];

        while (queue.length > 0) {
            const { id: currentId, currentDepth } = queue.shift();

            if (visited.has(currentId) || currentDepth > depth) {continue;}
            visited.add(currentId);

            this.edges.forEach(edge => {
                let neighborId = null;
                if (edge.source.id === currentId || edge.source === currentId) {
                    neighborId = edge.target.id || edge.target;
                } else if (edge.target.id === currentId || edge.target === currentId) {
                    neighborId = edge.source.id || edge.source;
                }

                if (neighborId && !visited.has(neighborId) && neighborId !== nodeId) {
                    neighbors.add(neighborId);
                    if (currentDepth < depth) {
                        queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
                    }
                }
            });
        }

        return Array.from(neighbors);
    }

    // View control methods
    resetView() {
        this.svg.transition()
            .duration(1000)
            .call(this.zoom.transform, this.d3.zoomIdentity);
    }

    fitToView() {
        if (this.nodes.length === 0) {return;}

        const bounds = this.getGraphBounds();
        const fullWidth = this.config.width;
        const fullHeight = this.config.height;

        const scale = Math.min(
            fullWidth / bounds.width,
            fullHeight / bounds.height
        ) * 0.8;

        const translateX = fullWidth / 2 - scale * (bounds.x + bounds.width / 2);
        const translateY = fullHeight / 2 - scale * (bounds.y + bounds.height / 2);

        this.svg.transition()
            .duration(1000)
            .call(this.zoom.transform,
                this.d3.zoomIdentity
                    .translate(translateX, translateY)
                    .scale(scale)
            );
    }

    getGraphBounds() {
        const visibleNodes = this.nodes.filter(n => !this.hiddenNodes.has(n.id));
        if (visibleNodes.length === 0) {return { x: 0, y: 0, width: 1, height: 1 };}

        const xs = visibleNodes.map(d => d.x || 0);
        const ys = visibleNodes.map(d => d.y || 0);
        const padding = 50;

        return {
            x: Math.min(...xs) - padding,
            y: Math.min(...ys) - padding,
            width: Math.max(...xs) - Math.min(...xs) + 2 * padding,
            height: Math.max(...ys) - Math.min(...ys) + 2 * padding
        };
    }

    /**
     * Setup comprehensive accessibility features
     */
    setupAccessibilityFeatures() {
        this.setupGraphKeyboardNavigation();
        this.addScreenReaderSupport();
        this.setupFocusManagement();
        this.createAccessibilityDescriptions();
    }

    /**
     * Setup keyboard navigation for the graph
     */
    setupGraphKeyboardNavigation() {
        if (!this.container) {return;}

        // Make container focusable
        this.container.setAttribute('tabindex', '0');
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'Interactive knowledge graph');

        // Add keyboard event listener
        this.container.addEventListener('keydown', (event) => {
            this.handleGraphKeyboard(event);
        });

        // Focus management
        this.container.addEventListener('focus', () => {
            this.announceGraphFocus();
        });
    }

    /**
     * Handle keyboard navigation within the graph
     */
    handleGraphKeyboard(event) {
        if (!this.nodes || this.nodes.length === 0) {return;}

        const visibleNodes = this.nodes.filter(n => !this.hiddenNodes.has(n.id));
        if (visibleNodes.length === 0) {return;}

        switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
            event.preventDefault();
            this.navigateToNextNode();
            break;

        case 'ArrowLeft':
        case 'ArrowUp':
            event.preventDefault();
            this.navigateToPreviousNode();
            break;

        case 'Enter':
        case ' ':
            event.preventDefault();
            this.selectFocusedNode();
            break;

        case 'Escape':
            event.preventDefault();
            this.clearSelection();
            this.container.blur();
            break;

        case 'Tab':
            // Allow normal tab navigation
            break;

        case '+':
        case '=':
            event.preventDefault();
            this.zoomIn();
            break;

        case '-':
            event.preventDefault();
            this.zoomOut();
            break;

        case '0':
            event.preventDefault();
            this.resetView();
            break;

        case 'f':
        case 'F':
            event.preventDefault();
            this.fitToView();
            break;
        }
    }

    /**
     * Navigate to next node
     */
    navigateToNextNode() {
        const visibleNodes = this.nodes.filter(n => !this.hiddenNodes.has(n.id));
        if (visibleNodes.length === 0) {return;}

        this.focusedNodeIndex = (this.focusedNodeIndex + 1) % visibleNodes.length;
        const focusedNode = visibleNodes[this.focusedNodeIndex];

        this.focusOnNode(focusedNode.id);
        this.announceNodeFocus(focusedNode);
    }

    /**
     * Navigate to previous node
     */
    navigateToPreviousNode() {
        const visibleNodes = this.nodes.filter(n => !this.hiddenNodes.has(n.id));
        if (visibleNodes.length === 0) {return;}

        this.focusedNodeIndex = this.focusedNodeIndex <= 0 ?
            visibleNodes.length - 1 : this.focusedNodeIndex - 1;
        const focusedNode = visibleNodes[this.focusedNodeIndex];

        this.focusOnNode(focusedNode.id);
        this.announceNodeFocus(focusedNode);
    }

    /**
     * Select the currently focused node
     */
    selectFocusedNode() {
        const visibleNodes = this.nodes.filter(n => !this.hiddenNodes.has(n.id));
        if (visibleNodes.length === 0 || this.focusedNodeIndex < 0) {return;}

        const focusedNode = visibleNodes[this.focusedNodeIndex];
        this.handleNodeClick({ ctrlKey: false, metaKey: false }, focusedNode);
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedNodes.clear();
        this.updateNodeSelection();
        store.setState({ selectedNode: null });
        this.announceToScreenReader('Selection cleared');
    }

    /**
     * Focus on a specific node
     */
    focusOnNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node || this.hiddenNodes.has(nodeId)) {return;}

        // Center the view on the node
        const transform = this.d3.zoomIdentity
            .translate(
                this.config.width / 2 - node.x * this.transform.k,
                this.config.height / 2 - node.y * this.transform.k
            )
            .scale(Math.max(1, this.transform.k));

        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, transform);

        // Highlight the focused node
        this.highlightFocusedNode(nodeId);
    }

    /**
     * Highlight the focused node for keyboard navigation
     */
    highlightFocusedNode(nodeId) {
        // Remove previous focus highlights
        this.nodeSelection.select('.focus-ring').remove();

        // Add focus ring to current node
        const focusedNodeSelection = this.nodeSelection
            .filter(d => d.id === nodeId);

        focusedNodeSelection.insert('circle', '.node-circle')
            .attr('class', 'focus-ring')
            .attr('r', d => this.getNodeRadius(d) + 8)
            .attr('fill', 'none')
            .attr('stroke', '#ff6b35')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '5,5')
            .style('opacity', 0)
            .transition()
            .duration(300)
            .style('opacity', 0.8);

        // Animate the focus ring
        const animate = () => {
            focusedNodeSelection.select('.focus-ring')
                .transition()
                .duration(1000)
                .attr('stroke-dashoffset', -10)
                .on('end', animate);
        };
        animate();
    }

    /**
     * Add comprehensive screen reader support
     */
    addScreenReaderSupport() {
        // Create ARIA description for the graph
        const description = document.createElement('div');
        description.id = 'graph-description';
        description.className = 'sr-only';
        description.innerHTML = `
            This is an interactive knowledge graph visualization.
            Use arrow keys to navigate between nodes.
            Press Enter or Space to select a node.
            Press Escape to clear selections and exit graph navigation.
            Use + and - keys to zoom in and out.
            Press F to fit all nodes to view.
            Press 0 to reset the view.
        `;
        document.body.appendChild(description);

        // Link description to graph container
        this.container.setAttribute('aria-describedby', 'graph-description');
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Track focus state
        this.container.addEventListener('focus', () => {
            this.keyboardNavigationMode = true;
            this.container.classList.add('keyboard-focused');
        });

        this.container.addEventListener('blur', () => {
            this.keyboardNavigationMode = false;
            this.container.classList.remove('keyboard-focused');

            // Remove focus rings when leaving graph
            if (this.nodeSelection) {
                this.nodeSelection.selectAll('.focus-ring')
                    .transition()
                    .duration(300)
                    .style('opacity', 0)
                    .remove();
            }
        });

        // Reset focus index when nodes change
        this.container.addEventListener('nodeDataChanged', () => {
            this.focusedNodeIndex = -1;
        });
    }

    /**
     * Create accessibility descriptions for nodes
     */
    createAccessibilityDescriptions() {
        this.nodes.forEach(node => {
            const degree = this.getNodeDegree(node);
            const description = `${node.type || 'Node'} named ${node.name || node.id}. ` +
                `Has ${degree} connection${degree !== 1 ? 's' : ''}. ` +
                `${node.address?.city ? `Located in ${node.address.city}, ${node.address.state}. ` : ''}` +
                `${this.clusteredNodes.has(node.id) ?
                    `This is a cluster containing ${this.getClusterSize(node.id)} nodes. ` : ''}`;

            this.nodeDescriptions.set(node.id, description);
        });
    }

    /**
     * Announce graph focus to screen readers
     */
    announceGraphFocus() {
        const nodeCount = this.nodes.filter(n => !this.hiddenNodes.has(n.id)).length;
        const edgeCount = this.edges.length;

        this.announceToScreenReader(
            `Graph focused. Contains ${nodeCount} nodes and ${edgeCount} connections. ` +
            'Use arrow keys to navigate, Enter to select, Escape to exit.'
        );
    }

    /**
     * Announce node focus to screen readers
     */
    announceNodeFocus(node) {
        const description = this.nodeDescriptions.get(node.id) ||
            `Node ${node.name || node.id}`;
        this.announceToScreenReader(`Focused on: ${description}`);
    }

    /**
     * Announce to screen reader (connects to dashboard UI)
     */
    announceToScreenReader(message) {
        // Use global dashboard UI announcer if available
        if (window.dashboardUI && window.dashboardUI.announceToScreenReader) {
            window.dashboardUI.announceToScreenReader(message);
            return;
        }

        // Fallback to direct announcement
        const announcer = document.getElementById('sr-announcer');
        if (announcer) {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }

    /**
     * Zoom in functionality
     */
    zoomIn() {
        const newScale = Math.min(5, this.transform.k * 1.2);
        this.svg.transition()
            .duration(300)
            .call(this.zoom.scaleBy, 1.2);

        this.announceToScreenReader(`Zoomed in. Current zoom level: ${Math.round(newScale * 100)}%`);
    }

    /**
     * Zoom out functionality
     */
    zoomOut() {
        const newScale = Math.max(0.1, this.transform.k * 0.8);
        this.svg.transition()
            .duration(300)
            .call(this.zoom.scaleBy, 0.8);

        this.announceToScreenReader(`Zoomed out. Current zoom level: ${Math.round(newScale * 100)}%`);
    }

    /**
     * Update node selection with accessibility enhancements
     */
    updateNodeSelection() {
        if (!this.nodeSelection) {return;}

        this.nodeSelection.each((d, i, nodes) => {
            const node = this.d3.select(nodes[i]);
            const circle = node.select('.node-circle');

            if (this.selectedNodes.has(d.id)) {
                circle.attr('stroke', '#f39c12')
                    .attr('stroke-width', 4)
                    .style('filter', 'url(#glow)');

                // Add selection indicator for screen readers
                node.attr('aria-selected', 'true');
            } else {
                circle.attr('stroke', '#2c3e50')
                    .attr('stroke-width', 2.5)
                    .style('filter', null);

                node.attr('aria-selected', 'false');
            }
        });
    }

    /**
     * Enhanced node highlighting with accessibility
     */
    highlightNodeNeighborhood(nodeId, highlight = true) {
        if (!this.nodeSelection || !this.edgeSelection) {return;}

        const neighbors = new Set(this.getNodeNeighbors(nodeId));
        neighbors.add(nodeId);

        // Highlight nodes
        this.nodeSelection.style('opacity', d => {
            return highlight ? (neighbors.has(d.id) ? 1 : 0.3) : 1;
        });

        // Highlight edges
        this.edgeSelection.style('opacity', d => {
            const sourceId = d.source.id || d.source;
            const targetId = d.target.id || d.target;
            return highlight ?
                (neighbors.has(sourceId) && neighbors.has(targetId) ? 1 : 0.2) : 0.8;
        });

        if (highlight) {
            const neighborCount = neighbors.size - 1;
            this.announceToScreenReader(
                `Highlighting ${neighborCount} connected node${neighborCount !== 1 ? 's' : ''}`
            );
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.d3.selectAll('.enhanced-tooltip').remove();

        // Clear internal state
        this.hiddenNodes.clear();
        this.clusteredNodes.clear();
        this.selectedNodes.clear();
        this.highlightedNodes.clear();
    }
}

export default D3EnhancedGraphView;
