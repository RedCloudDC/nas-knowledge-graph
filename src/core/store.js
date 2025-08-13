/**
 * Central State Store
 * Simple observable pattern for state management
 */
export class Store {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.listeners = new Map();
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Update state and notify listeners
     */
    setState(updates, notify = true) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };

        if (notify) {
            this.notifyListeners(oldState, this.state);
        }
    }

    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Notify all listeners of state changes
     */
    notifyListeners(oldState, newState) {
        this.listeners.forEach((callbacks, key) => {
            // Check if the specific state key has changed
            if (oldState[key] !== newState[key]) {
                callbacks.forEach(callback => {
                    callback(newState[key], oldState[key], newState);
                });
            }
        });

        // Notify general listeners (subscribed to '*')
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                callback(newState, oldState);
            });
        }
    }

    /**
     * Reset store to initial state
     */
    reset(initialState = {}) {
        this.setState(initialState, false);
        this.state = { ...initialState };
        this.notifyListeners({}, this.state);
    }
}

// Create and export singleton store instance
export const store = new Store({
    // Graph data
    nodes: [],
    edges: [],

    // UI state
    selectedNode: null,
    selectedEdge: null,
    viewMode: 'graph', // 'graph', 'analysis'
    sidePanel: {
        visible: true,
        activeTab: 'details' // 'details', 'analysis', 'filters'
    },

    // Graph view state
    graphView: {
        zoom: 1,
        center: { x: 400, y: 300 },
        layout: 'force' // 'force', 'circular', 'hierarchical'
    },

    // Filters
    filters: {
        nodeTypes: [],
        searchTerm: '',
        dateRange: null
    },

    // Loading states
    loading: {
        data: false,
        analysis: false
    }
});
