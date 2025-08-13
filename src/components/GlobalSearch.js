/**
 * Global Search Component
 * Advanced search with instant suggestions, filtering, and autocompletion
 * Optimized with throttling, debouncing, virtual scrolling, and performance monitoring
 */

import { search } from '../utils/search.js';
import { store } from '../core/store.js';
import { debounce, throttle, cancellableDebounce, frameDebounce, batchDebounce } from '../utils/debounce.js';

export class GlobalSearch {
    constructor(containerId) {
        this.container = document.getElementById(containerId) || document.querySelector(containerId);
        this.searchInput = null;
        this.suggestionsContainer = null;
        this.currentSuggestions = [];
        this.selectedSuggestionIndex = -1;
        this.isOpen = false;

        // Search configuration with performance optimizations
        this.config = {
            minQueryLength: 1,
            maxSuggestions: 10,
            searchDelay: 200,
            highlightMatches: true,
            searchScopes: ['all', 'nodes', 'edges'],
            currentScope: 'all',
            // Performance settings
            maxCachedResults: 100,
            virtualScrolling: true,
            itemHeight: 48,
            visibleItems: 8,
            throttleKeyNav: 16, // ~60fps
            batchRenderSize: 20,
            enableMetrics: true
        };

        // Performance monitoring
        this.searchMetrics = {
            searchCount: 0,
            avgSearchTime: 0,
            totalSearchTime: 0,
            cacheHits: 0,
            lastSearchTime: null
        };

        // Caching and optimization
        this.searchCache = new Map();
        this.debounceInstances = new Map();
        this.virtualScrollState = {
            startIndex: 0,
            endIndex: this.config.visibleItems
        };

        // DOM optimization
        this.documentFragment = document.createDocumentFragment();
        this.intersectionObserver = null;

        this.init();
        this.setupEventListeners();
    }

    /**
     * Initialize the search component
     */
    init() {
        if (!this.container) {
            console.warn('GlobalSearch: Container not found');
            return;
        }

        this.createSearchInterface();
        this.setupSearch();
    }

    /**
     * Create the search interface elements
     */
    createSearchInterface() {
        // Get existing search input or create new one
        this.searchInput = this.container.querySelector('#search-input') ||
                          this.container.querySelector('input[type="search"]');

        if (!this.searchInput) {
            // Create complete search interface if it doesn't exist
            this.container.innerHTML = `
                <div class="global-search-container">
                    <div class="search-input-wrapper">
                        <div class="search-icon">🔍</div>
                        <input 
                            type="search" 
                            id="search-input" 
                            placeholder="Search nodes, edges, or properties..." 
                            autocomplete="off"
                            spellcheck="false"
                            role="combobox"
                            aria-expanded="false"
                            aria-haspopup="listbox"
                            aria-owns="search-suggestions"
                        />
                        <div class="search-scope-selector">
                            <select id="search-scope" aria-label="Search scope">
                                <option value="all">All</option>
                                <option value="nodes">Nodes</option>
                                <option value="edges">Edges</option>
                            </select>
                        </div>
                        <button id="search-clear" type="button" class="search-clear-btn" aria-label="Clear search">
                            <span>✕</span>
                        </button>
                    </div>
                    <div id="search-suggestions" 
                         class="search-suggestions" 
                         role="listbox" 
                         aria-label="Search suggestions"
                         style="display: none;">
                    </div>
                </div>
            `;

            this.searchInput = this.container.querySelector('#search-input');
        }

        // Create suggestions container if it doesn't exist
        this.suggestionsContainer = this.container.querySelector('#search-suggestions');
        if (!this.suggestionsContainer) {
            this.suggestionsContainer = document.createElement('div');
            this.suggestionsContainer.id = 'search-suggestions';
            this.suggestionsContainer.className = 'search-suggestions';
            this.suggestionsContainer.setAttribute('role', 'listbox');
            this.suggestionsContainer.setAttribute('aria-label', 'Search suggestions');
            this.suggestionsContainer.style.display = 'none';
            this.container.appendChild(this.suggestionsContainer);
        }

        // Add CSS if not present
        this.addSearchStyles();
    }

    /**
     * Add search component styles
     */
    addSearchStyles() {
        if (document.querySelector('#global-search-styles')) {return;}

        const style = document.createElement('style');
        style.id = 'global-search-styles';
        style.textContent = `
            .global-search-container {
                position: relative;
                width: 100%;
                max-width: 500px;
            }

            .search-input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
                background: white;
                border: 2px solid #e1e8ed;
                border-radius: 25px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .search-input-wrapper:focus-within {
                border-color: #3498db;
                box-shadow: 0 4px 12px rgba(52,152,219,0.2);
            }

            .search-icon {
                padding: 0 15px;
                color: #7f8c8d;
                font-size: 16px;
                pointer-events: none;
            }

            #search-input {
                flex: 1;
                border: none;
                outline: none;
                padding: 12px 0;
                font-size: 14px;
                background: transparent;
                color: #2c3e50;
            }

            #search-input::placeholder {
                color: #bdc3c7;
            }

            .search-scope-selector {
                padding-right: 8px;
            }

            #search-scope {
                border: none;
                background: #f8f9fa;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                color: #7f8c8d;
                cursor: pointer;
                outline: none;
            }

            #search-scope:focus {
                background: #e9ecef;
                color: #495057;
            }

            .search-clear-btn {
                background: none;
                border: none;
                padding: 8px 15px;
                cursor: pointer;
                color: #7f8c8d;
                border-radius: 50%;
                transition: all 0.2s ease;
                display: none;
            }

            .search-clear-btn:hover {
                background: #f8f9fa;
                color: #e74c3c;
            }

            .search-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #e1e8ed;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                z-index: 1000;
                max-height: 400px;
                overflow-y: auto;
                margin-top: 8px;
            }

            .suggestion-item {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f8f9fa;
                display: flex;
                align-items: center;
                transition: background-color 0.2s ease;
            }

            .suggestion-item:hover,
            .suggestion-item.selected {
                background: #f8f9fa;
            }

            .suggestion-item:last-child {
                border-bottom: none;
            }

            .suggestion-icon {
                margin-right: 12px;
                font-size: 16px;
                width: 20px;
                text-align: center;
            }

            .suggestion-content {
                flex: 1;
                min-width: 0;
            }

            .suggestion-title {
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 2px;
                word-break: break-word;
            }

            .suggestion-subtitle {
                font-size: 12px;
                color: #7f8c8d;
                word-break: break-word;
            }

            .suggestion-type {
                font-size: 10px;
                background: #e9ecef;
                color: #6c757d;
                padding: 2px 6px;
                border-radius: 8px;
                font-weight: 500;
                text-transform: uppercase;
                margin-left: 8px;
            }

            .search-highlight {
                background: #fff3cd;
                color: #856404;
                padding: 1px 2px;
                border-radius: 2px;
                font-weight: 600;
            }

            .no-suggestions {
                padding: 16px;
                text-align: center;
                color: #7f8c8d;
                font-style: italic;
            }

            .recent-searches {
                border-bottom: 1px solid #f8f9fa;
            }

            .recent-searches-header {
                padding: 8px 16px;
                font-size: 11px;
                font-weight: 600;
                color: #7f8c8d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #f8f9fa;
            }

            /* Dark theme support */
            .theme-dark .search-input-wrapper,
            .theme-dark .search-suggestions {
                background: #2c3e50;
                border-color: #34495e;
                color: #ecf0f1;
            }

            .theme-dark .search-input-wrapper:focus-within {
                border-color: #3498db;
            }

            .theme-dark #search-input {
                color: #ecf0f1;
            }

            .theme-dark #search-input::placeholder {
                color: #7f8c8d;
            }

            .theme-dark .suggestion-item:hover,
            .theme-dark .suggestion-item.selected {
                background: #34495e;
            }

            .theme-dark .suggestion-title {
                color: #ecf0f1;
            }

            .theme-dark #search-scope {
                background: #34495e;
                color: #ecf0f1;
            }

            .theme-dark .search-clear-btn:hover {
                background: #34495e;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup search functionality with performance optimizations
     */
    setupSearch() {
        // Create multiple debounced/throttled functions for different purposes
        this.debouncedSearch = cancellableDebounce(this.performSearchOptimized.bind(this), this.config.searchDelay);
        this.throttledKeyNav = throttle(this.updateSuggestionSelection.bind(this), this.config.throttleKeyNav);
        this.frameBasedRender = frameDebounce(this.renderSuggestionsOptimized.bind(this));
        this.batchProcessor = batchDebounce(this.processBatchOperations.bind(this), 50, 10);

        // Initialize search index
        this.updateSearchIndex();

        // Setup intersection observer for virtual scrolling
        this.setupVirtualScrolling();

        // Initialize performance monitoring
        if (this.config.enableMetrics) {
            this.initPerformanceMonitoring();
        }
    }

    /**
     * Setup virtual scrolling for large suggestion lists
     */
    setupVirtualScrolling() {
        if (!this.config.virtualScrolling) {return;}

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.handleVirtualScrollIntersection(entry.target);
                    }
                });
            },
            {
                root: this.suggestionsContainer,
                rootMargin: '50px',
                threshold: 0.1
            }
        );
    }

    /**
     * Initialize performance monitoring
     */
    initPerformanceMonitoring() {
        // Log search performance periodically
        setInterval(() => {
            if (this.searchMetrics.searchCount > 0) {
                console.log('Search Performance Metrics:', {
                    totalSearches: this.searchMetrics.searchCount,
                    avgSearchTime: Math.round(this.searchMetrics.avgSearchTime * 100) / 100 + 'ms',
                    cacheHitRate: Math.round((this.searchMetrics.cacheHits / this.searchMetrics.searchCount) * 100) + '%',
                    cacheSize: this.searchCache.size
                });
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Optimized search with caching and performance monitoring
     */
    performSearchOptimized(query) {
        if (!query || query.length < this.config.minQueryLength) {
            this.hideSuggestions();
            return;
        }

        const startTime = performance.now();
        const cacheKey = `${query}-${this.config.currentScope}`;

        // Check cache first
        if (this.searchCache.has(cacheKey)) {
            this.searchMetrics.cacheHits++;
            this.currentSuggestions = this.searchCache.get(cacheKey);
            this.frameBasedRender();
            this.showSuggestions();
            return;
        }

        // Perform search
        const searchOptions = {
            searchNodes: this.config.currentScope === 'all' || this.config.currentScope === 'nodes',
            searchEdges: this.config.currentScope === 'all' || this.config.currentScope === 'edges',
            limit: this.config.maxSuggestions
        };

        const results = search.textSearch(query, searchOptions);
        const suggestions = search.getSuggestions(query, this.config.maxSuggestions - results.length);

        this.currentSuggestions = [
            ...results.map(result => ({
                type: result.type,
                data: result.data,
                score: result.score,
                matchedText: query
            })),
            ...suggestions.map(suggestion => ({
                type: 'suggestion',
                text: suggestion,
                matchedText: query
            }))
        ];

        // Cache results if cache isn't too large
        if (this.searchCache.size < this.config.maxCachedResults) {
            this.searchCache.set(cacheKey, this.currentSuggestions);
        }

        // Update performance metrics
        const searchTime = performance.now() - startTime;
        this.searchMetrics.searchCount++;
        this.searchMetrics.totalSearchTime += searchTime;
        this.searchMetrics.avgSearchTime = this.searchMetrics.totalSearchTime / this.searchMetrics.searchCount;
        this.searchMetrics.lastSearchTime = searchTime;

        this.frameBasedRender();
        this.showSuggestions();
    }

    /**
     * Optimized rendering with virtual scrolling and batching
     */
    renderSuggestionsOptimized() {
        if (this.currentSuggestions.length === 0) {
            this.suggestionsContainer.innerHTML = `
                <div class="no-suggestions">
                    No matches found. Try different keywords.
                </div>
            `;
            return;
        }

        if (this.config.virtualScrolling && this.currentSuggestions.length > this.config.visibleItems) {
            this.renderVirtualScrollSuggestions();
        } else {
            this.renderBatchedSuggestions();
        }
    }

    /**
     * Render suggestions with virtual scrolling for large lists
     */
    renderVirtualScrollSuggestions() {
        const { startIndex, endIndex } = this.virtualScrollState;
        const visibleSuggestions = this.currentSuggestions.slice(startIndex, endIndex);

        // Create container with proper height for scrolling
        const totalHeight = this.currentSuggestions.length * this.config.itemHeight;
        const offsetY = startIndex * this.config.itemHeight;

        this.suggestionsContainer.innerHTML = `
            <div class="virtual-scroll-container" style="height: ${totalHeight}px; position: relative;">
                <div class="visible-items" style="transform: translateY(${offsetY}px);">
                    ${this.renderSuggestionItems(visibleSuggestions, startIndex)}
                </div>
            </div>
        `;

        // Observe visible items for intersection
        const visibleItems = this.suggestionsContainer.querySelectorAll('.suggestion-item');
        visibleItems.forEach(item => {
            this.intersectionObserver?.observe(item);
        });
    }

    /**
     * Render suggestions in batches to avoid blocking UI
     */
    renderBatchedSuggestions() {
        const batchSize = this.config.batchRenderSize;
        const batches = [];

        for (let i = 0; i < this.currentSuggestions.length; i += batchSize) {
            batches.push(this.currentSuggestions.slice(i, i + batchSize));
        }

        // Clear container
        this.suggestionsContainer.innerHTML = '';

        // Render batches with requestAnimationFrame
        let batchIndex = 0;

        const renderNextBatch = () => {
            if (batchIndex >= batches.length) {return;}

            const batch = batches[batchIndex];
            const batchFragment = document.createDocumentFragment();

            batch.forEach((suggestion, index) => {
                const actualIndex = batchIndex * batchSize + index;
                const itemElement = this.createSuggestionElement(suggestion, actualIndex);
                batchFragment.appendChild(itemElement);
            });

            this.suggestionsContainer.appendChild(batchFragment);
            batchIndex++;

            if (batchIndex < batches.length) {
                requestAnimationFrame(renderNextBatch);
            }
        };

        requestAnimationFrame(renderNextBatch);
    }

    /**
     * Render suggestion items HTML
     */
    renderSuggestionItems(suggestions, startIndex = 0) {
        return suggestions.map((suggestion, index) => {
            const actualIndex = startIndex + index;
            const icon = this.getSuggestionIcon(suggestion);
            const title = this.getSuggestionTitle(suggestion);
            const subtitle = this.getSuggestionSubtitle(suggestion);
            const typeLabel = this.getSuggestionTypeLabel(suggestion);

            return `
                <div class="suggestion-item" 
                     data-index="${actualIndex}" 
                     role="option"
                     style="height: ${this.config.itemHeight}px;">
                    <div class="suggestion-icon">${icon}</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${title}</div>
                        ${subtitle ? `<div class="suggestion-subtitle">${subtitle}</div>` : ''}
                    </div>
                    ${typeLabel ? `<div class="suggestion-type">${typeLabel}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Create suggestion element as DOM node
     */
    createSuggestionElement(suggestion, index) {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.dataset.index = index;
        div.setAttribute('role', 'option');
        div.style.height = this.config.itemHeight + 'px';

        const icon = this.getSuggestionIcon(suggestion);
        const title = this.getSuggestionTitle(suggestion);
        const subtitle = this.getSuggestionSubtitle(suggestion);
        const typeLabel = this.getSuggestionTypeLabel(suggestion);

        div.innerHTML = `
            <div class="suggestion-icon">${icon}</div>
            <div class="suggestion-content">
                <div class="suggestion-title">${title}</div>
                ${subtitle ? `<div class="suggestion-subtitle">${subtitle}</div>` : ''}
            </div>
            ${typeLabel ? `<div class="suggestion-type">${typeLabel}</div>` : ''}
        `;

        return div;
    }

    /**
     * Handle virtual scroll intersection
     */
    handleVirtualScrollIntersection(element) {
        const index = parseInt(element.dataset.index);

        // Update virtual scroll state if needed
        if (index <= this.virtualScrollState.startIndex + 2) {
            // Near top, load previous items
            this.virtualScrollState.startIndex = Math.max(0, this.virtualScrollState.startIndex - this.config.visibleItems);
            this.virtualScrollState.endIndex = this.virtualScrollState.startIndex + this.config.visibleItems * 2;
            this.frameBasedRender();
        } else if (index >= this.virtualScrollState.endIndex - 2) {
            // Near bottom, load next items
            this.virtualScrollState.startIndex = Math.min(
                this.currentSuggestions.length - this.config.visibleItems,
                this.virtualScrollState.startIndex + this.config.visibleItems
            );
            this.virtualScrollState.endIndex = this.virtualScrollState.startIndex + this.config.visibleItems * 2;
            this.frameBasedRender();
        }
    }

    /**
     * Process batch operations
     */
    processBatchOperations(operations) {
        operations.forEach(operation => {
            switch (operation.type) {
            case 'cache-cleanup':
                this.cleanupCache();
                break;
            case 'metrics-update':
                this.updateMetrics(operation.data);
                break;
            case 'index-update':
                this.updateSearchIndex();
                break;
            }
        });
    }

    /**
     * Cleanup old cache entries
     */
    cleanupCache() {
        if (this.searchCache.size > this.config.maxCachedResults * 0.8) {
            // Remove oldest entries
            const entries = Array.from(this.searchCache.entries());
            const toRemove = Math.floor(entries.length * 0.3);

            for (let i = 0; i < toRemove; i++) {
                this.searchCache.delete(entries[i][0]);
            }
        }
    }

    /**
     * Throttled suggestion selection update
     */
    updateSuggestionSelectionThrottled() {
        this.throttledKeyNav();
    }

    /**
     * Get search performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.searchMetrics,
            cacheSize: this.searchCache.size,
            cacheHitRate: this.searchMetrics.searchCount > 0 ?
                Math.round((this.searchMetrics.cacheHits / this.searchMetrics.searchCount) * 100) : 0
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.searchInput) {return;}

        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        this.searchInput.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });

        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.length >= this.config.minQueryLength) {
                this.showSuggestions();
            } else {
                this.showRecentSearches();
            }
        });

        this.searchInput.addEventListener('blur', (e) => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
                if (!this.container.contains(document.activeElement)) {
                    this.hideSuggestions();
                }
            }, 150);
        });

        // Clear button
        const clearBtn = this.container.querySelector('#search-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
                this.searchInput.focus();
            });
        }

        // Search scope selector
        const scopeSelect = this.container.querySelector('#search-scope');
        if (scopeSelect) {
            scopeSelect.addEventListener('change', (e) => {
                this.config.currentScope = e.target.value;
                if (this.searchInput.value) {
                    this.debouncedSearch(this.searchInput.value);
                }
            });
        }

        // Suggestions container events
        this.suggestionsContainer.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                this.selectSuggestion(parseInt(suggestionItem.dataset.index));
            }
        });

        // Global click to hide suggestions
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // Store subscriptions
        store.subscribe('nodes', () => this.updateSearchIndex());
        store.subscribe('edges', () => this.updateSearchIndex());
    }

    /**
     * Handle search input
     */
    handleSearchInput(query) {
        const clearBtn = this.container.querySelector('#search-clear');
        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }

        if (query.length >= this.config.minQueryLength) {
            this.debouncedSearch(query);
        } else if (query.length === 0) {
            this.showRecentSearches();
        } else {
            this.hideSuggestions();
        }
    }

    /**
     * Handle keyboard navigation in search
     */
    handleSearchKeydown(e) {
        if (!this.isOpen) {return;}

        switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            this.selectedSuggestionIndex = Math.min(
                this.selectedSuggestionIndex + 1,
                this.currentSuggestions.length - 1
            );
            this.updateSuggestionSelection();
            break;

        case 'ArrowUp':
            e.preventDefault();
            this.selectedSuggestionIndex = Math.max(
                this.selectedSuggestionIndex - 1,
                -1
            );
            this.updateSuggestionSelection();
            break;

        case 'Enter':
            e.preventDefault();
            if (this.selectedSuggestionIndex >= 0) {
                this.selectSuggestion(this.selectedSuggestionIndex);
            } else {
                this.performDirectSearch(e.target.value);
            }
            break;

        case 'Escape':
            this.hideSuggestions();
            this.searchInput.blur();
            break;

        case 'Tab':
            if (this.selectedSuggestionIndex >= 0) {
                e.preventDefault();
                this.selectSuggestion(this.selectedSuggestionIndex);
            }
            break;
        }
    }

    /**
     * Perform search and show suggestions
     */
    performSearch(query) {
        if (!query || query.length < this.config.minQueryLength) {
            this.hideSuggestions();
            return;
        }

        // Perform search based on scope
        const searchOptions = {
            searchNodes: this.config.currentScope === 'all' || this.config.currentScope === 'nodes',
            searchEdges: this.config.currentScope === 'all' || this.config.currentScope === 'edges',
            limit: this.config.maxSuggestions
        };

        const results = search.textSearch(query, searchOptions);

        // Get additional suggestions from search utility
        const suggestions = search.getSuggestions(query, this.config.maxSuggestions - results.length);

        this.currentSuggestions = [
            ...results.map(result => ({
                type: result.type,
                data: result.data,
                score: result.score,
                matchedText: query
            })),
            ...suggestions.map(suggestion => ({
                type: 'suggestion',
                text: suggestion,
                matchedText: query
            }))
        ];

        this.renderSuggestions();
        this.showSuggestions();
    }

    /**
     * Show recent searches
     */
    showRecentSearches() {
        const history = search.getSearchHistory();
        if (history.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.currentSuggestions = history.slice(0, 5).map(query => ({
            type: 'recent',
            text: query,
            isRecent: true
        }));

        this.renderRecentSearches();
        this.showSuggestions();
    }

    /**
     * Render search suggestions
     */
    renderSuggestions() {
        if (this.currentSuggestions.length === 0) {
            this.suggestionsContainer.innerHTML = `
                <div class="no-suggestions">
                    No matches found. Try different keywords.
                </div>
            `;
            return;
        }

        const suggestionsHtml = this.currentSuggestions.map((suggestion, index) => {
            const icon = this.getSuggestionIcon(suggestion);
            const title = this.getSuggestionTitle(suggestion);
            const subtitle = this.getSuggestionSubtitle(suggestion);
            const typeLabel = this.getSuggestionTypeLabel(suggestion);

            return `
                <div class="suggestion-item" data-index="${index}" role="option">
                    <div class="suggestion-icon">${icon}</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${title}</div>
                        ${subtitle ? `<div class="suggestion-subtitle">${subtitle}</div>` : ''}
                    </div>
                    ${typeLabel ? `<div class="suggestion-type">${typeLabel}</div>` : ''}
                </div>
            `;
        }).join('');

        this.suggestionsContainer.innerHTML = suggestionsHtml;
    }

    /**
     * Render recent searches
     */
    renderRecentSearches() {
        const recentHtml = `
            <div class="recent-searches">
                <div class="recent-searches-header">Recent Searches</div>
                ${this.currentSuggestions.map((suggestion, index) => `
                    <div class="suggestion-item" data-index="${index}" role="option">
                        <div class="suggestion-icon">🕐</div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${suggestion.text}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        this.suggestionsContainer.innerHTML = recentHtml;
    }

    /**
     * Get suggestion icon based on type
     */
    getSuggestionIcon(suggestion) {
        if (suggestion.isRecent) {return '🕐';}
        if (suggestion.type === 'suggestion') {return '🔍';}
        if (suggestion.type === 'edge') {return '↔️';}

        // Node icons based on node type
        const nodeIcons = {
            'faa_stars_terminal': '🏢',
            'approach_control': '🛫',
            'faa_eram_terminal': '📡',
            'geographic_location': '📍',
            'radar_equipment': '📊',
            'communication_equipment': '📻',
            'default': '◉'
        };

        return suggestion.data?.type ?
            nodeIcons[suggestion.data.type] || nodeIcons.default :
            '🔍';
    }

    /**
     * Get suggestion title with highlighting
     */
    getSuggestionTitle(suggestion) {
        if (suggestion.type === 'suggestion' || suggestion.isRecent) {
            return this.highlightMatch(suggestion.text, suggestion.matchedText);
        }

        const title = suggestion.data?.name ||
                     suggestion.data?.label ||
                     suggestion.data?.id ||
                     'Unknown';

        return this.highlightMatch(title, suggestion.matchedText);
    }

    /**
     * Get suggestion subtitle
     */
    getSuggestionSubtitle(suggestion) {
        if (suggestion.type === 'suggestion' || suggestion.isRecent) {
            return null;
        }

        if (suggestion.type === 'edge') {
            return `${suggestion.data.source} → ${suggestion.data.target}`;
        }

        // For nodes, show type and location if available
        const parts = [];
        if (suggestion.data?.type) {
            parts.push(suggestion.data.type.replace(/_/g, ' '));
        }
        if (suggestion.data?.address?.city) {
            parts.push(`${suggestion.data.address.city}, ${suggestion.data.address.state}`);
        }

        return parts.join(' • ');
    }

    /**
     * Get suggestion type label
     */
    getSuggestionTypeLabel(suggestion) {
        if (suggestion.isRecent) {return null;}
        if (suggestion.type === 'suggestion') {return 'Search';}
        return suggestion.type === 'edge' ? 'Edge' : 'Node';
    }

    /**
     * Highlight matching text
     */
    highlightMatch(text, query) {
        if (!this.config.highlightMatches || !query) {return text;}

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    /**
     * Update suggestion selection styling
     */
    updateSuggestionSelection() {
        const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedSuggestionIndex);
        });

        // Update ARIA attributes
        this.searchInput.setAttribute('aria-activedescendant',
            this.selectedSuggestionIndex >= 0 ?
                `suggestion-${this.selectedSuggestionIndex}` : '');
    }

    /**
     * Select a suggestion
     */
    selectSuggestion(index) {
        const suggestion = this.currentSuggestions[index];
        if (!suggestion) {return;}

        if (suggestion.type === 'suggestion' || suggestion.isRecent) {
            this.searchInput.value = suggestion.text;
            this.performDirectSearch(suggestion.text);
        } else {
            // Select the actual node/edge
            if (suggestion.type === 'node') {
                store.setState({ selectedNode: suggestion.data });
                this.highlightSearchResult(suggestion.data);
            } else if (suggestion.type === 'edge') {
                store.setState({ selectedEdge: suggestion.data });
                this.highlightSearchResult(suggestion.data);
            }

            this.searchInput.value = this.getSuggestionTitle(suggestion);
            this.hideSuggestions();
        }
    }

    /**
     * Perform direct search without suggestions
     */
    performDirectSearch(query) {
        this.hideSuggestions();

        // Emit search event for other components
        document.dispatchEvent(new CustomEvent('globalSearch', {
            detail: {
                query,
                scope: this.config.currentScope,
                timestamp: Date.now()
            }
        }));

        // Add to search history
        if (query.length >= this.config.minQueryLength) {
            search.addToHistory(query);
        }
    }

    /**
     * Highlight search result in graph
     */
    highlightSearchResult(data) {
        document.dispatchEvent(new CustomEvent('highlightGraphElement', {
            detail: {
                element: data,
                type: data.source ? 'edge' : 'node'
            }
        }));
    }

    /**
     * Show suggestions dropdown
     */
    showSuggestions() {
        this.suggestionsContainer.style.display = 'block';
        this.searchInput.setAttribute('aria-expanded', 'true');
        this.isOpen = true;
        this.selectedSuggestionIndex = -1;
    }

    /**
     * Hide suggestions dropdown
     */
    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
        this.searchInput.setAttribute('aria-expanded', 'false');
        this.isOpen = false;
        this.selectedSuggestionIndex = -1;
        this.currentSuggestions = [];
    }

    /**
     * Clear search
     */
    clearSearch() {
        this.searchInput.value = '';
        this.hideSuggestions();

        const clearBtn = this.container.querySelector('#search-clear');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }

        // Emit clear event
        document.dispatchEvent(new CustomEvent('globalSearchClear'));
    }

    /**
     * Update search index when data changes
     */
    updateSearchIndex() {
        // This will be called when store data changes
        search.updateIndex();
    }

    /**
     * Get current search query
     */
    getCurrentQuery() {
        return this.searchInput ? this.searchInput.value : '';
    }

    /**
     * Set search query programmatically
     */
    setQuery(query) {
        if (this.searchInput) {
            this.searchInput.value = query;
            if (query) {
                this.debouncedSearch(query);
            }
        }
    }

    /**
     * Focus search input
     */
    focus() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Destroy the search component
     */
    destroy() {
        this.hideSuggestions();

        // Remove event listeners would go here in a full implementation
        // For now, cleanup main references
        this.searchInput = null;
        this.suggestionsContainer = null;
        this.currentSuggestions = [];
    }
}

export default GlobalSearch;
