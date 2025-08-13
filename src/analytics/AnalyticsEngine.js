/**
 * Analytics Engine for Maintenance Management System
 * Provides comprehensive analysis tools for equipment failures, maintenance scheduling,
 * geographic distribution, and personnel workload analysis
 */

import { EquipmentFailureAnalyzer } from './components/EquipmentFailureAnalyzer.js';
import { MaintenanceTimelineAnalyzer } from './components/MaintenanceTimelineAnalyzer.js';
import { GeographicAnalyzer } from './components/GeographicAnalyzer.js';
import { PersonnelWorkloadAnalyzer } from './components/PersonnelWorkloadAnalyzer.js';
import { TrendDetector } from './components/TrendDetector.js';

export class AnalyticsEngine {
    constructor(containerId = 'analysis-content') {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.data = {
            events: [],
            equipment: [],
            locations: [],
            personnel: [],
            relationships: []
        };

        // Initialize analyzers
        this.analyzers = {
            equipmentFailure: new EquipmentFailureAnalyzer(),
            maintenanceTimeline: new MaintenanceTimelineAnalyzer(),
            geographic: new GeographicAnalyzer(),
            personnelWorkload: new PersonnelWorkloadAnalyzer(),
            trendDetector: new TrendDetector()
        };

        this.currentView = 'overview';
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Analytics container not found');
            return;
        }

        this.createAnalyticsInterface();
        this.setupEventListeners();
        console.log('✅ Analytics Engine initialized');
    }

    createAnalyticsInterface() {
        this.container.innerHTML = `
            <div class="analytics-dashboard">
                <div class="analytics-header">
                    <h3>📊 Maintenance Analytics Dashboard</h3>
                    <div class="analytics-controls">
                        <select id="analytics-view-selector" class="view-selector">
                            <option value="overview">📈 Overview</option>
                            <option value="equipment-failures">⚠️ Equipment Failures</option>
                            <option value="maintenance-timeline">📅 Maintenance Timeline</option>
                            <option value="geographic-analysis">🗺️ Geographic Analysis</option>
                            <option value="personnel-workload">👥 Personnel Workload</option>
                            <option value="trend-analysis">📊 Trend Analysis</option>
                        </select>
                        <button id="refresh-analytics" class="analytics-btn" title="Refresh Analytics Data">
                            🔄 Refresh
                        </button>
                        <button id="export-analytics" class="analytics-btn" title="Export Analytics Report">
                            📊 Export
                        </button>
                    </div>
                </div>
                
                <div class="analytics-content">
                    <div id="analytics-overview" class="analytics-view active">
                        <div class="overview-metrics">
                            <div class="metric-card">
                                <div class="metric-icon">⚡</div>
                                <div class="metric-info">
                                    <span class="metric-value" id="total-events">0</span>
                                    <span class="metric-label">Total Events</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon">🔧</div>
                                <div class="metric-info">
                                    <span class="metric-value" id="active-maintenance">0</span>
                                    <span class="metric-label">Active Maintenance</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon">⚠️</div>
                                <div class="metric-info">
                                    <span class="metric-value" id="critical-equipment">0</span>
                                    <span class="metric-label">Critical Issues</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon">👥</div>
                                <div class="metric-info">
                                    <span class="metric-value" id="personnel-utilization">0%</span>
                                    <span class="metric-label">Avg. Utilization</span>
                                </div>
                            </div>
                        </div>
                        <div class="overview-charts">
                            <div id="overview-failure-trends" class="chart-container"></div>
                            <div id="overview-workload-distribution" class="chart-container"></div>
                        </div>
                    </div>
                    
                    <div id="analytics-equipment-failures" class="analytics-view">
                        <div id="equipment-failure-content"></div>
                    </div>
                    
                    <div id="analytics-maintenance-timeline" class="analytics-view">
                        <div id="maintenance-timeline-content"></div>
                    </div>
                    
                    <div id="analytics-geographic-analysis" class="analytics-view">
                        <div id="geographic-analysis-content"></div>
                    </div>
                    
                    <div id="analytics-personnel-workload" class="analytics-view">
                        <div id="personnel-workload-content"></div>
                    </div>
                    
                    <div id="analytics-trend-analysis" class="analytics-view">
                        <div id="trend-analysis-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const viewSelector = document.getElementById('analytics-view-selector');
        const refreshBtn = document.getElementById('refresh-analytics');
        const exportBtn = document.getElementById('export-analytics');

        if (viewSelector) {
            viewSelector.addEventListener('change', (e) => {
                this.switchView(e.target.value);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAnalytics();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAnalytics();
            });
        }
    }

    switchView(viewName) {
        if (this.currentView === viewName) {return;}

        // Hide current view
        const currentElement = document.getElementById(`analytics-${this.currentView}`);
        if (currentElement) {
            currentElement.classList.remove('active');
        }

        // Show new view
        const newElement = document.getElementById(`analytics-${viewName}`);
        if (newElement) {
            newElement.classList.add('active');
        }

        this.currentView = viewName;
        this.renderView(viewName);
    }

    async renderView(viewName) {
        switch (viewName) {
        case 'overview':
            this.renderOverview();
            break;
        case 'equipment-failures':
            await this.analyzers.equipmentFailure.render('equipment-failure-content', this.data);
            break;
        case 'maintenance-timeline':
            await this.analyzers.maintenanceTimeline.render('maintenance-timeline-content', this.data);
            break;
        case 'geographic-analysis':
            await this.analyzers.geographic.render('geographic-analysis-content', this.data);
            break;
        case 'personnel-workload':
            await this.analyzers.personnelWorkload.render('personnel-workload-content', this.data);
            break;
        case 'trend-analysis':
            await this.analyzers.trendDetector.render('trend-analysis-content', this.data);
            break;
        default:
            console.warn(`Unknown view: ${viewName}`);
        }
    }

    async loadData() {
        try {
            // Load data from the existing data loader
            const response = await fetch('data/sample-data.json');
            const rawData = await response.json();

            const relationResponse = await fetch('data/sample-relations.json');
            const relationships = await relationResponse.json();

            // Transform and categorize data
            this.data = this.transformData(rawData, relationships);

            console.log('✅ Analytics data loaded:', {
                events: this.data.events.length,
                equipment: this.data.equipment.length,
                locations: this.data.locations.length,
                personnel: this.data.personnel.length,
                relationships: this.data.relationships.length
            });

            return this.data;
        } catch (error) {
            console.error('❌ Failed to load analytics data:', error);
            throw error;
        }
    }

    transformData(rawData, relationships) {
        const data = {
            events: [],
            equipment: [],
            locations: [],
            personnel: [],
            relationships: relationships || []
        };

        // Categorize raw data by type
        rawData.forEach(item => {
            if (item.id.startsWith('EVT')) {
                data.events.push(item);
            } else if (item.id.startsWith('EQ')) {
                data.equipment.push(item);
            } else if (item.id.startsWith('LOC')) {
                data.locations.push(item);
            } else if (item.id.startsWith('PER')) {
                data.personnel.push(item);
            }
        });

        // Generate synthetic events if none exist in data
        if (data.events.length === 0) {
            data.events = this.generateSyntheticEvents(data.equipment, data.personnel);
        }

        return data;
    }

    generateSyntheticEvents(equipment, personnel) {
        const events = [];
        const eventTypes = [
            'maintenance_scheduled', 'maintenance_unscheduled', 'system_failure',
            'equipment_malfunction', 'power_failure', 'weather_related', 'upgrade'
        ];
        const severities = ['critical', 'high', 'medium', 'low'];
        const statuses = ['open', 'in_progress', 'resolved', 'closed'];

        // Generate events for last 6 months
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 6);

        equipment.forEach(eq => {
            // Generate 1-5 events per equipment piece
            const eventCount = Math.floor(Math.random() * 5) + 1;

            for (let i = 0; i < eventCount; i++) {
                const eventDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
                const eventEndDate = new Date(eventDate.getTime() + (Math.random() * 24 * 60 * 60 * 1000 * 3)); // 0-3 days duration

                const event = {
                    id: `EVT${String(events.length + 1).padStart(6, '0')}`,
                    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
                    severity: severities[Math.floor(Math.random() * severities.length)],
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    title: `${eq.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ${this.getEventTypeLabel(eventTypes[Math.floor(Math.random() * eventTypes.length)])}`,
                    description: `Automated event generated for ${eq.name}`,
                    startTime: eventDate.toISOString(),
                    endTime: eventEndDate.toISOString(),
                    affectedEquipment: [eq.id],
                    affectedLocations: [eq.location],
                    assignedPersonnel: this.getRandomPersonnel(personnel, 1, 3),
                    impactLevel: severities[Math.floor(Math.random() * severities.length)],
                    metrics: {
                        responseTime: Math.floor(Math.random() * 120) + 15, // 15-135 minutes
                        resolutionTime: Math.floor(Math.random() * 480) + 60, // 1-8 hours
                        downtime: Math.floor(Math.random() * 300) + 30, // 30-330 minutes
                        cost: Math.floor(Math.random() * 50000) + 1000 // $1K-50K
                    },
                    metadata: {
                        createdAt: eventDate.toISOString(),
                        updatedAt: eventEndDate.toISOString(),
                        version: '1.0'
                    }
                };

                events.push(event);
            }
        });

        return events.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }

    getEventTypeLabel(eventType) {
        const labels = {
            'maintenance_scheduled': 'Scheduled Maintenance',
            'maintenance_unscheduled': 'Unscheduled Maintenance',
            'system_failure': 'System Failure',
            'equipment_malfunction': 'Equipment Malfunction',
            'power_failure': 'Power Failure',
            'weather_related': 'Weather Related Issue',
            'upgrade': 'System Upgrade'
        };
        return labels[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getRandomPersonnel(personnel, min = 1, max = 3) {
        const count = Math.floor(Math.random() * (max - min + 1)) + min;
        const shuffled = [...personnel].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, personnel.length)).map(p => p.id);
    }

    renderOverview() {
        // Update metric cards
        const totalEvents = this.data.events.length;
        const activeMaintenance = this.data.events.filter(e =>
            e.status === 'in_progress' && (e.type === 'maintenance_scheduled' || e.type === 'maintenance_unscheduled')
        ).length;
        const criticalEquipment = this.data.equipment.filter(eq =>
            eq.criticalityLevel === 'critical' && eq.operationalStatus !== 'operational'
        ).length;

        // Calculate average personnel utilization
        const totalPersonnel = this.data.personnel.length;
        const avgUtilization = totalPersonnel > 0 ?
            Math.round(this.data.personnel.reduce((sum, p) =>
                sum + (p.workload?.utilizationRate || Math.random() * 100), 0
            ) / totalPersonnel) : 0;

        document.getElementById('total-events').textContent = totalEvents;
        document.getElementById('active-maintenance').textContent = activeMaintenance;
        document.getElementById('critical-equipment').textContent = criticalEquipment;
        document.getElementById('personnel-utilization').textContent = `${avgUtilization}%`;

        // Render mini charts
        this.renderOverviewCharts();
    }

    renderOverviewCharts() {
        // Failure trends mini chart
        const failureTrendsContainer = document.getElementById('overview-failure-trends');
        if (failureTrendsContainer && this.data.events.length > 0) {
            this.analyzers.equipmentFailure.renderMiniChart(failureTrendsContainer, this.data);
        }

        // Workload distribution mini chart
        const workloadContainer = document.getElementById('overview-workload-distribution');
        if (workloadContainer && this.data.personnel.length > 0) {
            this.analyzers.personnelWorkload.renderMiniChart(workloadContainer, this.data);
        }
    }

    async refreshAnalytics() {
        const refreshBtn = document.getElementById('refresh-analytics');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '🔄 Refreshing...';
        }

        try {
            await this.loadData();
            await this.renderView(this.currentView);

            // Show success notification
            this.showNotification('Analytics data refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh analytics:', error);
            this.showNotification('Failed to refresh analytics data', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '🔄 Refresh';
            }
        }
    }

    exportAnalytics() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                summary: {
                    totalEvents: this.data.events.length,
                    totalEquipment: this.data.equipment.length,
                    totalLocations: this.data.locations.length,
                    totalPersonnel: this.data.personnel.length
                },
                analysis: {
                    equipmentFailures: this.analyzers.equipmentFailure.getAnalysisData(this.data),
                    personnelWorkload: this.analyzers.personnelWorkload.getAnalysisData(this.data),
                    trends: this.analyzers.trendDetector.getAnalysisData(this.data)
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `maintenance-analytics-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Analytics report exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export analytics:', error);
            this.showNotification('Failed to export analytics report', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = `analytics-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Public API
    async initialize() {
        await this.loadData();
        this.renderOverview();
    }

    setData(data) {
        this.data = data;
        if (this.currentView === 'overview') {
            this.renderOverview();
        }
    }

    getCurrentData() {
        return this.data;
    }
}

export default AnalyticsEngine;
