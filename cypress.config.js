const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    
    // Browser-specific settings
    chromeWebSecurity: false,
    
    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    // Test settings
    testIsolation: true,
    
    // Environment variables
    env: {
      coverage: true
    },
    
    setupNodeEvents(on, config) {
      // Task for performance measurements
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        recordPerformance(data) {
          // Store performance data for analysis
          const fs = require('fs');
          const path = './cypress/results/performance.json';
          
          let existingData = [];
          if (fs.existsSync(path)) {
            existingData = JSON.parse(fs.readFileSync(path, 'utf8'));
          }
          
          existingData.push({
            ...data,
            timestamp: new Date().toISOString()
          });
          
          if (!fs.existsSync('./cypress/results')) {
            fs.mkdirSync('./cypress/results', { recursive: true });
          }
          
          fs.writeFileSync(path, JSON.stringify(existingData, null, 2));
          return null;
        }
      });

      // Setup coverage collection
      require('@cypress/code-coverage/task')(on, config);
      
      return config;
    },
  },
  
  component: {
    devServer: {
      framework: 'vite',
      bundler: 'vite',
    },
    supportFile: 'cypress/support/component.js',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
  },
});
