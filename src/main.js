/**
 * NAS Knowledge Graph Demo
 * Main application logic
 */

class KnowledgeGraph {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;

        this.init();
    }

    init() {
        this.loadSampleData();
        this.setupEventListeners();
        this.render();
    }

    loadSampleData() {
        // Sample NAS-related knowledge nodes
        this.nodes = [
            { id: 1, label: 'NAS Device', type: 'hardware', x: 200, y: 150 },
            {
                id: 2,
                label: 'RAID Configuration',
                type: 'concept',
                x: 400,
                y: 100,
            },
            {
                id: 3,
                label: 'Network Protocol',
                type: 'protocol',
                x: 300,
                y: 250,
            },
            { id: 4, label: 'Storage Pool', type: 'concept', x: 500, y: 200 },
            {
                id: 5,
                label: 'Backup Strategy',
                type: 'process',
                x: 150,
                y: 300,
            },
        ];

        this.edges = [
            { from: 1, to: 2, label: 'uses' },
            { from: 1, to: 3, label: 'communicates via' },
            { from: 2, to: 4, label: 'creates' },
            { from: 1, to: 5, label: 'implements' },
        ];
    }

    setupEventListeners() {
        // Control buttons
        document
            .getElementById('reset-view')
            .addEventListener('click', () => this.resetView());
        document
            .getElementById('expand-all')
            .addEventListener('click', () => this.expandAll());
        document
            .getElementById('collapse-all')
            .addEventListener('click', () => this.collapseAll());

        // Node selection
        this.container.addEventListener('click', e => {
            if (e.target.classList.contains('node')) {
                const nodeId = parseInt(e.target.dataset.nodeId);
                this.selectNode(nodeId);
            }
        });
    }

    render() {
        this.container.innerHTML = '';

        // Create SVG container
        const svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        );
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 800 600');

        // Render edges
        this.edges.forEach(edge => {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);

            const line = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'line'
            );
            line.setAttribute('x1', fromNode.x);
            line.setAttribute('y1', fromNode.y);
            line.setAttribute('x2', toNode.x);
            line.setAttribute('y2', toNode.y);
            line.setAttribute('stroke', '#bdc3c7');
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);

            // Edge label
            const text = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'text'
            );
            text.setAttribute('x', (fromNode.x + toNode.x) / 2);
            text.setAttribute('y', (fromNode.y + toNode.y) / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#7f8c8d');
            text.setAttribute('font-size', '12');
            text.textContent = edge.label;
            svg.appendChild(text);
        });

        // Render nodes
        this.nodes.forEach(node => {
            const g = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'g'
            );

            const circle = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'circle'
            );
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', '30');
            circle.setAttribute('fill', this.getNodeColor(node.type));
            circle.setAttribute('stroke', '#2c3e50');
            circle.setAttribute('stroke-width', '2');
            circle.classList.add('node');
            circle.dataset.nodeId = node.id;

            const text = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'text'
            );
            text.setAttribute('x', node.x);
            text.setAttribute('y', node.y - 40);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#2c3e50');
            text.setAttribute('font-size', '14');
            text.setAttribute('font-weight', 'bold');
            text.textContent = node.label;

            g.appendChild(circle);
            g.appendChild(text);
            svg.appendChild(g);
        });

        this.container.appendChild(svg);
    }

    getNodeColor(type) {
        const colors = {
            hardware: '#e74c3c',
            concept: '#3498db',
            protocol: '#2ecc71',
            process: '#f39c12',
        };
        return colors[type] || '#95a5a6';
    }

    selectNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            this.selectedNode = node;
            this.updateInfoPanel(node);
        }
    }

    updateInfoPanel(node) {
        const detailsDiv = document.getElementById('node-details');
        detailsDiv.innerHTML = `
            <h4>${node.label}</h4>
            <p><strong>Type:</strong> ${node.type}</p>
            <p><strong>ID:</strong> ${node.id}</p>
            <p><strong>Connections:</strong> ${this.getNodeConnections(node.id)}</p>
        `;
    }

    getNodeConnections(nodeId) {
        const connections = this.edges.filter(
            e => e.from === nodeId || e.to === nodeId
        );
        return connections.length;
    }

    resetView() {
        this.selectedNode = null;
        document.getElementById('node-details').innerHTML =
            'Select a node to view details';
        this.render();
    }

    expandAll() {
        // Placeholder for expand functionality
        // eslint-disable-next-line no-console
        console.log('Expanding all nodes...');
    }

    collapseAll() {
        // Placeholder for collapse functionality
        // eslint-disable-next-line no-console
        console.log('Collapsing all nodes...');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new KnowledgeGraph('graph-container');
    // eslint-disable-next-line no-console
    console.log('NAS Knowledge Graph Demo initialized');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KnowledgeGraph };
}
