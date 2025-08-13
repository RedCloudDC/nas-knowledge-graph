// Cypress E2E Support File
import './commands';
import '@testing-library/cypress/add-commands';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // that might be expected in some scenarios
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Performance monitoring helpers
Cypress.Commands.add('measurePerformance', (name, callback) => {
  cy.window().then((win) => {
    const startTime = win.performance.now();
    
    if (callback) {
      callback();
    }
    
    cy.then(() => {
      const endTime = win.performance.now();
      const duration = endTime - startTime;
      
      cy.task('recordPerformance', {
        name,
        duration,
        startTime,
        endTime,
        url: win.location.href
      });
      
      // Log to Cypress output
      cy.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    });
  });
});

// Wait for graph to be loaded and rendered
Cypress.Commands.add('waitForGraph', (options = {}) => {
  const { timeout = 10000 } = options;
  
  // Wait for the graph container to exist
  cy.get('#graph-container', { timeout }).should('exist');
  
  // Wait for SVG to be created
  cy.get('#graph-container svg', { timeout }).should('exist');
  
  // Wait for nodes to be rendered
  cy.get('#graph-container svg circle', { timeout }).should('have.length.greaterThan', 0);
  
  // Wait for edges to be rendered
  cy.get('#graph-container svg line', { timeout }).should('exist');
  
  // Wait for any loading spinners to disappear
  cy.get('.loading-spinner', { timeout: 5000 }).should('not.exist');
  
  // Small delay to ensure rendering is complete
  cy.wait(500);
});

// Custom command to interact with graph nodes
Cypress.Commands.add('clickGraphNode', (nodeSelector) => {
  cy.get(nodeSelector)
    .should('be.visible')
    .click({ force: true });
});

// Custom command to verify node details panel
Cypress.Commands.add('verifyNodeDetails', (expectedData = {}) => {
  cy.get('#node-details').should('be.visible');
  
  if (expectedData.label) {
    cy.get('#node-details').should('contain.text', expectedData.label);
  }
  
  if (expectedData.type) {
    cy.get('#node-details').should('contain.text', expectedData.type);
  }
  
  if (expectedData.connections !== undefined) {
    cy.get('#node-details').should('contain.text', expectedData.connections);
  }
});

// Custom command to apply filters
Cypress.Commands.add('applyFilter', (filterType, filterValue) => {
  // Open filters panel
  cy.get('[data-cy="filters-toggle"]').click();
  cy.get('[data-cy="filters-panel"]').should('be.visible');
  
  // Apply the specific filter
  cy.get(`[data-cy="filter-${filterType}"]`).select(filterValue);
  
  // Apply filters
  cy.get('[data-cy="apply-filters"]').click();
  
  // Wait for filtering to complete
  cy.wait(1000);
});

// Custom command to perform search
Cypress.Commands.add('searchGraph', (searchTerm) => {
  cy.get('[data-cy="search-input"]').clear().type(searchTerm);
  cy.get('[data-cy="search-button"]').click();
  cy.wait(500); // Wait for search results
});

// Custom command to take performance snapshot
Cypress.Commands.add('performanceSnapshot', (label) => {
  cy.window().then((win) => {
    const metrics = {
      label,
      url: win.location.href,
      timestamp: new Date().toISOString(),
      navigation: win.performance.getEntriesByType('navigation')[0],
      paint: win.performance.getEntriesByType('paint'),
      resources: win.performance.getEntriesByType('resource').length,
      memory: win.performance.memory || null
    };
    
    cy.task('recordPerformance', metrics);
  });
});

// Helper to wait for network requests to complete
Cypress.Commands.add('waitForNetworkIdle', (timeout = 5000) => {
  let networkIdleTimer;
  let pendingRequests = 0;
  
  cy.window().then((win) => {
    // Override fetch to track network requests
    const originalFetch = win.fetch;
    win.fetch = function(...args) {
      pendingRequests++;
      return originalFetch.apply(this, args).finally(() => {
        pendingRequests--;
        if (pendingRequests === 0) {
          clearTimeout(networkIdleTimer);
          networkIdleTimer = setTimeout(() => {
            // Network is idle
          }, 500);
        }
      });
    };
  });
  
  cy.wrap(null).should(() => {
    expect(pendingRequests).to.equal(0);
  });
});

// Accessibility testing helpers
Cypress.Commands.add('checkA11y', (context = null, options = {}) => {
  cy.injectAxe();
  cy.checkA11y(context, {
    includeTags: ['wcag2a', 'wcag2aa'],
    ...options
  });
});

// Visual regression testing placeholder
Cypress.Commands.add('visualTest', (name) => {
  // This would integrate with a visual testing service
  cy.log(`Visual test: ${name}`);
  // cy.percySnapshot(name); // Example with Percy
});

// Database and state helpers
beforeEach(() => {
  // Clear any persistent state
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up any default intercepts
  cy.intercept('GET', '/data/sample-data.json', { fixture: 'sample-data.json' }).as('sampleData');
  cy.intercept('GET', '/data/sample-relations.json', { fixture: 'sample-relations.json' }).as('sampleRelations');
});

// Global after hook for cleanup
after(() => {
  // Cleanup any resources if needed
  cy.task('log', 'Test suite completed');
});
