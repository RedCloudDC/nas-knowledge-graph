/**
 * Path Finder Component
 * Advanced shortest-path algorithms for finding routes between nodes
 */

import { store } from '../core/store.js';
import { search } from '../utils/search.js';

export class PathFinder {
    constructor() {
        this.algorithms = {
            'dijkstra': this.dijkstra.bind(this),
            'bfs': this.breadthFirstSearch.bind(this),
            'astar': this.aStar.bind(this),
            'bidirectional': this.bidirectionalSearch.bind(this)
        };

        this.currentAlgorithm = 'dijkstra';
        this.pathCache = new Map();
        this.maxCacheSize = 1000;
        this.pathHistory = [];
        this.maxHistorySize = 50;

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for pathfinding
     */
    setupEventListeners() {
        // Listen for pathfinding requests
        document.addEventListener('findPath', (e) => {
            const { sourceId, targetId, algorithm, options } = e.detail;
            this.findPath(sourceId, targetId, algorithm, options);
        });

        // Listen for shortest path requests from neighborhood explorer
        document.addEventListener('setPathFindingSource', (e) => {
            this.pathSource = e.detail.sourceNode;
            this.updatePathFindingUI();
        });

        document.addEventListener('setPathFindingTarget', (e) => {
            this.pathTarget = e.detail.targetNode;
            this.updatePathFindingUI();

            // If both source and target are set, find path
            if (this.pathSource) {
                this.findPath(this.pathSource.id, this.pathTarget.id);
            }
        });

        document.addEventListener('clearPathHighlights', () => {
            this.clearAllPaths();
        });
    }

    /**
     * Main pathfinding method
     */
    findPath(sourceId, targetId, algorithm = this.currentAlgorithm, options = {}) {
        console.log(`🛣️ Finding path from ${sourceId} to ${targetId} using ${algorithm}`);

        // Check cache first
        const cacheKey = `${sourceId}-${targetId}-${algorithm}-${JSON.stringify(options)}`;
        const cached = this.pathCache.get(cacheKey);

        if (cached) {
            console.log('📋 Using cached path');
            this.displayPath(cached);
            return cached;
        }

        const startTime = performance.now();
        const pathResult = this.algorithms[algorithm](sourceId, targetId, options);
        const endTime = performance.now();

        if (pathResult.path) {
            // Cache the result
            this.cachePathResult(cacheKey, pathResult);

            // Add to history
            this.addToHistory({
                sourceId,
                targetId,
                algorithm,
                path: pathResult.path,
                distance: pathResult.distance,
                computeTime: endTime - startTime,
                timestamp: Date.now()
            });

            // Display the path
            this.displayPath(pathResult);

            console.log(`✅ Path found: ${pathResult.path.length} nodes, distance: ${pathResult.distance.toFixed(2)}, time: ${(endTime - startTime).toFixed(2)}ms`);
        } else {
            console.log('❌ No path found');
            document.dispatchEvent(new CustomEvent('pathNotFound', {
                detail: { sourceId, targetId, algorithm, computeTime: endTime - startTime }
            }));
        }

        return pathResult;
    }

    /**
     * Dijkstra's shortest path algorithm
     */
    dijkstra(sourceId, targetId, options = {}) {
        const { nodes, edges } = store.getState();
        const { weightProperty = null, maxDistance = Infinity } = options;

        // Build adjacency list with weights
        const graph = this.buildWeightedGraph(nodes, edges, weightProperty);

        // Initialize distances and previous nodes
        const distances = new Map();
        const previous = new Map();
        const visited = new Set();
        const unvisited = new Set();

        // Initialize all distances to infinity except source
        nodes.forEach(node => {
            distances.set(node.id, node.id === sourceId ? 0 : Infinity);
            unvisited.add(node.id);
        });

        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let current = null;
            let minDistance = Infinity;

            for (const nodeId of unvisited) {
                const distance = distances.get(nodeId);
                if (distance < minDistance) {
                    minDistance = distance;
                    current = nodeId;
                }
            }

            if (current === null || minDistance === Infinity) {break;}
            if (current === targetId) {break;} // Found target
            if (minDistance > maxDistance) {break;} // Exceeded max distance

            unvisited.delete(current);
            visited.add(current);

            // Update neighbors
            const neighbors = graph.get(current) || [];
            for (const { nodeId: neighbor, weight } of neighbors) {
                if (visited.has(neighbor)) {continue;}

                const altDistance = distances.get(current) + weight;
                if (altDistance < distances.get(neighbor)) {
                    distances.set(neighbor, altDistance);
                    previous.set(neighbor, current);
                }
            }
        }

        // Reconstruct path
        const path = this.reconstructPath(previous, sourceId, targetId);
        const distance = distances.get(targetId);

        return {
            path: distance === Infinity ? null : path,
            distance: distance === Infinity ? null : distance,
            algorithm: 'dijkstra',
            visited: visited.size,
            sourceId,
            targetId
        };
    }

    /**
     * Breadth-First Search (BFS) for unweighted shortest path
     */
    breadthFirstSearch(sourceId, targetId, options = {}) {
        const { nodes, edges } = store.getState();
        const { maxHops = Infinity } = options;

        const graph = this.buildGraph(nodes, edges);
        const queue = [{ nodeId: sourceId, path: [sourceId], distance: 0 }];
        const visited = new Set([sourceId]);

        while (queue.length > 0) {
            const { nodeId, path, distance } = queue.shift();

            if (nodeId === targetId) {
                return {
                    path,
                    distance,
                    algorithm: 'bfs',
                    visited: visited.size,
                    sourceId,
                    targetId
                };
            }

            if (distance >= maxHops) {continue;}

            const neighbors = graph.get(nodeId) || [];
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push({
                        nodeId: neighborId,
                        path: [...path, neighborId],
                        distance: distance + 1
                    });
                }
            }
        }

        return {
            path: null,
            distance: null,
            algorithm: 'bfs',
            visited: visited.size,
            sourceId,
            targetId
        };
    }

    /**
     * A* algorithm with heuristic
     */
    aStar(sourceId, targetId, options = {}) {
        const { nodes, edges } = store.getState();
        const { weightProperty = null, heuristicFunction } = options;

        const graph = this.buildWeightedGraph(nodes, edges, weightProperty);
        const nodeMap = new Map(nodes.map(node => [node.id, node]));

        // Default heuristic: Euclidean distance if nodes have coordinates
        const heuristic = heuristicFunction || ((nodeId1, nodeId2) => {
            const node1 = nodeMap.get(nodeId1);
            const node2 = nodeMap.get(nodeId2);

            if (node1?.x !== undefined && node1?.y !== undefined &&
                node2?.x !== undefined && node2?.y !== undefined) {
                return Math.sqrt(
                    Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2)
                );
            }

            // Fallback: connection-based heuristic
            return this.getConnectionDistance(nodeId1, nodeId2);
        });

        const openSet = new Set([sourceId]);
        const closedSet = new Set();
        const gScore = new Map([[sourceId, 0]]);
        const fScore = new Map([[sourceId, heuristic(sourceId, targetId)]]);
        const cameFrom = new Map();

        while (openSet.size > 0) {
            // Find node with lowest fScore
            let current = null;
            let lowestF = Infinity;

            for (const nodeId of openSet) {
                const f = fScore.get(nodeId) || Infinity;
                if (f < lowestF) {
                    lowestF = f;
                    current = nodeId;
                }
            }

            if (current === targetId) {
                const path = this.reconstructPath(cameFrom, sourceId, targetId);
                return {
                    path,
                    distance: gScore.get(targetId),
                    algorithm: 'astar',
                    visited: closedSet.size,
                    sourceId,
                    targetId
                };
            }

            openSet.delete(current);
            closedSet.add(current);

            const neighbors = graph.get(current) || [];
            for (const { nodeId: neighbor, weight } of neighbors) {
                if (closedSet.has(neighbor)) {continue;}

                const tentativeG = gScore.get(current) + weight;

                if (!openSet.has(neighbor)) {
                    openSet.add(neighbor);
                } else if (tentativeG >= (gScore.get(neighbor) || Infinity)) {
                    continue;
                }

                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeG);
                fScore.set(neighbor, tentativeG + heuristic(neighbor, targetId));
            }
        }

        return {
            path: null,
            distance: null,
            algorithm: 'astar',
            visited: closedSet.size,
            sourceId,
            targetId
        };
    }

    /**
     * Bidirectional search
     */
    bidirectionalSearch(sourceId, targetId, options = {}) {
        const { nodes, edges } = store.getState();
        const { maxDistance = Infinity } = options;

        const graph = this.buildGraph(nodes, edges);

        // Forward search from source
        const forwardQueue = [{ nodeId: sourceId, path: [sourceId], distance: 0 }];
        const forwardVisited = new Map([[sourceId, { path: [sourceId], distance: 0 }]]);

        // Backward search from target
        const backwardQueue = [{ nodeId: targetId, path: [targetId], distance: 0 }];
        const backwardVisited = new Map([[targetId, { path: [targetId], distance: 0 }]]);

        while (forwardQueue.length > 0 || backwardQueue.length > 0) {
            // Expand forward search
            if (forwardQueue.length > 0) {
                const { nodeId, path, distance } = forwardQueue.shift();

                if (backwardVisited.has(nodeId)) {
                    // Found intersection
                    const backwardData = backwardVisited.get(nodeId);
                    const completePath = [
                        ...path,
                        ...backwardData.path.slice(1).reverse()
                    ];
                    const totalDistance = distance + backwardData.distance;

                    return {
                        path: completePath,
                        distance: totalDistance,
                        algorithm: 'bidirectional',
                        visited: forwardVisited.size + backwardVisited.size,
                        sourceId,
                        targetId
                    };
                }

                if (distance < maxDistance) {
                    const neighbors = graph.get(nodeId) || [];
                    for (const neighborId of neighbors) {
                        if (!forwardVisited.has(neighborId)) {
                            const newPath = [...path, neighborId];
                            const newDistance = distance + 1;
                            forwardVisited.set(neighborId, { path: newPath, distance: newDistance });
                            forwardQueue.push({ nodeId: neighborId, path: newPath, distance: newDistance });
                        }
                    }
                }
            }

            // Expand backward search
            if (backwardQueue.length > 0) {
                const { nodeId, path, distance } = backwardQueue.shift();

                if (forwardVisited.has(nodeId)) {
                    // Found intersection
                    const forwardData = forwardVisited.get(nodeId);
                    const completePath = [
                        ...forwardData.path,
                        ...path.slice(1).reverse()
                    ];
                    const totalDistance = forwardData.distance + distance;

                    return {
                        path: completePath,
                        distance: totalDistance,
                        algorithm: 'bidirectional',
                        visited: forwardVisited.size + backwardVisited.size,
                        sourceId,
                        targetId
                    };
                }

                if (distance < maxDistance) {
                    const neighbors = graph.get(nodeId) || [];
                    for (const neighborId of neighbors) {
                        if (!backwardVisited.has(neighborId)) {
                            const newPath = [...path, neighborId];
                            const newDistance = distance + 1;
                            backwardVisited.set(neighborId, { path: newPath, distance: newDistance });
                            backwardQueue.push({ nodeId: neighborId, path: newPath, distance: newDistance });
                        }
                    }
                }
            }
        }

        return {
            path: null,
            distance: null,
            algorithm: 'bidirectional',
            visited: forwardVisited.size + backwardVisited.size,
            sourceId,
            targetId
        };
    }

    /**
     * Find multiple alternative paths
     */
    findAlternativePaths(sourceId, targetId, options = {}) {
        const { maxPaths = 3, diversityThreshold = 0.5 } = options;
        const paths = [];

        // Get primary path
        const primaryPath = this.findPath(sourceId, targetId, this.currentAlgorithm, options);
        if (primaryPath.path) {
            paths.push(primaryPath);
        }

        // Find alternative paths by temporarily removing edges
        const { edges } = store.getState();
        const originalEdges = [...edges];

        for (let i = 1; i < maxPaths && primaryPath.path; i++) {
            // Remove edges from the primary path
            const edgesToRemove = this.getPathEdges(primaryPath.path);
            const filteredEdges = originalEdges.filter(edge =>
                !edgesToRemove.some(pathEdge =>
                    (edge.source === pathEdge.source && edge.target === pathEdge.target) ||
                    (edge.source === pathEdge.target && edge.target === pathEdge.source)
                )
            );

            // Temporarily update store
            store.setState({ edges: filteredEdges }, false);

            // Find alternative path
            const altPath = this.findPath(sourceId, targetId, this.currentAlgorithm, options);

            if (altPath.path && this.isPathDiverse(altPath.path, paths, diversityThreshold)) {
                paths.push(altPath);
            }
        }

        // Restore original edges
        store.setState({ edges: originalEdges }, false);

        return paths;
    }

    /**
     * Find all simple paths between two nodes
     */
    findAllSimplePaths(sourceId, targetId, maxLength = 10) {
        const { nodes, edges } = store.getState();
        const graph = this.buildGraph(nodes, edges);
        const allPaths = [];

        const dfs = (currentId, target, path, visited) => {
            if (path.length > maxLength) {return;}
            if (currentId === target) {
                allPaths.push([...path]);
                return;
            }

            const neighbors = graph.get(currentId) || [];
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    path.push(neighborId);
                    dfs(neighborId, target, path, visited);
                    path.pop();
                    visited.delete(neighborId);
                }
            }
        };

        dfs(sourceId, targetId, [sourceId], new Set([sourceId]));

        // Sort by length
        allPaths.sort((a, b) => a.length - b.length);

        return allPaths.map(path => ({
            path,
            distance: path.length - 1,
            algorithm: 'all-simple-paths'
        }));
    }

    /**
     * Build unweighted graph adjacency list
     */
    buildGraph(nodes, edges) {
        const graph = new Map();

        // Initialize all nodes
        nodes.forEach(node => {
            graph.set(node.id, []);
        });

        // Add edges
        edges.forEach(edge => {
            const sourceList = graph.get(edge.source) || [];
            const targetList = graph.get(edge.target) || [];

            sourceList.push(edge.target);
            targetList.push(edge.source); // Assuming undirected graph

            graph.set(edge.source, sourceList);
            graph.set(edge.target, targetList);
        });

        return graph;
    }

    /**
     * Build weighted graph adjacency list
     */
    buildWeightedGraph(nodes, edges, weightProperty = null) {
        const graph = new Map();

        // Initialize all nodes
        nodes.forEach(node => {
            graph.set(node.id, []);
        });

        // Add weighted edges
        edges.forEach(edge => {
            const weight = weightProperty && edge[weightProperty]
                ? parseFloat(edge[weightProperty])
                : 1;

            const sourceList = graph.get(edge.source) || [];
            const targetList = graph.get(edge.target) || [];

            sourceList.push({ nodeId: edge.target, weight });
            targetList.push({ nodeId: edge.source, weight }); // Undirected

            graph.set(edge.source, sourceList);
            graph.set(edge.target, targetList);
        });

        return graph;
    }

    /**
     * Reconstruct path from previous nodes map
     */
    reconstructPath(previous, sourceId, targetId) {
        const path = [];
        let current = targetId;

        while (current !== undefined) {
            path.unshift(current);
            current = previous.get(current);
        }

        return path[0] === sourceId ? path : null;
    }

    /**
     * Get connection-based distance between nodes (heuristic)
     */
    getConnectionDistance(nodeId1, nodeId2) {
        // Simple heuristic based on node IDs or properties
        // In a real application, this could use more sophisticated metrics
        return Math.abs(nodeId1.toString().length - nodeId2.toString().length) + 1;
    }

    /**
     * Get edges that form a path
     */
    getPathEdges(path) {
        const edges = [];
        for (let i = 0; i < path.length - 1; i++) {
            edges.push({
                source: path[i],
                target: path[i + 1]
            });
        }
        return edges;
    }

    /**
     * Check if a path is diverse enough from existing paths
     */
    isPathDiverse(newPath, existingPaths, threshold) {
        for (const existingPath of existingPaths) {
            const similarity = this.calculatePathSimilarity(newPath, existingPath.path);
            if (similarity > threshold) {
                return false;
            }
        }
        return true;
    }

    /**
     * Calculate similarity between two paths (Jaccard similarity)
     */
    calculatePathSimilarity(path1, path2) {
        const set1 = new Set(path1);
        const set2 = new Set(path2);

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    /**
     * Display path in visualization
     */
    displayPath(pathResult) {
        if (!pathResult.path) {return;}

        document.dispatchEvent(new CustomEvent('showShortestPath', {
            detail: {
                path: pathResult.path,
                distance: pathResult.distance,
                algorithm: pathResult.algorithm,
                visited: pathResult.visited,
                sourceId: pathResult.sourceId,
                targetId: pathResult.targetId
            }
        }));
    }

    /**
     * Cache path result
     */
    cachePathResult(key, result) {
        if (this.pathCache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.pathCache.keys().next().value;
            this.pathCache.delete(firstKey);
        }

        this.pathCache.set(key, result);
    }

    /**
     * Add path to history
     */
    addToHistory(pathInfo) {
        this.pathHistory.unshift(pathInfo);

        if (this.pathHistory.length > this.maxHistorySize) {
            this.pathHistory = this.pathHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Update pathfinding UI state
     */
    updatePathFindingUI() {
        document.dispatchEvent(new CustomEvent('pathFindingStateUpdated', {
            detail: {
                source: this.pathSource,
                target: this.pathTarget,
                hasSource: !!this.pathSource,
                hasTarget: !!this.pathTarget,
                canFindPath: !!(this.pathSource && this.pathTarget)
            }
        }));
    }

    /**
     * Clear all paths and reset state
     */
    clearAllPaths() {
        this.pathSource = null;
        this.pathTarget = null;
        this.updatePathFindingUI();

        document.dispatchEvent(new CustomEvent('clearAllPaths'));

        console.log('🧹 All paths cleared');
    }

    /**
     * Get path statistics
     */
    getPathStatistics() {
        return {
            cacheSize: this.pathCache.size,
            maxCacheSize: this.maxCacheSize,
            historySize: this.pathHistory.length,
            maxHistorySize: this.maxHistorySize,
            currentAlgorithm: this.currentAlgorithm,
            availableAlgorithms: Object.keys(this.algorithms)
        };
    }

    /**
     * Analyze graph connectivity
     */
    analyzeConnectivity() {
        const { nodes, edges } = store.getState();
        const graph = this.buildGraph(nodes, edges);

        // Find connected components
        const components = [];
        const visited = new Set();

        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const component = [];
                const queue = [node.id];

                while (queue.length > 0) {
                    const currentId = queue.shift();
                    if (visited.has(currentId)) {continue;}

                    visited.add(currentId);
                    component.push(currentId);

                    const neighbors = graph.get(currentId) || [];
                    neighbors.forEach(neighborId => {
                        if (!visited.has(neighborId)) {
                            queue.push(neighborId);
                        }
                    });
                }

                components.push(component);
            }
        });

        // Calculate statistics
        const componentSizes = components.map(comp => comp.length);
        const largestComponent = Math.max(...componentSizes);
        const totalNodes = nodes.length;
        const totalEdges = edges.length;
        const density = totalNodes > 1 ? (2 * totalEdges) / (totalNodes * (totalNodes - 1)) : 0;

        return {
            totalNodes,
            totalEdges,
            density,
            numComponents: components.length,
            componentSizes,
            largestComponent,
            largestComponentRatio: largestComponent / totalNodes,
            isConnected: components.length === 1,
            components: components.map(comp => ({
                size: comp.length,
                nodes: comp
            }))
        };
    }

    /**
     * Set pathfinding algorithm
     */
    setAlgorithm(algorithm) {
        if (this.algorithms[algorithm]) {
            this.currentAlgorithm = algorithm;
            console.log(`🔄 Pathfinding algorithm set to: ${algorithm}`);
        } else {
            console.warn(`Unknown algorithm: ${algorithm}`);
        }
    }

    /**
     * Get path history
     */
    getPathHistory() {
        return [...this.pathHistory];
    }

    /**
     * Clear path cache
     */
    clearCache() {
        this.pathCache.clear();
        console.log('🧹 Path cache cleared');
    }

    /**
     * Export path data
     */
    exportPathData() {
        return {
            history: this.pathHistory,
            statistics: this.getPathStatistics(),
            connectivity: this.analyzeConnectivity(),
            timestamp: Date.now()
        };
    }

    /**
     * Destroy the path finder
     */
    destroy() {
        this.clearAllPaths();
        this.clearCache();
        this.pathHistory = [];
        console.log('🗑️ PathFinder destroyed');
    }
}

export default PathFinder;
