/**
 * @jest-environment jsdom
 */

import { Filter, QuickFilters } from '../../src/utils/filter.js';
import { store } from '../../src/core/store.js';

// Mock store
jest.mock('../../src/core/store.js', () => ({
  store: {
    getState: jest.fn(),
    setState: jest.fn(),
    subscribe: jest.fn()
  }
}));

describe('Filter', () => {
  let filter;
  const mockNodes = [
    { id: 1, label: 'NAS Device', type: 'hardware', properties: { brand: 'Synology', connections: 3 } },
    { id: 2, label: 'RAID Config', type: 'concept', properties: { level: 'RAID1', drives: 2 } },
    { id: 3, label: 'Network Storage', type: 'concept', properties: { protocol: 'SMB', size: 100 } },
    { id: 4, label: 'Backup Process', type: 'process', properties: { frequency: 'daily', retention: 30 } },
    { id: 5, label: 'Security Layer', type: 'security', properties: { encryption: 'AES256', strength: 5 } }
  ];

  const mockEdges = [
    { id: 'e1', source: 1, target: 2, label: 'implements', type: 'uses', properties: { weight: 0.8 } },
    { id: 'e2', source: 1, target: 3, label: 'provides', type: 'enables', properties: { weight: 0.9 } },
    { id: 'e3', source: 2, target: 3, label: 'manages', type: 'controls', properties: { weight: 0.7 } },
    { id: 'e4', source: 4, target: 5, label: 'includes', type: 'contains', properties: { weight: 0.6 } },
    { id: 'e5', source: 3, target: 5, label: 'secures', type: 'protects', properties: { weight: 0.85 } }
  ];

  beforeEach(() => {
    filter = new Filter();
    store.getState.mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges
    });
  });

  afterEach(() => {
    filter.clearAllFilters();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(filter.activeFilters).toBeInstanceOf(Map);
      expect(filter.filterHistory).toEqual([]);
      expect(filter.maxHistorySize).toBe(20);
    });
  });

  describe('applyFilters', () => {
    test('should return original data when no filters specified', () => {
      const result = filter.applyFilters({});
      
      expect(result.nodes).toHaveLength(mockNodes.length);
      expect(result.edges).toHaveLength(mockEdges.length);
    });

    test('should filter nodes by type', () => {
      const result = filter.applyFilters({
        nodes: { type: 'hardware' }
      });
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('hardware');
    });

    test('should filter edges by type', () => {
      const result = filter.applyFilters({
        edges: { type: 'uses' }
      });
      
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].type).toBe('uses');
    });

    test('should cascade edge filtering by default', () => {
      const result = filter.applyFilters({
        nodes: { type: 'hardware' } // Only hardware nodes (id: 1)
      });
      
      // Edges should only include those connected to remaining nodes
      expect(result.edges.length).toBeLessThan(mockEdges.length);
      expect(result.edges.every(edge => 
        result.nodes.some(node => node.id === edge.source) &&
        result.nodes.some(node => node.id === edge.target)
      )).toBe(true);
    });

    test('should not cascade edge filtering when disabled', () => {
      const result = filter.applyFilters({
        nodes: { type: 'hardware' },
        cascadeEdges: false
      });
      
      expect(result.edges).toHaveLength(mockEdges.length);
    });
  });

  describe('Node Filtering', () => {
    describe('filterByType', () => {
      test('should filter by single type', () => {
        const result = filter.filterByType('hardware', 'hardware');
        expect(result).toBe(true);
        
        const result2 = filter.filterByType('concept', 'hardware');
        expect(result2).toBe(false);
      });

      test('should filter by array of types', () => {
        const result = filter.filterByType('hardware', ['hardware', 'concept']);
        expect(result).toBe(true);
        
        const result2 = filter.filterByType('process', ['hardware', 'concept']);
        expect(result2).toBe(false);
      });

      test('should filter with operator', () => {
        const result = filter.filterByType('hardware', { operator: 'eq', value: 'hardware' });
        expect(result).toBe(true);
        
        const result2 = filter.filterByType('hardware', { operator: 'ne', value: 'concept' });
        expect(result2).toBe(true);
      });
    });

    describe('filterByText', () => {
      test('should filter by substring match', () => {
        expect(filter.filterByText('NAS Device', 'nas')).toBe(true);
        expect(filter.filterByText('NAS Device', 'device')).toBe(true);
        expect(filter.filterByText('NAS Device', 'storage')).toBe(false);
      });

      test('should respect case sensitivity', () => {
        expect(filter.filterByText('NAS Device', { value: 'NAS', caseSensitive: true })).toBe(true);
        expect(filter.filterByText('NAS Device', { value: 'nas', caseSensitive: true })).toBe(false);
        expect(filter.filterByText('NAS Device', { value: 'nas', caseSensitive: false })).toBe(true);
      });

      test('should support different operators', () => {
        expect(filter.filterByText('NAS Device', { value: 'NAS Device', operator: 'equals' })).toBe(true);
        expect(filter.filterByText('NAS Device', { value: 'NAS', operator: 'startsWith' })).toBe(true);
        expect(filter.filterByText('NAS Device', { value: 'Device', operator: 'endsWith' })).toBe(true);
        expect(filter.filterByText('NAS Device', { value: 'NAS.*Device', operator: 'regex' })).toBe(true);
      });
    });

    describe('filterById', () => {
      test('should filter by single ID', () => {
        expect(filter.filterById(1, 1)).toBe(true);
        expect(filter.filterById(1, 2)).toBe(false);
      });

      test('should filter by array of IDs', () => {
        expect(filter.filterById(1, [1, 2, 3])).toBe(true);
        expect(filter.filterById(4, [1, 2, 3])).toBe(false);
      });

      test('should filter with operator', () => {
        expect(filter.filterById(5, { operator: 'gt', value: 3 })).toBe(true);
        expect(filter.filterById(2, { operator: 'lt', value: 5 })).toBe(true);
      });
    });

    describe('filterByProperties', () => {
      test('should filter by property value', () => {
        const properties = { brand: 'Synology' };
        expect(filter.filterByProperties(properties, { brand: 'Synology' })).toBe(true);
        expect(filter.filterByProperties(properties, { brand: 'QNAP' })).toBe(false);
      });

      test('should filter by property with operator', () => {
        const properties = { connections: 3 };
        expect(filter.filterByProperties(properties, { 
          connections: { operator: 'gte', value: 2 } 
        })).toBe(true);
        expect(filter.filterByProperties(properties, { 
          connections: { operator: 'gt', value: 5 } 
        })).toBe(false);
      });

      test('should handle missing properties', () => {
        const properties = { brand: 'Synology' };
        expect(filter.filterByProperties(properties, { model: 'DS920+' })).toBe(false);
      });
    });

    describe('filterByConnectionCount', () => {
      test('should filter by exact connection count', () => {
        // Node 1 has 2 connections (e1, e2)
        expect(filter.filterByConnectionCount(1, 2)).toBe(true);
        expect(filter.filterByConnectionCount(1, 3)).toBe(false);
      });

      test('should filter by connection count with operator', () => {
        expect(filter.filterByConnectionCount(1, { operator: 'gte', value: 1 })).toBe(true);
        expect(filter.filterByConnectionCount(1, { operator: 'lte', value: 5 })).toBe(true);
        expect(filter.filterByConnectionCount(1, { operator: 'gt', value: 5 })).toBe(false);
      });
    });

    describe('filterByDegree', () => {
      test('should filter by total degree', () => {
        // Node 3 has in-degree 2 (e2, e3) and out-degree 1 (e5) = total 3
        const result = filter.filterByDegree(3, { type: 'total', operator: 'eq', value: 3 });
        expect(result).toBe(true);
      });

      test('should filter by in-degree', () => {
        const result = filter.filterByDegree(3, { type: 'in', operator: 'eq', value: 2 });
        expect(result).toBe(true);
      });

      test('should filter by out-degree', () => {
        const result = filter.filterByDegree(3, { type: 'out', operator: 'eq', value: 1 });
        expect(result).toBe(true);
      });
    });
  });

  describe('Operator Applications', () => {
    test('should apply equality operators', () => {
      expect(filter.applyOperator(5, 5, 'eq')).toBe(true);
      expect(filter.applyOperator(5, 3, 'eq')).toBe(false);
      expect(filter.applyOperator(5, 3, 'ne')).toBe(true);
    });

    test('should apply comparison operators', () => {
      expect(filter.applyOperator(5, 3, 'gt')).toBe(true);
      expect(filter.applyOperator(5, 3, 'gte')).toBe(true);
      expect(filter.applyOperator(3, 5, 'lt')).toBe(true);
      expect(filter.applyOperator(3, 5, 'lte')).toBe(true);
    });

    test('should apply array operators', () => {
      expect(filter.applyOperator(3, [1, 2, 3, 4], 'in')).toBe(true);
      expect(filter.applyOperator(5, [1, 2, 3, 4], 'in')).toBe(false);
      expect(filter.applyOperator(5, [1, 2, 3, 4], 'nin')).toBe(true);
    });

    test('should apply between operator', () => {
      expect(filter.applyOperator(5, [1, 10], 'between')).toBe(true);
      expect(filter.applyOperator(15, [1, 10], 'between')).toBe(false);
    });

    test('should apply text operators', () => {
      expect(filter.applyOperator('Hello World', 'world', 'contains')).toBe(true);
      expect(filter.applyOperator('Hello World', 'hello', 'startsWith')).toBe(true);
      expect(filter.applyOperator('Hello World', 'world', 'endsWith')).toBe(true);
      expect(filter.applyOperator('Test123', '\\d+', 'regex')).toBe(true);
    });
  });

  describe('Filter Sets Management', () => {
    test('should create named filter set', () => {
      const config = { nodes: { type: 'hardware' } };
      const result = filter.createFilterSet('hardwareOnly', config);
      
      expect(filter.activeFilters.has('hardwareOnly')).toBe(true);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('hardware');
    });

    test('should update existing filter set', () => {
      filter.createFilterSet('test', { nodes: { type: 'hardware' } });
      
      const newConfig = { nodes: { type: 'concept' } };
      const result = filter.updateFilterSet('test', newConfig);
      
      expect(result.nodes.every(n => n.type === 'concept')).toBe(true);
    });

    test('should throw error when updating non-existent filter set', () => {
      expect(() => filter.updateFilterSet('nonexistent', {})).toThrow("Filter set 'nonexistent' not found");
    });

    test('should remove filter set', () => {
      filter.createFilterSet('test', { nodes: { type: 'hardware' } });
      expect(filter.activeFilters.has('test')).toBe(true);
      
      filter.removeFilterSet('test');
      expect(filter.activeFilters.has('test')).toBe(false);
    });

    test('should toggle filter set active state', () => {
      filter.createFilterSet('test', { nodes: { type: 'hardware' } });
      
      // Deactivate
      filter.toggleFilterSet('test', false);
      const filterSet = filter.activeFilters.get('test');
      expect(filterSet.active).toBe(false);
      
      // Activate
      filter.toggleFilterSet('test', true);
      const filterSet2 = filter.activeFilters.get('test');
      expect(filterSet2.active).toBe(true);
    });

    test('should apply all active filter sets', () => {
      filter.createFilterSet('hardware', { nodes: { type: 'hardware' } });
      filter.createFilterSet('concept', { nodes: { type: 'concept' } });
      
      // Deactivate one filter
      filter.toggleFilterSet('concept', false);
      
      const result = filter.applyAllActiveFilters();
      expect(result.nodes.every(n => n.type === 'hardware')).toBe(true);
    });
  });

  describe('Common Filter Creation', () => {
    test('should create node type filter', () => {
      const result = filter.createNodeTypeFilter(['hardware', 'concept']);
      
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.every(n => ['hardware', 'concept'].includes(n.type))).toBe(true);
    });

    test('should create connection filter', () => {
      const result = filter.createConnectionFilter(2);
      
      expect(result.nodes.every(node => {
        const connectionCount = mockEdges.filter(edge => 
          edge.source === node.id || edge.target === node.id
        ).length;
        return connectionCount >= 2;
      })).toBe(true);
    });

    test('should create connection filter with range', () => {
      const result = filter.createConnectionFilter(1, 2);
      
      expect(result.nodes.every(node => {
        const connectionCount = mockEdges.filter(edge => 
          edge.source === node.id || edge.target === node.id
        ).length;
        return connectionCount >= 1 && connectionCount <= 2;
      })).toBe(true);
    });

    test('should create property filter', () => {
      const result = filter.createPropertyFilter('brand', 'Synology', 'eq');
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].properties.brand).toBe('Synology');
    });

    test('should create text filter', () => {
      const result = filter.createTextFilter('Device', 'label');
      
      expect(result.nodes.every(n => n.label.includes('Device'))).toBe(true);
    });
  });

  describe('Filter Import/Export', () => {
    test('should export filters to JSON', () => {
      filter.createFilterSet('test1', { nodes: { type: 'hardware' } });
      filter.createFilterSet('test2', { nodes: { type: 'concept' } });
      
      const exported = filter.exportFilters();
      const parsed = JSON.parse(exported);
      
      expect(parsed.test1).toBeDefined();
      expect(parsed.test2).toBeDefined();
      expect(parsed.test1.config.nodes.type).toBe('hardware');
    });

    test('should import filters from JSON', () => {
      const filtersJson = JSON.stringify({
        imported1: {
          config: { nodes: { type: 'hardware' } },
          active: true,
          created: '2023-01-01'
        }
      });
      
      const result = filter.importFilters(filtersJson);
      
      expect(filter.activeFilters.has('imported1')).toBe(true);
      expect(result.nodes).toHaveLength(1);
    });

    test('should throw error for invalid JSON', () => {
      expect(() => filter.importFilters('invalid json')).toThrow('Invalid filter configuration JSON');
    });
  });

  describe('Filter Statistics', () => {
    test('should provide filter statistics', () => {
      filter.createFilterSet('hardware', { nodes: { type: 'hardware' } });
      
      const stats = filter.getFilterStats();
      
      expect(stats.original.nodes).toBe(mockNodes.length);
      expect(stats.original.edges).toBe(mockEdges.length);
      expect(stats.filtered.nodes).toBe(1);
      expect(stats.reduction.nodes).toBe(mockNodes.length - 1);
      expect(stats.activeFilters).toBe(1);
      expect(parseFloat(stats.reduction.nodesPercent)).toBeGreaterThan(0);
    });
  });

  describe('Filter History', () => {
    test('should maintain filter history', () => {
      filter.createFilterSet('test1', { nodes: { type: 'hardware' } });
      filter.updateFilterSet('test1', { nodes: { type: 'concept' } });
      filter.removeFilterSet('test1');
      
      const history = filter.getFilterHistory();
      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('remove');
      expect(history[1].action).toBe('update');
      expect(history[2].action).toBe('create');
    });

    test('should limit history size', () => {
      const originalMaxSize = filter.maxHistorySize;
      filter.maxHistorySize = 3;
      
      for (let i = 0; i < 5; i++) {
        filter.createFilterSet(`test${i}`, { nodes: { type: 'hardware' } });
      }
      
      const history = filter.getFilterHistory();
      expect(history.length).toBe(3);
      
      filter.maxHistorySize = originalMaxSize;
    });

    test('should clear filter history', () => {
      filter.createFilterSet('test', { nodes: { type: 'hardware' } });
      filter.clearFilterHistory();
      
      const history = filter.getFilterHistory();
      expect(history).toEqual([]);
    });
  });

  describe('Custom Filter Functions', () => {
    test('should apply custom filter function', () => {
      const customFilter = (node) => node.id % 2 === 0; // Even IDs only
      
      const result = filter.applyFilters({
        nodes: { custom: customFilter }
      });
      
      expect(result.nodes.every(n => n.id % 2 === 0)).toBe(true);
    });

    test('should handle invalid custom filter function', () => {
      const result = filter.filterByCustomFunction({ id: 1 }, 'not a function');
      expect(result).toBe(true);
    });
  });

  describe('Edge Filtering', () => {
    test('should filter edges by source', () => {
      const result = filter.applyFilters({
        edges: { source: 1 }
      });
      
      expect(result.edges.every(e => e.source === 1)).toBe(true);
    });

    test('should filter edges by target', () => {
      const result = filter.applyFilters({
        edges: { target: 3 }
      });
      
      expect(result.edges.every(e => e.target === 3)).toBe(true);
    });

    test('should filter edges by properties', () => {
      const result = filter.applyFilters({
        edges: { 
          properties: { 
            weight: { operator: 'gte', value: 0.8 } 
          } 
        }
      });
      
      expect(result.edges.every(e => e.properties.weight >= 0.8)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle nodes without properties', () => {
      const nodeWithoutProps = { id: 99, label: 'Simple', type: 'basic' };
      expect(filter.filterByProperties({}, { test: 'value' })).toBe(false);
      expect(filter.nodeMatchesCriteria(nodeWithoutProps, { properties: {} })).toBe(true);
    });

    test('should handle invalid filter configurations', () => {
      expect(() => filter.applyFilters({ nodes: null })).not.toThrow();
      expect(() => filter.applyFilters({ edges: null })).not.toThrow();
    });
  });

  describe('Get Active Filters', () => {
    test('should return only active filters', () => {
      filter.createFilterSet('active1', { nodes: { type: 'hardware' } });
      filter.createFilterSet('active2', { nodes: { type: 'concept' } });
      filter.createFilterSet('inactive', { nodes: { type: 'process' } });
      
      filter.toggleFilterSet('inactive', false);
      
      const activeFilters = filter.getActiveFilters();
      expect(Object.keys(activeFilters)).toHaveLength(2);
      expect(activeFilters.active1).toBeDefined();
      expect(activeFilters.active2).toBeDefined();
      expect(activeFilters.inactive).toBeUndefined();
    });

    test('should return all filters including inactive', () => {
      filter.createFilterSet('active', { nodes: { type: 'hardware' } });
      filter.createFilterSet('inactive', { nodes: { type: 'concept' } });
      filter.toggleFilterSet('inactive', false);
      
      const allFilters = filter.getAllFilters();
      expect(Object.keys(allFilters)).toHaveLength(2);
      expect(allFilters.active).toBeDefined();
      expect(allFilters.inactive).toBeDefined();
    });
  });
});

describe('QuickFilters', () => {
  test('should create node type filter', () => {
    const filter = QuickFilters.byNodeType('hardware');
    expect(filter.nodes.type).toBe('hardware');
    
    const multiFilter = QuickFilters.byNodeType(['hardware', 'concept']);
    expect(multiFilter.nodes.type).toEqual(['hardware', 'concept']);
  });

  test('should create high connectivity filter', () => {
    const filter = QuickFilters.byHighConnectivity(5);
    expect(filter.nodes.connections.operator).toBe('gte');
    expect(filter.nodes.connections.value).toBe(5);
  });

  test('should create label filter', () => {
    const filter = QuickFilters.byLabel('test');
    expect(filter.nodes.label.value).toBe('test');
    expect(filter.nodes.label.operator).toBe('contains');
  });

  test('should create property filter', () => {
    const filter = QuickFilters.byProperty('brand', 'Synology', 'eq');
    expect(filter.nodes.properties.brand.operator).toBe('eq');
    expect(filter.nodes.properties.brand.value).toBe('Synology');
  });

  test('should create leaf nodes filter', () => {
    const filter = QuickFilters.leafNodes();
    expect(filter.nodes.connections.operator).toBe('lte');
    expect(filter.nodes.connections.value).toBe(1);
  });

  test('should create hub nodes filter', () => {
    const filter = QuickFilters.hubNodes(10);
    expect(filter.nodes.connections.operator).toBe('gte');
    expect(filter.nodes.connections.value).toBe(10);
  });
});
