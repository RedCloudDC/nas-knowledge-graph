/**
 * @jest-environment jsdom
 */

const { KnowledgeGraph } = require('./main.js');

describe('KnowledgeGraph', () => {
    let container;
    let graph;

    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <div id="test-container"></div>
            <div id="node-details"></div>
            <button id="reset-view"></button>
            <button id="expand-all"></button>
            <button id="collapse-all"></button>
        `;
        container = document.getElementById('test-container');
        graph = new KnowledgeGraph('test-container');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('should initialize with sample data', () => {
        expect(graph.nodes).toHaveLength(5);
        expect(graph.edges).toHaveLength(4);
        expect(graph.selectedNode).toBeNull();
    });

    test('should have required DOM elements', () => {
        expect(container).toBeTruthy();
        expect(document.getElementById('node-details')).toBeTruthy();
        expect(document.getElementById('reset-view')).toBeTruthy();
    });

    test('should return correct node color based on type', () => {
        expect(graph.getNodeColor('hardware')).toBe('#e74c3c');
        expect(graph.getNodeColor('concept')).toBe('#3498db');
        expect(graph.getNodeColor('protocol')).toBe('#2ecc71');
        expect(graph.getNodeColor('process')).toBe('#f39c12');
        expect(graph.getNodeColor('unknown')).toBe('#95a5a6');
    });

    test('should select node correctly', () => {
        const nodeId = 1;
        graph.selectNode(nodeId);

        expect(graph.selectedNode).toBeTruthy();
        expect(graph.selectedNode.id).toBe(nodeId);
    });

    test('should count node connections correctly', () => {
        const connections = graph.getNodeConnections(1);
        expect(connections).toBe(3); // Node 1 has 3 connections in sample data
    });

    test('should reset view correctly', () => {
        graph.selectNode(1);
        expect(graph.selectedNode).toBeTruthy();

        graph.resetView();
        expect(graph.selectedNode).toBeNull();
    });

    test('should render SVG container', () => {
        graph.render();
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        expect(svg.getAttribute('viewBox')).toBe('0 0 800 600');
    });

    test('should render nodes and edges', () => {
        graph.render();
        const circles = container.querySelectorAll('circle');
        const lines = container.querySelectorAll('line');

        expect(circles).toHaveLength(5); // 5 nodes
        expect(lines).toHaveLength(4); // 4 edges
    });
});
