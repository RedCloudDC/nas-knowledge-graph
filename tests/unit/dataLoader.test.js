/**
 * @jest-environment jsdom
 */

import { DataLoader } from '../../src/services/dataLoader.js';
import { store } from '../../src/core/store.js';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock store
jest.mock('../../src/core/store.js', () => ({
  store: {
    getState: jest.fn(),
    setState: jest.fn()
  }
}));

describe('DataLoader', () => {
  let dataLoader;

  beforeEach(() => {
    dataLoader = new DataLoader();
    fetch.mockClear();
    store.getState.mockClear();
    store.setState.mockClear();
    
    // Default store state
    store.getState.mockReturnValue({
      loading: { data: false },
      nodes: [],
      edges: []
    });
  });

  afterEach(() => {
    dataLoader.clearCache();
    dataLoader.abortAllLoading();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(dataLoader.cache).toBeInstanceOf(Map);
      expect(dataLoader.baseUrl).toBe('/data');
      expect(dataLoader.cacheHits).toBe(0);
      expect(dataLoader.cacheMisses).toBe(0);
    });
  });

  describe('loadFromUrl', () => {
    const mockData = { nodes: [{ id: 1, label: 'Test' }], edges: [] };
    
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
        headers: new Map()
      });
    });

    test('should load data successfully', async () => {
      const result = await dataLoader.loadFromUrl('/test.json');
      
      expect(fetch).toHaveBeenCalledWith('/test.json', expect.any(Object));
      expect(result.nodes).toEqual(mockData.nodes);
      expect(result.edges).toEqual(mockData.edges);
    });

    test('should cache results when useCache is true', async () => {
      await dataLoader.loadFromUrl('/test.json', { useCache: true });
      await dataLoader.loadFromUrl('/test.json', { useCache: true });
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(dataLoader.cacheHits).toBe(1);
      expect(dataLoader.cacheMisses).toBe(1);
    });

    test('should not cache results when useCache is false', async () => {
      await dataLoader.loadFromUrl('/test.json', { useCache: false });
      await dataLoader.loadFromUrl('/test.json', { useCache: false });
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(dataLoader.cacheHits).toBe(0);
      expect(dataLoader.cacheMisses).toBe(2);
    });

    test('should handle HTTP errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(dataLoader.loadFromUrl('/nonexistent.json')).rejects.toThrow('HTTP error! status: 404');
    });

    test('should apply transform function', async () => {
      const transform = jest.fn((data) => ({ ...data, transformed: true }));
      
      const result = await dataLoader.loadFromUrl('/test.json', { transform });
      
      expect(transform).toHaveBeenCalledWith(mockData);
      expect(result.transformed).toBe(true);
    });

    test('should handle abort signal', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetch.mockRejectedValue(abortError);

      await expect(dataLoader.loadFromUrl('/test.json')).rejects.toThrow('Loading cancelled by user');
    });

    test('should track performance stats', async () => {
      await dataLoader.loadFromUrl('/test.json');
      
      const stats = dataLoader.getPerformanceStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.loadTimes).toHaveProperty('/test.json');
    });
  });

  describe('validateDataStructure', () => {
    test('should validate correct data structure', () => {
      const data = {
        nodes: [{ id: 1, label: 'Node 1' }],
        edges: [{ source: 1, target: 2 }]
      };

      expect(() => dataLoader.validateDataStructure(data)).not.toThrow();
    });

    test('should throw error for invalid data', () => {
      expect(() => dataLoader.validateDataStructure(null)).toThrow('Data must be an object');
      expect(() => dataLoader.validateDataStructure({ nodes: 'invalid' })).toThrow('Nodes must be an array');
      expect(() => dataLoader.validateDataStructure({ nodes: [], edges: 'invalid' })).toThrow('Edges must be an array');
    });

    test('should validate nodes have required id', () => {
      const data = {
        nodes: [{ label: 'No ID' }],
        edges: []
      };

      expect(() => dataLoader.validateDataStructure(data)).toThrow('Each node must have an id');
    });

    test('should validate edges have source and target', () => {
      const data = {
        nodes: [{ id: 1 }],
        edges: [{ source: 1 }] // missing target
      };

      expect(() => dataLoader.validateDataStructure(data)).toThrow('Each edge must have source and target');
    });

    test('should validate edge references existing nodes', () => {
      const data = {
        nodes: [{ id: 1 }],
        edges: [{ source: 1, target: 999 }] // target doesn't exist
      };

      expect(() => dataLoader.validateDataStructure(data)).toThrow('Edge references non-existent node');
    });

    test('should add default properties to nodes and edges', () => {
      const data = {
        nodes: [{ id: 1 }],
        edges: [{ source: 1, target: 1 }]
      };

      const result = dataLoader.validateDataStructure(data);
      
      expect(result.nodes[0]).toHaveProperty('label', '1');
      expect(result.nodes[0]).toHaveProperty('type', 'default');
      expect(result.nodes[0]).toHaveProperty('properties', {});
      expect(result.nodes[0]).toHaveProperty('position');
      
      expect(result.edges[0]).toHaveProperty('id', '1-1');
      expect(result.edges[0]).toHaveProperty('label', '');
      expect(result.edges[0]).toHaveProperty('type', 'default');
      expect(result.edges[0]).toHaveProperty('properties', {});
    });
  });

  describe('loadSampleData', () => {
    test('should load and merge sample data', async () => {
      const sampleData = { nodes: [{ id: 1 }] };
      const relations = { edges: [{ source: 1, target: 1 }] };
      
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(sampleData),
          headers: new Map()
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(relations),
          headers: new Map()
        });

      const result = await dataLoader.loadSampleData();
      
      expect(result.nodes).toEqual([expect.objectContaining({ id: 1 })]);
      expect(result.edges).toEqual([expect.objectContaining({ source: 1, target: 1 })]);
    });

    test('should fallback to default data when files not available', async () => {
      fetch.mockRejectedValue(new Error('Not found'));

      const result = await dataLoader.loadSampleData();
      
      expect(result.nodes).toHaveLength(5);
      expect(result.edges).toHaveLength(4);
      expect(result.metadata.source).toBe('fallback');
    });
  });

  describe('loadFromFile', () => {
    test('should load data from file', async () => {
      const fileContent = JSON.stringify({ nodes: [{ id: 1 }], edges: [] });
      const mockFile = new Blob([fileContent], { type: 'application/json' });
      
      // Mock FileReader
      const mockReader = {
        onload: null,
        onerror: null,
        readAsText: jest.fn(function() {
          this.onload({ target: { result: fileContent } });
        })
      };
      
      global.FileReader = jest.fn(() => mockReader);

      const result = await dataLoader.loadFromFile(mockFile);
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe(1);
    });

    test('should reject invalid JSON files', async () => {
      const invalidContent = 'invalid json';
      const mockFile = new Blob([invalidContent], { type: 'application/json' });
      
      const mockReader = {
        onload: null,
        onerror: null,
        readAsText: jest.fn(function() {
          this.onload({ target: { result: invalidContent } });
        })
      };
      
      global.FileReader = jest.fn(() => mockReader);

      await expect(dataLoader.loadFromFile(mockFile)).rejects.toThrow('Invalid JSON file');
    });
  });

  describe('processCsvData', () => {
    test('should process CSV data with headers', () => {
      const csvData = 'id,label,type\n1,Node1,test\n2,Node2,test';
      
      const result = dataLoader.processCsvData(csvData, {
        nodeColumns: ['id', 'label', 'type'],
        hasHeaders: true
      });
      
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]).toMatchObject({ id: '1', label: 'Node1', type: 'test' });
    });

    test('should process CSV data without headers', () => {
      const csvData = '1,Node1,test\n2,Node2,test';
      
      const result = dataLoader.processCsvData(csvData, {
        nodeColumns: ['col_0', 'col_1', 'col_2'],
        hasHeaders: false
      });
      
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].id).toBe('1');
    });

    test('should create edges from CSV data', () => {
      const csvData = 'source,target,label\n1,2,connects\n2,3,links';
      
      const result = dataLoader.processCsvData(csvData, {
        edgeColumns: ['source', 'target', 'label'],
        hasHeaders: true
      });
      
      expect(result.edges).toHaveLength(2);
      expect(result.nodes).toHaveLength(3); // Auto-generated from edge endpoints
    });
  });

  describe('Performance and Cache Management', () => {
    test('should track cache statistics', async () => {
      const mockData = { nodes: [], edges: [] };
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
        headers: new Map()
      });

      // First call - cache miss
      await dataLoader.loadFromUrl('/test.json', { useCache: true });
      // Second call - cache hit
      await dataLoader.loadFromUrl('/test.json', { useCache: true });

      const stats = dataLoader.getPerformanceStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHitRate).toBe(50);
    });

    test('should clear cache properly', () => {
      dataLoader.cache.set('test', 'data');
      dataLoader.cacheHits = 5;
      dataLoader.cacheMisses = 3;
      
      dataLoader.clearCache();
      
      expect(dataLoader.cache.size).toBe(0);
      expect(dataLoader.cacheHits).toBe(0);
      expect(dataLoader.cacheMisses).toBe(0);
    });

    test('should preload data', async () => {
      const mockData = { nodes: [], edges: [] };
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
        headers: new Map()
      });

      const urls = ['/data1.json', '/data2.json'];
      const results = await dataLoader.preloadData(urls);
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe('Export functionality', () => {
    beforeEach(() => {
      store.getState.mockReturnValue({
        nodes: [{ id: 1, label: 'Node 1', type: 'test', properties: { prop: 'value' } }],
        edges: [{ source: 1, target: 1, label: 'self', type: 'loop', properties: {} }]
      });
    });

    test('should export data as JSON', () => {
      const result = dataLoader.exportData('json');
      const parsed = JSON.parse(result);
      
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.edges).toHaveLength(1);
    });

    test('should export data as CSV', () => {
      const result = dataLoader.exportData('csv');
      
      expect(result).toContain('NODES:');
      expect(result).toContain('EDGES:');
      expect(result).toContain('Node 1');
    });

    test('should export data as Cytoscape format', () => {
      const result = dataLoader.exportData('cytoscape');
      const parsed = JSON.parse(result);
      
      expect(parsed.elements).toBeDefined();
      expect(parsed.elements).toHaveLength(2); // 1 node + 1 edge
    });

    test('should throw error for unsupported format', () => {
      expect(() => dataLoader.exportData('unsupported')).toThrow('Unsupported export format');
    });
  });

  describe('Data processing in chunks', () => {
    test('should process large data in chunks without blocking', async () => {
      const largeDataset = {
        nodes: Array.from({ length: 2500 }, (_, i) => ({ id: i, label: `Node ${i}` })),
        edges: Array.from({ length: 1000 }, (_, i) => ({ source: i, target: i + 1 }))
      };

      const result = await dataLoader.processDataInChunks(largeDataset, 1000);
      
      expect(result.nodes).toHaveLength(2500);
      expect(result.edges).toHaveLength(1000);
      expect(result.metadata.chunked).toBe(true);
      expect(result.metadata.chunkSize).toBe(1000);
      
      // Verify all items are marked as processed
      expect(result.nodes.every(node => node.processed)).toBe(true);
      expect(result.edges.every(edge => edge.processed)).toBe(true);
    });
  });

  describe('Error handling', () => {
    test('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(dataLoader.loadFromUrl('/test.json')).rejects.toThrow('Network error');
    });

    test('should handle malformed responses', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(dataLoader.loadFromUrl('/test.json')).rejects.toThrow('Invalid JSON');
    });

    test('should clean up resources on error', async () => {
      fetch.mockRejectedValue(new Error('Test error'));

      try {
        await dataLoader.loadFromUrl('/test.json', { showSpinner: true });
      } catch (error) {
        // Error expected
      }

      // Verify cleanup happened
      expect(store.setState).toHaveBeenCalledWith({ 
        loading: { data: false } 
      });
    });
  });
});
