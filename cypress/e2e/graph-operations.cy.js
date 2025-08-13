describe('NAS Knowledge Graph - Core Operations', () => {
  beforeEach(() => {
    // Set up fixtures and intercepts
    cy.fixture('sample-data.json').as('sampleData');
    cy.fixture('sample-relations.json').as('sampleRelations');
    
    cy.visit('/');
    cy.waitForGraph();
  });

  describe('Graph Loading', () => {
    it('should load the graph successfully', () => {
      cy.performanceSnapshot('graph-loaded');
      
      // Verify graph container exists and is visible
      cy.get('#graph-container').should('be.visible');
      cy.get('#graph-container svg').should('exist');
      
      // Verify nodes are rendered
      cy.get('#graph-container svg circle').should('have.length.greaterThan', 0);
      
      // Verify edges are rendered
      cy.get('#graph-container svg line').should('have.length.greaterThan', 0);
      
      // Verify the graph has expected sample data structure
      cy.assertGraphState({
        nodeCount: 5,
        edgeCount: 4
      });
    });

    it('should handle loading states properly', () => {
      // Visit page and check for loading indicator
      cy.visit('/');
      
      // Should show loading spinner initially
      cy.get('.loading-spinner', { timeout: 1000 }).should('exist');
      
      // Loading spinner should disappear when graph is loaded
      cy.waitForGraph();
      cy.get('.loading-spinner').should('not.exist');
    });

    it('should display proper graph metadata', () => {
      cy.get('[data-cy="graph-stats"]').should('be.visible');
      cy.get('[data-cy="node-count"]').should('contain.text', '5');
      cy.get('[data-cy="edge-count"]').should('contain.text', '4');
    });
  });

  describe('Node Interaction', () => {
    it('should select a node and display details', () => {
      cy.measurePerformance('node-selection', () => {
        // Click on the first node
        cy.get('#graph-container svg circle').first().click({ force: true });
        
        // Verify node is selected
        cy.get('#graph-container svg circle.selected').should('have.length', 1);
        
        // Verify node details panel appears
        cy.get('#node-details').should('be.visible');
        
        // Verify details contain expected information
        cy.verifyNodeDetails({
          label: 'NAS Device',
          type: 'hardware',
          connections: 3
        });
      });
    });

    it('should highlight connected nodes on selection', () => {
      // Select a node
      cy.selectNodeById(1);
      
      // Check that connected nodes are highlighted
      cy.get('#graph-container svg circle.connected').should('have.length.greaterThan', 0);
      
      // Check that edges to connected nodes are highlighted
      cy.get('#graph-container svg line.highlighted').should('have.length.greaterThan', 0);
    });

    it('should support multiple node selection', () => {
      // Select first node
      cy.get('#graph-container svg circle').first().click({ force: true });
      
      // Select second node with Ctrl key
      cy.get('#graph-container svg circle').eq(1).click({ ctrlKey: true, force: true });
      
      // Verify multiple nodes are selected
      cy.get('#graph-container svg circle.selected').should('have.length', 2);
      
      // Verify bulk actions are available
      cy.get('[data-cy="bulk-actions"]').should('be.visible');
    });

    it('should clear selection when clicking empty space', () => {
      // Select a node first
      cy.selectNodeById(1);
      cy.get('#graph-container svg circle.selected').should('have.length', 1);
      
      // Click on empty space in the SVG
      cy.get('#graph-container svg').click(100, 100, { force: true });
      
      // Verify selection is cleared
      cy.get('#graph-container svg circle.selected').should('have.length', 0);
      cy.get('#node-details').should('not.be.visible');
    });
  });

  describe('Filtering Functionality', () => {
    it('should filter nodes by type', () => {
      cy.testFilter({
        type: 'node-type',
        value: 'hardware',
        expectedNodeCount: 1,
        expectedEdgeCount: 0
      });
      
      // Verify only hardware nodes are visible
      cy.get('#graph-container svg circle').should('have.length', 1);
      cy.get('#graph-container svg circle').should('have.attr', 'data-node-type', 'hardware');
    });

    it('should filter nodes by multiple types', () => {
      cy.get('[data-cy="filters-toggle"]').click();
      cy.get('[data-cy="filter-node-type"]').select(['hardware', 'concept']);
      cy.get('[data-cy="apply-filters"]').click();
      
      cy.get('#graph-container svg circle').should('have.length', 3);
      cy.get('#graph-container svg circle').each($circle => {
        const nodeType = $circle.attr('data-node-type');
        expect(['hardware', 'concept']).to.include(nodeType);
      });
    });

    it('should search and filter nodes by text', () => {
      cy.searchGraph('NAS');
      
      // Should highlight or filter to nodes containing 'NAS'
      cy.get('[data-cy="search-results"]').should('be.visible');
      cy.get('[data-cy="search-results"] .result-item').should('have.length', 1);
      cy.get('[data-cy="search-results"] .result-item').should('contain.text', 'NAS Device');
    });

    it('should combine multiple filters', () => {
      // Apply type filter
      cy.applyFilter('node-type', 'concept');
      
      // Apply search filter
      cy.searchGraph('RAID');
      
      // Should show only concept nodes matching 'RAID'
      cy.get('#graph-container svg circle.filtered').should('have.length', 1);
    });

    it('should clear all filters', () => {
      // Apply some filters
      cy.applyFilter('node-type', 'hardware');
      cy.searchGraph('device');
      
      // Clear all filters
      cy.get('[data-cy="clear-filters"]').click();
      
      // Should show all nodes again
      cy.assertGraphState({
        nodeCount: 5,
        edgeCount: 4
      });
    });
  });

  describe('Search Functionality', () => {
    it('should perform fuzzy search', () => {
      cy.searchGraph('nas dev');
      
      cy.get('[data-cy="search-results"]').should('be.visible');
      cy.get('[data-cy="search-results"] .result-item').should('contain.text', 'NAS Device');
    });

    it('should show search suggestions', () => {
      cy.get('[data-cy="search-input"]').type('n');
      
      cy.get('[data-cy="search-suggestions"]').should('be.visible');
      cy.get('[data-cy="search-suggestions"] .suggestion').should('contain.text', 'NAS');
    });

    it('should search in node properties', () => {
      cy.searchGraph('Synology');
      
      cy.get('[data-cy="search-results"] .result-item').should('have.length', 1);
      cy.get('[data-cy="search-results"] .result-item').should('contain.text', 'NAS Device');
    });

    it('should maintain search history', () => {
      cy.searchGraph('NAS');
      cy.searchGraph('RAID');
      cy.searchGraph('Network');
      
      // Open search history
      cy.get('[data-cy="search-history-toggle"]').click();
      cy.get('[data-cy="search-history"]').should('be.visible');
      cy.get('[data-cy="search-history"] .history-item').should('have.length', 3);
    });
  });

  describe('Graph Navigation', () => {
    it('should support zoom operations', () => {
      const initialTransform = cy.get('#graph-container svg g.zoom-container');
      
      // Zoom in
      cy.get('[data-cy="zoom-in"]').click();
      cy.get('#graph-container svg g.zoom-container').should('have.attr', 'transform').and('contain', 'scale');
      
      // Zoom out
      cy.get('[data-cy="zoom-out"]').click();
      
      // Reset zoom
      cy.get('[data-cy="zoom-reset"]').click();
    });

    it('should support pan operations', () => {
      // Pan using mouse drag
      cy.get('#graph-container svg')
        .trigger('mousedown', { clientX: 100, clientY: 100 })
        .trigger('mousemove', { clientX: 200, clientY: 200 })
        .trigger('mouseup');
      
      // Verify transform changed
      cy.get('#graph-container svg g.zoom-container')
        .should('have.attr', 'transform')
        .and('contain', 'translate');
    });

    it('should center view on selected node', () => {
      cy.selectNodeById(1);
      cy.get('[data-cy="center-on-node"]').click();
      
      // Verify node is centered (transform should be adjusted)
      cy.get('#graph-container svg g.zoom-container').should('have.attr', 'transform');
    });

    it('should fit all nodes in view', () => {
      // Zoom in first
      cy.get('[data-cy="zoom-in"]').click().click().click();
      
      // Fit to view
      cy.get('[data-cy="fit-to-view"]').click();
      
      // All nodes should be visible
      cy.get('#graph-container svg circle').each($circle => {
        cy.wrap($circle).should('be.visible');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should load graph within performance threshold', () => {
      cy.performanceRegressionTest('graph-load', {
        loadTime: 2000,
        renderTime: 800,
        interactionTime: 150
      });
    });

    it('should handle rapid interactions without lag', () => {
      const interactions = 10;
      
      for (let i = 0; i < interactions; i++) {
        cy.measurePerformance(`rapid-interaction-${i}`, () => {
          cy.get('#graph-container svg circle').eq(i % 5).click({ force: true });
          cy.wait(50);
        });
      }
      
      // Verify all interactions were recorded
      cy.task('log', `Completed ${interactions} rapid interactions`);
    });

    it('should maintain performance with filters applied', () => {
      cy.measurePerformance('filter-performance', () => {
        cy.applyFilter('node-type', 'concept');
        cy.applyFilter('node-type', 'hardware');
        cy.applyFilter('node-type', 'all');
      });
    });
  });

  describe('Accessibility', () => {
    it('should pass accessibility audit', () => {
      cy.testAccessibility();
    });

    it('should support keyboard navigation', () => {
      // Tab through interactive elements
      cy.get('body').tab();
      cy.focused().should('have.attr', 'tabindex', '0');
      
      // Navigate to graph
      cy.get('#graph-container').focus();
      
      // Use arrow keys for navigation
      cy.focused().type('{rightarrow}');
      cy.focused().type('{enter}'); // Select node
      
      // Verify node is selected
      cy.get('#graph-container svg circle.selected').should('have.length', 1);
    });

    it('should have proper ARIA labels', () => {
      cy.get('#graph-container').should('have.attr', 'aria-label');
      cy.get('#node-details').should('have.attr', 'aria-live', 'polite');
      cy.get('[data-cy="search-input"]').should('have.attr', 'aria-label');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.testErrorHandling();
    });

    it('should recover from invalid data', () => {
      // Test with empty data
      cy.intercept('GET', '/data/sample-data.json', { nodes: [], edges: [] });
      cy.reload();
      
      cy.get('[data-cy="empty-state"]').should('be.visible');
      cy.get('[data-cy="load-sample-data"]').should('be.visible').click();
      
      // Should load fallback data
      cy.waitForGraph();
      cy.get('#graph-container svg circle').should('have.length.greaterThan', 0);
    });
  });

  describe('Data Export', () => {
    it('should export graph data as JSON', () => {
      cy.get('[data-cy="export-menu"]').click();
      cy.get('[data-cy="export-json"]').click();
      
      // Should trigger download
      cy.get('[data-cy="export-success"]').should('be.visible');
    });

    it('should export filtered data', () => {
      cy.applyFilter('node-type', 'hardware');
      
      cy.get('[data-cy="export-menu"]').click();
      cy.get('[data-cy="export-filtered"]').click();
      
      // Should export only filtered data
      cy.get('[data-cy="export-success"]').should('contain.text', '1 node');
    });
  });

  describe('State Management', () => {
    it('should save and restore application state', () => {
      cy.testStateManagement();
    });

    it('should maintain state across page reloads', () => {
      // Apply filters and select node
      cy.applyFilter('node-type', 'concept');
      cy.selectNodeById(2);
      
      // Reload page
      cy.reload();
      cy.waitForGraph();
      
      // State should be maintained (if implemented)
      // This test might need to be adjusted based on actual state persistence
      cy.get('[data-cy="restore-session"]').click();
      cy.get('#graph-container svg circle.selected').should('have.length', 1);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all features in a complete workflow', () => {
      // Complete user workflow test
      cy.measurePerformance('complete-workflow', () => {
        // 1. Load graph
        cy.waitForGraph();
        cy.performanceSnapshot('workflow-start');
        
        // 2. Search for a node
        cy.searchGraph('NAS');
        cy.get('[data-cy="search-results"] .result-item').first().click();
        
        // 3. Inspect node details
        cy.verifyNodeDetails({ label: 'NAS Device' });
        
        // 4. Apply filters
        cy.applyFilter('node-type', 'concept');
        
        // 5. Select multiple nodes
        cy.get('#graph-container svg circle').first().click({ force: true });
        cy.get('#graph-container svg circle').eq(1).click({ ctrlKey: true, force: true });
        
        // 6. Clear selection and filters
        cy.get('[data-cy="clear-all"]').click();
        
        // 7. Export data
        cy.get('[data-cy="export-menu"]').click();
        cy.get('[data-cy="export-json"]').click();
        
        cy.performanceSnapshot('workflow-end');
      });
    });

    it('should handle edge cases in user interactions', () => {
      // Rapid clicking
      for (let i = 0; i < 5; i++) {
        cy.get('#graph-container svg circle').first().click({ force: true });
      }
      
      // Multiple filter applications
      cy.applyFilter('node-type', 'hardware');
      cy.applyFilter('node-type', 'concept');
      cy.applyFilter('node-type', 'process');
      
      // Should not break the application
      cy.get('#graph-container').should('be.visible');
    });
  });

  afterEach(() => {
    // Clean up any test artifacts
    cy.clearLocalStorage();
    cy.performanceSnapshot('test-completed');
  });
});
