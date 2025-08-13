/**
 * Core Graph Module
 * Wrapper for Graphiti library functionality
 */
import { store } from './store.js';

export class Graph {
    constructor() {
        this.initialized = false;
        this.graphInstance = null;
        this.layoutEngine = null;
    }

    /**
     * Initialize the graph system
     */
    async init() {
        if (this.initialized) {return;}

        try {
            // Note: In a real implementation, you would import Graphiti here
            // For demo purposes, we'll create a mock implementation
            this.graphInstance = this.createMockGraphitiInstance();
            this.layoutEngine = new LayoutEngine();
            this.initialized = true;

            console.log('Graph system initialized');
        } catch (error) {
            console.error('Failed to initialize graph system:', error);
            throw error;
        }
    }

    /**
     * Load graph data
     */
    loadData(nodes, edges) {
        if (!this.initialized) {
            throw new Error('Graph system not initialized');
        }

        // Validate data
        const validatedNodes = this.validateNodes(nodes);
        const validatedEdges = this.validateEdges(edges, validatedNodes);

        // Update store
        store.setState({
            nodes: validatedNodes,
            edges: validatedEdges
        });

        // Apply to graph instance
        this.graphInstance.setNodes(validatedNodes);
        this.graphInstance.setEdges(validatedEdges);

        return { nodes: validatedNodes, edges: validatedEdges };
    }

    /**
     * Add node to graph
     */
    addNode(nodeData) {
        const node = this.validateNode(nodeData);
        const currentNodes = store.getState().nodes;
        const updatedNodes = [...currentNodes, node];

        store.setState({ nodes: updatedNodes });
        this.graphInstance.addNode(node);

        return node;
    }

    /**
     * Remove node from graph
     */
    removeNode(nodeId) {
        const currentState = store.getState();
        const updatedNodes = currentState.nodes.filter(n => n.id !== nodeId);
        const updatedEdges = currentState.edges.filter(e =>
            e.source !== nodeId && e.target !== nodeId
        );

        store.setState({
            nodes: updatedNodes,
            edges: updatedEdges,
            selectedNode: currentState.selectedNode?.id === nodeId ? null : currentState.selectedNode
        });

        this.graphInstance.removeNode(nodeId);
    }

    /**
     * Add edge to graph
     */
    addEdge(edgeData) {
        const edge = this.validateEdge(edgeData, store.getState().nodes);
        const currentEdges = store.getState().edges;
        const updatedEdges = [...currentEdges, edge];

        store.setState({ edges: updatedEdges });
        this.graphInstance.addEdge(edge);

        return edge;
    }

    /**
     * Remove edge from graph
     */
    removeEdge(edgeId) {
        const currentEdges = store.getState().edges;
        const updatedEdges = currentEdges.filter(e => e.id !== edgeId);

        store.setState({ edges: updatedEdges });
        this.graphInstance.removeEdge(edgeId);
    }

    /**
     * Apply layout algorithm
     */
    applyLayout(layoutType = 'force') {
        if (!this.layoutEngine) {
            throw new Error('Layout engine not available');
        }

        const { nodes, edges } = store.getState();
        const layoutResult = this.layoutEngine.apply(layoutType, nodes, edges);

        store.setState({
            nodes: layoutResult.nodes,
            graphView: {
                ...store.getState().graphView,
                layout: layoutType
            }
        });

        return layoutResult;
    }

    /**
     * Get neighbors of a node
     */
    getNeighbors(nodeId) {
        const { nodes, edges } = store.getState();
        const neighborIds = new Set();

        edges.forEach(edge => {
            if (edge.source === nodeId) {
                neighborIds.add(edge.target);
            } else if (edge.target === nodeId) {
                neighborIds.add(edge.source);
            }
        });

        return nodes.filter(node => neighborIds.has(node.id));
    }

    /**
     * Find shortest path between two nodes
     */
    findShortestPath(sourceId, targetId) {
        const { nodes, edges } = store.getState();
        // Simple breadth-first search implementation
        const queue = [{ nodeId: sourceId, path: [sourceId] }];
        const visited = new Set();

        while (queue.length > 0) {
            const { nodeId, path } = queue.shift();

            if (nodeId === targetId) {
                return path;
            }

            if (visited.has(nodeId)) {
                continue;
            }
            visited.add(nodeId);

            const neighbors = this.getNeighbors(nodeId);
            neighbors.forEach(neighbor => {
                if (!visited.has(neighbor.id)) {
                    queue.push({
                        nodeId: neighbor.id,
                        path: [...path, neighbor.id]
                    });
                }
            });
        }

        return null; // No path found
    }

    /**
     * Validate node data
     */
    validateNode(nodeData) {
        if (!nodeData.id) {
            throw new Error('Node must have an id');
        }

        return {
            id: nodeData.id,
            label: nodeData.label || `Node ${nodeData.id}`,
            type: nodeData.type || 'default',
            properties: nodeData.properties || {},
            position: nodeData.position || { x: 0, y: 0 },
            ...nodeData
        };
    }

    /**
     * Validate nodes array
     */
    validateNodes(nodes) {
        if (!Array.isArray(nodes)) {
            throw new Error('Nodes must be an array');
        }

        return nodes.map(node => this.validateNode(node));
    }

    /**
     * Validate edge data
     */
    validateEdge(edgeData, nodes) {
        if (!edgeData.source || !edgeData.target) {
            throw new Error('Edge must have source and target');
        }

        // Check if source and target nodes exist
        const nodeIds = nodes.map(n => n.id);
        if (!nodeIds.includes(edgeData.source) || !nodeIds.includes(edgeData.target)) {
            throw new Error('Edge source and target must exist in nodes');
        }

        return {
            id: edgeData.id || `${edgeData.source}-${edgeData.target}`,
            source: edgeData.source,
            target: edgeData.target,
            label: edgeData.label || '',
            type: edgeData.type || 'default',
            properties: edgeData.properties || {},
            ...edgeData
        };
    }

    /**
     * Validate edges array
     */
    validateEdges(edges, nodes) {
        if (!Array.isArray(edges)) {
            throw new Error('Edges must be an array');
        }

        return edges.map(edge => this.validateEdge(edge, nodes));
    }

    /**
     * Create mock Graphiti instance for demo
     */
    createMockGraphitiInstance() {
        return {
            nodes: [],
            edges: [],

            setNodes(nodes) {
                this.nodes = [...nodes];
            },

            setEdges(edges) {
                this.edges = [...edges];
            },

            addNode(node) {
                this.nodes.push(node);
            },

            removeNode(nodeId) {
                this.nodes = this.nodes.filter(n => n.id !== nodeId);
            },

            addEdge(edge) {
                this.edges.push(edge);
            },

            removeEdge(edgeId) {
                this.edges = this.edges.filter(e => e.id !== edgeId);
            }
        };
    }
}

/**
 * Layout Engine for graph positioning
 */
class LayoutEngine {
    apply(layoutType, nodes, edges) {
        switch (layoutType) {
        case 'circular':
            return this.circularLayout(nodes, edges);
        case 'hierarchical':
            return this.hierarchicalLayout(nodes, edges);
        case 'force':
        default:
            return this.forceLayout(nodes, edges);
        }
    }

    forceLayout(nodes, edges) {
        // Simple force-directed layout simulation
        const center = { x: 400, y: 300 };
        const radius = 200;

        return {
            nodes: nodes.map((node, index) => ({
                ...node,
                position: {
                    x: center.x + Math.cos(index * 2 * Math.PI / nodes.length) * radius,
                    y: center.y + Math.sin(index * 2 * Math.PI / nodes.length) * radius
                }
            })),
            edges
        };
    }

    circularLayout(nodes, edges) {
        const center = { x: 400, y: 300 };
        const radius = 150;

        return {
            nodes: nodes.map((node, index) => ({
                ...node,
                position: {
                    x: center.x + Math.cos(index * 2 * Math.PI / nodes.length) * radius,
                    y: center.y + Math.sin(index * 2 * Math.PI / nodes.length) * radius
                }
            })),
            edges
        };
    }

    hierarchicalLayout(nodes, edges) {
        // Simple hierarchical layout based on node connections
        const levels = new Map();
        const visited = new Set();

        // Find root nodes (nodes with no incoming edges)
        const hasIncoming = new Set();
        edges.forEach(edge => hasIncoming.add(edge.target));
        const roots = nodes.filter(node => !hasIncoming.has(node.id));

        // Assign levels
        const assignLevel = (nodeId, level) => {
            if (visited.has(nodeId)) {return;}
            visited.add(nodeId);

            if (!levels.has(level)) {levels.set(level, []);}
            levels.get(level).push(nodeId);

            // Process children
            edges
                .filter(edge => edge.source === nodeId)
                .forEach(edge => assignLevel(edge.target, level + 1));
        };

        roots.forEach(root => assignLevel(root.id, 0));

        // Position nodes by level
        return {
            nodes: nodes.map(node => {
                let level = 0;
                let position = 0;

                for (const [l, nodeIds] of levels.entries()) {
                    const pos = nodeIds.indexOf(node.id);
                    if (pos >= 0) {
                        level = l;
                        position = pos;
                        break;
                    }
                }

                return {
                    ...node,
                    position: {
                        x: 100 + position * 150,
                        y: 100 + level * 100
                    }
                };
            }),
            edges
        };
    }
}

// Create and export singleton graph instance
export const graph = new Graph();
