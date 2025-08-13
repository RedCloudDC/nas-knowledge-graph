/**
 * Advanced Filters Component
 * Comprehensive filtering for equipment type, date range, severity, location region, etc.
 */

import { filter } from '../utils/filter.js';
import { store } from '../core/store.js';

export class AdvancedFilters {
    constructor(containerId) {
        this.container = document.getElementById(containerId) || document.querySelector(containerId);
        this.activeFilters = new Map();
        this.filterState = {
            equipmentTypes: [],
            dateRange: { start: null, end: null },
            severity: [],
            locationRegions: [],
            connectionCount: { min: 0, max: null },
            customProperties: {}
        };

        this.init();
        this.setupEventListeners();
    }

    /**
     * Initialize the filter panel
     */
    init() {
        if (!this.container) {
            console.warn('AdvancedFilters: Container not found');
            return;
        }

        this.createFilterInterface();
        this.addFilterStyles();
        this.loadFilterState();
    }

    /**
     * Create the comprehensive filter interface
     */
    createFilterInterface() {
        this.container.innerHTML = `
            <div class="advanced-filters-container">
                <div class="filter-header">
                    <h2>🔍 Advanced Filters</h2>
                    <div class="filter-actions">
                        <button id="clear-all-filters" class="filter-btn filter-btn-secondary">
                            🗑️ Clear All
                        </button>
                        <button id="save-filter-set" class="filter-btn filter-btn-primary">
                            💾 Save Set
                        </button>
                    </div>
                </div>

                <!-- Equipment Type Filter -->
                <div class="filter-section" id="equipment-type-section">
                    <div class="filter-section-header">
                        <h3>🔧 Equipment Type</h3>
                        <button class="filter-toggle" data-section="equipment-type">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="filter-content">
                        <div class="checkbox-group">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="faa_stars_terminal" data-filter="equipmentType">
                                <span class="checkmark"></span>
                                <span class="checkbox-icon">🏢</span>
                                FAA STARS Terminal
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="approach_control" data-filter="equipmentType">
                                <span class="checkmark"></span>
                                <span class="checkbox-icon">🛫</span>
                                Approach Control
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="faa_eram_terminal" data-filter="equipmentType">
                                <span class="checkmark"></span>
                                <span class="checkbox-icon">📡</span>
                                FAA ERAM Terminal
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="radar_equipment" data-filter="equipmentType">
                                <span class="checkmark"></span>
                                <span class="checkbox-icon">📊</span>
                                Radar Equipment
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="communication_equipment" data-filter="equipmentType">
                                <span class="checkmark"></span>
                                <span class="checkbox-icon">📻</span>
                                Communication Equipment
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Date Range Filter -->
                <div class="filter-section" id="date-range-section">
                    <div class="filter-section-header">
                        <h3>📅 Date Range</h3>
                        <button class="filter-toggle" data-section="date-range">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="filter-content">
                        <div class="date-range-container">
                            <div class="date-input-group">
                                <label>From:</label>
                                <input type="date" id="date-start" data-filter="dateRange">
                            </div>
                            <div class="date-input-group">
                                <label>To:</label>
                                <input type="date" id="date-end" data-filter="dateRange">
                            </div>
                        </div>
                        <div class="date-presets">
                            <button class="date-preset" data-days="7">Last 7 days</button>
                            <button class="date-preset" data-days="30">Last 30 days</button>
                            <button class="date-preset" data-days="90">Last 90 days</button>
                            <button class="date-preset" data-days="365">Last year</button>
                        </div>
                    </div>
                </div>

                <!-- Severity Filter -->
                <div class="filter-section" id="severity-section">
                    <div class="filter-section-header">
                        <h3>⚠️ Severity Level</h3>
                        <button class="filter-toggle" data-section="severity">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="filter-content">
                        <div class="severity-grid">
                            <label class="severity-item severity-critical">
                                <input type="checkbox" value="critical" data-filter="severity">
                                <span class="severity-indicator"></span>
                                <span class="severity-label">Critical</span>
                            </label>
                            <label class="severity-item severity-high">
                                <input type="checkbox" value="high" data-filter="severity">
                                <span class="severity-indicator"></span>
                                <span class="severity-label">High</span>
                            </label>
                            <label class="severity-item severity-medium">
                                <input type="checkbox" value="medium" data-filter="severity">
                                <span class="severity-indicator"></span>
                                <span class="severity-label">Medium</span>
                            </label>
                            <label class="severity-item severity-low">
                                <input type="checkbox" value="low" data-filter="severity">
                                <span class="severity-indicator"></span>
                                <span class="severity-label">Low</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Location Region Filter -->
                <div class="filter-section" id="location-section">
                    <div class="filter-section-header">
                        <h3>📍 Location Region</h3>
                        <button class="filter-toggle" data-section="location">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="filter-content">
                        <div class="location-search">
                            <input type="text" id="location-search" placeholder="Search locations..." 
                                   autocomplete="off">
                        </div>
                        <div class="location-regions">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="northeast" data-filter="region">
                                <span class="checkmark"></span>
                                Northeast US
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="southeast" data-filter="region">
                                <span class="checkmark"></span>
                                Southeast US
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="midwest" data-filter="region">
                                <span class="checkmark"></span>
                                Midwest US
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="southwest" data-filter="region">
                                <span class="checkmark"></span>
                                Southwest US
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="west" data-filter="region">
                                <span class="checkmark"></span>
                                Western US
                            </label>
                        </div>
                        <div class="specific-locations" id="specific-locations">
                            <!-- Dynamically populated based on data -->
                        </div>
                    </div>
                </div>

                <!-- Connection Count Filter -->
                <div class="filter-section" id="connection-section">
                    <div class="filter-section-header">
                        <h3>🔗 Connection Count</h3>
                        <button class="filter-toggle" data-section="connection">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="filter-content">
                        <div class="range-filter">
                            <div class="range-input-group">
                                <label>Minimum:</label>
                                <input type="number" id="connection-min" min="0" placeholder="0" 
                                       data-filter="connectionCount">
                            </div>
                            <div class="range-input-group">
                                <label>Maximum:</label>
                                <input type="number" id="connection-max" min="0" placeholder="∞" 
                                       data-filter="connectionCount">
                            </div>
                        </div>
                        <div class="range-slider-container">
                            <input type="range" id="connection-range" min="0" max="50" value="0" 
                                   class="range-slider">
                            <div class="range-labels">
                                <span>0</span>
                                <span>50+</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Custom Properties Filter -->
                <div class="filter-section" id="custom-properties-section">
                    <div class="filter-section-header">
                        <h3>⚙️ Custom Properties</h3>
                        <button class="filter-toggle" data-section="custom-properties">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="filter-content">
                        <div class="custom-filter-builder">
                            <div class="property-filter-row">
                                <select id="property-key" class="property-select">
                                    <option value="">Select property...</option>
                                </select>
                                <select id="property-operator" class="operator-select">
                                    <option value="equals">equals</option>
                                    <option value="contains">contains</option>
                                    <option value="greater">greater than</option>
                                    <option value="less">less than</option>
                                </select>
                                <input type="text" id="property-value" class="property-value" 
                                       placeholder="Value...">
                                <button id="add-property-filter" class="add-filter-btn">+</button>
                            </div>
                            <div id="active-property-filters" class="active-filters-list">
                                <!-- Active property filters will be displayed here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filter Summary -->
                <div class="filter-summary">
                    <div class="summary-header">
                        <h4>📊 Filter Summary</h4>
                    </div>
                    <div class="summary-content">
                        <div class="summary-stats">
                            <div class="stat-item">
                                <span class="stat-value" id="filtered-nodes">0</span>
                                <span class="stat-label">Nodes</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value" id="filtered-edges">0</span>
                                <span class="stat-label">Edges</span>
                            </div>
                        </div>
                        <div class="active-filters-summary" id="active-filters-summary">
                            <!-- Active filters summary -->
                        </div>
                    </div>
                </div>

                <!-- Saved Filter Sets -->
                <div class="saved-filters-section">
                    <div class="section-header">
                        <h4>💾 Saved Filter Sets</h4>
                    </div>
                    <div id="saved-filters-list" class="saved-filters-list">
                        <!-- Saved filter sets will be displayed here -->
                    </div>
                </div>
            </div>
        `;

        this.populateSpecificLocations();
        this.populatePropertyKeys();
        this.loadSavedFilterSets();
    }

    /**
     * Add comprehensive styles for the filter component
     */
    addFilterStyles() {
        if (document.querySelector('#advanced-filters-styles')) {return;}

        const style = document.createElement('style');
        style.id = 'advanced-filters-styles';
        style.textContent = `
            .advanced-filters-container {
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
                max-height: calc(100vh - 200px);
                overflow-y: auto;
            }

            .filter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #e9ecef;
            }

            .filter-header h2 {
                margin: 0;
                color: #2c3e50;
                font-size: 18px;
            }

            .filter-actions {
                display: flex;
                gap: 10px;
            }

            .filter-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .filter-btn-primary {
                background: #3498db;
                color: white;
            }

            .filter-btn-primary:hover {
                background: #2980b9;
            }

            .filter-btn-secondary {
                background: #e9ecef;
                color: #6c757d;
            }

            .filter-btn-secondary:hover {
                background: #dee2e6;
                color: #495057;
            }

            .filter-section {
                margin-bottom: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .filter-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #e9ecef;
                cursor: pointer;
            }

            .filter-section-header h3 {
                margin: 0;
                font-size: 14px;
                color: #2c3e50;
            }

            .filter-toggle {
                background: none;
                border: none;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
                transition: background-color 0.2s ease;
            }

            .filter-toggle:hover {
                background: #f8f9fa;
            }

            .toggle-icon {
                transition: transform 0.2s ease;
            }

            .filter-section.collapsed .toggle-icon {
                transform: rotate(-90deg);
            }

            .filter-content {
                padding: 20px;
            }

            .filter-section.collapsed .filter-content {
                display: none;
            }

            /* Checkbox Styles */
            .checkbox-group {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .filter-checkbox {
                display: flex;
                align-items: center;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                transition: background-color 0.2s ease;
            }

            .filter-checkbox:hover {
                background: #f8f9fa;
            }

            .filter-checkbox input[type="checkbox"] {
                display: none;
            }

            .checkmark {
                width: 18px;
                height: 18px;
                border: 2px solid #bdc3c7;
                border-radius: 4px;
                margin-right: 10px;
                position: relative;
                transition: all 0.2s ease;
            }

            .filter-checkbox input[type="checkbox"]:checked + .checkmark {
                background: #3498db;
                border-color: #3498db;
            }

            .filter-checkbox input[type="checkbox"]:checked + .checkmark::after {
                content: '✓';
                position: absolute;
                top: -2px;
                left: 2px;
                color: white;
                font-size: 12px;
                font-weight: bold;
            }

            .checkbox-icon {
                margin-right: 8px;
                font-size: 16px;
            }

            /* Date Range Styles */
            .date-range-container {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
            }

            .date-input-group {
                flex: 1;
            }

            .date-input-group label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #6c757d;
                margin-bottom: 5px;
            }

            .date-input-group input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s ease;
            }

            .date-input-group input:focus {
                border-color: #3498db;
                box-shadow: 0 0 0 2px rgba(52,152,219,0.2);
            }

            .date-presets {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .date-preset {
                padding: 6px 12px;
                background: #e9ecef;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .date-preset:hover {
                background: #dee2e6;
            }

            .date-preset.active {
                background: #3498db;
                color: white;
            }

            /* Severity Styles */
            .severity-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
            }

            .severity-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s ease;
            }

            .severity-item input[type="checkbox"] {
                display: none;
            }

            .severity-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
            }

            .severity-critical .severity-indicator {
                background: #e74c3c;
            }

            .severity-high .severity-indicator {
                background: #f39c12;
            }

            .severity-medium .severity-indicator {
                background: #f1c40f;
            }

            .severity-low .severity-indicator {
                background: #2ecc71;
            }

            .severity-item input[type="checkbox"]:checked + .severity-indicator {
                box-shadow: 0 0 0 3px rgba(255,255,255,1), 0 0 0 5px currentColor;
            }

            .severity-label {
                font-size: 12px;
                font-weight: 600;
            }

            /* Location Styles */
            .location-search {
                margin-bottom: 15px;
            }

            .location-search input {
                width: 100%;
                padding: 10px 15px;
                border: 1px solid #e9ecef;
                border-radius: 25px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s ease;
            }

            .location-search input:focus {
                border-color: #3498db;
            }

            .location-regions {
                margin-bottom: 15px;
            }

            .specific-locations {
                max-height: 150px;
                overflow-y: auto;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 10px;
            }

            /* Range Filter Styles */
            .range-filter {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
            }

            .range-input-group {
                flex: 1;
            }

            .range-slider-container {
                position: relative;
            }

            .range-slider {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #e9ecef;
                outline: none;
                cursor: pointer;
            }

            .range-slider::-webkit-slider-thumb {
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #3498db;
                cursor: pointer;
            }

            .range-labels {
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
                font-size: 11px;
                color: #6c757d;
            }

            /* Custom Properties Styles */
            .property-filter-row {
                display: flex;
                gap: 10px;
                align-items: end;
                margin-bottom: 15px;
            }

            .property-select,
            .operator-select {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                background: white;
                outline: none;
            }

            .property-value {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                outline: none;
            }

            .add-filter-btn {
                width: 36px;
                height: 36px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
            }

            .add-filter-btn:hover {
                background: #2980b9;
            }

            .active-filters-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .property-filter-tag {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #e3f2fd;
                border-radius: 6px;
                font-size: 12px;
            }

            .filter-tag-remove {
                background: none;
                border: none;
                color: #2196f3;
                cursor: pointer;
                font-size: 14px;
                padding: 2px 4px;
            }

            /* Filter Summary Styles */
            .filter-summary {
                background: white;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .summary-header h4 {
                margin: 0 0 15px 0;
                font-size: 14px;
                color: #2c3e50;
            }

            .summary-stats {
                display: flex;
                gap: 20px;
                margin-bottom: 15px;
            }

            .stat-item {
                text-align: center;
            }

            .stat-value {
                display: block;
                font-size: 24px;
                font-weight: bold;
                color: #3498db;
            }

            .stat-label {
                display: block;
                font-size: 11px;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .active-filters-summary {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .filter-tag {
                padding: 4px 8px;
                background: #e9ecef;
                border-radius: 4px;
                font-size: 11px;
                color: #495057;
            }

            /* Saved Filters Styles */
            .saved-filters-section {
                background: white;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .saved-filters-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .saved-filter-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }

            .saved-filter-item:hover {
                background: #e9ecef;
            }

            .saved-filter-name {
                font-weight: 600;
                color: #2c3e50;
            }

            .saved-filter-actions {
                display: flex;
                gap: 5px;
            }

            .filter-action-btn {
                padding: 4px 8px;
                background: none;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .filter-action-btn:hover {
                background: #e9ecef;
            }

            /* Dark theme support */
            .theme-dark .advanced-filters-container,
            .theme-dark .filter-section,
            .theme-dark .filter-summary,
            .theme-dark .saved-filters-section {
                background: #2c3e50;
                color: #ecf0f1;
            }

            .theme-dark .filter-section-header {
                border-bottom-color: #34495e;
            }

            .theme-dark .filter-content {
                background: #2c3e50;
            }

            .theme-dark .date-input-group input,
            .theme-dark .location-search input,
            .theme-dark .property-value,
            .theme-dark .property-select,
            .theme-dark .operator-select {
                background: #34495e;
                border-color: #4a5c6b;
                color: #ecf0f1;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup event listeners for all filter interactions
     */
    setupEventListeners() {
        // Section toggle handlers
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.filter-toggle')) {
                const section = e.target.closest('.filter-section');
                section.classList.toggle('collapsed');
            }
        });

        // Checkbox filters
        this.container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleCheckboxFilter(e.target);
            }
        });

        // Date range filters
        this.container.addEventListener('change', (e) => {
            if (e.target.type === 'date') {
                this.handleDateRangeFilter();
            }
        });

        // Date preset buttons
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-preset')) {
                this.handleDatePreset(e.target);
            }
        });

        // Location search
        const locationSearch = this.container.querySelector('#location-search');
        if (locationSearch) {
            locationSearch.addEventListener('input', (e) => {
                this.handleLocationSearch(e.target.value);
            });
        }

        // Connection count filters
        const connectionMin = this.container.querySelector('#connection-min');
        const connectionMax = this.container.querySelector('#connection-max');
        const connectionRange = this.container.querySelector('#connection-range');

        [connectionMin, connectionMax].forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.handleConnectionCountFilter());
            }
        });

        if (connectionRange) {
            connectionRange.addEventListener('input', (e) => {
                connectionMin.value = e.target.value;
                this.handleConnectionCountFilter();
            });
        }

        // Custom property filters
        const addPropertyBtn = this.container.querySelector('#add-property-filter');
        if (addPropertyBtn) {
            addPropertyBtn.addEventListener('click', () => {
                this.addCustomPropertyFilter();
            });
        }

        // Clear all filters
        const clearAllBtn = this.container.querySelector('#clear-all-filters');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Save filter set
        const saveFilterBtn = this.container.querySelector('#save-filter-set');
        if (saveFilterBtn) {
            saveFilterBtn.addEventListener('click', () => {
                this.saveFilterSet();
            });
        }

        // Store subscription for data updates
        store.subscribe('nodes', () => this.updateFilterSummary());
        store.subscribe('edges', () => this.updateFilterSummary());
    }

    /**
     * Handle checkbox filter changes
     */
    handleCheckboxFilter(checkbox) {
        const filterType = checkbox.dataset.filter;
        const value = checkbox.value;

        switch (filterType) {
        case 'equipmentType':
            this.updateArrayFilter('equipmentTypes', value, checkbox.checked);
            break;
        case 'severity':
            this.updateArrayFilter('severity', value, checkbox.checked);
            break;
        case 'region':
            this.updateArrayFilter('locationRegions', value, checkbox.checked);
            break;
        }

        this.applyFilters();
    }

    /**
     * Update array-based filter
     */
    updateArrayFilter(filterKey, value, checked) {
        if (checked) {
            if (!this.filterState[filterKey].includes(value)) {
                this.filterState[filterKey].push(value);
            }
        } else {
            this.filterState[filterKey] = this.filterState[filterKey].filter(v => v !== value);
        }
    }

    /**
     * Handle date range filter changes
     */
    handleDateRangeFilter() {
        const startInput = this.container.querySelector('#date-start');
        const endInput = this.container.querySelector('#date-end');

        this.filterState.dateRange = {
            start: startInput.value || null,
            end: endInput.value || null
        };

        this.applyFilters();
    }

    /**
     * Handle date preset selection
     */
    handleDatePreset(button) {
        const days = parseInt(button.dataset.days);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const startInput = this.container.querySelector('#date-start');
        const endInput = this.container.querySelector('#date-end');

        if (startInput && endInput) {
            startInput.value = startDate.toISOString().split('T')[0];
            endInput.value = endDate.toISOString().split('T')[0];
        }

        // Update active preset styling
        this.container.querySelectorAll('.date-preset').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        this.handleDateRangeFilter();
    }

    /**
     * Handle location search
     */
    handleLocationSearch(query) {
        const specificLocations = this.container.querySelector('#specific-locations');
        if (!specificLocations) {return;}

        // Get unique locations from data
        const { nodes } = store.getState();
        const locations = new Set();

        nodes.forEach(node => {
            if (node.address?.city) {
                const location = `${node.address.city}, ${node.address.state}`;
                if (location.toLowerCase().includes(query.toLowerCase())) {
                    locations.add(location);
                }
            }
        });

        // Render filtered locations
        specificLocations.innerHTML = Array.from(locations)
            .slice(0, 10) // Limit to 10 results
            .map(location => `
                <label class="filter-checkbox">
                    <input type="checkbox" value="${location}" data-filter="specificLocation">
                    <span class="checkmark"></span>
                    📍 ${location}
                </label>
            `).join('');
    }

    /**
     * Handle connection count filter
     */
    handleConnectionCountFilter() {
        const minInput = this.container.querySelector('#connection-min');
        const maxInput = this.container.querySelector('#connection-max');
        const rangeSlider = this.container.querySelector('#connection-range');

        const min = parseInt(minInput.value) || 0;
        const max = maxInput.value ? parseInt(maxInput.value) : null;

        this.filterState.connectionCount = { min, max };

        if (rangeSlider) {
            rangeSlider.value = min;
        }

        this.applyFilters();
    }

    /**
     * Add custom property filter
     */
    addCustomPropertyFilter() {
        const keySelect = this.container.querySelector('#property-key');
        const operatorSelect = this.container.querySelector('#property-operator');
        const valueInput = this.container.querySelector('#property-value');

        if (!keySelect.value || !valueInput.value) {return;}

        const filterId = `${keySelect.value}_${Date.now()}`;
        this.filterState.customProperties[filterId] = {
            key: keySelect.value,
            operator: operatorSelect.value,
            value: valueInput.value
        };

        this.renderCustomPropertyFilters();
        this.applyFilters();

        // Clear inputs
        valueInput.value = '';
    }

    /**
     * Render active custom property filters
     */
    renderCustomPropertyFilters() {
        const container = this.container.querySelector('#active-property-filters');
        if (!container) {return;}

        container.innerHTML = Object.entries(this.filterState.customProperties)
            .map(([filterId, filterData]) => `
                <div class="property-filter-tag" data-filter-id="${filterId}">
                    <span>${filterData.key} ${filterData.operator} "${filterData.value}"</span>
                    <button class="filter-tag-remove" onclick="this.removePropertyFilter('${filterId}')">×</button>
                </div>
            `).join('');
    }

    /**
     * Remove custom property filter
     */
    removePropertyFilter(filterId) {
        delete this.filterState.customProperties[filterId];
        this.renderCustomPropertyFilters();
        this.applyFilters();
    }

    /**
     * Apply all active filters
     */
    applyFilters() {
        const filterConfig = this.buildFilterConfig();
        const filteredData = filter.applyFilters(filterConfig);

        // Update store with filtered data or emit event
        document.dispatchEvent(new CustomEvent('filtersApplied', {
            detail: {
                filteredData,
                filterState: this.filterState
            }
        }));

        this.updateFilterSummary(filteredData);
        this.saveFilterState();
    }

    /**
     * Build filter configuration from current state
     */
    buildFilterConfig() {
        const config = { nodes: {}, edges: {} };

        // Equipment type filter
        if (this.filterState.equipmentTypes.length > 0) {
            config.nodes.type = this.filterState.equipmentTypes;
        }

        // Date range filter (would need date properties in data)
        if (this.filterState.dateRange.start || this.filterState.dateRange.end) {
            config.nodes.properties = config.nodes.properties || {};
            if (this.filterState.dateRange.start) {
                config.nodes.properties.createdDate = {
                    operator: 'gte',
                    value: this.filterState.dateRange.start
                };
            }
            if (this.filterState.dateRange.end) {
                config.nodes.properties.createdDate = {
                    ...config.nodes.properties.createdDate,
                    operator: 'between',
                    value: [this.filterState.dateRange.start, this.filterState.dateRange.end]
                };
            }
        }

        // Connection count filter
        if (this.filterState.connectionCount.min > 0 || this.filterState.connectionCount.max !== null) {
            config.nodes.connections = {
                operator: this.filterState.connectionCount.max ? 'between' : 'gte',
                value: this.filterState.connectionCount.max ?
                    [this.filterState.connectionCount.min, this.filterState.connectionCount.max] :
                    this.filterState.connectionCount.min
            };
        }

        // Custom property filters
        Object.entries(this.filterState.customProperties).forEach(([filterId, filterData]) => {
            config.nodes.properties = config.nodes.properties || {};
            config.nodes.properties[filterData.key] = {
                operator: filterData.operator === 'equals' ? 'eq' : filterData.operator,
                value: filterData.value
            };
        });

        return config;
    }

    /**
     * Update filter summary statistics
     */
    updateFilterSummary(filteredData = null) {
        if (!filteredData) {
            const filterConfig = this.buildFilterConfig();
            filteredData = filter.applyFilters(filterConfig);
        }

        const nodesCount = this.container.querySelector('#filtered-nodes');
        const edgesCount = this.container.querySelector('#filtered-edges');
        const summary = this.container.querySelector('#active-filters-summary');

        if (nodesCount) {nodesCount.textContent = filteredData.nodes.length;}
        if (edgesCount) {edgesCount.textContent = filteredData.edges.length;}

        if (summary) {
            const activeTags = [];

            if (this.filterState.equipmentTypes.length > 0) {
                activeTags.push(`Equipment: ${this.filterState.equipmentTypes.join(', ')}`);
            }

            if (this.filterState.dateRange.start || this.filterState.dateRange.end) {
                activeTags.push('Date Range');
            }

            if (this.filterState.severity.length > 0) {
                activeTags.push(`Severity: ${this.filterState.severity.join(', ')}`);
            }

            if (this.filterState.connectionCount.min > 0 || this.filterState.connectionCount.max) {
                activeTags.push('Connection Count');
            }

            summary.innerHTML = activeTags
                .map(tag => `<span class="filter-tag">${tag}</span>`)
                .join('');
        }
    }

    /**
     * Populate specific locations from data
     */
    populateSpecificLocations() {
        const { nodes } = store.getState();
        const locations = new Set();

        nodes.forEach(node => {
            if (node.address?.city) {
                locations.add(`${node.address.city}, ${node.address.state}`);
            }
        });

        const container = this.container.querySelector('#specific-locations');
        if (container) {
            container.innerHTML = Array.from(locations)
                .slice(0, 20) // Show first 20 locations
                .map(location => `
                    <label class="filter-checkbox">
                        <input type="checkbox" value="${location}" data-filter="specificLocation">
                        <span class="checkmark"></span>
                        📍 ${location}
                    </label>
                `).join('');
        }
    }

    /**
     * Populate property keys for custom filters
     */
    populatePropertyKeys() {
        const { nodes } = store.getState();
        const properties = new Set();

        nodes.forEach(node => {
            if (node.properties) {
                Object.keys(node.properties).forEach(key => properties.add(key));
            }

            // Add common node properties
            ['type', 'name', 'label'].forEach(key => {
                if (node[key]) {properties.add(key);}
            });
        });

        const select = this.container.querySelector('#property-key');
        if (select) {
            select.innerHTML = `
                <option value="">Select property...</option>
                ${Array.from(properties).map(prop =>
        `<option value="${prop}">${prop}</option>`
    ).join('')}
            `;
        }
    }

    /**
     * Clear all active filters
     */
    clearAllFilters() {
        this.filterState = {
            equipmentTypes: [],
            dateRange: { start: null, end: null },
            severity: [],
            locationRegions: [],
            connectionCount: { min: 0, max: null },
            customProperties: {}
        };

        // Reset UI
        this.container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        this.container.querySelectorAll('input[type="date"]').forEach(input => input.value = '');
        this.container.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
        this.container.querySelector('#property-value').value = '';

        this.renderCustomPropertyFilters();
        this.applyFilters();
    }

    /**
     * Save current filter set
     */
    saveFilterSet() {
        const name = prompt('Enter name for filter set:');
        if (!name) {return;}

        const filterSets = this.getSavedFilterSets();
        filterSets[name] = {
            ...this.filterState,
            created: new Date().toISOString()
        };

        localStorage.setItem('nas-filter-sets', JSON.stringify(filterSets));
        this.loadSavedFilterSets();
    }

    /**
     * Load saved filter sets
     */
    loadSavedFilterSets() {
        const filterSets = this.getSavedFilterSets();
        const container = this.container.querySelector('#saved-filters-list');

        if (!container) {return;}

        container.innerHTML = Object.entries(filterSets)
            .map(([name, filterSet]) => `
                <div class="saved-filter-item">
                    <span class="saved-filter-name">${name}</span>
                    <div class="saved-filter-actions">
                        <button class="filter-action-btn" onclick="this.applyFilterSet('${name}')">Apply</button>
                        <button class="filter-action-btn" onclick="this.deleteFilterSet('${name}')">Delete</button>
                    </div>
                </div>
            `).join('');
    }

    /**
     * Get saved filter sets from localStorage
     */
    getSavedFilterSets() {
        try {
            return JSON.parse(localStorage.getItem('nas-filter-sets') || '{}');
        } catch {
            return {};
        }
    }

    /**
     * Apply saved filter set
     */
    applyFilterSet(name) {
        const filterSets = this.getSavedFilterSets();
        const filterSet = filterSets[name];

        if (!filterSet) {return;}

        this.filterState = { ...filterSet };
        delete this.filterState.created; // Remove metadata

        this.updateUIFromFilterState();
        this.applyFilters();
    }

    /**
     * Update UI elements to match filter state
     */
    updateUIFromFilterState() {
        // Update checkboxes
        this.filterState.equipmentTypes.forEach(type => {
            const checkbox = this.container.querySelector(`input[value="${type}"][data-filter="equipmentType"]`);
            if (checkbox) {checkbox.checked = true;}
        });

        this.filterState.severity.forEach(sev => {
            const checkbox = this.container.querySelector(`input[value="${sev}"][data-filter="severity"]`);
            if (checkbox) {checkbox.checked = true;}
        });

        // Update date inputs
        if (this.filterState.dateRange.start) {
            const startInput = this.container.querySelector('#date-start');
            if (startInput) {startInput.value = this.filterState.dateRange.start;}
        }

        if (this.filterState.dateRange.end) {
            const endInput = this.container.querySelector('#date-end');
            if (endInput) {endInput.value = this.filterState.dateRange.end;}
        }

        // Update connection count
        const minInput = this.container.querySelector('#connection-min');
        const maxInput = this.container.querySelector('#connection-max');

        if (minInput) {minInput.value = this.filterState.connectionCount.min;}
        if (maxInput && this.filterState.connectionCount.max) {
            maxInput.value = this.filterState.connectionCount.max;
        }

        this.renderCustomPropertyFilters();
    }

    /**
     * Delete saved filter set
     */
    deleteFilterSet(name) {
        if (!confirm(`Delete filter set "${name}"?`)) {return;}

        const filterSets = this.getSavedFilterSets();
        delete filterSets[name];

        localStorage.setItem('nas-filter-sets', JSON.stringify(filterSets));
        this.loadSavedFilterSets();
    }

    /**
     * Save current filter state to localStorage
     */
    saveFilterState() {
        localStorage.setItem('nas-current-filter-state', JSON.stringify(this.filterState));
    }

    /**
     * Load filter state from localStorage
     */
    loadFilterState() {
        try {
            const saved = localStorage.getItem('nas-current-filter-state');
            if (saved) {
                this.filterState = { ...this.filterState, ...JSON.parse(saved) };
                this.updateUIFromFilterState();
            }
        } catch (e) {
            console.warn('Failed to load filter state:', e);
        }
    }

    /**
     * Get current filter state
     */
    getFilterState() {
        return { ...this.filterState };
    }

    /**
     * Destroy the filter component
     */
    destroy() {
        // Clean up event listeners and references
        this.container = null;
        this.activeFilters.clear();
    }
}

export default AdvancedFilters;
