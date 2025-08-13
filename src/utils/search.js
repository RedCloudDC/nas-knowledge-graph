/**
 * Search Utility
 * Provides comprehensive search and query functionality for graph data
 */
import { store } from '../core/store.js';

export class Search {
    constructor() {
        this.searchIndex = new Map();
        this.lastQuery = '';
        this.searchHistory = [];
        this.maxHistorySize = 50;
    }

    /**
     * Build search index for fast text searching
     */
    buildIndex(nodes, edges) {
        this.searchIndex.clear();

        // Index nodes
        nodes.forEach(node => {
            const searchableText = this.extractSearchableText(node);
            this.searchIndex.set(`node-${node.id}`, {
                id: node.id,
                type: 'node',
                text: searchableText,
                data: node
            });
        });

        // Index edges
        edges.forEach(edge => {
            const searchableText = this.extractSearchableText(edge);
            this.searchIndex.set(`edge-${edge.id}`, {
                id: edge.id,
                type: 'edge',
                text: searchableText,
                data: edge
            });
        });
    }

    /**
     * Extract searchable text from node or edge
     */
    extractSearchableText(item) {
        const texts = [];

        // Add basic properties
        if (item.label) {texts.push(item.label.toLowerCase());}
        if (item.type) {texts.push(item.type.toLowerCase());}
        if (item.id) {texts.push(String(item.id).toLowerCase());}

        // Add properties
        if (item.properties) {
            Object.entries(item.properties).forEach(([key, value]) => {
                texts.push(key.toLowerCase());
                texts.push(String(value).toLowerCase());
            });
        }

        return texts.join(' ');
    }

    /**
     * Perform text search across nodes and edges
     */
    textSearch(query, options = {}) {
        const {
            caseSensitive = false,
            exactMatch = false,
            searchNodes = true,
            searchEdges = true,
            limit = 100
        } = options;

        if (!query) {return [];}

        const searchQuery = caseSensitive ? query : query.toLowerCase();
        const results = [];

        this.searchIndex.forEach((item, key) => {
            if (!searchNodes && item.type === 'node') {return;}
            if (!searchEdges && item.type === 'edge') {return;}

            let matches = false;

            if (exactMatch) {
                matches = item.text.includes(searchQuery);
            } else {
                // Fuzzy matching
                matches = this.fuzzyMatch(item.text, searchQuery);
            }

            if (matches) {
                results.push({
                    ...item,
                    score: this.calculateRelevanceScore(item.text, searchQuery)
                });
            }

            if (results.length >= limit) {return false;} // Break iteration
        });

        // Sort by relevance score
        results.sort((a, b) => b.score - a.score);

        // Add to search history
        this.addToHistory(query);

        return results;
    }

    /**
     * Search nodes by specific criteria
     */
    searchNodes(criteria = {}) {
        const { nodes } = store.getState();

        return nodes.filter(node => {
            return this.matchesCriteria(node, criteria);
        });
    }

    /**
     * Search edges by specific criteria
     */
    searchEdges(criteria = {}) {
        const { edges } = store.getState();

        return edges.filter(edge => {
            return this.matchesCriteria(edge, criteria);
        });
    }

    /**
     * Find nodes by type
     */
    findNodesByType(nodeType) {
        const { nodes } = store.getState();
        return nodes.filter(node => node.type === nodeType);
    }

    /**
     * Find connected nodes
     */
    findConnectedNodes(nodeId, options = {}) {
        const { maxDepth = 1, direction = 'both' } = options;
        const { nodes, edges } = store.getState();

        const visited = new Set();
        const result = [];
        const queue = [{ id: nodeId, depth: 0 }];

        while (queue.length > 0) {
            const { id, depth } = queue.shift();

            if (visited.has(id) || depth > maxDepth) {continue;}
            visited.add(id);

            if (depth > 0) {
                const node = nodes.find(n => n.id === id);
                if (node) {result.push(node);}
            }

            if (depth < maxDepth) {
                const connections = this.getNodeConnections(id, edges, direction);
                connections.forEach(connectedId => {
                    if (!visited.has(connectedId)) {
                        queue.push({ id: connectedId, depth: depth + 1 });
                    }
                });
            }
        }

        return result;
    }

    /**
     * Find shortest path between nodes
     */
    findPath(sourceId, targetId, options = {}) {
        const { maxDepth = 10, weighted = false } = options;
        const { edges } = store.getState();

        if (sourceId === targetId) {return [sourceId];}

        const queue = [{ id: sourceId, path: [sourceId], depth: 0 }];
        const visited = new Set();

        while (queue.length > 0) {
            const { id, path, depth } = queue.shift();

            if (visited.has(id) || depth > maxDepth) {continue;}
            visited.add(id);

            const connections = this.getNodeConnections(id, edges, 'both');

            for (const connectedId of connections) {
                if (connectedId === targetId) {
                    return [...path, connectedId];
                }

                if (!visited.has(connectedId)) {
                    queue.push({
                        id: connectedId,
                        path: [...path, connectedId],
                        depth: depth + 1
                    });
                }
            }
        }

        return null; // No path found
    }

    /**
     * Advanced search with multiple filters
     */
    advancedSearch(filters = {}) {
        const {
            text = '',
            nodeTypes = [],
            edgeTypes = [],
            properties = {},
            dateRange = null,
            minConnections = null,
            maxConnections = null
        } = filters;

        let results = { nodes: [], edges: [] };

        // Start with text search if provided
        if (text) {
            const textResults = this.textSearch(text);
            results.nodes = textResults.filter(r => r.type === 'node').map(r => r.data);
            results.edges = textResults.filter(r => r.type === 'edge').map(r => r.data);
        } else {
            const state = store.getState();
            results.nodes = [...state.nodes];
            results.edges = [...state.edges];
        }

        // Apply node type filters
        if (nodeTypes.length > 0) {
            results.nodes = results.nodes.filter(node => nodeTypes.includes(node.type));
        }

        // Apply edge type filters
        if (edgeTypes.length > 0) {
            results.edges = results.edges.filter(edge => edgeTypes.includes(edge.type));
        }

        // Apply property filters
        if (Object.keys(properties).length > 0) {
            results.nodes = results.nodes.filter(node =>
                this.matchesProperties(node, properties)
            );
            results.edges = results.edges.filter(edge =>
                this.matchesProperties(edge, properties)
            );
        }

        // Apply connection count filters
        if (minConnections !== null || maxConnections !== null) {
            const { edges } = store.getState();
            results.nodes = results.nodes.filter(node => {
                const connectionCount = this.getNodeConnectionCount(node.id, edges);
                return (minConnections === null || connectionCount >= minConnections) &&
                       (maxConnections === null || connectionCount <= maxConnections);
            });
        }

        return results;
    }

    /**
     * Suggest search terms based on current data
     */
    getSuggestions(partialQuery, limit = 10) {
        if (!partialQuery) {return [];}

        const query = partialQuery.toLowerCase();
        const suggestions = new Set();

        this.searchIndex.forEach(item => {
            const words = item.text.split(' ');
            words.forEach(word => {
                if (word.startsWith(query) && word.length > query.length) {
                    suggestions.add(word);
                }
            });
        });

        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * Get search history
     */
    getSearchHistory() {
        return [...this.searchHistory].reverse();
    }

    /**
     * Clear search history
     */
    clearSearchHistory() {
        this.searchHistory = [];
    }

    /**
     * Helper methods
     */
    matchesCriteria(item, criteria) {
        for (const [key, value] of Object.entries(criteria)) {
            if (!this.matchesCriterion(item, key, value)) {
                return false;
            }
        }
        return true;
    }

    matchesCriterion(item, key, value) {
        if (key === 'text') {
            const searchableText = this.extractSearchableText(item);
            return this.fuzzyMatch(searchableText, value.toLowerCase());
        }

        if (key === 'type') {
            return Array.isArray(value) ? value.includes(item.type) : item.type === value;
        }

        if (key === 'id') {
            return Array.isArray(value) ? value.includes(item.id) : item.id === value;
        }

        if (key === 'properties') {
            return this.matchesProperties(item, value);
        }

        return item[key] === value;
    }

    matchesProperties(item, propertyFilters) {
        if (!item.properties) {return Object.keys(propertyFilters).length === 0;}

        for (const [propKey, propValue] of Object.entries(propertyFilters)) {
            if (!item.properties.hasOwnProperty(propKey)) {return false;}

            const itemValue = item.properties[propKey];

            if (typeof propValue === 'object' && propValue.operator) {
                if (!this.matchesOperator(itemValue, propValue.value, propValue.operator)) {
                    return false;
                }
            } else if (itemValue !== propValue) {
                return false;
            }
        }

        return true;
    }

    matchesOperator(itemValue, filterValue, operator) {
        switch (operator) {
        case 'eq': return itemValue === filterValue;
        case 'ne': return itemValue !== filterValue;
        case 'gt': return itemValue > filterValue;
        case 'gte': return itemValue >= filterValue;
        case 'lt': return itemValue < filterValue;
        case 'lte': return itemValue <= filterValue;
        case 'contains': return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'startsWith': return String(itemValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
        case 'endsWith': return String(itemValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
        case 'regex': return new RegExp(filterValue, 'i').test(String(itemValue));
        default: return itemValue === filterValue;
        }
    }

    getNodeConnections(nodeId, edges, direction = 'both') {
        const connections = [];

        edges.forEach(edge => {
            if (direction === 'both' || direction === 'out') {
                if (edge.source === nodeId) {connections.push(edge.target);}
            }
            if (direction === 'both' || direction === 'in') {
                if (edge.target === nodeId) {connections.push(edge.source);}
            }
        });

        return connections;
    }

    getNodeConnectionCount(nodeId, edges) {
        return edges.filter(edge =>
            edge.source === nodeId || edge.target === nodeId
        ).length;
    }

    fuzzyMatch(text, query) {
        // Simple fuzzy matching - checks if all query characters appear in order
        let queryIndex = 0;

        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                queryIndex++;
            }
        }

        return queryIndex === query.length;
    }

    calculateRelevanceScore(text, query) {
        let score = 0;

        // Exact match bonus
        if (text.includes(query)) {score += 100;}

        // Starting with query bonus
        if (text.startsWith(query)) {score += 50;}

        // Word boundary match bonus
        const words = text.split(' ');
        words.forEach(word => {
            if (word.startsWith(query)) {score += 25;}
            if (word === query) {score += 75;}
        });

        // Length penalty (prefer shorter matches)
        score -= text.length * 0.1;

        return Math.max(0, score);
    }

    addToHistory(query) {
        if (!query || query === this.lastQuery) {return;}

        // Remove existing entry if present
        const existingIndex = this.searchHistory.indexOf(query);
        if (existingIndex > -1) {
            this.searchHistory.splice(existingIndex, 1);
        }

        // Add to front
        this.searchHistory.unshift(query);

        // Trim to max size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }

        this.lastQuery = query;
    }

    /**
     * Search within node neighborhoods
     */
    searchNeighborhood(nodeId, query, depth = 1) {
        const connectedNodes = this.findConnectedNodes(nodeId, { maxDepth: depth });

        if (!query) {return connectedNodes;}

        return connectedNodes.filter(node => {
            const searchableText = this.extractSearchableText(node);
            return this.fuzzyMatch(searchableText, query.toLowerCase());
        });
    }

    /**
     * Create saved search
     */
    saveSearch(name, filters) {
        const savedSearches = this.getSavedSearches();
        savedSearches[name] = {
            filters,
            created: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        localStorage.setItem('kg-saved-searches', JSON.stringify(savedSearches));
    }

    /**
     * Get saved searches
     */
    getSavedSearches() {
        try {
            return JSON.parse(localStorage.getItem('kg-saved-searches') || '{}');
        } catch {
            return {};
        }
    }

    /**
     * Execute saved search
     */
    executeSavedSearch(name) {
        const savedSearches = this.getSavedSearches();
        const search = savedSearches[name];

        if (!search) {throw new Error(`Saved search '${name}' not found`);}

        // Update last used
        search.lastUsed = new Date().toISOString();
        localStorage.setItem('kg-saved-searches', JSON.stringify(savedSearches));

        return this.advancedSearch(search.filters);
    }

    /**
     * Update search index when data changes
     */
    updateIndex() {
        const { nodes, edges } = store.getState();
        this.buildIndex(nodes, edges);
    }
}

// Create and export singleton search instance
export const search = new Search();

// Initialize search index when store changes
store.subscribe('nodes', () => search.updateIndex());
store.subscribe('edges', () => search.updateIndex());
