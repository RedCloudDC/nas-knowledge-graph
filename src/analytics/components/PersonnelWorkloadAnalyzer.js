/**
 * Personnel Workload Analyzer
 * Creates donut and bar charts showing personnel workload distribution
 * and events assigned per person for maintenance team analysis
 */

export class PersonnelWorkloadAnalyzer {
    constructor() {
        this.workloadColors = {
            'overloaded': '#f44336',    // Red
            'high': '#ff9800',          // Orange  
            'moderate': '#ffc107',      // Yellow
            'light': '#4caf50',         // Green
            'available': '#2196f3'      // Blue
        };
    }

    async render(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const workloadData = this.analyzePersonnelWorkload(data);
        
        container.innerHTML = `
            <div class="personnel-workload-analysis">
                <div class="analysis-header">
                    <h4>👥 Personnel Workload Analysis</h4>
                    <div class="analysis-controls">
                        <select id="workload-view-selector" class="view-selector">
                            <option value="current-workload">Current Workload</option>
                            <option value="assignment-distribution">Assignment Distribution</option>
                            <option value="performance-metrics">Performance Metrics</option>
                            <option value="capacity-planning">Capacity Planning</option>
                        </select>
                        <select id="workload-grouping" class="grouping-selector">
                            <option value="individual">By Individual</option>
                            <option value="role">By Role</option>
                            <option value="department">By Department</option>
                            <option value="location">By Location</option>
                        </select>
                    </div>
                </div>
                
                <div class="workload-metrics">
                    <div class="metric-card">
                        <span class="metric-value">${workloadData.totalPersonnel}</span>
                        <span class="metric-label">Active Personnel</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${workloadData.avgWorkloadPct.toFixed(1)}%</span>
                        <span class="metric-label">Avg Utilization</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${workloadData.overloadedPersonnel}</span>
                        <span class="metric-label">Overloaded Staff</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${workloadData.avgEventsPerPerson.toFixed(1)}</span>
                        <span class="metric-label">Avg Events/Person</span>
                    </div>
                </div>
                
                <div class="workload-charts">
                    <div class="chart-row">
                        <div id="workload-donut-chart" class="chart-container donut-chart"></div>
                        <div id="workload-bar-chart" class="chart-container bar-chart"></div>
                    </div>
                </div>
                
                <div class="workload-details">
                    <div class="detail-section">
                        <h5>⚡ High Workload Personnel</h5>
                        <div id="high-workload-list"></div>
                    </div>
                    <div class="detail-section">
                        <h5>📊 Team Performance</h5>
                        <div id="team-performance"></div>
                    </div>
                </div>
                
                <div class="capacity-insights">
                    <h5>💡 Capacity Insights & Recommendations</h5>
                    <div id="capacity-recommendations"></div>
                </div>
            </div>
        `;

        this.setupEventListeners(workloadData, data);
        this.renderWorkloadCharts('current-workload', 'individual', workloadData, data);
        this.renderHighWorkloadList(workloadData);
        this.renderTeamPerformance(workloadData);
        this.renderCapacityRecommendations(workloadData);
    }

    analyzePersonnelWorkload(data) {
        const personnelWorkload = {};
        let totalAssignedEvents = 0;

        // Initialize personnel data
        data.personnel.forEach(person => {
            personnelWorkload[person.id] = {
                person: person,
                assignedEvents: [],
                totalEvents: 0,
                activeEvents: 0,
                completedEvents: 0,
                criticalEvents: 0,
                averageResponseTime: 0,
                averageResolutionTime: 0,
                workloadScore: person.workload?.utilizationRate || 0,
                performanceRating: this.calculatePerformanceRating(person),
                skillAreas: person.expertiseAreas || [],
                currentUtilization: person.workload?.utilizationRate || Math.random() * 100 // Fallback for demo
            };
        });

        // Analyze event assignments
        data.events.forEach(event => {
            if (event.assignedPersonnel && event.assignedPersonnel.length > 0) {
                event.assignedPersonnel.forEach(personnelId => {
                    if (personnelWorkload[personnelId]) {
                        personnelWorkload[personnelId].assignedEvents.push(event);
                        personnelWorkload[personnelId].totalEvents++;
                        totalAssignedEvents++;

                        // Categorize events
                        if (['open', 'in_progress'].includes(event.status)) {
                            personnelWorkload[personnelId].activeEvents++;
                        } else if (['resolved', 'closed'].includes(event.status)) {
                            personnelWorkload[personnelId].completedEvents++;
                        }

                        if (event.severity === 'critical') {
                            personnelWorkload[personnelId].criticalEvents++;
                        }

                        // Add to response/resolution time calculations
                        if (event.metrics?.responseTime) {
                            personnelWorkload[personnelId].averageResponseTime += event.metrics.responseTime;
                        }
                        if (event.metrics?.resolutionTime) {
                            personnelWorkload[personnelId].averageResolutionTime += event.metrics.resolutionTime;
                        }
                    }
                });
            }
        });

        // Calculate averages and workload categories
        Object.values(personnelWorkload).forEach(person => {
            // Calculate average times
            if (person.totalEvents > 0) {
                person.averageResponseTime = person.averageResponseTime / person.totalEvents;
                person.averageResolutionTime = person.averageResolutionTime / person.totalEvents;
            }

            // Determine workload category
            person.workloadCategory = this.categorizeWorkload(person.currentUtilization, person.activeEvents);
            
            // Calculate efficiency score
            person.efficiencyScore = this.calculateEfficiencyScore(person);
        });

        // Group by different criteria
        const workloadByRole = this.groupPersonnelBy(Object.values(personnelWorkload), 'role');
        const workloadByDepartment = this.groupPersonnelBy(Object.values(personnelWorkload), 'department');
        const workloadByLocation = this.groupPersonnelBy(Object.values(personnelWorkload), 'homeLocation', data);

        // Calculate summary metrics
        const personnelList = Object.values(personnelWorkload);
        const totalPersonnel = personnelList.length;
        const avgWorkloadPct = totalPersonnel > 0 ? 
            personnelList.reduce((sum, p) => sum + p.currentUtilization, 0) / totalPersonnel : 0;
        const overloadedPersonnel = personnelList.filter(p => p.workloadCategory === 'overloaded').length;
        const avgEventsPerPerson = totalPersonnel > 0 ? totalAssignedEvents / totalPersonnel : 0;

        // Workload distribution
        const workloadDistribution = {
            'overloaded': personnelList.filter(p => p.workloadCategory === 'overloaded').length,
            'high': personnelList.filter(p => p.workloadCategory === 'high').length,
            'moderate': personnelList.filter(p => p.workloadCategory === 'moderate').length,
            'light': personnelList.filter(p => p.workloadCategory === 'light').length,
            'available': personnelList.filter(p => p.workloadCategory === 'available').length
        };

        return {
            personnelWorkload: Object.values(personnelWorkload),
            workloadByRole,
            workloadByDepartment, 
            workloadByLocation,
            workloadDistribution,
            totalPersonnel,
            avgWorkloadPct,
            overloadedPersonnel,
            avgEventsPerPerson,
            totalAssignedEvents
        };
    }

    categorizeWorkload(utilization, activeEvents) {
        if (utilization > 90 || activeEvents > 10) return 'overloaded';
        if (utilization > 75 || activeEvents > 7) return 'high';
        if (utilization > 50 || activeEvents > 4) return 'moderate';
        if (utilization > 25 || activeEvents > 1) return 'light';
        return 'available';
    }

    calculatePerformanceRating(person) {
        // Simple performance calculation based on available metrics
        let score = 50; // Base score
        
        if (person.performanceMetrics?.overallRating) {
            const ratingMap = {
                'exceeds_expectations': 90,
                'meets_expectations': 70,
                'below_expectations': 40,
                'unsatisfactory': 20
            };
            score = ratingMap[person.performanceMetrics.overallRating] || score;
        }

        // Adjust based on experience
        if (person.yearsOfExperience) {
            score += Math.min(20, person.yearsOfExperience * 2);
        }

        return Math.min(100, score);
    }

    calculateEfficiencyScore(person) {
        let score = 50; // Base score
        
        // Higher completion rate increases efficiency
        if (person.totalEvents > 0) {
            const completionRate = person.completedEvents / person.totalEvents;
            score += completionRate * 30;
        }

        // Lower average response time increases efficiency
        if (person.averageResponseTime > 0) {
            const responseScore = Math.max(0, 20 - (person.averageResponseTime / 30)); // 30min baseline
            score += responseScore;
        }

        // Experience bonus
        score += (person.person.yearsOfExperience || 0) * 0.5;

        return Math.min(100, score);
    }

    groupPersonnelBy(personnelList, criteria, data = null) {
        const groups = {};
        
        personnelList.forEach(person => {
            let groupKey = '';
            
            switch (criteria) {
                case 'role':
                    groupKey = person.person.role || 'Unknown Role';
                    break;
                case 'department':
                    groupKey = person.person.department || 'Unknown Department';
                    break;
                case 'homeLocation':
                    if (data && person.person.homeLocation) {
                        const location = data.locations.find(loc => loc.id === person.person.homeLocation);
                        groupKey = location ? location.name : 'Unknown Location';
                    } else {
                        groupKey = 'Unknown Location';
                    }
                    break;
                default:
                    groupKey = 'Other';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    name: groupKey,
                    personnel: [],
                    totalEvents: 0,
                    avgUtilization: 0,
                    avgEfficiency: 0
                };
            }

            groups[groupKey].personnel.push(person);
            groups[groupKey].totalEvents += person.totalEvents;
        });

        // Calculate group averages
        Object.values(groups).forEach(group => {
            const personnelCount = group.personnel.length;
            if (personnelCount > 0) {
                group.avgUtilization = group.personnel.reduce((sum, p) => sum + p.currentUtilization, 0) / personnelCount;
                group.avgEfficiency = group.personnel.reduce((sum, p) => sum + p.efficiencyScore, 0) / personnelCount;
            }
        });

        return groups;
    }

    renderWorkloadCharts(viewType, grouping, workloadData, data) {
        this.renderDonutChart(viewType, workloadData);
        this.renderBarChart(viewType, grouping, workloadData, data);
    }

    renderDonutChart(viewType, workloadData) {
        const container = document.getElementById('workload-donut-chart');
        if (!container) return;

        container.innerHTML = '<h6>Workload Distribution</h6>';
        
        let chartData = [];
        
        switch (viewType) {
            case 'current-workload':
                chartData = Object.entries(workloadData.workloadDistribution).map(([category, count]) => ({
                    label: category.charAt(0).toUpperCase() + category.slice(1),
                    value: count,
                    color: this.workloadColors[category]
                }));
                break;
            case 'assignment-distribution':
                // Group by number of assignments
                const assignmentGroups = {
                    '0': workloadData.personnelWorkload.filter(p => p.totalEvents === 0).length,
                    '1-3': workloadData.personnelWorkload.filter(p => p.totalEvents >= 1 && p.totalEvents <= 3).length,
                    '4-7': workloadData.personnelWorkload.filter(p => p.totalEvents >= 4 && p.totalEvents <= 7).length,
                    '8-12': workloadData.personnelWorkload.filter(p => p.totalEvents >= 8 && p.totalEvents <= 12).length,
                    '13+': workloadData.personnelWorkload.filter(p => p.totalEvents >= 13).length
                };
                chartData = Object.entries(assignmentGroups).map(([range, count], index) => ({
                    label: `${range} Events`,
                    value: count,
                    color: d3.schemeCategory10[index]
                }));
                break;
            case 'performance-metrics':
                // Group by performance rating
                const performanceGroups = {
                    'Excellent (90+)': workloadData.personnelWorkload.filter(p => p.performanceRating >= 90).length,
                    'Good (70-89)': workloadData.personnelWorkload.filter(p => p.performanceRating >= 70 && p.performanceRating < 90).length,
                    'Average (50-69)': workloadData.personnelWorkload.filter(p => p.performanceRating >= 50 && p.performanceRating < 70).length,
                    'Below Average (<50)': workloadData.personnelWorkload.filter(p => p.performanceRating < 50).length
                };
                chartData = Object.entries(performanceGroups).map(([range, count], index) => ({
                    label: range,
                    value: count,
                    color: ['#4caf50', '#2196f3', '#ff9800', '#f44336'][index]
                }));
                break;
        }

        this.createD3DonutChart(container, chartData);
    }

    createD3DonutChart(container, data) {
        // Filter out zero values
        data = data.filter(d => d.value > 0);
        
        if (data.length === 0) {
            container.innerHTML += '<p class="no-data">No data available for chart</p>';
            return;
        }

        const width = 300;
        const height = 300;
        const margin = 40;
        const radius = Math.min(width, height) / 2 - margin;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width/2},${height/2})`);

        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);

        const arc = d3.arc()
            .innerRadius(radius * 0.4)
            .outerRadius(radius);

        const arcs = svg.selectAll('.arc')
            .data(pie(data))
            .enter().append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('opacity', 0.8)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                
                // Show tooltip
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'chart-tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0,0,0,0.8)')
                    .style('color', 'white')
                    .style('padding', '8px 12px')
                    .style('border-radius', '4px')
                    .style('pointer-events', 'none')
                    .style('opacity', 0);

                tooltip.html(`
                    <strong>${d.data.label}</strong><br>
                    Count: ${d.data.value}<br>
                    Percentage: ${((d.data.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
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

        // Add labels
        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(d => d.data.value > 0 ? d.data.value : '');

        // Add legend
        const legend = d3.select(container)
            .append('div')
            .attr('class', 'chart-legend')
            .style('margin-top', '10px');

        data.forEach(d => {
            const legendItem = legend.append('div')
                .style('display', 'inline-block')
                .style('margin-right', '15px')
                .style('margin-bottom', '5px');

            legendItem.append('span')
                .style('display', 'inline-block')
                .style('width', '12px')
                .style('height', '12px')
                .style('background-color', d.color)
                .style('margin-right', '5px')
                .style('vertical-align', 'middle');

            legendItem.append('span')
                .style('font-size', '12px')
                .style('vertical-align', 'middle')
                .text(d.label);
        });
    }

    renderBarChart(viewType, grouping, workloadData, data) {
        const container = document.getElementById('workload-bar-chart');
        if (!container) return;

        container.innerHTML = '<h6>Personnel Distribution</h6>';

        let chartData = [];

        if (grouping === 'individual') {
            // Show top 15 most loaded personnel
            chartData = workloadData.personnelWorkload
                .sort((a, b) => b.currentUtilization - a.currentUtilization)
                .slice(0, 15)
                .map(p => ({
                    label: p.person.name ? `${p.person.name.first} ${p.person.name.last}` : 'Unknown',
                    value: p.currentUtilization,
                    category: p.workloadCategory,
                    details: p
                }));
        } else {
            // Show grouped data
            let groupData = {};
            switch (grouping) {
                case 'role':
                    groupData = workloadData.workloadByRole;
                    break;
                case 'department':
                    groupData = workloadData.workloadByDepartment;
                    break;
                case 'location':
                    groupData = workloadData.workloadByLocation;
                    break;
            }

            chartData = Object.values(groupData)
                .sort((a, b) => b.avgUtilization - a.avgUtilization)
                .map(group => ({
                    label: group.name,
                    value: group.avgUtilization,
                    category: this.categorizeWorkload(group.avgUtilization, 0),
                    details: group
                }));
        }

        this.createD3BarChart(container, chartData, grouping);
    }

    createD3BarChart(container, data, grouping) {
        if (data.length === 0) {
            container.innerHTML += '<p class="no-data">No data available for chart</p>';
            return;
        }

        const margin = { top: 20, right: 30, bottom: 100, left: 60 };
        const width = Math.max(400, data.length * 30) - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, Math.max(100, d3.max(data, d => d.value))])
            .range([height, 0]);

        // Bars
        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label))
            .attr('width', xScale.bandwidth())
            .attr('y', d => yScale(d.value))
            .attr('height', d => height - yScale(d.value))
            .attr('fill', d => this.workloadColors[d.category] || '#2196f3')
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

                let tooltipContent = `
                    <strong>${d.label}</strong><br>
                    Utilization: ${d.value.toFixed(1)}%<br>
                `;

                if (grouping === 'individual' && d.details) {
                    tooltipContent += `
                        Active Events: ${d.details.activeEvents}<br>
                        Total Events: ${d.details.totalEvents}<br>
                        Role: ${d.details.person.role || 'Unknown'}
                    `;
                } else if (d.details) {
                    tooltipContent += `
                        Personnel: ${d.details.personnel.length}<br>
                        Total Events: ${d.details.totalEvents}
                    `;
                }

                tooltip.html(tooltipContent)
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
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        svg.append('g')
            .call(d3.axisLeft(yScale));

        // Y-axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Utilization (%)');
    }

    renderHighWorkloadList(workloadData) {
        const container = document.getElementById('high-workload-list');
        if (!container) return;

        const highWorkloadPersonnel = workloadData.personnelWorkload
            .filter(p => ['overloaded', 'high'].includes(p.workloadCategory))
            .sort((a, b) => b.currentUtilization - a.currentUtilization)
            .slice(0, 10);

        if (highWorkloadPersonnel.length === 0) {
            container.innerHTML = '<p class="no-data">No personnel with high workload found</p>';
            return;
        }

        container.innerHTML = `
            <div class="personnel-list">
                ${highWorkloadPersonnel.map(person => `
                    <div class="personnel-item ${person.workloadCategory}">
                        <div class="person-header">
                            <span class="person-name">${person.person.name ? `${person.person.name.first} ${person.person.name.last}` : 'Unknown'}</span>
                            <span class="workload-badge ${person.workloadCategory}">${person.currentUtilization.toFixed(1)}%</span>
                        </div>
                        <div class="person-details">
                            <span class="role">${person.person.role || 'Unknown Role'}</span>
                            <span class="department">${person.person.department || 'Unknown Dept'}</span>
                        </div>
                        <div class="person-metrics">
                            <div class="metric">
                                <span class="metric-label">Active Events:</span>
                                <span class="metric-value">${person.activeEvents}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Total Events:</span>
                                <span class="metric-value">${person.totalEvents}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Critical:</span>
                                <span class="metric-value">${person.criticalEvents}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderTeamPerformance(workloadData) {
        const container = document.getElementById('team-performance');
        if (!container) return;

        // Calculate team metrics
        const personnelList = workloadData.personnelWorkload;
        const totalPersonnel = personnelList.length;
        
        if (totalPersonnel === 0) {
            container.innerHTML = '<p class="no-data">No personnel data available</p>';
            return;
        }

        const avgEfficiency = personnelList.reduce((sum, p) => sum + p.efficiencyScore, 0) / totalPersonnel;
        const avgResponseTime = personnelList
            .filter(p => p.averageResponseTime > 0)
            .reduce((sum, p) => sum + p.averageResponseTime, 0) / 
            Math.max(1, personnelList.filter(p => p.averageResponseTime > 0).length);
        
        const avgResolutionTime = personnelList
            .filter(p => p.averageResolutionTime > 0)
            .reduce((sum, p) => sum + p.averageResolutionTime, 0) / 
            Math.max(1, personnelList.filter(p => p.averageResolutionTime > 0).length);

        // Top performers
        const topPerformers = personnelList
            .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
            .slice(0, 5);

        container.innerHTML = `
            <div class="team-performance-summary">
                <div class="performance-metrics">
                    <div class="perf-metric">
                        <span class="perf-label">Team Efficiency:</span>
                        <span class="perf-value">${avgEfficiency.toFixed(1)}/100</span>
                    </div>
                    <div class="perf-metric">
                        <span class="perf-label">Avg Response:</span>
                        <span class="perf-value">${avgResponseTime.toFixed(0)} min</span>
                    </div>
                    <div class="perf-metric">
                        <span class="perf-label">Avg Resolution:</span>
                        <span class="perf-value">${(avgResolutionTime / 60).toFixed(1)} hrs</span>
                    </div>
                </div>
                
                <div class="top-performers">
                    <h6>🏆 Top Performers</h6>
                    <div class="performer-list">
                        ${topPerformers.map((person, index) => `
                            <div class="performer-item">
                                <span class="rank">#${index + 1}</span>
                                <span class="performer-name">${person.person.name ? `${person.person.name.first} ${person.person.name.last}` : 'Unknown'}</span>
                                <span class="efficiency-score">${person.efficiencyScore.toFixed(1)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderCapacityRecommendations(workloadData) {
        const container = document.getElementById('capacity-recommendations');
        if (!container) return;

        const recommendations = this.generateCapacityRecommendations(workloadData);

        container.innerHTML = `
            <div class="recommendations-list">
                ${recommendations.map(rec => `
                    <div class="recommendation-item ${rec.priority}">
                        <div class="rec-icon">${rec.icon}</div>
                        <div class="rec-content">
                            <div class="rec-title">${rec.title}</div>
                            <div class="rec-description">${rec.description}</div>
                            ${rec.action ? `<div class="rec-action">${rec.action}</div>` : ''}
                        </div>
                        <div class="rec-priority">${rec.priority.toUpperCase()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateCapacityRecommendations(workloadData) {
        const recommendations = [];
        const personnelList = workloadData.personnelWorkload;

        // Check for overloaded personnel
        const overloadedCount = workloadData.overloadedPersonnel;
        if (overloadedCount > 0) {
            recommendations.push({
                icon: '🚨',
                title: 'Critical Workload Issues',
                description: `${overloadedCount} personnel are currently overloaded (>90% utilization)`,
                action: 'Consider redistributing work or hiring additional staff',
                priority: 'critical'
            });
        }

        // Check utilization balance
        const avgUtilization = workloadData.avgWorkloadPct;
        if (avgUtilization > 80) {
            recommendations.push({
                icon: '⚖️',
                title: 'High Team Utilization',
                description: `Average team utilization is ${avgUtilization.toFixed(1)}%, which may lead to burnout`,
                action: 'Consider capacity expansion or workload optimization',
                priority: 'high'
            });
        } else if (avgUtilization < 50) {
            recommendations.push({
                icon: '📊',
                title: 'Low Team Utilization',
                description: `Average team utilization is only ${avgUtilization.toFixed(1)}%`,
                action: 'Evaluate if team size can be optimized or if additional projects can be taken on',
                priority: 'medium'
            });
        }

        // Check for skill gaps
        const skillAreas = {};
        personnelList.forEach(person => {
            person.skillAreas.forEach(skill => {
                skillAreas[skill] = (skillAreas[skill] || 0) + 1;
            });
        });

        const criticalSkills = ['radar_systems', 'communication_equipment', 'power_systems'];
        const missingCriticalSkills = criticalSkills.filter(skill => !skillAreas[skill] || skillAreas[skill] < 2);
        
        if (missingCriticalSkills.length > 0) {
            recommendations.push({
                icon: '🎯',
                title: 'Skill Gap Analysis',
                description: `Limited expertise in: ${missingCriticalSkills.join(', ')}`,
                action: 'Consider training programs or targeted hiring',
                priority: 'medium'
            });
        }

        // Check response times
        const slowResponders = personnelList.filter(p => p.averageResponseTime > 60).length;
        if (slowResponders > personnelList.length * 0.3) {
            recommendations.push({
                icon: '⏱️',
                title: 'Response Time Concerns',
                description: `${slowResponders} personnel have average response times over 60 minutes`,
                action: 'Review response protocols and provide additional support',
                priority: 'medium'
            });
        }

        // Positive feedback
        const efficientWorkers = personnelList.filter(p => p.efficiencyScore > 80).length;
        if (efficientWorkers > personnelList.length * 0.5) {
            recommendations.push({
                icon: '🌟',
                title: 'Strong Team Performance',
                description: `${efficientWorkers} personnel demonstrate high efficiency scores`,
                action: 'Consider leveraging these high performers as mentors',
                priority: 'low'
            });
        }

        return recommendations;
    }

    renderMiniChart(container, data) {
        const workloadData = this.analyzePersonnelWorkload(data);
        
        container.innerHTML = '<h5>Personnel Utilization</h5>';
        
        if (workloadData.personnelWorkload.length === 0) {
            container.innerHTML += '<p class="no-data">No personnel data available</p>';
            return;
        }

        // Show workload distribution as mini bar chart
        const distribution = Object.entries(workloadData.workloadDistribution)
            .filter(([, count]) => count > 0)
            .map(([category, count]) => ({
                label: category.charAt(0).toUpperCase() + category.slice(1),
                value: count,
                color: this.workloadColors[category]
            }));

        const maxValue = Math.max(...distribution.map(d => d.value));
        
        const chartHtml = distribution.map(item => `
            <div class="mini-chart-item">
                <div class="chart-label">${item.label}</div>
                <div class="chart-bar">
                    <div class="bar-fill" style="width: ${(item.value / maxValue) * 100}%; background-color: ${item.color}"></div>
                    <span class="bar-value">${item.value}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML += `<div class="mini-chart">${chartHtml}</div>`;
    }

    setupEventListeners(workloadData, data) {
        const viewSelector = document.getElementById('workload-view-selector');
        const groupingSelector = document.getElementById('workload-grouping');

        if (viewSelector && groupingSelector) {
            const updateCharts = () => {
                this.renderWorkloadCharts(
                    viewSelector.value,
                    groupingSelector.value,
                    workloadData,
                    data
                );
            };

            viewSelector.addEventListener('change', updateCharts);
            groupingSelector.addEventListener('change', updateCharts);
        }
    }

    getAnalysisData(data) {
        return this.analyzePersonnelWorkload(data);
    }
}

export default PersonnelWorkloadAnalyzer;
