/**
 * Trend Detector
 * Simple rule-based trend detection highlighting equipment/models with rising failure trends
 * Uses statistical analysis and pattern recognition for maintenance trend analysis
 */

export class TrendDetector {
    constructor() {
        this.trendColors = {
            'rising': '#f44336',      // Red - concerning upward trend
            'stable': '#ffc107',      // Yellow - stable/no clear trend
            'declining': '#4caf50',   // Green - improving trend
            'volatile': '#ff9800',    // Orange - high volatility
            'insufficient': '#9e9e9e' // Gray - not enough data
        };

        this.alertLevels = {
            'critical': { threshold: 0.8, icon: '🚨', color: '#d32f2f' },
            'high': { threshold: 0.6, icon: '⚠️', color: '#f57c00' },
            'medium': { threshold: 0.4, icon: '⚡', color: '#fbc02d' },
            'low': { threshold: 0.2, icon: '📊', color: '#388e3c' }
        };
    }

    async render(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const trendData = this.analyzeTrends(data);
        
        container.innerHTML = `
            <div class="trend-analysis">
                <div class="analysis-header">
                    <h4>📊 Trend Analysis & Failure Prediction</h4>
                    <div class="analysis-controls">
                        <select id="trend-analysis-type" class="view-selector">
                            <option value="equipment-failures">Equipment Failure Trends</option>
                            <option value="maintenance-patterns">Maintenance Patterns</option>
                            <option value="performance-degradation">Performance Degradation</option>
                            <option value="predictive-alerts">Predictive Alerts</option>
                        </select>
                        <select id="trend-time-window" class="time-selector">
                            <option value="30">Last 30 Days</option>
                            <option value="90" selected>Last 90 Days</option>
                            <option value="180">Last 6 Months</option>
                            <option value="365">Last Year</option>
                        </select>
                    </div>
                </div>
                
                <div class="trend-summary">
                    <div class="summary-card rising">
                        <div class="card-icon">📈</div>
                        <div class="card-content">
                            <span class="card-value">${trendData.risingTrends.length}</span>
                            <span class="card-label">Rising Trends</span>
                        </div>
                    </div>
                    <div class="summary-card stable">
                        <div class="card-icon">➡️</div>
                        <div class="card-content">
                            <span class="card-value">${trendData.stableTrends.length}</span>
                            <span class="card-label">Stable Patterns</span>
                        </div>
                    </div>
                    <div class="summary-card declining">
                        <div class="card-icon">📉</div>
                        <div class="card-content">
                            <span class="card-value">${trendData.decliningTrends.length}</span>
                            <span class="card-label">Improving</span>
                        </div>
                    </div>
                    <div class="summary-card alerts">
                        <div class="card-icon">🚨</div>
                        <div class="card-content">
                            <span class="card-value">${trendData.criticalAlerts.length}</span>
                            <span class="card-label">Critical Alerts</span>
                        </div>
                    </div>
                </div>
                
                <div class="trend-visualization">
                    <div id="trend-chart-container" class="chart-container"></div>
                </div>
                
                <div class="trend-details">
                    <div class="detail-section">
                        <h5>🔥 Critical Trend Alerts</h5>
                        <div id="critical-alerts-list"></div>
                    </div>
                    <div class="detail-section">
                        <h5>📈 Rising Failure Trends</h5>
                        <div id="rising-trends-list"></div>
                    </div>
                </div>
                
                <div class="predictive-insights">
                    <h5>🔮 Predictive Insights</h5>
                    <div id="predictive-recommendations"></div>
                </div>
            </div>
        `;

        this.setupEventListeners(trendData, data);
        this.renderTrendVisualization('equipment-failures', 90, trendData, data);
        this.renderCriticalAlerts(trendData);
        this.renderRisingTrends(trendData);
        this.renderPredictiveInsights(trendData);
    }

    analyzeTrends(data) {
        const timeWindows = [30, 90, 180, 365]; // Days
        const trendsByEquipment = {};
        const trendsByModel = {};
        const trendsByLocation = {};
        const alerts = [];

        // Analyze failure trends by equipment
        data.equipment.forEach(equipment => {
            const failureEvents = data.events.filter(event => 
                event.affectedEquipment?.includes(equipment.id) &&
                ['system_failure', 'equipment_malfunction', 'power_failure'].includes(event.type)
            );

            const trendAnalysis = this.calculateTrendMetrics(failureEvents, equipment);
            
            trendsByEquipment[equipment.id] = {
                equipment,
                events: failureEvents,
                ...trendAnalysis,
                riskScore: this.calculateRiskScore(trendAnalysis, equipment)
            };

            // Check for critical alerts
            if (trendAnalysis.trend === 'rising' && trendAnalysis.confidence > 0.7) {
                alerts.push({
                    type: 'equipment_failure_trend',
                    severity: this.determineSeverity(trendAnalysis.slope, trendAnalysis.recentFailures),
                    subject: equipment,
                    analysis: trendAnalysis,
                    message: this.generateAlertMessage('equipment', equipment, trendAnalysis)
                });
            }
        });

        // Analyze trends by equipment model
        const modelGroups = this.groupBy(data.equipment, 'model');
        Object.entries(modelGroups).forEach(([model, equipmentList]) => {
            const allModelEvents = data.events.filter(event =>
                event.affectedEquipment?.some(eqId => 
                    equipmentList.some(eq => eq.id === eqId)
                ) && ['system_failure', 'equipment_malfunction', 'power_failure'].includes(event.type)
            );

            const trendAnalysis = this.calculateTrendMetrics(allModelEvents, { model, count: equipmentList.length });
            
            trendsByModel[model] = {
                model,
                equipmentCount: equipmentList.length,
                equipment: equipmentList,
                events: allModelEvents,
                ...trendAnalysis
            };

            // Model-level alerts
            if (trendAnalysis.trend === 'rising' && equipmentList.length > 1 && trendAnalysis.confidence > 0.6) {
                alerts.push({
                    type: 'model_failure_trend',
                    severity: this.determineSeverity(trendAnalysis.slope, trendAnalysis.recentFailures),
                    subject: { model, count: equipmentList.length },
                    analysis: trendAnalysis,
                    message: this.generateAlertMessage('model', { model, count: equipmentList.length }, trendAnalysis)
                });
            }
        });

        // Analyze trends by location
        data.locations.forEach(location => {
            const locationEvents = data.events.filter(event =>
                event.affectedLocations?.includes(location.id) &&
                ['system_failure', 'equipment_malfunction', 'power_failure', 'maintenance_unscheduled'].includes(event.type)
            );

            const trendAnalysis = this.calculateTrendMetrics(locationEvents, location);
            
            trendsByLocation[location.id] = {
                location,
                events: locationEvents,
                ...trendAnalysis
            };
        });

        // Categorize trends
        const allTrends = [
            ...Object.values(trendsByEquipment),
            ...Object.values(trendsByModel),
            ...Object.values(trendsByLocation)
        ];

        const risingTrends = allTrends.filter(t => t.trend === 'rising').sort((a, b) => b.slope - a.slope);
        const stableTrends = allTrends.filter(t => t.trend === 'stable');
        const decliningTrends = allTrends.filter(t => t.trend === 'declining').sort((a, b) => a.slope - b.slope);
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');

        return {
            trendsByEquipment,
            trendsByModel,
            trendsByLocation,
            risingTrends,
            stableTrends,
            decliningTrends,
            alerts,
            criticalAlerts,
            summary: {
                totalAnalyzed: allTrends.length,
                risingCount: risingTrends.length,
                stableCount: stableTrends.length,
                decliningCount: decliningTrends.length
            }
        };
    }

    calculateTrendMetrics(events, subject) {
        if (events.length < 2) {
            return {
                trend: 'insufficient',
                slope: 0,
                confidence: 0,
                recentFailures: events.length,
                averageInterval: 0,
                volatility: 0,
                prediction: null
            };
        }

        // Sort events by time
        const sortedEvents = events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        // Calculate time-based metrics
        const timePoints = sortedEvents.map(event => new Date(event.startTime).getTime());
        const daysSinceFirst = (Date.now() - timePoints[0]) / (1000 * 60 * 60 * 24);
        
        // Group events by week to analyze trend
        const weeklyData = this.groupEventsByTimeInterval(sortedEvents, 'week');
        const montlyData = this.groupEventsByTimeInterval(sortedEvents, 'month');
        
        // Calculate linear regression on weekly failure counts
        const regressionData = this.calculateLinearRegression(weeklyData);
        
        // Determine trend direction and confidence
        const trend = this.classifyTrend(regressionData.slope, regressionData.r2);
        const confidence = regressionData.r2; // R-squared as confidence measure
        
        // Calculate recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentFailures = events.filter(event => 
            new Date(event.startTime) >= thirtyDaysAgo
        ).length;

        // Calculate average failure interval
        const intervals = [];
        for (let i = 1; i < timePoints.length; i++) {
            intervals.push((timePoints[i] - timePoints[i-1]) / (1000 * 60 * 60 * 24)); // Days
        }
        const averageInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

        // Calculate volatility (coefficient of variation of intervals)
        const volatility = intervals.length > 1 ? 
            this.calculateStandardDeviation(intervals) / (averageInterval || 1) : 0;

        // Generate prediction
        const prediction = this.generatePrediction(regressionData, recentFailures, averageInterval);

        return {
            trend,
            slope: regressionData.slope,
            confidence,
            recentFailures,
            averageInterval,
            volatility,
            prediction,
            totalEvents: events.length,
            timespan: daysSinceFirst,
            weeklyData,
            monthlyData: montlyData
        };
    }

    groupEventsByTimeInterval(events, interval = 'week') {
        const groups = {};
        const msPerDay = 1000 * 60 * 60 * 24;
        const msPerWeek = msPerDay * 7;
        const intervalMs = interval === 'week' ? msPerWeek : msPerDay * 30; // Approximate month

        events.forEach(event => {
            const eventTime = new Date(event.startTime).getTime();
            const intervalKey = Math.floor(eventTime / intervalMs) * intervalMs;
            
            if (!groups[intervalKey]) {
                groups[intervalKey] = {
                    start: new Date(intervalKey),
                    end: new Date(intervalKey + intervalMs),
                    count: 0,
                    events: []
                };
            }
            
            groups[intervalKey].count++;
            groups[intervalKey].events.push(event);
        });

        return Object.values(groups).sort((a, b) => a.start - b.start);
    }

    calculateLinearRegression(timeSeriesData) {
        if (timeSeriesData.length < 2) {
            return { slope: 0, intercept: 0, r2: 0 };
        }

        const n = timeSeriesData.length;
        const x = timeSeriesData.map((_, i) => i); // Time index
        const y = timeSeriesData.map(d => d.count);   // Event counts

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const yMean = sumY / n;
        const ssRes = y.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

        return { slope, intercept, r2: Math.max(0, r2) };
    }

    classifyTrend(slope, r2) {
        const minConfidence = 0.3;
        const slopeThreshold = 0.1;

        if (r2 < minConfidence) {
            return 'insufficient';
        }

        if (Math.abs(slope) < slopeThreshold) {
            return 'stable';
        }

        return slope > 0 ? 'rising' : 'declining';
    }

    calculateStandardDeviation(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
        return Math.sqrt(variance);
    }

    calculateRiskScore(trendAnalysis, subject) {
        let score = 0;

        // Base score from trend direction
        if (trendAnalysis.trend === 'rising') {
            score += 40 + (trendAnalysis.slope * 20);
        } else if (trendAnalysis.trend === 'stable') {
            score += 20;
        } else if (trendAnalysis.trend === 'declining') {
            score += Math.max(0, 20 - (Math.abs(trendAnalysis.slope) * 10));
        }

        // Confidence multiplier
        score *= (0.5 + trendAnalysis.confidence * 0.5);

        // Recent activity weight
        if (trendAnalysis.recentFailures > 3) {
            score += 15;
        } else if (trendAnalysis.recentFailures > 1) {
            score += 5;
        }

        // Volatility penalty
        if (trendAnalysis.volatility > 1) {
            score += 10;
        }

        // Equipment age factor (if available)
        if (subject.installationDate) {
            const ageYears = (Date.now() - new Date(subject.installationDate)) / (1000 * 60 * 60 * 24 * 365);
            if (ageYears > 5) {
                score += Math.min(15, (ageYears - 5) * 2);
            }
        }

        // Criticality factor
        if (subject.criticalityLevel === 'critical') {
            score *= 1.3;
        } else if (subject.criticalityLevel === 'high') {
            score *= 1.2;
        }

        return Math.min(100, Math.max(0, score));
    }

    determineSeverity(slope, recentFailures) {
        if (slope > 0.8 || recentFailures > 5) return 'critical';
        if (slope > 0.5 || recentFailures > 3) return 'high';
        if (slope > 0.2 || recentFailures > 1) return 'medium';
        return 'low';
    }

    generateAlertMessage(type, subject, analysis) {
        const trendDescription = this.describeTrend(analysis.slope, analysis.confidence);
        const predictionText = analysis.prediction ? ` Next failure predicted in ~${analysis.prediction.daysUntilNext} days.` : '';

        switch (type) {
            case 'equipment':
                return `${subject.name || subject.id} shows ${trendDescription} with ${analysis.recentFailures} recent failures.${predictionText}`;
            case 'model':
                return `${subject.model} equipment model (${subject.count} units) shows ${trendDescription}.${predictionText}`;
            case 'location':
                return `${subject.name} location shows ${trendDescription} in maintenance events.${predictionText}`;
            default:
                return `${trendDescription} detected with confidence ${(analysis.confidence * 100).toFixed(0)}%.`;
        }
    }

    describeTrend(slope, confidence) {
        const confidenceLevel = confidence > 0.8 ? 'strong' : confidence > 0.6 ? 'moderate' : 'weak';
        const direction = slope > 0 ? 'increasing failure rate' : 'decreasing failure rate';
        const magnitude = Math.abs(slope) > 0.5 ? 'significant' : Math.abs(slope) > 0.2 ? 'noticeable' : 'slight';
        
        return `${confidenceLevel} ${magnitude} ${direction}`;
    }

    generatePrediction(regression, recentFailures, averageInterval) {
        if (!regression || regression.r2 < 0.4 || averageInterval === 0) {
            return null;
        }

        // Simple prediction based on trend and historical interval
        const trendFactor = Math.max(0.1, 1 + regression.slope);
        const adjustedInterval = averageInterval / trendFactor;
        const daysUntilNext = Math.max(1, Math.round(adjustedInterval));

        return {
            daysUntilNext,
            confidence: regression.r2,
            method: 'trend_adjusted_interval'
        };
    }

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const value = item[key] || 'unknown';
            if (!groups[value]) {
                groups[value] = [];
            }
            groups[value].push(item);
            return groups;
        }, {});
    }

    renderTrendVisualization(analysisType, timeWindow, trendData, data) {
        const container = document.getElementById('trend-chart-container');
        if (!container) return;

        container.innerHTML = '';

        switch (analysisType) {
            case 'equipment-failures':
                this.renderEquipmentFailureTrends(container, trendData);
                break;
            case 'maintenance-patterns':
                this.renderMaintenancePatterns(container, trendData, data);
                break;
            case 'performance-degradation':
                this.renderPerformanceDegradation(container, trendData);
                break;
            case 'predictive-alerts':
                this.renderPredictiveAlerts(container, trendData);
                break;
        }
    }

    renderEquipmentFailureTrends(container, trendData) {
        const topTrends = trendData.risingTrends
            .filter(t => t.equipment) // Only equipment trends
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 15);

        if (topTrends.length === 0) {
            container.innerHTML = '<p class="no-data">No significant equipment failure trends detected</p>';
            return;
        }

        this.createTrendChart(container, topTrends, 'Equipment Failure Trend Analysis');
    }

    renderMaintenancePatterns(container, trendData, data) {
        // Analyze maintenance event patterns
        const maintenanceEvents = data.events.filter(e => 
            ['maintenance_scheduled', 'maintenance_unscheduled'].includes(e.type)
        );

        const monthlyData = this.groupEventsByTimeInterval(maintenanceEvents, 'month');
        const regression = this.calculateLinearRegression(monthlyData);

        container.innerHTML = `
            <div class="pattern-analysis">
                <h6>Maintenance Pattern Analysis</h6>
                <div class="pattern-metrics">
                    <div class="metric">
                        <span class="label">Monthly Trend:</span>
                        <span class="value ${regression.slope > 0 ? 'rising' : regression.slope < 0 ? 'declining' : 'stable'}">
                            ${regression.slope > 0 ? '↗️ Rising' : regression.slope < 0 ? '↘️ Declining' : '➡️ Stable'}
                        </span>
                    </div>
                    <div class="metric">
                        <span class="label">Trend Confidence:</span>
                        <span class="value">${(regression.r2 * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Recent Month:</span>
                        <span class="value">${monthlyData[monthlyData.length - 1]?.count || 0} events</span>
                    </div>
                </div>
                <div id="maintenance-trend-chart"></div>
            </div>
        `;

        // Render simple line chart for maintenance trends
        this.renderSimpleLineChart(
            document.getElementById('maintenance-trend-chart'), 
            monthlyData.map((d, i) => ({ x: i, y: d.count, label: d.start.toLocaleDateString('en', { month: 'short', year: '2-digit' }) })),
            'Monthly Maintenance Events'
        );
    }

    renderPerformanceDegradation(container, trendData) {
        const degradingEquipment = Object.values(trendData.trendsByEquipment)
            .filter(t => t.trend === 'rising' && t.confidence > 0.5)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 10);

        container.innerHTML = `
            <div class="degradation-analysis">
                <h6>Performance Degradation Analysis</h6>
                <div class="degradation-list">
                    ${degradingEquipment.map(item => `
                        <div class="degradation-item">
                            <div class="item-header">
                                <span class="equipment-name">${item.equipment.name || item.equipment.id}</span>
                                <span class="risk-score ${this.getRiskLevel(item.riskScore)}">${item.riskScore.toFixed(0)}/100</span>
                            </div>
                            <div class="item-details">
                                <span class="equipment-type">${item.equipment.type || 'Unknown'}</span>
                                <span class="trend-indicator ${item.trend}">
                                    ${item.trend === 'rising' ? '📈' : item.trend === 'declining' ? '📉' : '➡️'}
                                    ${(item.slope * 100).toFixed(1)}% change rate
                                </span>
                            </div>
                            <div class="item-metrics">
                                <span class="metric">Recent: ${item.recentFailures} failures</span>
                                <span class="metric">Confidence: ${(item.confidence * 100).toFixed(0)}%</span>
                                ${item.prediction ? `<span class="metric">Next: ~${item.prediction.daysUntilNext} days</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderPredictiveAlerts(container, trendData) {
        const upcomingFailures = Object.values(trendData.trendsByEquipment)
            .filter(t => t.prediction && t.prediction.daysUntilNext < 30)
            .sort((a, b) => a.prediction.daysUntilNext - b.prediction.daysUntilNext)
            .slice(0, 10);

        container.innerHTML = `
            <div class="predictive-alerts">
                <h6>Predictive Maintenance Alerts</h6>
                ${upcomingFailures.length === 0 ? '<p class="no-data">No imminent failures predicted</p>' : `
                    <div class="alert-timeline">
                        ${upcomingFailures.map(item => `
                            <div class="timeline-item">
                                <div class="timeline-date">
                                    <div class="days">${item.prediction.daysUntilNext}</div>
                                    <div class="unit">days</div>
                                </div>
                                <div class="timeline-content">
                                    <div class="equipment-name">${item.equipment.name || item.equipment.id}</div>
                                    <div class="prediction-details">
                                        <span class="confidence">Confidence: ${(item.prediction.confidence * 100).toFixed(0)}%</span>
                                        <span class="location">${item.equipment.location || 'Unknown location'}</span>
                                    </div>
                                </div>
                                <div class="alert-actions">
                                    <button class="action-btn">Schedule Maintenance</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    createTrendChart(container, data, title) {
        container.innerHTML = `<h6>${title}</h6>`;
        
        if (data.length === 0) return;

        const margin = { top: 20, right: 30, bottom: 80, left: 200 };
        const width = Math.max(600, container.offsetWidth) - margin.left - margin.right;
        const height = Math.max(400, data.length * 30) - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.equipment?.name || d.model || d.location?.name || 'Unknown'))
            .range([0, height])
            .padding(0.1);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.riskScore)])
            .range([0, width]);

        // Bars
        svg.selectAll('.trend-bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'trend-bar')
            .attr('y', d => yScale(d.equipment?.name || d.model || d.location?.name || 'Unknown'))
            .attr('x', 0)
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d.riskScore))
            .attr('fill', d => this.trendColors[d.trend] || '#2196f3')
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

                tooltip.html(`
                    <strong>${d.equipment?.name || d.model || d.location?.name || 'Unknown'}</strong><br>
                    Risk Score: ${d.riskScore.toFixed(1)}/100<br>
                    Trend: ${d.trend} (${(d.confidence * 100).toFixed(0)}% confidence)<br>
                    Recent Failures: ${d.recentFailures}<br>
                    ${d.prediction ? `Next Failure: ~${d.prediction.daysUntilNext} days` : 'No prediction available'}
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
            .call(d3.axisLeft(yScale));

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        // Labels
        svg.append('text')
            .attr('transform', `translate(${width / 2}, ${height + 40})`)
            .style('text-anchor', 'middle')
            .text('Risk Score');
    }

    renderSimpleLineChart(container, data, title) {
        if (!container || data.length === 0) return;

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = 400 - margin.left - margin.right;
        const height = 200 - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.x))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.y))
            .range([height, 0]);

        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y));

        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', '#2196f3')
            .attr('stroke-width', 2)
            .attr('d', line);

        svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 3)
            .attr('fill', '#2196f3');

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat((d, i) => data[d]?.label || ''));

        svg.append('g')
            .call(d3.axisLeft(yScale));
    }

    getRiskLevel(score) {
        if (score >= 75) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
    }

    renderCriticalAlerts(trendData) {
        const container = document.getElementById('critical-alerts-list');
        if (!container) return;

        const criticalAlerts = trendData.alerts
            .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
            .sort((a, b) => {
                const severityOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            })
            .slice(0, 10);

        if (criticalAlerts.length === 0) {
            container.innerHTML = '<p class="no-data">No critical trend alerts at this time</p>';
            return;
        }

        container.innerHTML = `
            <div class="alerts-list">
                ${criticalAlerts.map(alert => `
                    <div class="alert-item ${alert.severity}">
                        <div class="alert-icon">${this.alertLevels[alert.severity]?.icon || '⚠️'}</div>
                        <div class="alert-content">
                            <div class="alert-title">${this.getAlertTitle(alert)}</div>
                            <div class="alert-message">${alert.message}</div>
                            <div class="alert-meta">
                                <span class="alert-type">${alert.type.replace('_', ' ')}</span>
                                <span class="alert-confidence">${(alert.analysis.confidence * 100).toFixed(0)}% confidence</span>
                            </div>
                        </div>
                        <div class="alert-severity">${alert.severity.toUpperCase()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRisingTrends(trendData) {
        const container = document.getElementById('rising-trends-list');
        if (!container) return;

        const risingTrends = trendData.risingTrends
            .sort((a, b) => b.slope - a.slope)
            .slice(0, 15);

        if (risingTrends.length === 0) {
            container.innerHTML = '<p class="no-data">No rising failure trends detected</p>';
            return;
        }

        container.innerHTML = `
            <div class="trends-list">
                ${risingTrends.map(trend => `
                    <div class="trend-item rising">
                        <div class="trend-header">
                            <span class="trend-subject">${this.getTrendSubjectName(trend)}</span>
                            <span class="trend-indicator">📈 +${(trend.slope * 100).toFixed(1)}%</span>
                        </div>
                        <div class="trend-details">
                            <span class="trend-type">${this.getTrendType(trend)}</span>
                            <span class="trend-confidence">${(trend.confidence * 100).toFixed(0)}% confidence</span>
                        </div>
                        <div class="trend-metrics">
                            <div class="metric">
                                <span class="metric-label">Recent Events:</span>
                                <span class="metric-value">${trend.recentFailures}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Total Events:</span>
                                <span class="metric-value">${trend.totalEvents}</span>
                            </div>
                            ${trend.prediction ? `
                                <div class="metric">
                                    <span class="metric-label">Next Predicted:</span>
                                    <span class="metric-value">${trend.prediction.daysUntilNext} days</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderPredictiveInsights(trendData) {
        const container = document.getElementById('predictive-recommendations');
        if (!container) return;

        const insights = this.generatePredictiveInsights(trendData);

        container.innerHTML = `
            <div class="insights-list">
                ${insights.map(insight => `
                    <div class="insight-item ${insight.priority}">
                        <div class="insight-icon">${insight.icon}</div>
                        <div class="insight-content">
                            <div class="insight-title">${insight.title}</div>
                            <div class="insight-description">${insight.description}</div>
                            ${insight.recommendation ? `<div class="insight-recommendation">${insight.recommendation}</div>` : ''}
                        </div>
                        <div class="insight-priority">${insight.priority.toUpperCase()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generatePredictiveInsights(trendData) {
        const insights = [];

        // Rising model trends
        const risingModels = Object.values(trendData.trendsByModel)
            .filter(t => t.trend === 'rising' && t.equipmentCount > 1)
            .sort((a, b) => b.slope - a.slope)
            .slice(0, 3);

        risingModels.forEach(model => {
            insights.push({
                icon: '🏭',
                title: 'Model-Wide Failure Pattern',
                description: `${model.model} equipment model shows increasing failure rate across ${model.equipmentCount} units`,
                recommendation: 'Consider manufacturer consultation, bulk maintenance, or model replacement evaluation',
                priority: model.slope > 0.5 ? 'high' : 'medium'
            });
        });

        // Aging equipment
        const agingEquipment = Object.values(trendData.trendsByEquipment)
            .filter(t => {
                const age = t.equipment.installationDate ? 
                    (Date.now() - new Date(t.equipment.installationDate)) / (1000 * 60 * 60 * 24 * 365) : 0;
                return age > 5 && t.trend === 'rising';
            })
            .length;

        if (agingEquipment > 0) {
            insights.push({
                icon: '⏰',
                title: 'Age-Related Degradation',
                description: `${agingEquipment} aging equipment pieces (>5 years) show increasing failure rates`,
                recommendation: 'Implement proactive replacement program for older equipment',
                priority: agingEquipment > 5 ? 'high' : 'medium'
            });
        }

        // Predictive maintenance opportunities
        const predictableFailures = Object.values(trendData.trendsByEquipment)
            .filter(t => t.prediction && t.prediction.confidence > 0.6 && t.prediction.daysUntilNext < 60)
            .length;

        if (predictableFailures > 0) {
            insights.push({
                icon: '🔮',
                title: 'Predictive Maintenance Opportunity',
                description: `${predictableFailures} equipment pieces have predictable failure patterns within 60 days`,
                recommendation: 'Schedule proactive maintenance to prevent unplanned downtime',
                priority: 'medium'
            });
        }

        // Seasonal patterns
        const seasonalTrends = this.detectSeasonalPatterns(trendData);
        if (seasonalTrends.length > 0) {
            insights.push({
                icon: '🌡️',
                title: 'Seasonal Failure Patterns',
                description: 'Detected seasonal variations in equipment failure rates',
                recommendation: 'Adjust maintenance schedules to account for seasonal factors',
                priority: 'low'
            });
        }

        return insights;
    }

    detectSeasonalPatterns(trendData) {
        // Simplified seasonal detection - would need more sophisticated analysis in production
        const monthlyFailures = {};
        
        Object.values(trendData.trendsByEquipment).forEach(trend => {
            trend.events.forEach(event => {
                const month = new Date(event.startTime).getMonth();
                monthlyFailures[month] = (monthlyFailures[month] || 0) + 1;
            });
        });

        // Check for significant variance in monthly failures
        const values = Object.values(monthlyFailures);
        if (values.length > 6) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            
            return variance > mean * 0.5 ? ['seasonal_pattern_detected'] : [];
        }
        
        return [];
    }

    getAlertTitle(alert) {
        switch (alert.type) {
            case 'equipment_failure_trend':
                return `Equipment Failure Trend: ${alert.subject.name || alert.subject.id}`;
            case 'model_failure_trend':
                return `Model Failure Trend: ${alert.subject.model}`;
            default:
                return 'Trend Alert';
        }
    }

    getTrendSubjectName(trend) {
        if (trend.equipment) return trend.equipment.name || trend.equipment.id;
        if (trend.model) return trend.model;
        if (trend.location) return trend.location.name;
        return 'Unknown';
    }

    getTrendType(trend) {
        if (trend.equipment) return 'Equipment';
        if (trend.model) return 'Model';
        if (trend.location) return 'Location';
        return 'Unknown';
    }

    setupEventListeners(trendData, data) {
        const analysisTypeSelector = document.getElementById('trend-analysis-type');
        const timeWindowSelector = document.getElementById('trend-time-window');

        if (analysisTypeSelector && timeWindowSelector) {
            const updateVisualization = () => {
                this.renderTrendVisualization(
                    analysisTypeSelector.value,
                    parseInt(timeWindowSelector.value),
                    trendData,
                    data
                );
            };

            analysisTypeSelector.addEventListener('change', updateVisualization);
            timeWindowSelector.addEventListener('change', () => {
                // Re-analyze trends with new time window and update visualization
                const filteredData = this.filterDataByTimeRange(data, parseInt(timeWindowSelector.value));
                const newTrendData = this.analyzeTrends(filteredData);
                this.renderTrendVisualization(analysisTypeSelector.value, parseInt(timeWindowSelector.value), newTrendData, filteredData);
                this.renderCriticalAlerts(newTrendData);
                this.renderRisingTrends(newTrendData);
                this.renderPredictiveInsights(newTrendData);
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
        return this.analyzeTrends(data);
    }
}

export default TrendDetector;
