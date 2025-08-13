/**
 * URL State Manager
 * Manages URL hash for persisting and sharing filter states, search queries, and view settings
 */

import { store } from '../core/store.js';

export class URLStateManager {
    constructor() {
        this.stateVersion = '1.0';
        this.maxUrlLength = 2048; // Browser URL length limit
        this.compressionEnabled = true;
        this.debounceDelay = 500;
        this.updateTimeout = null;

        this.stateKeys = {
            // Filter states
            filters: 'f',
            search: 's',
            selectedNode: 'n',
            selectedEdge: 'e',

            // View states
            graphView: 'v',
            sidePanel: 'p',
            theme: 't',
            layout: 'l',

            // Explorer states
            exploredNodes: 'ex',
            pathfinding: 'pf',

            // Data states
            dataSource: 'd',
            timestamp: 'ts'
        };

        this.reverseStateKeys = Object.fromEntries(
            Object.entries(this.stateKeys).map(([key, value]) => [value, key])
        );

        this.init();
    }

    /**
     * Initialize the URL state manager
     */
    init() {
        // Load state from URL on initialization
        this.loadStateFromUrl();

        // Setup event listeners
        this.setupEventListeners();

        // Setup store subscriptions
        this.setupStoreSubscriptions();

        console.log('🔗 URL State Manager initialized');
    }

    /**
     * Setup event listeners for browser navigation and custom events
     */
    setupEventListeners() {
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.appState) {
                this.restoreState(e.state.appState);
            } else {
                this.loadStateFromUrl();
            }
        });

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.loadStateFromUrl();
        });

        // Listen for filter changes
        document.addEventListener('filtersApplied', (e) => {
            this.updateUrlState('filters', e.detail.filterState);
        });

        // Listen for search changes
        document.addEventListener('globalSearch', (e) => {
            this.updateUrlState('search', {
                query: e.detail.query,
                scope: e.detail.scope,
                timestamp: e.detail.timestamp
            });
        });

        // Listen for view changes
        document.addEventListener('layoutChange', (e) => {
            this.updateUrlState('layout', e.detail.layout);
        });

        // Listen for node selections
        document.addEventListener('nodeSelected', (e) => {
            this.updateUrlState('selectedNode', e.detail.nodeId);
        });

        // Listen for exploration state changes
        document.addEventListener('explorationStateChanged', (e) => {
            this.updateUrlState('exploredNodes', Array.from(e.detail.exploredNodes));
        });
    }

    /**
     * Setup store subscriptions to track state changes
     */
    setupStoreSubscriptions() {
        // Track selected node changes
        store.subscribe('selectedNode', (node) => {
            const nodeId = node ? node.id : null;
            this.updateUrlState('selectedNode', nodeId);
        });

        // Track graph view changes
        store.subscribe('graphView', (graphView) => {
            this.updateUrlState('graphView', {
                zoom: graphView.zoom,
                center: graphView.center,
                layout: graphView.layout
            });
        });

        // Track side panel state
        store.subscribe('sidePanel', (sidePanel) => {
            this.updateUrlState('sidePanel', {
                visible: sidePanel.visible,
                activeTab: sidePanel.activeTab
            });
        });
    }

    /**
     * Update URL state with new data
     */
    updateUrlState(key, value, immediate = false) {
        // Clear existing timeout
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        // Update state immediately or with debounce
        const updateFn = () => {
            this.setUrlState(key, value);
        };

        if (immediate) {
            updateFn();
        } else {
            this.updateTimeout = setTimeout(updateFn, this.debounceDelay);
        }
    }

    /**
     * Set URL state for a specific key
     */
    setUrlState(key, value) {
        try {
            const currentState = this.parseUrlHash();

            if (value === null || value === undefined ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'object' && Object.keys(value).length === 0)) {
                delete currentState[this.stateKeys[key]];
            } else {
                currentState[this.stateKeys[key]] = value;
            }

            currentState[this.stateKeys.timestamp] = Date.now();

            const newHash = this.buildUrlHash(currentState);

            // Check URL length limit
            if (newHash.length > this.maxUrlLength) {
                console.warn('URL state too long, applying compression');
                const compressedState = this.compressState(currentState);
                const compressedHash = this.buildUrlHash(compressedState);

                if (compressedHash.length <= this.maxUrlLength) {
                    this.setUrlHash(compressedHash);
                } else {
                    console.error('State too large even after compression');
                }
            } else {
                this.setUrlHash(newHash);
            }

            // Update browser history
            this.pushStateToHistory(currentState);

        } catch (error) {
            console.error('Failed to update URL state:', error);
        }
    }

    /**
     * Load complete state from current URL
     */
    loadStateFromUrl() {
        try {
            const urlState = this.parseUrlHash();
            const appState = this.convertToAppState(urlState);

            if (Object.keys(appState).length > 0) {
                this.applyStateToApp(appState);
                console.log('📥 Loaded state from URL:', appState);
            }
        } catch (error) {
            console.error('Failed to load state from URL:', error);
        }
    }

    /**
     * Parse URL hash into state object
     */
    parseUrlHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) {return {};}

        try {
            // Handle compressed state
            if (hash.startsWith('c:')) {
                return this.decompressState(hash.substring(2));
            }

            // Handle base64 encoded state
            if (this.isBase64(hash)) {
                const decoded = atob(hash);
                return JSON.parse(decoded);
            }

            // Handle URL parameters format
            const params = new URLSearchParams(hash);
            const state = {};

            for (const [key, value] of params.entries()) {
                try {
                    state[key] = JSON.parse(decodeURIComponent(value));
                } catch {
                    state[key] = decodeURIComponent(value);
                }
            }

            return state;
        } catch (error) {
            console.warn('Failed to parse URL hash:', error);
            return {};
        }
    }

    /**
     * Build URL hash from state object
     */
    buildUrlHash(state) {
        if (Object.keys(state).length === 0) {return '';}

        try {
            // Try base64 encoding first (most compact)
            const json = JSON.stringify(state);
            const base64 = btoa(json);

            if (base64.length < this.maxUrlLength) {
                return base64;
            }

            // Fall back to URL parameters format
            const params = new URLSearchParams();

            for (const [key, value] of Object.entries(state)) {
                if (value !== null && value !== undefined) {
                    const serialized = typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value);
                    params.set(key, serialized);
                }
            }

            return params.toString();
        } catch (error) {
            console.error('Failed to build URL hash:', error);
            return '';
        }
    }

    /**
     * Set URL hash without triggering hashchange event
     */
    setUrlHash(hash) {
        const currentHash = window.location.hash.substring(1);
        if (currentHash !== hash) {
            // Use replaceState to avoid triggering navigation
            const newUrl = hash ? `${window.location.pathname}#${hash}` : window.location.pathname;
            window.history.replaceState(null, '', newUrl);
        }
    }

    /**
     * Push current state to browser history
     */
    pushStateToHistory(state) {
        const appState = this.convertToAppState(state);

        window.history.replaceState(
            { appState, timestamp: Date.now() },
            document.title,
            window.location.href
        );
    }

    /**
     * Convert URL state keys to application state keys
     */
    convertToAppState(urlState) {
        const appState = {};

        for (const [shortKey, value] of Object.entries(urlState)) {
            const fullKey = this.reverseStateKeys[shortKey];
            if (fullKey) {
                appState[fullKey] = value;
            }
        }

        return appState;
    }

    /**
     * Apply loaded state to application
     */
    applyStateToApp(appState) {
        // Apply filters
        if (appState.filters) {
            document.dispatchEvent(new CustomEvent('applyUrlFilters', {
                detail: { filters: appState.filters }
            }));
        }

        // Apply search
        if (appState.search) {
            document.dispatchEvent(new CustomEvent('applyUrlSearch', {
                detail: appState.search
            }));
        }

        // Apply selected node
        if (appState.selectedNode) {
            store.setState({
                selectedNode: this.findNodeById(appState.selectedNode)
            });
        }

        // Apply graph view settings
        if (appState.graphView) {
            store.setState({ graphView: appState.graphView });
        }

        // Apply side panel settings
        if (appState.sidePanel) {
            store.setState({ sidePanel: appState.sidePanel });
        }

        // Apply theme
        if (appState.theme) {
            document.dispatchEvent(new CustomEvent('applyTheme', {
                detail: { theme: appState.theme }
            }));
        }

        // Apply layout
        if (appState.layout) {
            document.dispatchEvent(new CustomEvent('applyLayout', {
                detail: { layout: appState.layout }
            }));
        }

        // Apply exploration state
        if (appState.exploredNodes) {
            document.dispatchEvent(new CustomEvent('applyExplorationState', {
                detail: { exploredNodes: new Set(appState.exploredNodes) }
            }));
        }

        // Apply pathfinding state
        if (appState.pathfinding) {
            document.dispatchEvent(new CustomEvent('applyPathfindingState', {
                detail: appState.pathfinding
            }));
        }
    }

    /**
     * Find node by ID in store
     */
    findNodeById(nodeId) {
        const { nodes } = store.getState();
        return nodes.find(node => node.id.toString() === nodeId.toString());
    }

    /**
     * Compress state for shorter URLs
     */
    compressState(state) {
        const compressed = {};

        // Remove timestamp for compression
        const { ts, ...stateWithoutTimestamp } = state;

        // Compress common values
        for (const [key, value] of Object.entries(stateWithoutTimestamp)) {
            if (Array.isArray(value)) {
                // Only include non-empty arrays
                if (value.length > 0) {
                    compressed[key] = value;
                }
            } else if (typeof value === 'object' && value !== null) {
                // Only include objects with properties
                if (Object.keys(value).length > 0) {
                    compressed[key] = value;
                }
            } else if (value !== null && value !== undefined && value !== '') {
                compressed[key] = value;
            }
        }

        return compressed;
    }

    /**
     * Decompress state from compressed format
     */
    decompressState(compressedData) {
        try {
            // Simple decompression - in a full implementation,
            // you might use actual compression algorithms
            const decoded = atob(compressedData);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Failed to decompress state:', error);
            return {};
        }
    }

    /**
     * Check if string is base64 encoded
     */
    isBase64(str) {
        try {
            return btoa(atob(str)) === str;
        } catch {
            return false;
        }
    }

    /**
     * Generate shareable URL with current state
     */
    generateShareableUrl(options = {}) {
        const {
            includeView = true,
            includeFilters = true,
            includeSearch = true,
            includeSelection = true,
            includeExploration = false
        } = options;

        const currentState = this.parseUrlHash();
        const shareState = {};

        // Include version for compatibility
        shareState.v = this.stateVersion;

        // Conditionally include state components
        if (includeFilters && currentState[this.stateKeys.filters]) {
            shareState[this.stateKeys.filters] = currentState[this.stateKeys.filters];
        }

        if (includeSearch && currentState[this.stateKeys.search]) {
            shareState[this.stateKeys.search] = currentState[this.stateKeys.search];
        }

        if (includeSelection) {
            if (currentState[this.stateKeys.selectedNode]) {
                shareState[this.stateKeys.selectedNode] = currentState[this.stateKeys.selectedNode];
            }
            if (currentState[this.stateKeys.selectedEdge]) {
                shareState[this.stateKeys.selectedEdge] = currentState[this.stateKeys.selectedEdge];
            }
        }

        if (includeView) {
            if (currentState[this.stateKeys.graphView]) {
                shareState[this.stateKeys.graphView] = currentState[this.stateKeys.graphView];
            }
            if (currentState[this.stateKeys.layout]) {
                shareState[this.stateKeys.layout] = currentState[this.stateKeys.layout];
            }
            if (currentState[this.stateKeys.theme]) {
                shareState[this.stateKeys.theme] = currentState[this.stateKeys.theme];
            }
        }

        if (includeExploration && currentState[this.stateKeys.exploredNodes]) {
            shareState[this.stateKeys.exploredNodes] = currentState[this.stateKeys.exploredNodes];
        }

        shareState[this.stateKeys.timestamp] = Date.now();

        const hash = this.buildUrlHash(shareState);
        const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

        return hash ? `${baseUrl}#${hash}` : baseUrl;
    }

    /**
     * Copy shareable URL to clipboard
     */
    async copyShareableUrl(options = {}) {
        try {
            const url = this.generateShareableUrl(options);

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback for older browsers or non-HTTPS
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            console.log('📋 Shareable URL copied to clipboard:', url);

            // Emit event for UI feedback
            document.dispatchEvent(new CustomEvent('urlCopied', {
                detail: { url, options }
            }));

            return url;
        } catch (error) {
            console.error('Failed to copy URL to clipboard:', error);
            throw error;
        }
    }

    /**
     * Clear all URL state
     */
    clearUrlState() {
        window.history.replaceState(null, '', window.location.pathname);
        console.log('🧹 URL state cleared');
    }

    /**
     * Get current state summary for debugging
     */
    getStateSummary() {
        const urlState = this.parseUrlHash();
        const appState = this.convertToAppState(urlState);

        return {
            urlHash: window.location.hash,
            urlState,
            appState,
            urlLength: window.location.href.length,
            compressed: window.location.hash.startsWith('#c:')
        };
    }

    /**
     * Validate URL state compatibility
     */
    validateState(state) {
        const issues = [];

        // Check for version compatibility
        if (state.v && state.v !== this.stateVersion) {
            issues.push(`State version mismatch: ${state.v} vs ${this.stateVersion}`);
        }

        // Check for unknown state keys
        const knownKeys = new Set(Object.values(this.stateKeys));
        for (const key of Object.keys(state)) {
            if (!knownKeys.has(key) && key !== 'v') {
                issues.push(`Unknown state key: ${key}`);
            }
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Restore state from external source
     */
    restoreState(state) {
        const validation = this.validateState(state);

        if (!validation.valid) {
            console.warn('State validation issues:', validation.issues);
        }

        this.applyStateToApp(this.convertToAppState(state));

        // Update URL to reflect restored state
        const hash = this.buildUrlHash(state);
        this.setUrlHash(hash);
    }

    /**
     * Save current state to localStorage for persistence
     */
    saveStateToStorage(key = 'app-state-backup') {
        try {
            const currentState = this.parseUrlHash();
            localStorage.setItem(key, JSON.stringify({
                state: currentState,
                timestamp: Date.now(),
                url: window.location.href
            }));

            console.log('💾 State saved to localStorage');
        } catch (error) {
            console.error('Failed to save state to localStorage:', error);
        }
    }

    /**
     * Load state from localStorage
     */
    loadStateFromStorage(key = 'app-state-backup') {
        try {
            const saved = localStorage.getItem(key);
            if (!saved) {return null;}

            const { state, timestamp, url } = JSON.parse(saved);

            console.log('📥 Loading state from localStorage:', { timestamp, url });

            return state;
        } catch (error) {
            console.error('Failed to load state from localStorage:', error);
            return null;
        }
    }

    /**
     * Get URL state analytics
     */
    getAnalytics() {
        const currentState = this.parseUrlHash();
        const appState = this.convertToAppState(currentState);

        return {
            stateKeys: Object.keys(appState),
            urlLength: window.location.href.length,
            stateSize: JSON.stringify(currentState).length,
            isCompressed: window.location.hash.startsWith('#c:'),
            timestamp: appState.timestamp,
            hasFilters: !!appState.filters,
            hasSearch: !!appState.search,
            hasSelection: !!(appState.selectedNode || appState.selectedEdge),
            hasView: !!appState.graphView,
            hasExploration: !!appState.exploredNodes
        };
    }

    /**
     * Destroy the URL state manager
     */
    destroy() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        // Remove event listeners
        window.removeEventListener('popstate', this.loadStateFromUrl);
        window.removeEventListener('hashchange', this.loadStateFromUrl);

        console.log('🗑️ URL State Manager destroyed');
    }
}

export default URLStateManager;
