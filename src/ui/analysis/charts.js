/**
 * Charts Analysis Module
 * Provides various chart visualizations for graph data analysis
 */
import { store } from '../../core/store.js';

export class Charts {
    constructor() {
        this.charts = new Map();
        this.defaultConfig = {
            width: 400,
            height: 300,
            colors: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
        };
    }

    /**
     * Create node type distribution chart
     */
    createNodeTypeChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes } = store.getState();
        const config = { ...this.defaultConfig, ...options };
        
        // Count node types
        const typeCount = {};
        nodes.forEach(node => {
            typeCount[node.type] = (typeCount[node.type] || 0) + 1;
        });

        // Create pie chart
        const chart = this.createPieChart(container, typeCount, config);
        this.charts.set(containerId, chart);
        
        return chart;
    }

    /**
     * Create degree distribution chart
     */
    createDegreeDistributionChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes, edges } = store.getState();
        const config = { ...this.defaultConfig, ...options };
        
        // Calculate node degrees
        const degrees = nodes.map(node => {
            return edges.filter(edge => 
                edge.source === node.id || edge.target === node.id
            ).length;
        });

        // Create histogram
        const degreeCount = {};
        degrees.forEach(degree => {
            degreeCount[degree] = (degreeCount[degree] || 0) + 1;
        });

        const chart = this.createBarChart(container, degreeCount, config, {
            title: 'Degree Distribution',
            xLabel: 'Degree',
            yLabel: 'Number of Nodes'
        });
        
        this.charts.set(containerId, chart);
        return chart;
    }

    /**
     * Create connectivity chart
     */
    createConnectivityChart(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes, edges } = store.getState();
        const config = { ...this.defaultConfig, ...options };

        // Calculate connectivity over time (mock data for demonstration)
        const timeData = this.generateConnectivityTimeSeries(nodes, edges);
        
        const chart = this.createLineChart(container, timeData, config, {
            title: 'Graph Connectivity Over Time',
            xLabel: 'Time',
            yLabel: 'Connection Count'
        });
        
        this.charts.set(containerId, chart);
        return chart;
    }

    /**
     * Create simple pie chart using SVG
     */
    createPieChart(container, data, config) {
        container.innerHTML = '';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.style.border = '1px solid #ddd';
        
        const centerX = config.width / 2;
        const centerY = config.height / 2;
        const radius = Math.min(config.width, config.height) / 2 - 20;
        
        const total = Object.values(data).reduce((sum, value) => sum + value, 0);
        const entries = Object.entries(data);
        
        let currentAngle = 0;
        
        entries.forEach(([key, value], index) => {
            const percentage = value / total;
            const sliceAngle = percentage * 2 * Math.PI;
            
            // Create pie slice
            const slice = this.createPieSlice(
                centerX, centerY, radius, 
                currentAngle, currentAngle + sliceAngle,
                config.colors[index % config.colors.length]
            );
            
            svg.appendChild(slice);
            
            // Add label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', labelX);
            label.setAttribute('y', labelY);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '12');
            label.setAttribute('fill', 'white');
            label.textContent = `${key} (${value})`;
            
            svg.appendChild(label);
            
            currentAngle += sliceAngle;
        });
        
        // Add title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', centerX);
        title.setAttribute('y', 20);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '16');
        title.setAttribute('font-weight', 'bold');
        title.textContent = 'Node Type Distribution';
        
        svg.appendChild(title);
        container.appendChild(svg);
        
        return { type: 'pie', element: svg, data };
    }

    /**
     * Create pie slice path
     */
    createPieSlice(centerX, centerY, radius, startAngle, endAngle, color) {
        const x1 = centerX + Math.cos(startAngle) * radius;
        const y1 = centerY + Math.sin(startAngle) * radius;
        const x2 = centerX + Math.cos(endAngle) * radius;
        const y2 = centerY + Math.sin(endAngle) * radius;
        
        const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
        
        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', color);
        path.setAttribute('stroke', 'white');
        path.setAttribute('stroke-width', '2');
        
        return path;
    }

    /**
     * Create simple bar chart using SVG
     */
    createBarChart(container, data, config, chartOptions = {}) {
        container.innerHTML = '';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.style.border = '1px solid #ddd';
        
        const margin = { top: 40, right: 20, bottom: 40, left: 40 };
        const chartWidth = config.width - margin.left - margin.right;
        const chartHeight = config.height - margin.top - margin.bottom;
        
        const entries = Object.entries(data);
        const maxValue = Math.max(...Object.values(data));
        
        const barWidth = chartWidth / entries.length * 0.8;
        const barSpacing = chartWidth / entries.length * 0.2;
        
        entries.forEach(([key, value], index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = margin.left + index * (barWidth + barSpacing);
            const y = margin.top + chartHeight - barHeight;
            
            // Create bar
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', config.colors[index % config.colors.length]);
            
            svg.appendChild(rect);
            
            // Add x-axis label
            const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            xLabel.setAttribute('x', x + barWidth / 2);
            xLabel.setAttribute('y', config.height - 5);
            xLabel.setAttribute('text-anchor', 'middle');
            xLabel.setAttribute('font-size', '12');
            xLabel.textContent = key;
            
            svg.appendChild(xLabel);
            
            // Add value label
            const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            valueLabel.setAttribute('x', x + barWidth / 2);
            valueLabel.setAttribute('y', y - 5);
            valueLabel.setAttribute('text-anchor', 'middle');
            valueLabel.setAttribute('font-size', '12');
            valueLabel.textContent = value;
            
            svg.appendChild(valueLabel);
        });
        
        // Add title
        if (chartOptions.title) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            title.setAttribute('x', config.width / 2);
            title.setAttribute('y', 20);
            title.setAttribute('text-anchor', 'middle');
            title.setAttribute('font-size', '16');
            title.setAttribute('font-weight', 'bold');
            title.textContent = chartOptions.title;
            
            svg.appendChild(title);
        }
        
        container.appendChild(svg);
        return { type: 'bar', element: svg, data };
    }

    /**
     * Create simple line chart using SVG
     */
    createLineChart(container, data, config, chartOptions = {}) {
        container.innerHTML = '';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.style.border = '1px solid #ddd';
        
        const margin = { top: 40, right: 20, bottom: 40, left: 40 };
        const chartWidth = config.width - margin.left - margin.right;
        const chartHeight = config.height - margin.top - margin.bottom;
        
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        
        // Create path points
        const points = data.map((d, index) => {
            const x = margin.left + (index / (data.length - 1)) * chartWidth;
            const y = margin.top + chartHeight - ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
            return `${x},${y}`;
        });
        
        // Create line path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        path.setAttribute('points', points.join(' '));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', config.colors[0]);
        path.setAttribute('stroke-width', '2');
        
        svg.appendChild(path);
        
        // Add data points
        data.forEach((d, index) => {
            const x = margin.left + (index / (data.length - 1)) * chartWidth;
            const y = margin.top + chartHeight - ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 4);
            circle.setAttribute('fill', config.colors[0]);
            
            svg.appendChild(circle);
        });
        
        // Add title
        if (chartOptions.title) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            title.setAttribute('x', config.width / 2);
            title.setAttribute('y', 20);
            title.setAttribute('text-anchor', 'middle');
            title.setAttribute('font-size', '16');
            title.setAttribute('font-weight', 'bold');
            title.textContent = chartOptions.title;
            
            svg.appendChild(title);
        }
        
        container.appendChild(svg);
        return { type: 'line', element: svg, data };
    }

    /**
     * Generate mock connectivity time series data
     */
    generateConnectivityTimeSeries(nodes, edges) {
        const data = [];
        const baseConnectivity = edges.length;
        
        for (let i = 0; i < 10; i++) {
            data.push({
                time: i,
                value: baseConnectivity + Math.floor(Math.random() * 10) - 5
            });
        }
        
        return data;
    }

    /**
     * Create network metrics dashboard
     */
    createMetricsDashboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes, edges } = store.getState();
        
        // Calculate metrics
        const metrics = this.calculateNetworkMetrics(nodes, edges);
        
        container.innerHTML = `
            <div class="metrics-dashboard">
                <div class="metric-card">
                    <h4>Network Density</h4>
                    <span class="metric-value">${metrics.density}</span>
                </div>
                <div class="metric-card">
                    <h4>Average Clustering</h4>
                    <span class="metric-value">${metrics.clustering}</span>
                </div>
                <div class="metric-card">
                    <h4>Diameter</h4>
                    <span class="metric-value">${metrics.diameter}</span>
                </div>
                <div class="metric-card">
                    <h4>Components</h4>
                    <span class="metric-value">${metrics.components}</span>
                </div>
            </div>
        `;
        
        return metrics;
    }

    /**
     * Calculate basic network metrics
     */
    calculateNetworkMetrics(nodes, edges) {
        const nodeCount = nodes.length;
        const edgeCount = edges.length;
        
        // Network density
        const maxEdges = nodeCount * (nodeCount - 1) / 2;
        const density = maxEdges > 0 ? (edgeCount / maxEdges).toFixed(3) : 0;
        
        // Simple clustering coefficient approximation
        const clustering = this.estimateClusteringCoefficient(nodes, edges);
        
        // Diameter approximation (simplified)
        const diameter = this.estimateDiameter(nodes, edges);
        
        // Connected components (simplified)
        const components = this.countConnectedComponents(nodes, edges);
        
        return {
            density,
            clustering: clustering.toFixed(3),
            diameter,
            components
        };
    }

    /**
     * Estimate clustering coefficient
     */
    estimateClusteringCoefficient(nodes, edges) {
        if (nodes.length < 3) return 0;
        
        let totalTriangles = 0;
        let totalTriplets = 0;
        
        nodes.forEach(node => {
            const neighbors = this.getNodeNeighbors(node.id, edges);
            if (neighbors.length < 2) return;
            
            // Count triangles for this node
            let triangles = 0;
            for (let i = 0; i < neighbors.length; i++) {
                for (let j = i + 1; j < neighbors.length; j++) {
                    if (this.areNodesConnected(neighbors[i], neighbors[j], edges)) {
                        triangles++;
                    }
                }
            }
            
            const possibleTriplets = neighbors.length * (neighbors.length - 1) / 2;
            totalTriangles += triangles;
            totalTriplets += possibleTriplets;
        });
        
        return totalTriplets > 0 ? totalTriangles / totalTriplets : 0;
    }

    /**
     * Estimate diameter (simplified BFS)
     */
    estimateDiameter(nodes, edges) {
        if (nodes.length === 0) return 0;
        
        let maxDistance = 0;
        
        // Sample a few nodes to estimate diameter
        const sampleSize = Math.min(5, nodes.length);
        for (let i = 0; i < sampleSize; i++) {
            const distances = this.bfsDistances(nodes[i].id, nodes, edges);
            const maxDist = Math.max(...Object.values(distances).filter(d => d !== Infinity));
            maxDistance = Math.max(maxDistance, maxDist);
        }
        
        return maxDistance;
    }

    /**
     * Count connected components
     */
    countConnectedComponents(nodes, edges) {
        const visited = new Set();
        let components = 0;
        
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                this.dfsMarkComponent(node.id, edges, visited);
                components++;
            }
        });
        
        return components;
    }

    /**
     * Helper methods for network analysis
     */
    getNodeNeighbors(nodeId, edges) {
        const neighbors = [];
        edges.forEach(edge => {
            if (edge.source === nodeId) neighbors.push(edge.target);
            else if (edge.target === nodeId) neighbors.push(edge.source);
        });
        return neighbors;
    }

    areNodesConnected(node1, node2, edges) {
        return edges.some(edge => 
            (edge.source === node1 && edge.target === node2) ||
            (edge.source === node2 && edge.target === node1)
        );
    }

    bfsDistances(startId, nodes, edges) {
        const distances = {};
        const queue = [{ id: startId, dist: 0 }];
        const visited = new Set();
        
        nodes.forEach(node => distances[node.id] = Infinity);
        distances[startId] = 0;
        
        while (queue.length > 0) {
            const { id, dist } = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);
            
            const neighbors = this.getNodeNeighbors(id, edges);
            neighbors.forEach(neighborId => {
                if (!visited.has(neighborId)) {
                    distances[neighborId] = Math.min(distances[neighborId], dist + 1);
                    queue.push({ id: neighborId, dist: dist + 1 });
                }
            });
        }
        
        return distances;
    }

    dfsMarkComponent(nodeId, edges, visited) {
        visited.add(nodeId);
        const neighbors = this.getNodeNeighbors(nodeId, edges);
        neighbors.forEach(neighborId => {
            if (!visited.has(neighborId)) {
                this.dfsMarkComponent(neighborId, edges, visited);
            }
        });
    }

    /**
     * Update charts when data changes
     */
    updateCharts() {
        // Refresh all existing charts
        this.charts.forEach((chart, containerId) => {
            const container = document.getElementById(containerId);
            if (container) {
                // Recreate chart based on type
                switch (chart.type) {
                    case 'pie':
                        this.createNodeTypeChart(containerId);
                        break;
                    case 'bar':
                        this.createDegreeDistributionChart(containerId);
                        break;
                    case 'line':
                        this.createConnectivityChart(containerId);
                        break;
                }
            }
        });
    }

    /**
     * Destroy all charts
     */
    destroy() {
        this.charts.clear();
    }
}

// Create and export singleton charts instance
export const charts = new Charts();
