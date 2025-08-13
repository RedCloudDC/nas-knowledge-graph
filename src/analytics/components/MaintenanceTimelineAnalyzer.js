/**
 * Maintenance Timeline Analyzer
 * Creates horizontal stacked bar charts showing maintenance activities over time with severity coloring
 */

export class MaintenanceTimelineAnalyzer {
    constructor() {
        this.severityColors = {
            critical: '#f44336',
            high: '#ff9800', 
            medium: '#ffc107',
            low: '#4caf50',
            informational: '#2196f3'
        };
        
        this.statusColors = {
            open: '#f44336',
            in_progress: '#ff9800',
            resolved: '#4caf50',
            closed: '#9e9e9e',
            cancelled: '#616161',
            scheduled: '#2196f3'
        };
    }

    async render(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const timelineData = this.analyzeMaintenanceTimeline(data);
        
        container.innerHTML = `
            <div class="maintenance-timeline-analysis">
                <div class="analysis-header">
                    <h4>📅 Maintenance Timeline Analysis</h4>
                    <div class="analysis-controls">
                        <select id="timeline-view-selector" class="view-selector">
                            <option value="by-month">Monthly View</option>
                            <option value="by-week">Weekly View</option>
                            <option value="by-location">By Location</option>
                            <option value="by-equipment">By Equipment Type</option>
                        </select>
                        <select id="timeline-color-mode" class="color-selector">
                            <option value="severity">Color by Severity</option>
                            <option value="status">Color by Status</option>
                            <option value="type">Color by Event Type</option>
                        </select>
                    </div>
                </div>
                
                <div class="timeline-metrics">
                    <div class="metric-card">
                        <span class="metric-value">${timelineData.totalMaintenanceEvents}</span>
                        <span class="metric-label">Maintenance Events</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${timelineData.avgDuration.toFixed(1)} hrs</span>
                        <span class="metric-label">Avg Duration</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${timelineData.upcomingScheduled}</span>
                        <span class="metric-label">Upcoming Scheduled</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${timelineData.completionRate.toFixed(1)}%</span>
                        <span class="metric-label">Completion Rate</span>
                    </div>
                </div>
                
                <div id="timeline-chart" class="chart-container"></div>
                
                <div class="timeline-details">
                    <div class="detail-section">
                        <h5>📊 Schedule Analysis</h5>
                        <div id="schedule-analysis"></div>
                    </div>
                    <div class="detail-section">
                        <h5>⚡ Critical Timeline Events</h5>
                        <div id="critical-events-list"></div>
                    </div>
                </div>
                
                <div class="timeline-calendar">
                    <h5>📆 Maintenance Calendar</h5>
                    <div id="maintenance-calendar"></div>
                </div>
            </div>
        `;

        this.setupEventListeners(timelineData, data);
        this.renderTimelineChart('by-month', 'severity', timelineData, data);
        this.renderScheduleAnalysis(timelineData);
        this.renderCriticalEvents(timelineData);
        this.renderMaintenanceCalendar(timelineData);
    }

    analyzeMaintenanceTimeline(data) {
        const maintenanceEvents = data.events.filter(event =>
            ['maintenance_scheduled', 'maintenance_unscheduled', 'inspection', 'calibration_required'].includes(event.type)
        );

        let totalDuration = 0;
        let completedEvents = 0;
        const upcomingEvents = [];
        const eventsByMonth = {};
        const eventsByWeek = {};
        const eventsByLocation = {};
        const eventsByEquipmentType = {};

        // Process each maintenance event
        maintenanceEvents.forEach(event => {
            const startDate = new Date(event.startTime);
            const endDate = new Date(event.endTime || event.estimatedEndTime || event.startTime);
            const duration = (endDate - startDate) / (1000 * 60 * 60); // hours

            // Duration calculation
            if (duration > 0 && duration < 1000) { // Filter out unrealistic durations
                totalDuration += duration;
            }

            // Completion tracking
            if (['resolved', 'closed'].includes(event.status)) {
                completedEvents++;
            }

            // Upcoming events
            if (startDate > new Date() || event.status === 'scheduled') {
                upcomingEvents.push(event);
            }

            // Group by month
            const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
            if (!eventsByMonth[monthKey]) {
                eventsByMonth[monthKey] = {
                    period: monthKey,
                    events: [],
                    severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
                    statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0, scheduled: 0 },
                    typeCounts: {}
                };
            }
            eventsByMonth[monthKey].events.push(event);
            
            if (event.severity) {
                eventsByMonth[monthKey].severityCounts[event.severity]++;
            }
            if (event.status) {
                eventsByMonth[monthKey].statusCounts[event.status]++;
            }
            if (event.type) {
                eventsByMonth[monthKey].typeCounts[event.type] = (eventsByMonth[monthKey].typeCounts[event.type] || 0) + 1;
            }

            // Group by week
            const weekStart = this.getWeekStart(startDate);
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!eventsByWeek[weekKey]) {
                eventsByWeek[weekKey] = {
                    period: weekKey,
                    events: [],
                    severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
                    statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0, scheduled: 0 },
                    typeCounts: {}
                };
            }
            eventsByWeek[weekKey].events.push(event);
            
            if (event.severity) {
                eventsByWeek[weekKey].severityCounts[event.severity]++;
            }
            if (event.status) {
                eventsByWeek[weekKey].statusCounts[event.status]++;
            }
            if (event.type) {
                eventsByWeek[weekKey].typeCounts[event.type] = (eventsByWeek[weekKey].typeCounts[event.type] || 0) + 1;
            }

            // Group by location
            event.affectedLocations?.forEach(locId => {
                const location = data.locations.find(loc => loc.id === locId);
                const locationName = location?.name || 'Unknown Location';
                
                if (!eventsByLocation[locationName]) {
                    eventsByLocation[locationName] = {
                        period: locationName,
                        events: [],
                        severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
                        statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0, scheduled: 0 },
                        typeCounts: {}
                    };
                }
                eventsByLocation[locationName].events.push(event);
                
                if (event.severity) {
                    eventsByLocation[locationName].severityCounts[event.severity]++;
                }
                if (event.status) {
                    eventsByLocation[locationName].statusCounts[event.status]++;
                }
                if (event.type) {
                    eventsByLocation[locationName].typeCounts[event.type] = (eventsByLocation[locationName].typeCounts[event.type] || 0) + 1;
                }
            });

            // Group by equipment type
            event.affectedEquipment?.forEach(eqId => {
                const equipment = data.equipment.find(eq => eq.id === eqId);
                const equipmentType = equipment?.type || 'Unknown Type';
                
                if (!eventsByEquipmentType[equipmentType]) {
                    eventsByEquipmentType[equipmentType] = {
                        period: equipmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        events: [],
                        severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
                        statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0, scheduled: 0 },
                        typeCounts: {}
                    };
                }
                eventsByEquipmentType[equipmentType].events.push(event);
                
                if (event.severity) {
                    eventsByEquipmentType[equipmentType].severityCounts[event.severity]++;
                }
                if (event.status) {
                    eventsByEquipmentType[equipmentType].statusCounts[event.status]++;
                }
                if (event.type) {
                    eventsByEquipmentType[equipmentType].typeCounts[event.type] = (eventsByEquipmentType[equipmentType].typeCounts[event.type] || 0) + 1;
                }
            });
        });

        const avgDuration = maintenanceEvents.length > 0 ? totalDuration / maintenanceEvents.length : 0;
        const completionRate = maintenanceEvents.length > 0 ? (completedEvents / maintenanceEvents.length) * 100 : 0;

        return {
            maintenanceEvents,
            totalMaintenanceEvents: maintenanceEvents.length,
            avgDuration,
            completionRate,
            upcomingScheduled: upcomingEvents.length,
            eventsByMonth: Object.values(eventsByMonth).sort((a, b) => a.period.localeCompare(b.period)),
            eventsByWeek: Object.values(eventsByWeek).sort((a, b) => a.period.localeCompare(b.period)),
            eventsByLocation: Object.values(eventsByLocation).sort((a, b) => b.events.length - a.events.length),
            eventsByEquipmentType: Object.values(eventsByEquipmentType).sort((a, b) => b.events.length - a.events.length),
            upcomingEvents,
            criticalEvents: maintenanceEvents.filter(e => e.severity === 'critical').slice(0, 10)
        };
    }

    renderTimelineChart(viewType, colorMode, timelineData, data) {
        const chartContainer = document.getElementById('timeline-chart');
        if (!chartContainer) return;

        chartContainer.innerHTML = '';

        let chartData = [];
        switch (viewType) {
            case 'by-month':
                chartData = timelineData.eventsByMonth.slice(-12); // Last 12 months
                break;
            case 'by-week':
                chartData = timelineData.eventsByWeek.slice(-8); // Last 8 weeks
                break;
            case 'by-location':
                chartData = timelineData.eventsByLocation.slice(0, 10); // Top 10 locations
                break;
            case 'by-equipment':
                chartData = timelineData.eventsByEquipmentType.slice(0, 10); // Top 10 equipment types
                break;
        }

        this.createD3StackedBarChart(chartContainer, chartData, colorMode, viewType);
    }

    createD3StackedBarChart(container, data, colorMode, viewType) {
        if (data.length === 0) {
            container.innerHTML = '<p class="no-data">No maintenance timeline data available</p>';
            return;
        }

        const margin = { top: 20, right: 120, bottom: 60, left: 150 };
        const width = container.offsetWidth - margin.left - margin.right;
        const height = Math.max(400, data.length * 40) - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Prepare stacked data
        const colorField = `${colorMode}Counts`;
        const keys = this.getKeysForColorMode(colorMode, data);
        const stackedData = d3.stack().keys(keys)(
            data.map(d => ({ period: d.period, ...d[colorField] }))
        );

        // Scales
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.period))
            .range([0, height])
            .padding(0.1);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.events.length)])
            .range([0, width]);

        const colorScale = d3.scaleOrdinal()
            .domain(keys)
            .range(keys.map(key => this.getColorForKey(key, colorMode)));

        // Draw stacked bars
        svg.selectAll('g.layer')
            .data(stackedData)
            .enter().append('g')
            .attr('class', 'layer')
            .attr('fill', d => colorScale(d.key))
            .selectAll('rect')
            .data(d => d)
            .enter().append('rect')
            .attr('y', d => yScale(d.data.period))
            .attr('x', d => xScale(d[0]))
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d[1]) - xScale(d[0]))
            .attr('opacity', 0.8)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'chart-tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0,0,0,0.8)')
                    .style('color', 'white')
                    .style('padding', '8px 12px')
                    .style('border-radius', '4px')
                    .style('pointer-events', 'none')
                    .style('opacity', 0);

                const value = d[1] - d[0];
                tooltip.html(`
                    <strong>${d.data.period}</strong><br>
                    ${d3.select(this.parentNode).datum().key}: ${value}<br>
                    Total Events: ${data.find(item => item.period === d.data.period)?.events.length || 0}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .transition()
                .duration(200)
                .style('opacity', 1);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 0.8);
                d3.selectAll('.chart-tooltip').remove();
            });

        // Axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append('g')
            .call(d3.axisLeft(yScale));

        // Legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width + 20}, 20)`);

        const legendItems = legend.selectAll('.legend-item')
            .data(keys)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`);

        legendItems.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => colorScale(d));

        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text(d => d.charAt(0).toUpperCase() + d.slice(1))
            .style('font-size', '12px');

        // Axis labels
        svg.append('text')
            .attr('transform', `translate(${width / 2}, ${height + 50})`)
            .style('text-anchor', 'middle')
            .text('Number of Events');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left + 20)
            .attr('x', 0 - (height / 2))
            .style('text-anchor', 'middle')
            .text(this.getYAxisLabel(viewType));
    }

    getKeysForColorMode(colorMode, data) {
        switch (colorMode) {
            case 'severity':
                return ['critical', 'high', 'medium', 'low'];
            case 'status':
                return ['open', 'in_progress', 'resolved', 'closed', 'scheduled'];
            case 'type':
                // Get all unique event types from the data
                const types = new Set();
                data.forEach(d => {
                    Object.keys(d.typeCounts || {}).forEach(type => types.add(type));
                });
                return Array.from(types);
            default:
                return ['critical', 'high', 'medium', 'low'];
        }
    }

    getColorForKey(key, colorMode) {
        if (colorMode === 'severity') {
            return this.severityColors[key] || '#9e9e9e';
        } else if (colorMode === 'status') {
            return this.statusColors[key] || '#9e9e9e';
        } else {
            // For event types, use a categorical color scheme
            const typeColors = d3.schemeCategory10;
            const typeIndex = ['maintenance_scheduled', 'maintenance_unscheduled', 'inspection', 'calibration_required', 'upgrade'].indexOf(key);
            return typeColors[typeIndex >= 0 ? typeIndex : Math.floor(Math.random() * typeColors.length)];
        }
    }

    getYAxisLabel(viewType) {
        const labels = {
            'by-month': 'Month',
            'by-week': 'Week',
            'by-location': 'Location',
            'by-equipment': 'Equipment Type'
        };
        return labels[viewType] || '';
    }

    renderScheduleAnalysis(timelineData) {
        const container = document.getElementById('schedule-analysis');
        if (!container) return;

        const scheduledEvents = timelineData.maintenanceEvents.filter(e => e.type === 'maintenance_scheduled');
        const unscheduledEvents = timelineData.maintenanceEvents.filter(e => e.type === 'maintenance_unscheduled');
        const overdueMaintenance = timelineData.maintenanceEvents.filter(e => {
            const dueDate = new Date(e.estimatedEndTime || e.endTime);
            return dueDate < new Date() && !['resolved', 'closed'].includes(e.status);
        });

        container.innerHTML = `
            <div class="schedule-metrics">
                <div class="schedule-metric">
                    <div class="metric-icon">📅</div>
                    <div class="metric-content">
                        <span class="metric-value">${scheduledEvents.length}</span>
                        <span class="metric-label">Scheduled</span>
                    </div>
                </div>
                <div class="schedule-metric">
                    <div class="metric-icon">⚡</div>
                    <div class="metric-content">
                        <span class="metric-value">${unscheduledEvents.length}</span>
                        <span class="metric-label">Unscheduled</span>
                    </div>
                </div>
                <div class="schedule-metric">
                    <div class="metric-icon">⏰</div>
                    <div class="metric-content">
                        <span class="metric-value">${overdueMaintenance.length}</span>
                        <span class="metric-label">Overdue</span>
                    </div>
                </div>
                <div class="schedule-metric">
                    <div class="metric-icon">📊</div>
                    <div class="metric-content">
                        <span class="metric-value">${scheduledEvents.length > 0 ? Math.round((scheduledEvents.length / (scheduledEvents.length + unscheduledEvents.length)) * 100) : 0}%</span>
                        <span class="metric-label">Planned Ratio</span>
                    </div>
                </div>
            </div>
            
            <div class="schedule-insights">
                <h6>📋 Schedule Insights</h6>
                <div class="insight-list">
                    ${this.generateScheduleInsights(timelineData).map(insight => `
                        <div class="insight-item">
                            <span class="insight-icon">${insight.icon}</span>
                            <span class="insight-text">${insight.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateScheduleInsights(timelineData) {
        const insights = [];
        
        const scheduledEvents = timelineData.maintenanceEvents.filter(e => e.type === 'maintenance_scheduled');
        const unscheduledEvents = timelineData.maintenanceEvents.filter(e => e.type === 'maintenance_unscheduled');
        
        if (unscheduledEvents.length > scheduledEvents.length) {
            insights.push({
                icon: '⚠️',
                text: 'High ratio of unscheduled maintenance suggests need for better preventive planning'
            });
        }
        
        if (timelineData.upcomingScheduled > 10) {
            insights.push({
                icon: '📈',
                text: `${timelineData.upcomingScheduled} upcoming scheduled events - resource planning needed`
            });
        }
        
        const avgDurationHours = timelineData.avgDuration;
        if (avgDurationHours > 24) {
            insights.push({
                icon: '⏱️',
                text: `Average maintenance duration of ${avgDurationHours.toFixed(1)} hours is quite lengthy`
            });
        }
        
        if (timelineData.completionRate < 80) {
            insights.push({
                icon: '🎯',
                text: `Completion rate of ${timelineData.completionRate.toFixed(1)}% could be improved`
            });
        }
        
        return insights;
    }

    renderCriticalEvents(timelineData) {
        const container = document.getElementById('critical-events-list');
        if (!container) return;

        const criticalEvents = timelineData.criticalEvents;
        
        if (criticalEvents.length === 0) {
            container.innerHTML = '<p class="no-data">No critical maintenance events found</p>';
            return;
        }

        container.innerHTML = criticalEvents.map(event => {
            const startDate = new Date(event.startTime);
            const endDate = new Date(event.endTime || event.estimatedEndTime || event.startTime);
            const duration = ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1);
            
            return `
                <div class="critical-event-item">
                    <div class="event-header">
                        <span class="event-title">${event.title || 'Maintenance Event'}</span>
                        <span class="event-status status-${event.status}">${event.status}</span>
                    </div>
                    <div class="event-details">
                        <span class="event-date">📅 ${startDate.toLocaleDateString()}</span>
                        <span class="event-duration">⏱️ ${duration} hours</span>
                        <span class="event-severity severity-${event.severity}">🚨 ${event.severity}</span>
                    </div>
                    <div class="event-description">${event.description || 'No description available'}</div>
                </div>
            `;
        }).join('');
    }

    renderMaintenanceCalendar(timelineData) {
        const container = document.getElementById('maintenance-calendar');
        if (!container) return;

        // Simple calendar view showing upcoming maintenance
        const upcomingEvents = timelineData.upcomingEvents
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
            .slice(0, 10);

        if (upcomingEvents.length === 0) {
            container.innerHTML = '<p class="no-data">No upcoming maintenance events scheduled</p>';
            return;
        }

        container.innerHTML = `
            <div class="calendar-events">
                ${upcomingEvents.map(event => {
                    const startDate = new Date(event.startTime);
                    const isOverdue = startDate < new Date() && !['resolved', 'closed'].includes(event.status);
                    
                    return `
                        <div class="calendar-event ${isOverdue ? 'overdue' : ''}">
                            <div class="event-date">
                                <div class="date-day">${startDate.getDate()}</div>
                                <div class="date-month">${startDate.toLocaleDateString('en', { month: 'short' })}</div>
                            </div>
                            <div class="event-info">
                                <div class="event-title">${event.title || 'Maintenance Event'}</div>
                                <div class="event-meta">
                                    <span class="severity severity-${event.severity}">${event.severity}</span>
                                    <span class="event-time">${startDate.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            ${isOverdue ? '<div class="overdue-badge">⚠️ OVERDUE</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        return new Date(d.setDate(diff));
    }

    setupEventListeners(timelineData, data) {
        const viewSelector = document.getElementById('timeline-view-selector');
        const colorSelector = document.getElementById('timeline-color-mode');

        if (viewSelector && colorSelector) {
            const updateChart = () => {
                this.renderTimelineChart(
                    viewSelector.value,
                    colorSelector.value,
                    timelineData,
                    data
                );
            };

            viewSelector.addEventListener('change', updateChart);
            colorSelector.addEventListener('change', updateChart);
        }
    }

    getAnalysisData(data) {
        return this.analyzeMaintenanceTimeline(data);
    }
}

export default MaintenanceTimelineAnalyzer;
