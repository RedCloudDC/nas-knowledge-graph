/**
 * Dashboard UI Manager
 * Handles theme switching, tab navigation, search functionality, and accessibility features
 */

export class DashboardUI {
    constructor() {
        this.currentTheme = 'theme-light';
        this.currentTab = 'details';
        this.legendVisible = false;
        this.focusableElements = [];
        this.currentFocusIndex = -1;
        this.keyboardNavigationMode = false;

        this.initializeEventListeners();
        this.setupAccessibility();
        this.setupKeyboardNavigation();
        this.loadUserPreferences();
        this.detectUserPreferences();
    }

    /**
     * Initialize all event listeners for dashboard interactions
     */
    initializeEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Layout toggle
        const layoutToggle = document.getElementById('layout-toggle');
        if (layoutToggle) {
            layoutToggle.addEventListener('click', () => this.toggleLayout());
        }

        // Legend toggle
        const legendToggle = document.getElementById('legend-toggle');
        if (legendToggle) {
            legendToggle.addEventListener('click', () => this.toggleLegend());
        }

        // Tab switching
        const detailsTab = document.getElementById('details-tab');
        const analysisTab = document.getElementById('analysis-tab');

        if (detailsTab) {
            detailsTab.addEventListener('click', () => this.switchTab('details'));
        }
        if (analysisTab) {
            analysisTab.addEventListener('click', () => this.switchTab('analysis'));
        }

        // Search functionality
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => this.clearSearch());
        }

        // Filter interactions
        this.setupFilterListeners();

        // Graph control buttons
        this.setupGraphControlListeners();

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

        // Global focus management
        document.addEventListener('focusin', (e) => this.handleFocusIn(e));
        document.addEventListener('focusout', (e) => this.handleFocusOut(e));

        // Mouse and touch interactions
        document.addEventListener('mousedown', () => this.keyboardNavigationMode = false);
        document.addEventListener('touchstart', () => this.keyboardNavigationMode = false);

        // Resize handler for responsive adjustments
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Setup accessibility features and ARIA attributes
     */
    setupAccessibility() {
        // Setup screen reader support first
        this.setupScreenReaderSupport();

        // Update ARIA labels for dynamic content
        this.updateAriaLabels();

        // Setup focus management
        this.updateFocusableElements();

        // Add landmark roles and descriptions
        this.enhanceLandmarks();

        // Setup high contrast media query listener
        this.setupContrastListener();
    }

    /**
     * Toggle between light, dark, and high-contrast themes
     */
    toggleTheme() {
        const app = document.getElementById('app');
        const themeButton = document.getElementById('theme-toggle');

        if (!app || !themeButton) {return;}

        // Cycle through themes: light -> dark -> high-contrast -> light
        switch (this.currentTheme) {
        case 'theme-light':
            this.currentTheme = 'theme-dark';
            themeButton.innerHTML = '<span aria-hidden="true">☀️</span> Light';
            themeButton.setAttribute('aria-label', 'Switch to light mode');
            break;
        case 'theme-dark':
            this.currentTheme = 'theme-high-contrast';
            themeButton.innerHTML = '<span aria-hidden="true">⚪</span> Contrast';
            themeButton.setAttribute('aria-label', 'Switch to high contrast mode');
            break;
        case 'theme-high-contrast':
            this.currentTheme = 'theme-light';
            themeButton.innerHTML = '<span aria-hidden="true">🌙</span> Dark';
            themeButton.setAttribute('aria-label', 'Switch to dark mode');
            break;
        }

        // Apply theme class
        app.className = this.currentTheme;

        // Save preference
        this.saveUserPreference('theme', this.currentTheme);

        // Announce change to screen readers
        this.announceToScreenReader(`Switched to ${this.currentTheme.replace('theme-', '')} theme`);
    }

    /**
     * Toggle layout type (implementation would depend on graph library)
     */
    toggleLayout() {
        // This would integrate with the graph visualization
        // For now, just cycle through layout names
        const layouts = ['Force-Directed', 'Circular', 'Hierarchical', 'Grid'];
        const currentIndex = layouts.findIndex(layout =>
            document.getElementById('layout-toggle').textContent.includes(layout)
        );
        const nextIndex = (currentIndex + 1) % layouts.length;
        const nextLayout = layouts[nextIndex];

        const layoutButton = document.getElementById('layout-toggle');
        layoutButton.innerHTML = `<span aria-hidden="true">🔀</span> ${nextLayout}`;

        // Emit custom event for graph to handle
        document.dispatchEvent(new CustomEvent('layoutChange', {
            detail: { layout: nextLayout.toLowerCase().replace('-', '') }
        }));

        this.announceToScreenReader(`Layout changed to ${nextLayout}`);
    }

    /**
     * Toggle legend visibility
     */
    toggleLegend() {
        const legend = document.getElementById('legend');
        const button = document.getElementById('legend-toggle');

        if (!legend || !button) {return;}

        this.legendVisible = !this.legendVisible;

        if (this.legendVisible) {
            legend.classList.remove('hidden');
            button.setAttribute('aria-pressed', 'true');
            this.announceToScreenReader('Legend shown');
        } else {
            legend.classList.add('hidden');
            button.setAttribute('aria-pressed', 'false');
            this.announceToScreenReader('Legend hidden');
        }

        this.saveUserPreference('legendVisible', this.legendVisible);
    }

    /**
     * Switch between details and analysis tabs
     */
    switchTab(tabName) {
        const tabs = ['details', 'analysis'];

        tabs.forEach(tab => {
            const tabButton = document.getElementById(`${tab}-tab`);
            const tabContent = document.getElementById(`${tab}-content`);

            if (tabButton && tabContent) {
                if (tab === tabName) {
                    tabButton.classList.add('active');
                    tabButton.setAttribute('aria-selected', 'true');
                    tabButton.setAttribute('tabindex', '0');
                    tabContent.classList.add('active');
                } else {
                    tabButton.classList.remove('active');
                    tabButton.setAttribute('aria-selected', 'false');
                    tabButton.setAttribute('tabindex', '-1');
                    tabContent.classList.remove('active');
                }
            }
        });

        this.currentTab = tabName;
        this.announceToScreenReader(`Switched to ${tabName} tab`);
    }

    /**
     * Handle search input
     */
    handleSearch(query) {
        const clearButton = document.getElementById('search-clear');

        // Show/hide clear button
        if (clearButton) {
            clearButton.style.display = query ? 'block' : 'none';
        }

        // Emit search event for graph to handle
        document.dispatchEvent(new CustomEvent('searchGraph', {
            detail: { query: query.trim() }
        }));

        // Update aria-live region with search results count (would be updated by graph)
        if (query.trim()) {
            this.announceToScreenReader(`Searching for "${query}"`);
        }
    }

    /**
     * Clear search input
     */
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        const clearButton = document.getElementById('search-clear');

        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        if (clearButton) {
            clearButton.style.display = 'none';
        }

        // Emit clear search event
        document.dispatchEvent(new CustomEvent('searchGraph', {
            detail: { query: '' }
        }));

        this.announceToScreenReader('Search cleared');
    }

    /**
     * Setup filter event listeners
     */
    setupFilterListeners() {
        // Node type filters
        const nodeTypeFilters = ['filter-files', 'filter-folders', 'filter-tags'];
        nodeTypeFilters.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.handleFilterChange());
            }
        });

        // Connection filters
        const connectionFilters = ['filter-strong', 'filter-weak'];
        connectionFilters.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.handleFilterChange());
            }
        });

        // Range sliders
        const rangeSliders = ['node-size-slider', 'link-strength-slider'];
        rangeSliders.forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', () => this.handleRangeChange(id, slider.value));
            }
        });

        // Reset filters button
        const resetButton = document.getElementById('reset-filters');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetFilters());
        }
    }

    /**
     * Setup graph control button listeners
     */
    setupGraphControlListeners() {
        const controls = ['reset-view', 'fit-view', 'expand-all', 'collapse-all'];

        controls.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    // Emit event for graph to handle
                    document.dispatchEvent(new CustomEvent('graphControl', {
                        detail: { action: id.replace('-', '') }
                    }));

                    this.announceToScreenReader(`${id.replace('-', ' ')} activated`);
                });
            }
        });
    }

    /**
     * Handle filter changes
     */
    handleFilterChange() {
        const filters = this.collectFilterState();

        // Emit filter change event
        document.dispatchEvent(new CustomEvent('filtersChanged', {
            detail: filters
        }));

        // Save filter preferences
        this.saveUserPreference('filters', filters);
    }

    /**
     * Handle range slider changes
     */
    handleRangeChange(sliderId, value) {
        const action = sliderId.replace('-slider', '');

        // Emit range change event
        document.dispatchEvent(new CustomEvent('rangeChanged', {
            detail: { type: action, value: parseFloat(value) }
        }));
    }

    /**
     * Collect current filter state
     */
    collectFilterState() {
        return {
            nodeTypes: {
                files: document.getElementById('filter-files')?.checked || false,
                folders: document.getElementById('filter-folders')?.checked || false,
                tags: document.getElementById('filter-tags')?.checked || false
            },
            connections: {
                strong: document.getElementById('filter-strong')?.checked || false,
                weak: document.getElementById('filter-weak')?.checked || false
            },
            ranges: {
                nodeSize: parseFloat(document.getElementById('node-size-slider')?.value || 1),
                linkStrength: parseFloat(document.getElementById('link-strength-slider')?.value || 1)
            }
        };
    }

    /**
     * Reset all filters to default
     */
    resetFilters() {
        // Reset checkboxes
        ['filter-files', 'filter-folders', 'filter-tags', 'filter-strong', 'filter-weak'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {checkbox.checked = true;}
        });

        // Reset sliders
        const nodeSizeSlider = document.getElementById('node-size-slider');
        const linkStrengthSlider = document.getElementById('link-strength-slider');

        if (nodeSizeSlider) {nodeSizeSlider.value = 1;}
        if (linkStrengthSlider) {linkStrengthSlider.value = 1;}

        // Emit reset event
        this.handleFilterChange();

        this.announceToScreenReader('Filters reset to default');
    }

    /**
     * Enhanced keyboard navigation with comprehensive support
     */
    handleKeyboardNavigation(event) {
        // Set keyboard navigation mode
        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(event.key)) {
            this.keyboardNavigationMode = true;
        }

        // Handle Escape key to close overlays and reset focus
        if (event.key === 'Escape') {
            this.handleEscapeKey(event);
            return;
        }

        // Handle Enter and Space for activation
        if ((event.key === 'Enter' || event.key === ' ') && event.target.getAttribute('role') === 'button') {
            event.preventDefault();
            event.target.click();
            return;
        }

        // Handle tab navigation with roving tabindex
        if (event.key === 'Tab') {
            this.handleTabNavigation(event);
            return;
        }

        // Handle arrow key navigation
        this.handleArrowNavigation(event);

        // Handle specific keyboard shortcuts
        this.handleKeyboardShortcuts(event);
    }

    /**
     * Handle window resize for responsive adjustments
     */
    handleResize() {
        // Emit resize event for graph to handle
        document.dispatchEvent(new CustomEvent('dashboardResize'));
    }

    /**
     * Setup comprehensive keyboard navigation system
     */
    setupKeyboardNavigation() {
        // Create keyboard navigation map
        this.navigationMap = {
            'header': {
                selector: '.header-toolbar button, .header-toolbar input',
                direction: 'horizontal'
            },
            'filters': {
                selector: '.sidebar-filters input, .sidebar-filters button',
                direction: 'vertical'
            },
            'graph-controls': {
                selector: '.graph-controls-overlay button',
                direction: 'vertical'
            },
            'tabs': {
                selector: '.panel-tabs .tab-button',
                direction: 'horizontal'
            }
        };

        // Setup roving tabindex for each navigation group
        this.setupRovingTabindex();
    }

    /**
     * Setup roving tabindex pattern for better keyboard navigation
     */
    setupRovingTabindex() {
        Object.keys(this.navigationMap).forEach(groupName => {
            const group = this.navigationMap[groupName];
            const elements = document.querySelectorAll(group.selector);

            if (elements.length === 0) {return;}

            // Set first element as focusable, others as non-focusable
            elements.forEach((element, index) => {
                element.setAttribute('tabindex', index === 0 ? '0' : '-1');
                element.dataset.navigationGroup = groupName;
                element.dataset.navigationIndex = index;
            });
        });
    }

    /**
     * Update focusable elements list
     */
    updateFocusableElements() {
        this.focusableElements = Array.from(
            document.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
            )
        ).filter(el => {
            // Filter out hidden elements
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        });
    }

    /**
     * Handle Escape key actions
     */
    handleEscapeKey(event) {
        // Close legend if open
        if (this.legendVisible) {
            this.toggleLegend();
            return;
        }

        // Clear search if focused
        if (event.target.id === 'search-input') {
            this.clearSearch();
            return;
        }

        // Return focus to main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
        }
    }

    /**
     * Handle Tab navigation with focus trapping
     */
    handleTabNavigation(event) {
        this.updateFocusableElements();

        if (this.focusableElements.length === 0) {return;}

        const currentIndex = this.focusableElements.indexOf(event.target);
        let nextIndex;

        if (event.shiftKey) {
            // Shift+Tab - go backwards
            nextIndex = currentIndex <= 0 ? this.focusableElements.length - 1 : currentIndex - 1;
        } else {
            // Tab - go forwards
            nextIndex = currentIndex >= this.focusableElements.length - 1 ? 0 : currentIndex + 1;
        }

        // Only prevent default and manually focus if we're at the boundaries
        if ((currentIndex === 0 && event.shiftKey) ||
            (currentIndex === this.focusableElements.length - 1 && !event.shiftKey)) {
            event.preventDefault();
            this.focusableElements[nextIndex].focus();
        }
    }

    /**
     * Handle arrow key navigation within groups
     */
    handleArrowNavigation(event) {
        const target = event.target;
        const groupName = target.dataset.navigationGroup;

        if (!groupName) {return;}

        const group = this.navigationMap[groupName];
        if (!group) {return;}

        const elements = Array.from(document.querySelectorAll(group.selector));
        const currentIndex = elements.indexOf(target);

        if (currentIndex === -1) {return;}

        let nextIndex = currentIndex;

        if (group.direction === 'horizontal') {
            if (event.key === 'ArrowLeft') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
                event.preventDefault();
            } else if (event.key === 'ArrowRight') {
                nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
                event.preventDefault();
            }
        } else if (group.direction === 'vertical') {
            if (event.key === 'ArrowUp') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
                event.preventDefault();
            } else if (event.key === 'ArrowDown') {
                nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
                event.preventDefault();
            }
        }

        if (nextIndex !== currentIndex) {
            // Update tabindex for roving tabindex pattern
            elements[currentIndex].setAttribute('tabindex', '-1');
            elements[nextIndex].setAttribute('tabindex', '0');
            elements[nextIndex].focus();

            // Handle special navigation for tabs
            if (groupName === 'tabs') {
                const tabName = elements[nextIndex].id.replace('-tab', '');
                this.switchTab(tabName);
            }

            this.announceToScreenReader(`Navigated to ${elements[nextIndex].textContent || elements[nextIndex].getAttribute('aria-label')}`);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Only handle shortcuts when not in input fields
        if (['input', 'textarea', 'select'].includes(event.target.tagName.toLowerCase())) {
            return;
        }

        // Handle shortcuts with modifiers
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
            case 'f':
                event.preventDefault();
                document.getElementById('search-input')?.focus();
                this.announceToScreenReader('Search focused');
                break;
            case 'r':
                event.preventDefault();
                this.resetFilters();
                break;
            }
        }

        // Handle single key shortcuts
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            switch (event.key) {
            case 't':
            case 'T':
                this.toggleTheme();
                break;
            case 'l':
            case 'L':
                this.toggleLegend();
                break;
            case '?':
                this.showKeyboardHelp();
                break;
            }
        }
    }

    /**
     * Handle focus in events
     */
    handleFocusIn(event) {
        // Add visual focus indicator for keyboard navigation
        if (this.keyboardNavigationMode) {
            event.target.classList.add('keyboard-focused');
        }

        // Announce complex widgets to screen readers
        if (event.target.getAttribute('aria-describedby')) {
            const descId = event.target.getAttribute('aria-describedby');
            const description = document.getElementById(descId);
            if (description) {
                this.announceToScreenReader(description.textContent);
            }
        }
    }

    /**
     * Handle focus out events
     */
    handleFocusOut(event) {
        // Remove visual focus indicator
        event.target.classList.remove('keyboard-focused');
    }

    /**
     * Enhance landmarks with better accessibility
     */
    enhanceLandmarks() {
        // Add live region for dynamic announcements
        if (!document.getElementById('sr-announcer')) {
            const announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            document.body.appendChild(announcer);
        }

        // Enhance graph container with better accessibility
        const graphContainer = document.getElementById('graph-container');
        if (graphContainer) {
            graphContainer.setAttribute('role', 'application');
            graphContainer.setAttribute('aria-label', 'Interactive knowledge graph. Use arrow keys to navigate, Enter to select.');
            graphContainer.setAttribute('tabindex', '0');
        }
    }

    /**
     * Update ARIA labels for dynamic content
     */
    updateAriaLabels() {
        // Update search results count
        // Update graph statistics
        // This would be called when data changes
    }

    /**
     * Setup screen reader support with enhanced announcements
     */
    setupScreenReaderSupport() {
        // Ensure announcer exists
        if (!document.getElementById('sr-announcer')) {
            this.enhanceLandmarks();
        }

        // Add contextual help for complex interactions
        this.addContextualHelp();

        // Setup mutation observer for dynamic content
        this.setupContentObserver();
    }

    /**
     * Add contextual help for screen reader users
     */
    addContextualHelp() {
        // Add help for graph interactions
        const graphContainer = document.getElementById('graph-container');
        if (graphContainer) {
            graphContainer.addEventListener('focus', () => {
                this.announceToScreenReader('Graph focused. Use arrow keys to navigate nodes, Enter to select, Escape to return to main navigation.');
            });
        }

        // Add help for filter controls
        const filterInputs = document.querySelectorAll('.filter-item input');
        filterInputs.forEach(input => {
            input.addEventListener('focus', () => {
                const label = input.closest('label');
                if (label) {
                    const text = label.textContent.replace(/\s+/g, ' ').trim();
                    this.announceToScreenReader(`${text} filter`);
                }
            });
        });
    }

    /**
     * Setup content observer for dynamic updates
     */
    setupContentObserver() {
        if (typeof MutationObserver === 'undefined') {return;}

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Update focusable elements when DOM changes
                    this.updateFocusableElements();

                    // Update roving tabindex if navigation elements change
                    if (mutation.target.classList.contains('graph-controls-overlay') ||
                        mutation.target.classList.contains('panel-tabs')) {
                        this.setupRovingTabindex();
                    }
                }

                // Announce important content changes
                if (mutation.target.id === 'node-details' && mutation.type === 'childList') {
                    this.announceNodeDetailsChange();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        this.contentObserver = observer;
    }

    /**
     * Enhanced screen reader announcements with timing and context
     */
    announceToScreenReader(message, priority = 'polite') {
        const announcer = document.getElementById('sr-announcer');
        if (!announcer) {return;}

        // Set appropriate priority
        announcer.setAttribute('aria-live', priority);

        // Clear previous announcement
        announcer.textContent = '';

        // Add new announcement after a brief delay to ensure it's picked up
        setTimeout(() => {
            announcer.textContent = message;

            // Clear after appropriate time based on message length
            const clearDelay = Math.max(1000, message.length * 50); // ~50ms per character
            setTimeout(() => {
                if (announcer.textContent === message) {
                    announcer.textContent = '';
                }
            }, clearDelay);
        }, 50);
    }

    /**
     * Announce node details changes
     */
    announceNodeDetailsChange() {
        const nodeDetails = document.getElementById('node-details');
        if (!nodeDetails) {return;}

        const hasSelection = !nodeDetails.querySelector('.no-selection');
        if (hasSelection) {
            const nodeTitle = nodeDetails.querySelector('.node-title');
            if (nodeTitle) {
                this.announceToScreenReader(`Node selected: ${nodeTitle.textContent}`);
            }
        } else {
            this.announceToScreenReader('No node selected');
        }
    }

    /**
     * Show keyboard help dialog
     */
    showKeyboardHelp() {
        const helpText = `
            Keyboard shortcuts:
            Tab: Navigate between controls
            Arrow keys: Navigate within groups
            Enter/Space: Activate buttons
            Escape: Close overlays or clear search
            T: Toggle theme
            L: Toggle legend
            Ctrl+F: Focus search
            Ctrl+R: Reset filters
            ?: Show this help
        `.replace(/\n\s+/g, '\n').trim();

        this.announceToScreenReader(helpText, 'assertive');

        // Also show visual help if needed
        console.log('Keyboard Help:', helpText);
    }

    /**
     * Detect user preferences for accessibility
     */
    detectUserPreferences() {
        // Detect reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
            console.log('Reduced motion detected - animations minimized');
        }

        // Detect high contrast preference
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            if (!this.currentTheme.includes('high-contrast')) {
                this.currentTheme = 'theme-high-contrast';
                document.getElementById('app').className = this.currentTheme;
                this.updateThemeButton();
                this.announceToScreenReader('High contrast mode activated based on system preference');
            }
        }

        // Detect color scheme preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            if (this.currentTheme === 'theme-light') {
                this.currentTheme = 'theme-dark';
                document.getElementById('app').className = this.currentTheme;
                this.updateThemeButton();
            }
        }
    }

    /**
     * Setup contrast media query listener
     */
    setupContrastListener() {
        if (!window.matchMedia) {return;}

        const contrastQuery = window.matchMedia('(prefers-contrast: high)');
        const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        contrastQuery.addEventListener('change', (e) => {
            if (e.matches && !this.currentTheme.includes('high-contrast')) {
                this.currentTheme = 'theme-high-contrast';
                document.getElementById('app').className = this.currentTheme;
                this.updateThemeButton();
                this.announceToScreenReader('High contrast mode activated');
            }
        });

        colorSchemeQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!localStorage.getItem('nas-graph-preferences')) {
                this.currentTheme = e.matches ? 'theme-dark' : 'theme-light';
                document.getElementById('app').className = this.currentTheme;
                this.updateThemeButton();
            }
        });
    }

    /**
     * Save user preference to localStorage
     */
    saveUserPreference(key, value) {
        try {
            const preferences = JSON.parse(localStorage.getItem('nas-graph-preferences') || '{}');
            preferences[key] = value;
            localStorage.setItem('nas-graph-preferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Could not save user preference:', error);
        }
    }

    /**
     * Load user preferences from localStorage
     */
    loadUserPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem('nas-graph-preferences') || '{}');

            // Apply saved theme
            if (preferences.theme && preferences.theme !== this.currentTheme) {
                this.currentTheme = preferences.theme;
                document.getElementById('app').className = this.currentTheme;
                this.updateThemeButton();
            }

            // Apply saved legend visibility
            if (typeof preferences.legendVisible === 'boolean') {
                this.legendVisible = !preferences.legendVisible; // Opposite because toggleLegend flips it
                this.toggleLegend();
            }

            // Apply saved filters
            if (preferences.filters) {
                this.applyFilters(preferences.filters);
            }

        } catch (error) {
            console.warn('Could not load user preferences:', error);
        }
    }

    /**
     * Update theme button text based on current theme
     */
    updateThemeButton() {
        const themeButton = document.getElementById('theme-toggle');
        if (!themeButton) {return;}

        switch (this.currentTheme) {
        case 'theme-light':
            themeButton.innerHTML = '<span aria-hidden="true">🌙</span> Dark';
            themeButton.setAttribute('aria-label', 'Switch to dark mode');
            break;
        case 'theme-dark':
            themeButton.innerHTML = '<span aria-hidden="true">⚪</span> Contrast';
            themeButton.setAttribute('aria-label', 'Switch to high contrast mode');
            break;
        case 'theme-high-contrast':
            themeButton.innerHTML = '<span aria-hidden="true">☀️</span> Light';
            themeButton.setAttribute('aria-label', 'Switch to light mode');
            break;
        }
    }

    /**
     * Apply saved filters
     */
    applyFilters(filters) {
        if (filters.nodeTypes) {
            Object.entries(filters.nodeTypes).forEach(([type, checked]) => {
                const checkbox = document.getElementById(`filter-${type}`);
                if (checkbox) {checkbox.checked = checked;}
            });
        }

        if (filters.connections) {
            Object.entries(filters.connections).forEach(([type, checked]) => {
                const checkbox = document.getElementById(`filter-${type}`);
                if (checkbox) {checkbox.checked = checked;}
            });
        }

        if (filters.ranges) {
            if (filters.ranges.nodeSize) {
                const slider = document.getElementById('node-size-slider');
                if (slider) {slider.value = filters.ranges.nodeSize;}
            }
            if (filters.ranges.linkStrength) {
                const slider = document.getElementById('link-strength-slider');
                if (slider) {slider.value = filters.ranges.linkStrength;}
            }
        }
    }

    /**
     * Update graph statistics in the analysis panel
     */
    updateGraphStats(stats) {
        const elements = {
            'nodes-count': stats.nodeCount || 0,
            'edges-count': stats.edgeCount || 0,
            'clusters-count': stats.clusterCount || 0,
            'density-value': `${(stats.density * 100 || 0).toFixed(1)}%`,
            'avg-degree-value': stats.avgDegree?.toFixed(1) || 0,
            'components-value': stats.components || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {element.textContent = value;}
        });

        // Announce significant changes
        if (stats.nodeCount !== this.lastStatsUpdate?.nodeCount) {
            this.announceToScreenReader(`Graph updated with ${stats.nodeCount} nodes`);
        }

        this.lastStatsUpdate = stats;
    }
}

// Initialize dashboard UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardUI = new DashboardUI();
});
