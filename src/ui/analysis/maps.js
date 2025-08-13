/**
 * Maps Analysis Module
 * Provides spatial visualizations and geographic analysis for graph data
 */
import { store } from '../../core/store.js';

export class Maps {
    constructor() {
        this.maps = new Map();
        this.defaultConfig = {
            width: 600,
            height: 400,
            center: [0, 0],
            zoom: 2
        };
    }

    /**
     * Create a network topology map
     */
    createTopologyMap(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes, edges } = store.getState();
        const config = { ...this.defaultConfig, ...options };
        
        // Create a simplified network topology visualization
        const map = this.createNetworkTopology(container, nodes, edges, config);
        this.maps.set(containerId, map);
        
        return map;
    }

    /**
     * Create geographic distribution map (if nodes have location data)
     */
    createGeographicMap(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes } = store.getState();
        const config = { ...this.defaultConfig, ...options };
        
        // Filter nodes that have geographic coordinates
        const geoNodes = nodes.filter(node => 
            node.properties && 
            (node.properties.lat || node.properties.latitude) && 
            (node.properties.lng || node.properties.longitude)
        );
        
        if (geoNodes.length === 0) {
            container.innerHTML = '<p>No geographic data available for visualization.</p>';
            return null;
        }
        
        const map = this.createGeoVisualization(container, geoNodes, config);
        this.maps.set(containerId, map);
        
        return map;
    }

    /**
     * Create hierarchical tree map
     */
    createTreeMap(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes, edges } = store.getState();
        const config = { ...this.defaultConfig, ...options };
        
        // Build hierarchy from graph data
        const hierarchy = this.buildHierarchy(nodes, edges);
        const map = this.createTreeVisualization(container, hierarchy, config);
        
        this.maps.set(containerId, map);
        return map;
    }

    /**
     * Create heat map based on node properties
     */
    createHeatMap(containerId, propertyName, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        const { nodes } = store.getState();
        const config = { ...this.defaultConfig, ...options };
        
        // Extract property values for heat mapping
        const values = nodes
            .filter(node => node.properties && node.properties[propertyName] !== undefined)
            .map(node => ({
                id: node.id,
                label: node.label,
                value: node.properties[propertyName],
                x: node.position?.x || Math.random() * config.width,
                y: node.position?.y || Math.random() * config.height
            }));
        
        if (values.length === 0) {
            container.innerHTML = `<p>No data available for property "${propertyName}".</p>`;
            return null;
        }
        
        const map = this.createHeatVisualization(container, values, config, propertyName);
        this.maps.set(containerId, map);
        
        return map;
    }

    /**
     * Create network topology visualization
     */
    createNetworkTopology(container, nodes, edges, config) {
        container.innerHTML = '';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.setAttribute('viewBox', `0 0 ${config.width} ${config.height}`);
        svg.style.border = '1px solid #ddd';
        svg.style.backgroundColor = '#f8f9fa';
        
        // Create title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', config.width / 2);
        title.setAttribute('y', 25);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '16');
        title.setAttribute('font-weight', 'bold');
        title.textContent = 'Network Topology Map';
        svg.appendChild(title);
        
        // Simple grid-based layout for topology
        const gridSize = Math.ceil(Math.sqrt(nodes.length));
        const cellWidth = (config.width - 60) / gridSize;
        const cellHeight = (config.height - 80) / gridSize;
        
        // Position nodes in grid
        const nodePositions = new Map();
        nodes.forEach((node, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            const x = 30 + col * cellWidth + cellWidth / 2;
            const y = 50 + row * cellHeight + cellHeight / 2;
            nodePositions.set(node.id, { x, y });
        });
        
        // Draw edges
        edges.forEach(edge => {
            const sourcePos = nodePositions.get(edge.source);
            const targetPos = nodePositions.get(edge.target);
            
            if (sourcePos && targetPos) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sourcePos.x);
                line.setAttribute('y1', sourcePos.y);
                line.setAttribute('x2', targetPos.x);
                line.setAttribute('y2', targetPos.y);
                line.setAttribute('stroke', '#6c757d');
                line.setAttribute('stroke-width', '1');
                line.setAttribute('opacity', '0.6');
                svg.appendChild(line);
            }
        });
        
        // Draw nodes
        nodes.forEach(node => {
            const pos = nodePositions.get(node.id);
            if (!pos) return;
            
            // Node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', '8');
            circle.setAttribute('fill', this.getNodeColor(node.type));
            circle.setAttribute('stroke', '#2c3e50');
            circle.setAttribute('stroke-width', '1');
            svg.appendChild(circle);
            
            // Node label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y + 20);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#2c3e50');
            text.textContent = node.label.length > 10 ? 
                node.label.substring(0, 8) + '...' : node.label;
            svg.appendChild(text);
        });
        
        container.appendChild(svg);
        
        return { type: 'topology', element: svg, data: { nodes, edges } };
    }

    /**
     * Create geographic visualization
     */
    createGeoVisualization(container, geoNodes, config) {
        container.innerHTML = '';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.setAttribute('viewBox', `0 0 ${config.width} ${config.height}`);
        svg.style.border = '1px solid #ddd';
        svg.style.backgroundColor = '#e3f2fd';
        
        // Create title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', config.width / 2);
        title.setAttribute('y', 25);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '16');
        title.setAttribute('font-weight', 'bold');
        title.textContent = 'Geographic Distribution';
        svg.appendChild(title);
        
        // Simple coordinate transformation (would need proper projection in real app)
        const lats = geoNodes.map(n => n.properties.lat || n.properties.latitude);
        const lngs = geoNodes.map(n => n.properties.lng || n.properties.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        const scaleX = (config.width - 60) / (maxLng - minLng || 1);
        const scaleY = (config.height - 80) / (maxLat - minLat || 1);
        
        // Draw nodes on map
        geoNodes.forEach(node => {
            const lat = node.properties.lat || node.properties.latitude;
            const lng = node.properties.lng || node.properties.longitude;
            
            const x = 30 + (lng - minLng) * scaleX;
            const y = config.height - 30 - (lat - minLat) * scaleY;
            
            // Node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '6');
            circle.setAttribute('fill', this.getNodeColor(node.type));
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('opacity', '0.8');
            svg.appendChild(circle);
            
            // Tooltip on hover
            circle.addEventListener('mouseover', (e) => {
                this.showTooltip(e, node, `${node.label}<br/>Lat: ${lat}, Lng: ${lng}`);
            });
            circle.addEventListener('mouseout', () => {
                this.hideTooltip();
            });
        });
        
        container.appendChild(svg);
        
        return { type: 'geographic', element: svg, data: geoNodes };
    }

    /**
     * Create tree visualization
     */
    createTreeVisualization(container, hierarchy, config) {
        container.innerHTML = '';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.setAttribute('viewBox', `0 0 ${config.width} ${config.height}`);
        svg.style.border = '1px solid #ddd';
        
        // Create title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', config.width / 2);
        title.setAttribute('y', 25);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '16');
        title.setAttribute('font-weight', 'bold');
        title.textContent = 'Hierarchical Tree Map';
        svg.appendChild(title);
        
        // Draw tree structure
        this.drawTreeNode(svg, hierarchy, config.width / 2, 50, config.width / 4, 0);
        
        container.appendChild(svg);
        
        return { type: 'tree', element: svg, data: hierarchy };
    }

    /**
     * Create heat visualization
     */
    createHeatVisualization(container, values, config, propertyName) {
        container.innerHTML = '';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.setAttribute('viewBox', `0 0 ${config.width} ${config.height}`);
        svg.style.border = '1px solid #ddd';
        
        // Create title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', config.width / 2);
        title.setAttribute('y', 25);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '16');
        title.setAttribute('font-weight', 'bold');
        title.textContent = `Heat Map: ${propertyName}`;
        svg.appendChild(title);
        
        // Calculate value range for color scaling
        const minValue = Math.min(...values.map(v => v.value));
        const maxValue = Math.max(...values.map(v => v.value));
        const valueRange = maxValue - minValue || 1;
        
        // Draw heat points
        values.forEach(point => {
            const intensity = (point.value - minValue) / valueRange;
            const color = this.getHeatColor(intensity);
            
            // Create gradient circle for heat effect
            const defs = svg.querySelector('defs') || svg.appendChild(
                document.createElementNS('http://www.w3.org/2000/svg', 'defs')
            );
            
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            const gradientId = `heat-${point.id}`;
            gradient.setAttribute('id', gradientId);
            
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', color);
            stop1.setAttribute('stop-opacity', '0.8');
            
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', color);
            stop2.setAttribute('stop-opacity', '0.1');
            
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            defs.appendChild(gradient);
            
            // Heat circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', 20 + intensity * 20);
            circle.setAttribute('fill', `url(#${gradientId})`);
            svg.appendChild(circle);
            
            // Value label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', point.x);
            text.setAttribute('y', point.y + 4);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#2c3e50');
            text.textContent = point.value;
            svg.appendChild(text);
        });
        
        // Add legend
        this.addHeatLegend(svg, config, minValue, maxValue);
        
        container.appendChild(svg);
        
        return { type: 'heat', element: svg, data: values };
    }

    /**
     * Helper methods
     */
    buildHierarchy(nodes, edges) {
        // Simple hierarchy building - find root nodes and build tree
        const hasIncoming = new Set();
        edges.forEach(edge => hasIncoming.add(edge.target));
        
        const roots = nodes.filter(node => !hasIncoming.has(node.id));
        
        const buildChildren = (nodeId) => {
            const children = edges
                .filter(edge => edge.source === nodeId)
                .map(edge => {
                    const childNode = nodes.find(n => n.id === edge.target);
                    return {
                        ...childNode,
                        children: buildChildren(edge.target)
                    };
                });
            return children;
        };
        
        return {
            id: 'root',
            label: 'Network',
            children: roots.map(root => ({
                ...root,
                children: buildChildren(root.id)
            }))
        };
    }
    
    drawTreeNode(svg, node, x, y, spread, depth) {
        if (depth > 3) return; // Limit depth
        
        // Draw node
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', this.getNodeColor(node.type));
        circle.setAttribute('stroke', '#2c3e50');
        circle.setAttribute('stroke-width', '1');
        svg.appendChild(circle);
        
        // Draw label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y - 15);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10');
        text.textContent = node.label;
        svg.appendChild(text);
        
        // Draw children
        if (node.children && node.children.length > 0) {
            const childY = y + 60;
            const childSpread = spread / 2;
            const startX = x - (node.children.length - 1) * childSpread / 2;
            
            node.children.forEach((child, index) => {
                const childX = startX + index * childSpread;
                
                // Draw connection line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x);
                line.setAttribute('y1', y + 8);
                line.setAttribute('x2', childX);
                line.setAttribute('y2', childY - 8);
                line.setAttribute('stroke', '#6c757d');
                line.setAttribute('stroke-width', '1');
                svg.appendChild(line);
                
                // Recursively draw child
                this.drawTreeNode(svg, child, childX, childY, childSpread, depth + 1);
            });
        }
    }
    
    getNodeColor(type) {
        const colors = {
            'hardware': '#e74c3c',
            'concept': '#3498db',
            'protocol': '#2ecc71',
            'process': '#f39c12',
            'default': '#95a5a6'
        };
        return colors[type] || colors.default;
    }
    
    getHeatColor(intensity) {
        // Simple color interpolation from blue (cold) to red (hot)
        const blue = [0, 100, 255];
        const red = [255, 0, 0];
        
        const r = Math.round(blue[0] + (red[0] - blue[0]) * intensity);
        const g = Math.round(blue[1] + (red[1] - blue[1]) * intensity);
        const b = Math.round(blue[2] + (red[2] - blue[2]) * intensity);
        
        return `rgb(${r},${g},${b})`;
    }
    
    addHeatLegend(svg, config, minValue, maxValue) {
        const legendX = config.width - 80;
        const legendY = 50;
        const legendHeight = 100;
        
        // Create gradient for legend
        const defs = svg.querySelector('defs') || svg.appendChild(
            document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        );
        
        const legendGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        legendGradient.setAttribute('id', 'legend-gradient');
        legendGradient.setAttribute('x1', '0%');
        legendGradient.setAttribute('y1', '0%');
        legendGradient.setAttribute('x2', '0%');
        legendGradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', this.getHeatColor(1));
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', this.getHeatColor(0));
        
        legendGradient.appendChild(stop1);
        legendGradient.appendChild(stop2);
        defs.appendChild(legendGradient);
        
        // Legend rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', legendX);
        rect.setAttribute('y', legendY);
        rect.setAttribute('width', '20');
        rect.setAttribute('height', legendHeight);
        rect.setAttribute('fill', 'url(#legend-gradient)');
        rect.setAttribute('stroke', '#2c3e50');
        svg.appendChild(rect);
        
        // Legend labels
        const maxLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        maxLabel.setAttribute('x', legendX + 25);
        maxLabel.setAttribute('y', legendY + 5);
        maxLabel.setAttribute('font-size', '10');
        maxLabel.textContent = maxValue.toFixed(1);
        svg.appendChild(maxLabel);
        
        const minLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        minLabel.setAttribute('x', legendX + 25);
        minLabel.setAttribute('y', legendY + legendHeight);
        minLabel.setAttribute('font-size', '10');
        minLabel.textContent = minValue.toFixed(1);
        svg.appendChild(minLabel);
    }
    
    showTooltip(event, node, content) {
        const tooltip = document.createElement('div');
        tooltip.id = 'map-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
        `;
        tooltip.innerHTML = content;
        
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        
        document.body.appendChild(tooltip);
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    /**
     * Update maps when data changes
     */
    updateMaps() {
        this.maps.forEach((map, containerId) => {
            const container = document.getElementById(containerId);
            if (container) {
                switch (map.type) {
                    case 'topology':
                        this.createTopologyMap(containerId);
                        break;
                    case 'geographic':
                        this.createGeographicMap(containerId);
                        break;
                    case 'tree':
                        this.createTreeMap(containerId);
                        break;
                    case 'heat':
                        // Would need to store the property name used
                        break;
                }
            }
        });
    }
    
    /**
     * Destroy all maps
     */
    destroy() {
        this.maps.clear();
    }
}
