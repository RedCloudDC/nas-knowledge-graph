/**
 * Equipment Failure Frequency Analyzer
 * Analyzes equipment failure patterns and displays them using D3 bar charts
 */

export class EquipmentFailureAnalyzer {
    constructor() {
        this.colors = {
            critical: '#f44336',
            high: '#ff9800',
            medium: '#ffc107',
            low: '#4caf50'
        };
    }

    async render(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const analysisData = this.analyzeEquipmentFailures(data);
        
        container.innerHTML = `
            <div class="equipment-failure-analysis">
                <div class="analysis-header">
                    <h4>⚠️ Equipment Failure Frequency Analysis</h4>
                    <div class="analysis-controls">
                        <select id="failure-view-selector" class="view-selector">
                            <option value="by-equipment">By Equipment</option>
                            <option value="by-type">By Equipment Type</option>
                            <option value="by-severity">By Severity</option>
                            <option value="by-manufacturer">By Manufacturer</option>
                        </select>
                        <select id="failure-time-range" class="time-selector">
                            <option value="30">Last 30 Days</option>
                            <option value="90" selected>Last 90 Days</option>
                            <option value="180">Last 6 Months</option>
                            <option value="365">Last Year</option>
                        </select>
                    </div>
                </div>
                
                <div class="failure-metrics">
                    <div class="metric-card">
                        <span class="metric-value">${analysisData.totalFailures}</span>
                        <span class="metric-label">Total Failures</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${analysisData.mtbf.toFixed(1)} days</span>
                        <span class="metric-label">Avg MTBF</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${analysisData.mttr.toFixed(1)} hrs</span>
                        <span class="metric-label">Avg MTTR</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-value">${(analysisData.reliability * 100).toFixed(1)}%</span>
                        <span class="metric-label">Reliability</span>
                    </div>
                </div>
                
                <div id="failure-chart" class="chart-container"></div>
                
                <div class="failure-details">
                    <div class="detail-section">
                        <h5>🔥 Most Failure-Prone Equipment</h5>
                        <div id="failure-prone-list" class="equipment-list"></div>
                    </div>
                    <div class="detail-section">
                        <h5>🎯 Failure Patterns</h5>
                        <div id="failure-patterns" class="pattern-analysis"></div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners(analysisData, data);
        this.renderChart('by-equipment', analysisData, data);
        this.renderFailureProneListing(analysisData);
        this.renderFailurePatterns(analysisData);
    }

    analyzeEquipmentFailures(data) {
        const failureEvents = data.events.filter(event => 
            ['system_failure', 'equipment_malfunction', 'power_failure'].includes(event.type)
        );

        const equipmentFailures = {};
        let totalDowntime = 0;
        let totalResolutionTime = 0;

        // Analyze failures by equipment
        failureEvents.forEach(event => {
            event.affectedEquipment?.forEach(eqId => {
                if (!equipmentFailures[eqId]) {
                    const equipment = data.equipment.find(eq => eq.id === eqId);
                    equipmentFailures[eqId] = {
                        equipment: equipment,
                        failures: [],
                        totalFailures: 0,
                        totalDowntime: 0,
                        severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 }
                    };
                }

                equipmentFailures[eqId].failures.push(event);
                equipmentFailures[eqId].totalFailures++;
                
                if (event.metrics?.downtime) {
                    equipmentFailures[eqId].totalDowntime += event.metrics.downtime;
                    totalDowntime += event.metrics.downtime;
                }

                if (event.metrics?.resolutionTime) {
                    totalResolutionTime += event.metrics.resolutionTime;
                }

                if (event.severity) {
                    equipmentFailures[eqId].severityBreakdown[event.severity]++;
                }
            });
        });

        // Calculate metrics
        const totalEquipment = data.equipment.length;
        const totalFailures = failureEvents.length;
        const avgTimeToFailure = totalEquipment > 0 ? 365 / (totalFailures / totalEquipment) : 0; // Rough MTBF calculation
        const avgResolutionTime = totalFailures > 0 ? totalResolutionTime / totalFailures / 60 : 0; // Convert to hours
        const reliability = totalEquipment > 0 ? (totalEquipment - Object.keys(equipmentFailures).length) / totalEquipment : 1;

        return {
            equipmentFailures,
            totalFailures,
            mtbf: avgTimeToFailure,
            mttr: avgResolutionTime,
            reliability,
            totalDowntime,
            failureEvents
        };
    }

    renderChart(viewType, analysisData, data) {
        const chartContainer = document.getElementById('failure-chart');
        if (!chartContainer) return;

        // Clear previous chart
        chartContainer.innerHTML = '';

        const chartData = this.prepareChartData(viewType, analysisData, data);
        this.createD3BarChart(chartContainer, chartData, viewType);
    }

    prepareChartData(viewType, analysisData, data) {
        switch (viewType) {
            case 'by-equipment':
                return Object.values(analysisData.equipmentFailures)
                    .sort((a, b) => b.totalFailures - a.totalFailures)
                    .slice(0, 15) // Top 15 most problematic
                    .map(item => ({
                        label: item.equipment?.name || 'Unknown',
                        value: item.totalFailures,
                        details: item
                    }));

            case 'by-type':
                const typeFailures = {};
                Object.values(analysisData.equipmentFailures).forEach(item => {
                    const type = item.equipment?.type || 'unknown';
                    if (!typeFailures[type]) {
                        typeFailures[type] = 0;
                    }
                    typeFailures[type] += item.totalFailures;
                });
                
                return Object.entries(typeFailures)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => ({
                        label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        value: count
                    }));

            case 'by-severity':
                const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
                analysisData.failureEvents.forEach(event => {
                    if (event.severity) {
                        severityCounts[event.severity]++;
                    }
                });
                
                return Object.entries(severityCounts)
                    .filter(([, count]) => count > 0)
                    .map(([severity, count]) => ({
                        label: severity.charAt(0).toUpperCase() + severity.slice(1),
                        value: count,
                        color: this.colors[severity]
                    }));

            case 'by-manufacturer':
                const manufacturerFailures = {};
                Object.values(analysisData.equipmentFailures).forEach(item => {
                    const manufacturer = item.equipment?.manufacturer || 'Unknown';
                    if (!manufacturerFailures[manufacturer]) {
                        manufacturerFailures[manufacturer] = 0;
                    }
                    manufacturerFailures[manufacturer] += item.totalFailures;
                });
                
                return Object.entries(manufacturerFailures)
                    .sort((a, b) => b[1] - a[1])
                    .map(([manufacturer, count]) => ({
                        label: manufacturer,
                        value: count
                    }));

            default:
                return [];
        }
    }

    createD3BarChart(container, data, viewType) {
        const margin = { top: 20, right: 30, bottom: 80, left: 60 };
        const width = container.offsetWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

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
            .domain([0, d3.max(data, d => d.value)])
            .range([height, 0]);

        // Color scale
        const colorScale = d3.scaleOrdinal()
            .domain(data.map(d => d.label))
            .range(viewType === 'by-severity' ? 
                data.map(d => d.color || '#2196F3') : 
                d3.schemeCategory10
            );

        // Bars
        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label))
            .attr('width', xScale.bandwidth())
            .attr('y', d => yScale(d.value))
            .attr('height', d => height - yScale(d.value))
            .attr('fill', d => colorScale(d.label))
            .attr('opacity', 0.8)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                
                // Tooltip
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
                    <strong>${d.label}</strong><br>
                    Failures: ${d.value}<br>
                    ${d.details ? `MTBF: ${(365 / d.value).toFixed(1)} days` : ''}
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
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        svg.append('g')
            .call(d3.axisLeft(yScale));

        // Labels
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Number of Failures');

        svg.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style('text-anchor', 'middle')
            .text(this.getXAxisLabel(viewType));
    }

    getXAxisLabel(viewType) {
        const labels = {
            'by-equipment': 'Equipment',
            'by-type': 'Equipment Type',
            'by-severity': 'Severity Level',
            'by-manufacturer': 'Manufacturer'
        };
        return labels[viewType] || '';
    }

    renderFailureProneListing(analysisData) {
        const container = document.getElementById('failure-prone-list');
        if (!container) return;

        const topFailures = Object.values(analysisData.equipmentFailures)
            .sort((a, b) => b.totalFailures - a.totalFailures)
            .slice(0, 10);

        container.innerHTML = topFailures.map(item => `
            <div class="equipment-item">
                <div class="equipment-header">
                    <span class="equipment-name">${item.equipment?.name || 'Unknown'}</span>
                    <span class="failure-count">${item.totalFailures} failures</span>
                </div>
                <div class="equipment-details">
                    <span class="equipment-type">${item.equipment?.type || 'Unknown Type'}</span>
                    <span class="equipment-location">${item.equipment?.location || 'Unknown Location'}</span>
                </div>
                <div class="severity-breakdown">
                    ${Object.entries(item.severityBreakdown)
                        .filter(([, count]) => count > 0)
                        .map(([severity, count]) => 
                            `<span class="severity-badge ${severity}">${count} ${severity}</span>`
                        ).join('')
                    }
                </div>
            </div>
        `).join('');
    }

    renderFailurePatterns(analysisData) {
        const container = document.getElementById('failure-patterns');
        if (!container) return;

        const patterns = this.identifyFailurePatterns(analysisData);
        
        container.innerHTML = `
            <div class="pattern-list">
                ${patterns.map(pattern => `
                    <div class="pattern-item">
                        <div class="pattern-icon">${pattern.icon}</div>
                        <div class="pattern-content">
                            <div class="pattern-title">${pattern.title}</div>
                            <div class="pattern-description">${pattern.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    identifyFailurePatterns(analysisData) {
        const patterns = [];
        
        // Analyze for common patterns
        const manufacturerFailures = {};
        const typeFailures = {};
        
        Object.values(analysisData.equipmentFailures).forEach(item => {
            const manufacturer = item.equipment?.manufacturer || 'Unknown';
            const type = item.equipment?.type || 'Unknown';
            
            manufacturerFailures[manufacturer] = (manufacturerFailures[manufacturer] || 0) + item.totalFailures;
            typeFailures[type] = (typeFailures[type] || 0) + item.totalFailures;
        });

        // Find manufacturer with highest failure rate
        const topManufacturer = Object.entries(manufacturerFailures)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topManufacturer && topManufacturer[1] > 5) {
            patterns.push({
                icon: '🏭',
                title: 'Manufacturer Risk',
                description: `${topManufacturer[0]} equipment shows higher failure rates (${topManufacturer[1]} failures)`
            });
        }

        // Find equipment type with highest failure rate
        const topType = Object.entries(typeFailures)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topType && topType[1] > 3) {
            patterns.push({
                icon: '⚙️',
                title: 'Equipment Type Risk',
                description: `${topType[0].replace(/_/g, ' ')} equipment requires attention (${topType[1]} failures)`
            });
        }

        // Check for aging equipment pattern
        const agingEquipment = Object.values(analysisData.equipmentFailures)
            .filter(item => {
                const installDate = new Date(item.equipment?.installationDate || '2020-01-01');
                const ageInYears = (new Date() - installDate) / (1000 * 60 * 60 * 24 * 365);
                return ageInYears > 5 && item.totalFailures > 2;
            }).length;

        if (agingEquipment > 0) {
            patterns.push({
                icon: '⏰',
                title: 'Equipment Age Factor',
                description: `${agingEquipment} older equipment pieces (>5 years) showing increased failures`
            });
        }

        return patterns;
    }

    renderMiniChart(container, data) {
        const analysisData = this.analyzeEquipmentFailures(data);
        const chartData = this.prepareChartData('by-type', analysisData, data).slice(0, 5);
        
        container.innerHTML = '<h5>Failures by Equipment Type</h5>';
        
        if (chartData.length === 0) {
            container.innerHTML += '<p class="no-data">No failure data available</p>';
            return;
        }

        const maxValue = d3.max(chartData, d => d.value);
        
        const chartHtml = chartData.map(item => `
            <div class="mini-chart-item">
                <div class="chart-label">${item.label}</div>
                <div class="chart-bar">
                    <div class="bar-fill" style="width: ${(item.value / maxValue) * 100}%"></div>
                    <span class="bar-value">${item.value}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML += `<div class="mini-chart">${chartHtml}</div>`;
    }

    setupEventListeners(analysisData, data) {
        const viewSelector = document.getElementById('failure-view-selector');
        const timeRangeSelector = document.getElementById('failure-time-range');

        if (viewSelector) {
            viewSelector.addEventListener('change', (e) => {
                this.renderChart(e.target.value, analysisData, data);
            });
        }

        if (timeRangeSelector) {
            timeRangeSelector.addEventListener('change', (e) => {
                // Filter data by time range and re-render
                const filteredData = this.filterDataByTimeRange(data, parseInt(e.target.value));
                const newAnalysisData = this.analyzeEquipmentFailures(filteredData);
                this.renderChart(viewSelector?.value || 'by-equipment', newAnalysisData, filteredData);
                this.renderFailureProneListing(newAnalysisData);
                this.renderFailurePatterns(newAnalysisData);
            });
        }
    }

    filterDataByTimeRange(data, days) {
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
        return this.analyzeEquipmentFailures(data);
    }
}

export default EquipmentFailureAnalyzer;
