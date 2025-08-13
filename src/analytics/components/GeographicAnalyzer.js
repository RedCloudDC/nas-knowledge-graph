/**
 * Geographic Analyzer
 * Creates geographic clustering heat maps using Leaflet with tile layers and circle markers
 * sized by event count for location-based maintenance analysis
 */

export class GeographicAnalyzer {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.heatmapLayer = null;
        this.isLeafletLoaded = false;
        this.loadLeaflet();
    }

    async loadLeaflet() {
        try {
            if (!window.L) {
                // Load Leaflet CSS
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);

                // Load Leaflet JS
                await this.loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
                
                // Load Leaflet Heat plugin
                await this.loadScript('https://unpkg.com/leaflet.heat/dist/leaflet-heat.js');
            }
            this.isLeafletLoaded = true;
            console.log('✅ Leaflet loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load Leaflet:', error);
            this.isLeafletLoaded = false;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async render(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const geoData = this.analyzeGeographicData(data);
        
        container.innerHTML = `
            <div class="geographic-analysis">
                <div class="analysis-header">
                    <h4>🗺️ Geographic Distribution Analysis</h4>
                    <div class="analysis-controls">
                        <select id="geo-view-selector" class="view-selector">
                            <option value="event-density">Event Density</option>
                            <option value="equipment-distribution">Equipment Distribution</option>
                            <option value="failure-hotspots">Failure Hotspots</option>
                            <option value="maintenance-coverage">Maintenance Coverage</option>
                        </select>
                        <select id="geo-time-filter" class="time-selector">
                            <option value="all">All Time</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="180">Last 6 Months</option>
                        </select>
                        <button id="toggle-heatmap" class="map-control-btn" title="Toggle Heatmap">
                            🔥 Heatmap
                        </button>
                    </div>
                </div>
                
                <div class="geo-metrics">
                    <div class="metric-card">
                        <span class="metric-value">${geoData.totalLocations}</span>
                        <span class="metric-label">Active Locations</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${geoData.avgEventsPerLocation.toFixed(1)}</span>
                        <span class="metric-label">Avg Events/Location</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${geoData.hotspotLocations.length}</span>
                        <span class="metric-label">High-Activity Zones</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${geoData.coverageArea.toFixed(0)} km²</span>
                        <span class="metric-label">Coverage Area</span>
                    </div>
                </div>
                
                <div id="map-container" class="map-container" style="height: 500px; width: 100%; margin: 20px 0; border: 1px solid #ddd; border-radius: 4px;">
                    ${!this.isLeafletLoaded ? '<div class="loading-map">Loading map...</div>' : ''}
                </div>
                
                <div class="geo-details">
                    <div class="detail-section">
                        <h5>🎯 Location Performance</h5>
                        <div id="location-performance"></div>
                    </div>
                    <div class="detail-section">
                        <h5>🌡️ Regional Trends</h5>
                        <div id="regional-trends"></div>
                    </div>
                </div>
            </div>
        `;

        // Wait for Leaflet to load if not already loaded
        if (!this.isLeafletLoaded) {
            await this.waitForLeaflet();
        }

        this.setupEventListeners(geoData, data);
        this.initializeMap();
        this.renderMapView('event-density', geoData, data);
        this.renderLocationPerformance(geoData);
        this.renderRegionalTrends(geoData);
    }

    async waitForLeaflet() {
        let attempts = 0;
        while (!this.isLeafletLoaded && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
    }

    analyzeGeographicData(data) {
        const locationData = {};
        const regionalData = {};
        let totalEvents = 0;
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

        // Process locations and their associated events
        data.locations.forEach(location => {
            const locationEvents = data.events.filter(event =>
                event.affectedLocations?.includes(location.id)
            );
            
            const equipmentAtLocation = data.equipment.filter(eq =>
                eq.location === location.id
            );

            const failureEvents = locationEvents.filter(event =>
                ['system_failure', 'equipment_malfunction', 'power_failure'].includes(event.type)
            );

            const maintenanceEvents = locationEvents.filter(event =>
                ['maintenance_scheduled', 'maintenance_unscheduled'].includes(event.type)
            );

            const criticalEvents = locationEvents.filter(event =>
                event.severity === 'critical'
            );

            // Update bounds
            if (location.coordinates) {
                const lat = location.coordinates.latitude;
                const lng = location.coordinates.longitude;
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
            }

            locationData[location.id] = {
                location,
                totalEvents: locationEvents.length,
                failureEvents: failureEvents.length,
                maintenanceEvents: maintenanceEvents.length,
                criticalEvents: criticalEvents.length,
                equipmentCount: equipmentAtLocation.length,
                events: locationEvents,
                coordinates: location.coordinates,
                riskScore: this.calculateRiskScore(failureEvents, criticalEvents, equipmentAtLocation),
                utilizationRate: this.calculateUtilizationRate(locationEvents, equipmentAtLocation)
            };

            totalEvents += locationEvents.length;

            // Group by regional designation
            const region = location.regionalDesignation || 'unknown';
            if (!regionalData[region]) {
                regionalData[region] = {
                    region,
                    locations: [],
                    totalEvents: 0,
                    totalEquipment: 0,
                    avgRiskScore: 0
                };
            }
            regionalData[region].locations.push(locationData[location.id]);
            regionalData[region].totalEvents += locationEvents.length;
            regionalData[region].totalEquipment += equipmentAtLocation.length;
        });

        // Calculate regional averages
        Object.values(regionalData).forEach(region => {
            const riskScores = region.locations.map(loc => loc.riskScore);
            region.avgRiskScore = riskScores.length > 0 ? 
                riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length : 0;
        });

        // Identify hotspots (locations with event count > average + 1 std dev)
        const eventCounts = Object.values(locationData).map(loc => loc.totalEvents);
        const avgEvents = eventCounts.reduce((sum, count) => sum + count, 0) / eventCounts.length;
        const stdDev = Math.sqrt(eventCounts.reduce((sum, count) => sum + Math.pow(count - avgEvents, 2), 0) / eventCounts.length);
        const hotspotThreshold = avgEvents + stdDev;

        const hotspotLocations = Object.values(locationData)
            .filter(loc => loc.totalEvents > hotspotThreshold)
            .sort((a, b) => b.totalEvents - a.totalEvents);

        // Calculate coverage area (rough approximation)
        const coverageArea = this.calculateCoverageArea(minLat, maxLat, minLng, maxLng);

        return {
            locationData: Object.values(locationData),
            regionalData: Object.values(regionalData),
            totalLocations: data.locations.length,
            totalEvents,
            avgEventsPerLocation: data.locations.length > 0 ? totalEvents / data.locations.length : 0,
            hotspotLocations,
            bounds: { minLat, maxLat, minLng, maxLng },
            coverageArea
        };
    }

    calculateRiskScore(failureEvents, criticalEvents, equipment) {
        // Simple risk scoring algorithm
        let score = 0;
        
        // Failure frequency contributes to risk
        score += failureEvents.length * 2;
        
        // Critical events have higher weight
        score += criticalEvents.length * 5;
        
        // More equipment means higher risk potential
        score += equipment.length * 0.5;
        
        // Normalize to 0-100 scale
        return Math.min(100, score);
    }

    calculateUtilizationRate(events, equipment) {
        if (equipment.length === 0) return 0;
        
        // Simple utilization calculation based on events per equipment
        const eventsPerEquipment = events.length / equipment.length;
        
        // Normalize to percentage (assuming 5 events per equipment = 100% utilization)
        return Math.min(100, (eventsPerEquipment / 5) * 100);
    }

    calculateCoverageArea(minLat, maxLat, minLng, maxLng) {
        // Rough approximation of area in km²
        const latRange = maxLat - minLat;
        const lngRange = maxLng - minLng;
        
        // 1 degree ≈ 111 km (rough approximation)
        const areaKm2 = latRange * lngRange * 111 * 111;
        return Math.max(0, areaKm2);
    }

    initializeMap() {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer || !window.L || this.map) return;

        try {
            // Initialize the map centered on US
            this.map = L.map('map-container').setView([39.8283, -98.5795], 4);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Initialize layers
            this.markersLayer = L.layerGroup().addTo(this.map);
            
            console.log('✅ Map initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize map:', error);
            mapContainer.innerHTML = '<div class="map-error">Map initialization failed. Please refresh the page.</div>';
        }
    }

    renderMapView(viewType, geoData, data) {
        if (!this.map || !this.markersLayer) return;

        // Clear existing markers
        this.markersLayer.clearLayers();
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }

        const filteredData = geoData.locationData.filter(loc => 
            loc.coordinates && 
            loc.coordinates.latitude && 
            loc.coordinates.longitude
        );

        switch (viewType) {
            case 'event-density':
                this.renderEventDensityMap(filteredData);
                break;
            case 'equipment-distribution':
                this.renderEquipmentDistributionMap(filteredData);
                break;
            case 'failure-hotspots':
                this.renderFailureHotspotsMap(filteredData);
                break;
            case 'maintenance-coverage':
                this.renderMaintenanceCoverageMap(filteredData);
                break;
        }

        // Fit map to show all markers
        if (filteredData.length > 0) {
            const group = new L.featureGroup(this.markersLayer.getLayers());
            if (group.getBounds().isValid()) {
                this.map.fitBounds(group.getBounds().pad(0.1));
            }
        }
    }

    renderEventDensityMap(locationData) {
        const maxEvents = Math.max(...locationData.map(loc => loc.totalEvents));
        
        locationData.forEach(loc => {
            const lat = loc.coordinates.latitude;
            const lng = loc.coordinates.longitude;
            const eventCount = loc.totalEvents;
            
            // Size circle based on event count
            const radius = Math.max(5, (eventCount / maxEvents) * 30);
            const color = this.getEventDensityColor(eventCount, maxEvents);
            
            const circle = L.circleMarker([lat, lng], {
                radius: radius,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
            });

            circle.bindPopup(`
                <div class="map-popup">
                    <h6>${loc.location.name}</h6>
                    <p><strong>Total Events:</strong> ${eventCount}</p>
                    <p><strong>Failures:</strong> ${loc.failureEvents}</p>
                    <p><strong>Maintenance:</strong> ${loc.maintenanceEvents}</p>
                    <p><strong>Equipment:</strong> ${loc.equipmentCount}</p>
                    <p><strong>Risk Score:</strong> ${loc.riskScore.toFixed(1)}/100</p>
                </div>
            `);

            this.markersLayer.addLayer(circle);
        });
    }

    renderEquipmentDistributionMap(locationData) {
        const maxEquipment = Math.max(...locationData.map(loc => loc.equipmentCount));
        
        locationData.forEach(loc => {
            const lat = loc.coordinates.latitude;
            const lng = loc.coordinates.longitude;
            const equipmentCount = loc.equipmentCount;
            
            const radius = Math.max(5, (equipmentCount / maxEquipment) * 25);
            const color = this.getEquipmentDistributionColor(equipmentCount, maxEquipment);
            
            const circle = L.circleMarker([lat, lng], {
                radius: radius,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
            });

            circle.bindPopup(`
                <div class="map-popup">
                    <h6>${loc.location.name}</h6>
                    <p><strong>Equipment Count:</strong> ${equipmentCount}</p>
                    <p><strong>Utilization:</strong> ${loc.utilizationRate.toFixed(1)}%</p>
                    <p><strong>Total Events:</strong> ${loc.totalEvents}</p>
                    <p><strong>Events/Equipment:</strong> ${equipmentCount > 0 ? (loc.totalEvents / equipmentCount).toFixed(1) : '0'}</p>
                </div>
            `);

            this.markersLayer.addLayer(circle);
        });
    }

    renderFailureHotspotsMap(locationData) {
        locationData.forEach(loc => {
            const lat = loc.coordinates.latitude;
            const lng = loc.coordinates.longitude;
            const failureCount = loc.failureEvents;
            const criticalCount = loc.criticalEvents;
            
            // Only show locations with failures
            if (failureCount === 0) return;
            
            const radius = Math.max(8, failureCount * 3);
            const color = this.getFailureHotspotColor(loc.riskScore);
            
            const circle = L.circleMarker([lat, lng], {
                radius: radius,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.7
            });

            circle.bindPopup(`
                <div class="map-popup">
                    <h6>${loc.location.name} 🚨</h6>
                    <p><strong>Failure Events:</strong> ${failureCount}</p>
                    <p><strong>Critical Events:</strong> ${criticalCount}</p>
                    <p><strong>Risk Score:</strong> ${loc.riskScore.toFixed(1)}/100</p>
                    <p><strong>Equipment Affected:</strong> ${loc.equipmentCount}</p>
                </div>
            `);

            this.markersLayer.addLayer(circle);
        });
    }

    renderMaintenanceCoverageMap(locationData) {
        locationData.forEach(loc => {
            const lat = loc.coordinates.latitude;
            const lng = loc.coordinates.longitude;
            const maintenanceCount = loc.maintenanceEvents;
            const coverage = loc.equipmentCount > 0 ? (maintenanceCount / loc.equipmentCount) : 0;
            
            const radius = Math.max(6, coverage * 15);
            const color = this.getMaintenanceCoverageColor(coverage);
            
            const circle = L.circleMarker([lat, lng], {
                radius: radius,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
            });

            circle.bindPopup(`
                <div class="map-popup">
                    <h6>${loc.location.name}</h6>
                    <p><strong>Maintenance Events:</strong> ${maintenanceCount}</p>
                    <p><strong>Coverage Ratio:</strong> ${coverage.toFixed(2)}</p>
                    <p><strong>Equipment Count:</strong> ${loc.equipmentCount}</p>
                    <p><strong>Utilization:</strong> ${loc.utilizationRate.toFixed(1)}%</p>
                </div>
            `);

            this.markersLayer.addLayer(circle);
        });
    }

    toggleHeatmap(locationData, currentView) {
        if (!window.L.heatLayer) {
            console.warn('Heatmap plugin not available');
            return;
        }

        if (this.heatmapLayer) {
            // Remove existing heatmap
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        } else {
            // Create heatmap data based on current view
            let heatData = [];
            
            locationData.forEach(loc => {
                if (!loc.coordinates) return;
                
                let intensity = 0;
                switch (currentView) {
                    case 'event-density':
                        intensity = loc.totalEvents / 10; // Normalize
                        break;
                    case 'equipment-distribution':
                        intensity = loc.equipmentCount / 5; // Normalize
                        break;
                    case 'failure-hotspots':
                        intensity = loc.failureEvents;
                        break;
                    case 'maintenance-coverage':
                        intensity = loc.maintenanceEvents / 5; // Normalize
                        break;
                }
                
                if (intensity > 0) {
                    heatData.push([
                        loc.coordinates.latitude,
                        loc.coordinates.longitude,
                        Math.min(1, intensity) // Cap at 1
                    ]);
                }
            });

            if (heatData.length > 0) {
                this.heatmapLayer = L.heatLayer(heatData, {
                    radius: 30,
                    blur: 20,
                    maxZoom: 10,
                    opacity: 0.6
                }).addTo(this.map);
            }
        }
    }

    getEventDensityColor(eventCount, maxEvents) {
        const ratio = eventCount / maxEvents;
        if (ratio > 0.8) return '#d32f2f'; // High density - red
        if (ratio > 0.6) return '#f57c00'; // Medium-high - orange
        if (ratio > 0.4) return '#fbc02d'; // Medium - yellow
        if (ratio > 0.2) return '#689f38'; // Medium-low - light green
        return '#388e3c'; // Low density - green
    }

    getEquipmentDistributionColor(equipmentCount, maxEquipment) {
        const ratio = equipmentCount / maxEquipment;
        if (ratio > 0.8) return '#1976d2'; // High - dark blue
        if (ratio > 0.6) return '#1e88e5'; // Medium-high - blue
        if (ratio > 0.4) return '#42a5f5'; // Medium - light blue
        if (ratio > 0.2) return '#64b5f6'; // Medium-low - lighter blue
        return '#90caf9'; // Low - lightest blue
    }

    getFailureHotspotColor(riskScore) {
        if (riskScore > 75) return '#b71c1c'; // Critical - dark red
        if (riskScore > 50) return '#d32f2f'; // High - red
        if (riskScore > 25) return '#f57c00'; // Medium - orange
        return '#fbc02d'; // Low - yellow
    }

    getMaintenanceCoverageColor(coverage) {
        if (coverage > 2) return '#2e7d32'; // Excellent coverage - dark green
        if (coverage > 1.5) return '#388e3c'; // Good coverage - green
        if (coverage > 1) return '#689f38'; // Fair coverage - light green
        if (coverage > 0.5) return '#fbc02d'; // Poor coverage - yellow
        return '#d32f2f'; // Very poor coverage - red
    }

    renderLocationPerformance(geoData) {
        const container = document.getElementById('location-performance');
        if (!container) return;

        const topPerformers = geoData.locationData
            .sort((a, b) => a.riskScore - b.riskScore) // Lower risk = better performance
            .slice(0, 5);

        const poorPerformers = geoData.locationData
            .sort((a, b) => b.riskScore - a.riskScore) // Higher risk = poor performance
            .slice(0, 5);

        container.innerHTML = `
            <div class="performance-comparison">
                <div class="performance-section">
                    <h6>🏆 Top Performing Locations</h6>
                    <div class="location-list">
                        ${topPerformers.map(loc => `
                            <div class="location-item good">
                                <div class="location-name">${loc.location.name}</div>
                                <div class="location-metrics">
                                    <span class="metric">Risk: ${loc.riskScore.toFixed(1)}</span>
                                    <span class="metric">Events: ${loc.totalEvents}</span>
                                    <span class="metric">Equipment: ${loc.equipmentCount}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="performance-section">
                    <h6>⚠️ Locations Needing Attention</h6>
                    <div class="location-list">
                        ${poorPerformers.map(loc => `
                            <div class="location-item warning">
                                <div class="location-name">${loc.location.name}</div>
                                <div class="location-metrics">
                                    <span class="metric">Risk: ${loc.riskScore.toFixed(1)}</span>
                                    <span class="metric">Failures: ${loc.failureEvents}</span>
                                    <span class="metric">Critical: ${loc.criticalEvents}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderRegionalTrends(geoData) {
        const container = document.getElementById('regional-trends');
        if (!container) return;

        const sortedRegions = geoData.regionalData
            .sort((a, b) => b.totalEvents - a.totalEvents);

        container.innerHTML = `
            <div class="regional-trends">
                ${sortedRegions.map(region => `
                    <div class="region-item">
                        <div class="region-header">
                            <span class="region-name">${region.region.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <span class="region-score">Avg Risk: ${region.avgRiskScore.toFixed(1)}</span>
                        </div>
                        <div class="region-metrics">
                            <div class="region-metric">
                                <span class="metric-label">Locations:</span>
                                <span class="metric-value">${region.locations.length}</span>
                            </div>
                            <div class="region-metric">
                                <span class="metric-label">Events:</span>
                                <span class="metric-value">${region.totalEvents}</span>
                            </div>
                            <div class="region-metric">
                                <span class="metric-label">Equipment:</span>
                                <span class="metric-value">${region.totalEquipment}</span>
                            </div>
                        </div>
                        <div class="region-bar">
                            <div class="bar-fill" style="width: ${(region.totalEvents / Math.max(...sortedRegions.map(r => r.totalEvents))) * 100}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupEventListeners(geoData, data) {
        const viewSelector = document.getElementById('geo-view-selector');
        const timeFilter = document.getElementById('geo-time-filter');
        const heatmapToggle = document.getElementById('toggle-heatmap');

        if (viewSelector) {
            viewSelector.addEventListener('change', (e) => {
                this.renderMapView(e.target.value, geoData, data);
            });
        }

        if (timeFilter) {
            timeFilter.addEventListener('change', (e) => {
                const filteredData = this.filterDataByTimeRange(data, e.target.value);
                const newGeoData = this.analyzeGeographicData(filteredData);
                this.renderMapView(viewSelector?.value || 'event-density', newGeoData, filteredData);
                this.renderLocationPerformance(newGeoData);
                this.renderRegionalTrends(newGeoData);
            });
        }

        if (heatmapToggle) {
            heatmapToggle.addEventListener('click', () => {
                this.toggleHeatmap(geoData.locationData, viewSelector?.value || 'event-density');
                heatmapToggle.classList.toggle('active');
            });
        }
    }

    filterDataByTimeRange(data, timeRange) {
        if (timeRange === 'all') return data;

        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return {
            ...data,
            events: data.events.filter(event => 
                new Date(event.startTime) >= cutoffDate
            )
        };
    }

    getAnalysisData(data) {
        return this.analyzeGeographicData(data);
    }
}

export default GeographicAnalyzer;
