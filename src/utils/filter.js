/**
 * Filter Utility
 * Provides filtering functionality for graph data manipulation
 */
import { store } from '../core/store.js';

export class Filter {
    constructor() {
        this.activeFilters = new Map();
        this.filterHistory = [];
        this.maxHistorySize = 20;
    }

    /**
     * Apply multiple filters to graph data
     */
    applyFilters(filterConfig = {}) {
        const { nodes, edges } = store.getState();

        let filteredNodes = [...nodes];
        let filteredEdges = [...edges];

        // Apply node filters
        if (filterConfig.nodes) {
            filteredNodes = this.filterNodes(filteredNodes, filterConfig.nodes);
        }

        // Apply edge filters
        if (filterConfig.edges) {
            filteredEdges = this.filterEdges(filteredEdges, filterConfig.edges);
        }

        // Filter edges based on filtered nodes (remove edges with missing nodes)
        if (filterConfig.cascadeEdges !== false) {
            const nodeIds = new Set(filteredNodes.map(n => n.id));
            filteredEdges = filteredEdges.filter(edge =>
                nodeIds.has(edge.source) && nodeIds.has(edge.target)
            );
        }

        return { nodes: filteredNodes, edges: filteredEdges };
    }

    /**
     * Filter nodes based on criteria
     */
    filterNodes(nodes, criteria) {
        return nodes.filter(node => this.nodeMatchesCriteria(node, criteria));
    }

    /**
     * Filter edges based on criteria
     */
    filterEdges(edges, criteria) {
        return edges.filter(edge => this.edgeMatchesCriteria(edge, criteria));
    }

    /**
     * Check if node matches filter criteria
     */
    nodeMatchesCriteria(node, criteria) {
        for (const [filterType, filterValue] of Object.entries(criteria)) {
            if (!this.applyNodeFilter(node, filterType, filterValue)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if edge matches filter criteria
     */
    edgeMatchesCriteria(edge, criteria) {
        for (const [filterType, filterValue] of Object.entries(criteria)) {
            if (!this.applyEdgeFilter(edge, filterType, filterValue)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Apply specific filter to a node
     */
    applyNodeFilter(node, filterType, filterValue) {
        switch (filterType) {
        case 'type':
            return this.filterByType(node.type, filterValue);

        case 'label':
            return this.filterByText(node.label, filterValue);

        case 'id':
            return this.filterById(node.id, filterValue);

        case 'properties':
            return this.filterByProperties(node.properties || {}, filterValue);

        case 'connections':
            return this.filterByConnectionCount(node.id, filterValue);

        case 'degree':
            return this.filterByDegree(node.id, filterValue);

        case 'custom':
            return this.filterByCustomFunction(node, filterValue);

        default:
            return true;
        }
    }

    /**
     * Apply specific filter to an edge
     */
    applyEdgeFilter(edge, filterType, filterValue) {
        switch (filterType) {
        case 'type':
            return this.filterByType(edge.type, filterValue);

        case 'label':
            return this.filterByText(edge.label, filterValue);

        case 'id':
            return this.filterById(edge.id, filterValue);

        case 'properties':
            return this.filterByProperties(edge.properties || {}, filterValue);

        case 'source':
            return this.filterById(edge.source, filterValue);

        case 'target':
            return this.filterById(edge.target, filterValue);

        case 'custom':
            return this.filterByCustomFunction(edge, filterValue);

        default:
            return true;
        }
    }

    /**
     * Filter by type (single value or array)
     */
    filterByType(itemType, filterValue) {
        if (Array.isArray(filterValue)) {
            return filterValue.includes(itemType);
        }
        if (typeof filterValue === 'object' && filterValue.operator) {
            return this.applyOperator(itemType, filterValue.value, filterValue.operator);
        }
        return itemType === filterValue;
    }

    /**
     * Filter by text content
     */
    filterByText(itemText, filterValue) {
        if (!itemText) {return !filterValue;}

        if (typeof filterValue === 'string') {
            return itemText.toLowerCase().includes(filterValue.toLowerCase());
        }

        if (typeof filterValue === 'object') {
            const { value, operator = 'contains', caseSensitive = false } = filterValue;
            const text = caseSensitive ? itemText : itemText.toLowerCase();
            const searchValue = caseSensitive ? value : value.toLowerCase();

            switch (operator) {
            case 'equals':
                return text === searchValue;
            case 'contains':
                return text.includes(searchValue);
            case 'startsWith':
                return text.startsWith(searchValue);
            case 'endsWith':
                return text.endsWith(searchValue);
            case 'regex':
                return new RegExp(value, caseSensitive ? 'g' : 'gi').test(itemText);
            default:
                return text.includes(searchValue);
            }
        }

        return false;
    }

    /**
     * Filter by ID
     */
    filterById(itemId, filterValue) {
        if (Array.isArray(filterValue)) {
            return filterValue.includes(itemId);
        }
        if (typeof filterValue === 'object' && filterValue.operator) {
            return this.applyOperator(itemId, filterValue.value, filterValue.operator);
        }
        return itemId === filterValue;
    }

    /**
     * Filter by properties
     */
    filterByProperties(itemProperties, filterValue) {
        if (typeof filterValue !== 'object') {return false;}

        for (const [propKey, propFilter] of Object.entries(filterValue)) {
            if (!itemProperties.hasOwnProperty(propKey)) {
                return false;
            }

            const propValue = itemProperties[propKey];

            if (typeof propFilter === 'object' && propFilter.operator) {
                if (!this.applyOperator(propValue, propFilter.value, propFilter.operator)) {
                    return false;
                }
            } else {
                if (propValue !== propFilter) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Filter by connection count
     */
    filterByConnectionCount(nodeId, filterValue) {
        const { edges } = store.getState();
        const connectionCount = edges.filter(edge =>
            edge.source === nodeId || edge.target === nodeId
        ).length;

        if (typeof filterValue === 'number') {
            return connectionCount === filterValue;
        }

        if (typeof filterValue === 'object') {
            return this.applyOperator(connectionCount, filterValue.value, filterValue.operator);
        }

        return false;
    }

    /**
     * Filter by degree (in, out, or both)
     */
    filterByDegree(nodeId, filterValue) {
        const { edges } = store.getState();

        const inDegree = edges.filter(edge => edge.target === nodeId).length;
        const outDegree = edges.filter(edge => edge.source === nodeId).length;
        const totalDegree = inDegree + outDegree;

        const { type = 'total', operator = 'eq', value } = filterValue;

        let degreeValue;
        switch (type) {
        case 'in':
            degreeValue = inDegree;
            break;
        case 'out':
            degreeValue = outDegree;
            break;
        case 'total':
        default:
            degreeValue = totalDegree;
            break;
        }

        return this.applyOperator(degreeValue, value, operator);
    }

    /**
     * Filter by custom function
     */
    filterByCustomFunction(item, filterFunction) {
        if (typeof filterFunction !== 'function') {return true;}
        return filterFunction(item);
    }

    /**
     * Apply comparison operator
     */
    applyOperator(itemValue, filterValue, operator) {
        switch (operator) {
        case 'eq':
        case '=':
        case '==':
            return itemValue === filterValue;

        case 'ne':
        case '!=':
            return itemValue !== filterValue;

        case 'gt':
        case '>':
            return itemValue > filterValue;

        case 'gte':
        case '>=':
            return itemValue >= filterValue;

        case 'lt':
        case '<':
            return itemValue < filterValue;

        case 'lte':
        case '<=':
            return itemValue <= filterValue;

        case 'in':
            return Array.isArray(filterValue) && filterValue.includes(itemValue);

        case 'nin':
            return Array.isArray(filterValue) && !filterValue.includes(itemValue);

        case 'between':
            return Array.isArray(filterValue) &&
                       filterValue.length === 2 &&
                       itemValue >= filterValue[0] &&
                       itemValue <= filterValue[1];

        case 'contains':
            return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());

        case 'startsWith':
            return String(itemValue).toLowerCase().startsWith(String(filterValue).toLowerCase());

        case 'endsWith':
            return String(itemValue).toLowerCase().endsWith(String(filterValue).toLowerCase());

        case 'regex':
            return new RegExp(filterValue, 'i').test(String(itemValue));

        default:
            return itemValue === filterValue;
        }
    }

    /**
     * Create a named filter set
     */
    createFilterSet(name, config) {
        this.activeFilters.set(name, {
            config,
            created: new Date().toISOString(),
            active: true
        });

        this.addToHistory({ name, config, action: 'create' });
        return this.applyFilters(config);
    }

    /**
     * Update existing filter set
     */
    updateFilterSet(name, config) {
        if (!this.activeFilters.has(name)) {
            throw new Error(`Filter set '${name}' not found`);
        }

        this.activeFilters.set(name, {
            ...this.activeFilters.get(name),
            config,
            updated: new Date().toISOString()
        });

        this.addToHistory({ name, config, action: 'update' });
        return this.applyAllActiveFilters();
    }

    /**
     * Remove filter set
     */
    removeFilterSet(name) {
        if (this.activeFilters.has(name)) {
            const filterSet = this.activeFilters.get(name);
            this.activeFilters.delete(name);
            this.addToHistory({ name, config: filterSet.config, action: 'remove' });
        }

        return this.applyAllActiveFilters();
    }

    /**
     * Toggle filter set active state
     */
    toggleFilterSet(name, active = null) {
        if (!this.activeFilters.has(name)) {return null;}

        const filterSet = this.activeFilters.get(name);
        const newActiveState = active !== null ? active : !filterSet.active;

        this.activeFilters.set(name, {
            ...filterSet,
            active: newActiveState
        });

        this.addToHistory({ name, config: filterSet.config, action: newActiveState ? 'activate' : 'deactivate' });
        return this.applyAllActiveFilters();
    }

    /**
     * Apply all active filter sets
     */
    applyAllActiveFilters() {
        const { nodes, edges } = store.getState();
        let result = { nodes: [...nodes], edges: [...edges] };

        for (const [name, filterSet] of this.activeFilters.entries()) {
            if (filterSet.active) {
                result = this.applyFilters({
                    ...filterSet.config,
                    nodes: result.nodes,
                    edges: result.edges
                });
            }
        }

        return result;
    }

    /**
     * Get all active filter sets
     */
    getActiveFilters() {
        const activeFilters = {};
        this.activeFilters.forEach((filterSet, name) => {
            if (filterSet.active) {
                activeFilters[name] = filterSet;
            }
        });
        return activeFilters;
    }

    /**
     * Get all filter sets (active and inactive)
     */
    getAllFilters() {
        const allFilters = {};
        this.activeFilters.forEach((filterSet, name) => {
            allFilters[name] = filterSet;
        });
        return allFilters;
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.activeFilters.clear();
        this.addToHistory({ action: 'clear_all' });

        const { nodes, edges } = store.getState();
        return { nodes, edges };
    }

    /**
     * Create common filters
     */
    createNodeTypeFilter(nodeTypes) {
        return this.createFilterSet('nodeType', {
            nodes: { type: nodeTypes }
        });
    }

    createConnectionFilter(minConnections = 0, maxConnections = null) {
        const connectionFilter = { operator: 'gte', value: minConnections };
        if (maxConnections !== null) {
            connectionFilter.operator = 'between';
            connectionFilter.value = [minConnections, maxConnections];
        }

        return this.createFilterSet('connections', {
            nodes: { connections: connectionFilter }
        });
    }

    createPropertyFilter(propertyName, propertyValue, operator = 'eq') {
        return this.createFilterSet(`property-${propertyName}`, {
            nodes: {
                properties: {
                    [propertyName]: { operator, value: propertyValue }
                }
            }
        });
    }

    createTextFilter(searchText, field = 'label') {
        return this.createFilterSet('textSearch', {
            nodes: {
                [field]: { value: searchText, operator: 'contains' }
            }
        });
    }

    /**
     * Create filter from search results
     */
    createFilterFromSearch(searchResults, name = 'searchFilter') {
        const nodeIds = searchResults.nodes.map(n => n.id);
        const edgeIds = searchResults.edges.map(e => e.id);

        return this.createFilterSet(name, {
            nodes: { id: nodeIds },
            edges: { id: edgeIds }
        });
    }

    /**
     * Export filters to JSON
     */
    exportFilters() {
        const filters = {};
        this.activeFilters.forEach((filterSet, name) => {
            filters[name] = {
                config: filterSet.config,
                active: filterSet.active,
                created: filterSet.created,
                updated: filterSet.updated
            };
        });
        return JSON.stringify(filters, null, 2);
    }

    /**
     * Import filters from JSON
     */
    importFilters(filtersJson) {
        try {
            const filters = JSON.parse(filtersJson);

            Object.entries(filters).forEach(([name, filterSet]) => {
                this.activeFilters.set(name, {
                    config: filterSet.config,
                    active: filterSet.active !== false,
                    created: filterSet.created || new Date().toISOString(),
                    updated: filterSet.updated,
                    imported: new Date().toISOString()
                });
            });

            this.addToHistory({ action: 'import', count: Object.keys(filters).length });
            return this.applyAllActiveFilters();
        } catch (error) {
            throw new Error('Invalid filter configuration JSON');
        }
    }

    /**
     * Get filter statistics
     */
    getFilterStats() {
        const { nodes, edges } = store.getState();
        const filtered = this.applyAllActiveFilters();

        return {
            original: {
                nodes: nodes.length,
                edges: edges.length
            },
            filtered: {
                nodes: filtered.nodes.length,
                edges: filtered.edges.length
            },
            reduction: {
                nodes: nodes.length - filtered.nodes.length,
                edges: edges.length - filtered.edges.length,
                nodesPercent: nodes.length > 0 ? ((1 - filtered.nodes.length / nodes.length) * 100).toFixed(1) : 0,
                edgesPercent: edges.length > 0 ? ((1 - filtered.edges.length / edges.length) * 100).toFixed(1) : 0
            },
            activeFilters: Array.from(this.activeFilters.keys()).filter(name =>
                this.activeFilters.get(name).active
            ).length
        };
    }

    /**
     * Add action to history
     */
    addToHistory(action) {
        this.filterHistory.unshift({
            ...action,
            timestamp: new Date().toISOString()
        });

        // Trim history to max size
        if (this.filterHistory.length > this.maxHistorySize) {
            this.filterHistory = this.filterHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Get filter history
     */
    getFilterHistory() {
        return [...this.filterHistory];
    }

    /**
     * Clear filter history
     */
    clearFilterHistory() {
        this.filterHistory = [];
    }
}

/**
 * Quick filter functions for common use cases
 */
export const QuickFilters = {
    /**
     * Show only nodes of specified types
     */
    byNodeType: (nodeTypes) => {
        if (!Array.isArray(nodeTypes)) {nodeTypes = [nodeTypes];}
        return { nodes: { type: nodeTypes } };
    },

    /**
     * Show only highly connected nodes
     */
    byHighConnectivity: (minConnections = 3) => {
        return { nodes: { connections: { operator: 'gte', value: minConnections } } };
    },

    /**
     * Show nodes matching text in label
     */
    byLabel: (searchText) => {
        return { nodes: { label: { value: searchText, operator: 'contains' } } };
    },

    /**
     * Show nodes with specific property values
     */
    byProperty: (propertyName, value, operator = 'eq') => {
        return {
            nodes: {
                properties: {
                    [propertyName]: { operator, value }
                }
            }
        };
    },

    /**
     * Show only leaf nodes (nodes with one or no connections)
     */
    leafNodes: () => {
        return { nodes: { connections: { operator: 'lte', value: 1 } } };
    },

    /**
     * Show only hub nodes (nodes with many connections)
     */
    hubNodes: (threshold = 5) => {
        return { nodes: { connections: { operator: 'gte', value: threshold } } };
    }
};

// Create and export singleton filter instance
export const filter = new Filter();
