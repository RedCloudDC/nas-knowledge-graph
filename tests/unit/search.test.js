/**
 * @jest-environment jsdom
 */

import { Search } from '../../src/utils/search.js';
import { store } from '../../src/core/store.js';

// Mock store
jest.mock('../../src/core/store.js', () => ({
  store: {
    getState: jest.fn(),
    setState: jest.fn(),
    subscribe: jest.fn()
  }
}));

describe('Search', () => {
  let search;
  const mockNodes = [
    { id: 1, label: 'NAS Device', type: 'hardware', properties: { brand: 'Synology', model: 'DS920+' } },
    { id: 2, label: 'RAID Configuration', type: 'concept', properties: { level: 'RAID1' } },
    { id: 3, label: 'Network Storage', type: 'concept', properties: { protocol: 'SMB' } },
    { id: 4, label: 'Backup Strategy', type: 'process', properties: { frequency: 'daily' } },
    { id: 5, label: 'Data Protection', type: 'process', properties: { encryption: 'AES256' } }
  ];

  const mockEdges = [
    { id: 'e1', source: 1, target: 2, label: 'implements', type: 'uses' },
    { id: 'e2', source: 1, target: 3, label: 'provides', type: 'enables' },
    { id: 'e3', source: 2, target: 3, label: 'manages', type: 'controls' },
    { id: 'e4', source: 4, target: 5, label: 'includes', type: 'contains' }
  ];

  beforeEach(() => {
    search = new Search();
    store.getState.mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges
    });
    search.buildIndex(mockNodes, mockEdges);
  });

  afterEach(() => {
    search.clearSearchHistory();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      const newSearch = new Search();
      expect(newSearch.searchIndex).toBeInstanceOf(Map);
      expect(newSearch.lastQuery).toBe('');
      expect(newSearch.searchHistory).toEqual([]);
      expect(newSearch.maxHistorySize).toBe(50);
    });
  });

  describe('buildIndex', () => {
    test('should build search index for nodes and edges', () => {
      expect(search.searchIndex.size).toBe(mockNodes.length + mockEdges.length);
      expect(search.searchIndex.has('node-1')).toBe(true);
      expect(search.searchIndex.has('edge-e1')).toBe(true);
    });

    test('should extract searchable text correctly', () => {
      const nodeEntry = search.searchIndex.get('node-1');
      expect(nodeEntry.text).toContain('nas device');
      expect(nodeEntry.text).toContain('hardware');
      expect(nodeEntry.text).toContain('synology');
      expect(nodeEntry.text).toContain('ds920+');
    });
  });

  describe('extractSearchableText', () => {
    test('should extract text from node properties', () => {
      const node = { id: 1, label: 'Test Node', type: 'test', properties: { key: 'value' } };
      const text = search.extractSearchableText(node);
      
      expect(text).toContain('test node');
      expect(text).toContain('test');
      expect(text).toContain('1');
      expect(text).toContain('key');
      expect(text).toContain('value');
    });

    test('should handle items without properties', () => {
      const node = { id: 1, label: 'Simple Node', type: 'basic' };
      const text = search.extractSearchableText(node);
      
      expect(text).toContain('simple node');
      expect(text).toContain('basic');
      expect(text).toContain('1');
    });
  });

  describe('textSearch', () => {
    test('should find nodes matching search query', () => {
      const results = search.textSearch('nas');
      
      expect(results).toHaveLength(1);
      expect(results[0].data.label).toBe('NAS Device');
      expect(results[0].type).toBe('node');
    });

    test('should find edges matching search query', () => {
      const results = search.textSearch('implements');
      
      expect(results).toHaveLength(1);
      expect(results[0].data.label).toBe('implements');
      expect(results[0].type).toBe('edge');
    });

    test('should perform case-insensitive search by default', () => {
      const results = search.textSearch('NAS');
      expect(results).toHaveLength(1);
      
      const results2 = search.textSearch('nas');
      expect(results2).toHaveLength(1);
    });

    test('should perform case-sensitive search when specified', () => {
      const results = search.textSearch('NAS', { caseSensitive: true });
      expect(results).toHaveLength(1);
      
      const results2 = search.textSearch('nas', { caseSensitive: true });
      expect(results2).toHaveLength(0);
    });

    test('should perform exact match when specified', () => {
      const results = search.textSearch('nas device', { exactMatch: true });
      expect(results).toHaveLength(1);
      
      const results2 = search.textSearch('nas', { exactMatch: true });
      expect(results2).toHaveLength(1);
    });

    test('should limit results', () => {
      const results = search.textSearch('a', { limit: 2 }); // Should match multiple items
      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('should filter by node/edge type', () => {
      const nodeResults = search.textSearch('nas', { searchEdges: false });
      expect(nodeResults.every(r => r.type === 'node')).toBe(true);
      
      const edgeResults = search.textSearch('implements', { searchNodes: false });
      expect(edgeResults.every(r => r.type === 'edge')).toBe(true);
    });

    test('should sort results by relevance', () => {
      const results = search.textSearch('storage');
      
      // Results should be sorted by score (highest first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    test('should add queries to search history', () => {
      search.textSearch('nas');
      search.textSearch('storage');
      
      const history = search.getSearchHistory();
      expect(history).toContain('storage');
      expect(history).toContain('nas');
    });
  });

  describe('fuzzyMatch', () => {
    test('should match characters in order', () => {
      expect(search.fuzzyMatch('nas device', 'nsd')).toBe(true);
      expect(search.fuzzyMatch('network storage', 'nts')).toBe(true);
      expect(search.fuzzyMatch('backup', 'bckp')).toBe(true);
    });

    test('should not match characters out of order', () => {
      expect(search.fuzzyMatch('nas device', 'sna')).toBe(false);
      expect(search.fuzzyMatch('backup', 'pakc')).toBe(false);
    });

    test('should handle empty queries', () => {
      expect(search.fuzzyMatch('text', '')).toBe(true);
    });
  });

  describe('calculateRelevanceScore', () => {
    test('should give higher scores for exact matches', () => {
      const exactScore = search.calculateRelevanceScore('nas device', 'nas device');
      const partialScore = search.calculateRelevanceScore('nas device storage', 'nas device');
      
      expect(exactScore).toBeGreaterThan(partialScore);
    });

    test('should give higher scores for matches at the beginning', () => {
      const startScore = search.calculateRelevanceScore('nas device', 'nas');
      const middleScore = search.calculateRelevanceScore('my nas device', 'nas');
      
      expect(startScore).toBeGreaterThan(middleScore);
    });

    test('should penalize longer texts', () => {
      const shortScore = search.calculateRelevanceScore('nas', 'nas');
      const longScore = search.calculateRelevanceScore('nas device with many features', 'nas');
      
      expect(shortScore).toBeGreaterThan(longScore);
    });
  });

  describe('searchNodes', () => {
    test('should filter nodes by type', () => {
      const results = search.searchNodes({ type: 'hardware' });
      
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('NAS Device');
    });

    test('should filter nodes by multiple types', () => {
      const results = search.searchNodes({ type: ['hardware', 'concept'] });
      
      expect(results).toHaveLength(3);
    });

    test('should filter nodes by properties', () => {
      const results = search.searchNodes({ 
        properties: { brand: 'Synology' } 
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('NAS Device');
    });
  });

  describe('searchEdges', () => {
    test('should filter edges by type', () => {
      const results = search.searchEdges({ type: 'uses' });
      
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('implements');
    });

    test('should filter edges by source', () => {
      const results = search.searchEdges({ source: 1 });
      
      expect(results).toHaveLength(2);
    });

    test('should filter edges by target', () => {
      const results = search.searchEdges({ target: 3 });
      
      expect(results).toHaveLength(2);
    });
  });

  describe('findNodesByType', () => {
    test('should find nodes of specific type', () => {
      const conceptNodes = search.findNodesByType('concept');
      
      expect(conceptNodes).toHaveLength(2);
      expect(conceptNodes.every(node => node.type === 'concept')).toBe(true);
    });

    test('should return empty array for non-existent type', () => {
      const results = search.findNodesByType('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('findConnectedNodes', () => {
    test('should find directly connected nodes', () => {
      const connected = search.findConnectedNodes(1, { maxDepth: 1 });
      
      expect(connected).toHaveLength(2);
      expect(connected.some(node => node.id === 2)).toBe(true);
      expect(connected.some(node => node.id === 3)).toBe(true);
    });

    test('should find nodes at multiple depths', () => {
      const connected = search.findConnectedNodes(1, { maxDepth: 2 });
      
      expect(connected.length).toBeGreaterThanOrEqual(2);
    });

    test('should respect direction parameter', () => {
      const outgoing = search.findConnectedNodes(1, { direction: 'out' });
      const incoming = search.findConnectedNodes(3, { direction: 'in' });
      
      expect(outgoing.length).toBeGreaterThan(0);
      expect(incoming.length).toBeGreaterThan(0);
    });
  });

  describe('findPath', () => {
    test('should find path between connected nodes', () => {
      const path = search.findPath(1, 3);
      
      expect(path).toContain(1);
      expect(path).toContain(3);
      expect(path.length).toBeGreaterThanOrEqual(2);
    });

    test('should return single node for same source and target', () => {
      const path = search.findPath(1, 1);
      expect(path).toEqual([1]);
    });

    test('should return null for disconnected nodes', () => {
      const path = search.findPath(1, 4);
      expect(path).toBeNull();
    });

    test('should respect max depth', () => {
      const path = search.findPath(1, 3, { maxDepth: 1 });
      expect(path).not.toBeNull();
      expect(path.length).toBeLessThanOrEqual(3); // source + max 1 intermediate + target
    });
  });

  describe('advancedSearch', () => {
    test('should combine text and type filters', () => {
      const results = search.advancedSearch({
        text: 'storage',
        nodeTypes: ['concept']
      });
      
      expect(results.nodes).toHaveLength(1);
      expect(results.nodes[0].label).toBe('Network Storage');
    });

    test('should filter by properties', () => {
      const results = search.advancedSearch({
        properties: { protocol: 'SMB' }
      });
      
      expect(results.nodes).toHaveLength(1);
      expect(results.nodes[0].label).toBe('Network Storage');
    });

    test('should filter by connection count', () => {
      const results = search.advancedSearch({
        minConnections: 2
      });
      
      // Node 1 and 3 have 2+ connections
      expect(results.nodes.length).toBeGreaterThan(0);
      expect(results.nodes.every(node => [1, 3].includes(node.id))).toBe(true);
    });

    test('should return all data when no filters specified', () => {
      const results = search.advancedSearch({});
      
      expect(results.nodes).toHaveLength(mockNodes.length);
      expect(results.edges).toHaveLength(mockEdges.length);
    });
  });

  describe('getSuggestions', () => {
    test('should suggest completions for partial queries', () => {
      const suggestions = search.getSuggestions('na');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('nas'))).toBe(true);
    });

    test('should limit number of suggestions', () => {
      const suggestions = search.getSuggestions('a', 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    test('should return empty array for empty query', () => {
      const suggestions = search.getSuggestions('');
      expect(suggestions).toEqual([]);
    });
  });

  describe('Search History', () => {
    test('should maintain search history', () => {
      search.textSearch('nas');
      search.textSearch('storage');
      search.textSearch('backup');
      
      const history = search.getSearchHistory();
      expect(history).toContain('nas');
      expect(history).toContain('storage');
      expect(history).toContain('backup');
    });

    test('should not duplicate consecutive same queries', () => {
      search.textSearch('nas');
      search.textSearch('nas');
      
      const history = search.getSearchHistory();
      const nasCount = history.filter(q => q === 'nas').length;
      expect(nasCount).toBe(1);
    });

    test('should move existing queries to front', () => {
      search.textSearch('first');
      search.textSearch('second');
      search.textSearch('first'); // Should move to front
      
      const history = search.getSearchHistory();
      expect(history[0]).toBe('first');
    });

    test('should limit history size', () => {
      const originalMaxSize = search.maxHistorySize;
      search.maxHistorySize = 3;
      
      for (let i = 0; i < 5; i++) {
        search.textSearch(`query${i}`);
      }
      
      const history = search.getSearchHistory();
      expect(history.length).toBe(3);
      
      search.maxHistorySize = originalMaxSize;
    });

    test('should clear history', () => {
      search.textSearch('test');
      search.clearSearchHistory();
      
      const history = search.getSearchHistory();
      expect(history).toEqual([]);
    });
  });

  describe('searchNeighborhood', () => {
    test('should search within node neighborhood', () => {
      const results = search.searchNeighborhood(1, 'concept');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(node => node.type === 'concept')).toBe(true);
    });

    test('should return all neighbors when no query provided', () => {
      const results = search.searchNeighborhood(1);
      
      expect(results.length).toBeGreaterThan(0);
    });

    test('should respect depth parameter', () => {
      const depth1 = search.searchNeighborhood(1, null, 1);
      const depth2 = search.searchNeighborhood(1, null, 2);
      
      expect(depth2.length).toBeGreaterThanOrEqual(depth1.length);
    });
  });

  describe('Saved Searches', () => {
    beforeEach(() => {
      // Mock localStorage
      global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };
    });

    afterEach(() => {
      delete global.localStorage;
    });

    test('should save search filters', () => {
      const filters = { nodeTypes: ['hardware'], text: 'nas' };
      
      localStorage.getItem.mockReturnValue('{}');
      search.saveSearch('mySearch', filters);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'kg-saved-searches',
        expect.stringContaining('mySearch')
      );
    });

    test('should execute saved search', () => {
      const filters = { nodeTypes: ['hardware'] };
      const savedSearches = {
        'mySearch': { filters, created: '2023-01-01', lastUsed: '2023-01-01' }
      };
      
      localStorage.getItem.mockReturnValue(JSON.stringify(savedSearches));
      
      const results = search.executeSavedSearch('mySearch');
      
      expect(results.nodes).toHaveLength(1);
      expect(results.nodes[0].type).toBe('hardware');
    });

    test('should throw error for non-existent saved search', () => {
      localStorage.getItem.mockReturnValue('{}');
      
      expect(() => search.executeSavedSearch('nonexistent')).toThrow("Saved search 'nonexistent' not found");
    });

    test('should handle corrupted localStorage', () => {
      localStorage.getItem.mockReturnValue('invalid json');
      
      const savedSearches = search.getSavedSearches();
      expect(savedSearches).toEqual({});
    });
  });

  describe('Property Operators', () => {
    test('should support equality operator', () => {
      const results = search.advancedSearch({
        properties: { 
          brand: { operator: 'eq', value: 'Synology' } 
        }
      });
      
      expect(results.nodes).toHaveLength(1);
    });

    test('should support contains operator', () => {
      const results = search.advancedSearch({
        properties: { 
          model: { operator: 'contains', value: 'DS' } 
        }
      });
      
      expect(results.nodes).toHaveLength(1);
    });

    test('should support regex operator', () => {
      const results = search.advancedSearch({
        properties: { 
          model: { operator: 'regex', value: 'DS\\d+\\+?' } 
        }
      });
      
      expect(results.nodes).toHaveLength(1);
    });
  });

  describe('Edge cases and Error handling', () => {
    test('should handle empty search index', () => {
      const emptySearch = new Search();
      const results = emptySearch.textSearch('test');
      
      expect(results).toEqual([]);
    });

    test('should handle nodes without properties', () => {
      const nodesWithoutProps = [{ id: 1, label: 'Simple', type: 'basic' }];
      search.buildIndex(nodesWithoutProps, []);
      
      const results = search.textSearch('simple');
      expect(results).toHaveLength(1);
    });

    test('should handle special characters in search', () => {
      const results = search.textSearch('DS920+');
      expect(results).toHaveLength(1);
    });

    test('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      const results = search.textSearch(longQuery);
      
      // Should not crash and return valid results
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('updateIndex', () => {
    test('should update index when called', () => {
      const newNodes = [{ id: 999, label: 'New Node', type: 'test' }];
      const newEdges = [{ id: 'new', source: 999, target: 999, label: 'self' }];
      
      store.getState.mockReturnValue({
        nodes: newNodes,
        edges: newEdges
      });
      
      search.updateIndex();
      
      expect(search.searchIndex.has('node-999')).toBe(true);
      expect(search.searchIndex.has('edge-new')).toBe(true);
    });
  });
});
