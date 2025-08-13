// Custom Cypress Commands for NAS Knowledge Graph

// Load graph with performance monitoring
Cypress.Commands.add('loadGraph', (options = {}) => {
  const { measurePerformance = true } = options;
  
  if (measurePerformance) {
    cy.measurePerformance('graph-load', () => {
      cy.visit('/');
      cy.waitForGraph();
    });
  } else {
    cy.visit('/');
    cy.waitForGraph();
  }
});

// Assert graph state
Cypress.Commands.add('assertGraphState', (expectedState) => {
  cy.get('#graph-container svg').within(() => {
    if (expectedState.nodeCount !== undefined) {
      cy.get('circle').should('have.length', expectedState.nodeCount);
    }
    
    if (expectedState.edgeCount !== undefined) {
      cy.get('line').should('have.length', expectedState.edgeCount);
    }
    
    if (expectedState.selectedNodes !== undefined) {
      cy.get('circle.selected').should('have.length', expectedState.selectedNodes);
    }
  });
});

// Interact with specific node by ID
Cypress.Commands.add('selectNodeById', (nodeId) => {
  cy.get(`circle[data-node-id="${nodeId}"]`)
    .should('exist')
    .click({ force: true });
    
  // Wait for selection to take effect
  cy.get(`circle[data-node-id="${nodeId}"]`)
    .should('have.class', 'selected');
});

// Verify filter functionality
Cypress.Commands.add('testFilter', (filterConfig) => {
  const { type, value, expectedNodeCount, expectedEdgeCount } = filterConfig;
  
  // Record initial state
  cy.get('#graph-container svg circle').then($circles => {
    const initialNodeCount = $circles.length;
    
    // Apply filter
    cy.applyFilter(type, value);
    
    // Verify filtered state
    cy.get('#graph-container svg circle').should('have.length', expectedNodeCount);
    
    if (expectedEdgeCount !== undefined) {
      cy.get('#graph-container svg line').should('have.length', expectedEdgeCount);
    }
    
    // Verify nodes are properly filtered
    if (type === 'node-type' && value !== 'all') {
      cy.get('#graph-container svg circle').each($circle => {
        cy.wrap($circle).should('have.attr', 'data-node-type', value);
      });
    }
  });
});

// Performance regression test
Cypress.Commands.add('performanceRegressionTest', (testName, thresholds = {}) => {
  const defaultThresholds = {
    loadTime: 3000,        // 3 seconds
    renderTime: 1000,      // 1 second
    interactionTime: 200,  // 200ms
    memoryUsage: 50000000  // 50MB
  };
  
  const finalThresholds = { ...defaultThresholds, ...thresholds };
  
  cy.measurePerformance(`${testName}-load`, () => {
    cy.visit('/');
  });
  
  cy.measurePerformance(`${testName}-render`, () => {
    cy.waitForGraph();
  });
  
  // Test interaction performance
  cy.measurePerformance(`${testName}-interaction`, () => {
    cy.get('#graph-container svg circle').first().click({ force: true });
    cy.get('#node-details').should('be.visible');
  });
  
  // Check memory usage
  cy.window().then((win) => {
    if (win.performance.memory) {
      const memoryUsage = win.performance.memory.usedJSHeapSize;
      expect(memoryUsage).to.be.lessThan(finalThresholds.memoryUsage);
      
      cy.task('recordPerformance', {
        test: testName,
        type: 'memory',
        value: memoryUsage,
        threshold: finalThresholds.memoryUsage,
        passed: memoryUsage < finalThresholds.memoryUsage
      });
    }
  });
});

// Stress test with large dataset
Cypress.Commands.add('stressTest', (options = {}) => {
  const { nodeCount = 1000, iterations = 10 } = options;
  
  // Load large dataset
  cy.intercept('GET', '/data/sample-data.json', {
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: i + 1,
      label: `Node ${i + 1}`,
      type: ['hardware', 'concept', 'process'][i % 3]
    })),
    edges: Array.from({ length: Math.floor(nodeCount * 1.5) }, (_, i) => ({
      id: `e${i}`,
      source: Math.floor(Math.random() * nodeCount) + 1,
      target: Math.floor(Math.random() * nodeCount) + 1,
      label: 'connection'
    }))
  }).as('largeDataset');
  
  cy.measurePerformance('stress-test-load', () => {
    cy.visit('/');
    cy.wait('@largeDataset');
    cy.waitForGraph({ timeout: 30000 });
  });
  
  // Perform multiple interactions
  for (let i = 0; i < iterations; i++) {
    cy.measurePerformance(`stress-test-interaction-${i}`, () => {
      const randomNodeIndex = Math.floor(Math.random() * Math.min(nodeCount, 50));
      cy.get('#graph-container svg circle').eq(randomNodeIndex).click({ force: true });
      cy.wait(100);
    });
  }
});

// Cross-browser compatibility helpers
Cypress.Commands.add('checkBrowserCompatibility', () => {
  // Check for required browser APIs
  cy.window().then((win) => {
    const requiredAPIs = [
      'fetch',
      'Promise',
      'Map',
      'Set',
      'WeakMap',
      'performance',
      'requestAnimationFrame'
    ];
    
    requiredAPIs.forEach(api => {
      expect(win[api]).to.exist;
    });
    
    // Check SVG support
    expect(document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")).to.be.true;
    
    // Check CSS features
    expect(win.CSS.supports('display', 'flex')).to.be.true;
    expect(win.CSS.supports('display', 'grid')).to.be.true;
  });
});

// Accessibility testing
Cypress.Commands.add('testAccessibility', () => {
  // Install axe-core
  cy.injectAxe();
  
  // Run accessibility audit
  cy.checkA11y(null, {
    rules: {
      'color-contrast': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'keyboard-navigation': { enabled: true }
    }
  });
  
  // Test keyboard navigation
  cy.get('body').tab();
  cy.focused().should('be.visible');
  
  // Test with screen reader simulation
  cy.get('#graph-container').should('have.attr', 'role', 'img');
  cy.get('#graph-container').should('have.attr', 'aria-label');
});

// Data validation helpers
Cypress.Commands.add('validateGraphData', () => {
  cy.window().then((win) => {
    // Access the graph instance (assuming it's available globally)
    if (win.graphInstance) {
      const { nodes, edges } = win.graphInstance.getData();
      
      // Validate nodes
      expect(nodes).to.be.an('array');
      nodes.forEach(node => {
        expect(node).to.have.property('id');
        expect(node).to.have.property('label');
        expect(node).to.have.property('type');
      });
      
      // Validate edges
      expect(edges).to.be.an('array');
      edges.forEach(edge => {
        expect(edge).to.have.property('source');
        expect(edge).to.have.property('target');
        
        // Ensure edge references valid nodes
        const sourceExists = nodes.some(n => n.id === edge.source);
        const targetExists = nodes.some(n => n.id === edge.target);
        expect(sourceExists).to.be.true;
        expect(targetExists).to.be.true;
      });
    }
  });
});

// Error handling and recovery testing
Cypress.Commands.add('testErrorHandling', () => {
  // Test network error handling
  cy.intercept('GET', '/data/sample-data.json', { forceNetworkError: true }).as('networkError');
  cy.visit('/');
  cy.get('[data-cy="error-message"]').should('be.visible');
  cy.get('[data-cy="retry-button"]').should('be.visible').click();
  
  // Test malformed data handling
  cy.intercept('GET', '/data/sample-data.json', { body: 'invalid json' }).as('invalidData');
  cy.reload();
  cy.get('[data-cy="error-message"]').should('contain.text', 'Invalid data');
});

// Performance monitoring during interactions
Cypress.Commands.add('monitorInteractionPerformance', (interactionName, callback) => {
  cy.window().then((win) => {
    const observer = new win.PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.includes(interactionName)) {
          cy.task('recordPerformance', {
            interaction: interactionName,
            duration: entry.duration,
            startTime: entry.startTime,
            detail: entry.detail || {}
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    callback();
    
    cy.then(() => {
      observer.disconnect();
    });
  });
});

// Bulk operations testing
Cypress.Commands.add('testBulkOperations', () => {
  // Select multiple nodes
  cy.get('#graph-container svg circle').then($circles => {
    const nodeCount = Math.min($circles.length, 5);
    
    for (let i = 0; i < nodeCount; i++) {
      cy.wrap($circles[i]).click({ ctrlKey: true, force: true });
    }
    
    // Verify multiple selection
    cy.get('#graph-container svg circle.selected').should('have.length', nodeCount);
    
    // Test bulk actions
    cy.get('[data-cy="bulk-actions"]').should('be.visible');
    cy.get('[data-cy="bulk-delete"]').should('be.visible');
    cy.get('[data-cy="bulk-group"]').should('be.visible');
  });
});

// Save and restore state testing
Cypress.Commands.add('testStateManagement', () => {
  // Apply some filters and selections
  cy.applyFilter('node-type', 'hardware');
  cy.get('#graph-container svg circle').first().click({ force: true });
  
  // Save state
  cy.get('[data-cy="save-state"]').click();
  cy.get('[data-cy="state-saved-message"]').should('be.visible');
  
  // Change state
  cy.get('[data-cy="reset-filters"]').click();
  
  // Restore state
  cy.get('[data-cy="restore-state"]').click();
  
  // Verify state restoration
  cy.get('#graph-container svg circle.selected').should('have.length', 1);
});
