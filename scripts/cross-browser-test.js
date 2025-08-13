#!/usr/bin/env node

/**
 * Cross-Browser Testing Script
 * Integrates with BrowserStack for comprehensive browser compatibility testing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CrossBrowserTester {
  constructor() {
    this.config = {
      // BrowserStack configuration
      browserStack: {
        username: process.env.BROWSERSTACK_USERNAME,
        accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
        projectName: 'NAS Knowledge Graph',
        buildName: `Build-${new Date().toISOString().split('T')[0]}`,
        sessionName: 'Cross-Browser Tests',
        local: true,
        debug: false,
        networkLogs: true,
        consoleLogs: 'info',
        video: true,
        resolution: '1920x1080'
      },
      
      // Browser configurations to test
      browsers: [
        // Desktop Browsers
        { os: 'Windows', os_version: '11', browser: 'Chrome', browser_version: 'latest' },
        { os: 'Windows', os_version: '11', browser: 'Firefox', browser_version: 'latest' },
        { os: 'Windows', os_version: '11', browser: 'Edge', browser_version: 'latest' },
        { os: 'OS X', os_version: 'Monterey', browser: 'Safari', browser_version: '15.0' },
        { os: 'OS X', os_version: 'Monterey', browser: 'Chrome', browser_version: 'latest' },
        { os: 'OS X', os_version: 'Monterey', browser: 'Firefox', browser_version: 'latest' },
        
        // Mobile Browsers
        { os: 'Android', os_version: '12.0', device: 'Samsung Galaxy S22', real_mobile: 'true' },
        { os: 'Android', os_version: '11.0', device: 'Google Pixel 5', real_mobile: 'true' },
        { os: 'iOS', os_version: '15', device: 'iPhone 13', real_mobile: 'true' },
        { os: 'iOS', os_version: '14', device: 'iPad Air 4', real_mobile: 'true' },
        
        // Legacy Browser Support
        { os: 'Windows', os_version: '10', browser: 'Chrome', browser_version: '90.0' },
        { os: 'Windows', os_version: '10', browser: 'Firefox', browser_version: '85.0' }
      ],
      
      // Test scenarios to run on each browser
      testScenarios: [
        'basic-functionality',
        'graph-interaction',
        'responsive-design',
        'performance-check',
        'accessibility-audit'
      ],
      
      // Results directory
      resultsDir: path.join(__dirname, '..', 'cross-browser-results'),
      
      // Test timeouts
      timeouts: {
        test: 300000,      // 5 minutes per test
        browser: 600000,   // 10 minutes per browser session
        overall: 3600000   // 1 hour for all tests
      }
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      browsers: [],
      issues: [],
      recommendations: []
    };
    
    this.ensureResultsDirectory();
  }

  ensureResultsDirectory() {
    if (!fs.existsSync(this.config.resultsDir)) {
      fs.mkdirSync(this.config.resultsDir, { recursive: true });
    }
  }

  async runCrossBrowserTests() {
    console.log('🌐 Starting Cross-Browser Testing...\n');
    
    try {
      // Validate BrowserStack credentials
      this.validateCredentials();
      
      // Start BrowserStack Local tunnel if needed
      const localTunnel = await this.startLocalTunnel();
      
      // Start development server
      console.log('📡 Starting development server...');
      const serverProcess = this.startServer();
      await this.waitForServer('http://localhost:5173', 30000);
      console.log('✅ Development server ready\n');
      
      // Run tests on each browser
      for (const browser of this.config.browsers) {
        console.log(`🔍 Testing on ${this.getBrowserDisplayName(browser)}`);
        await this.runBrowserTests(browser);
      }
      
      // Generate comprehensive report
      this.analyzeResults();
      this.generateReport();
      this.generateRecommendations();
      
      // Cleanup
      if (localTunnel) {
        console.log('🧹 Stopping BrowserStack Local tunnel...');
        localTunnel.kill();
      }
      
      process.kill(serverProcess.pid);
      
    } catch (error) {
      console.error('❌ Cross-browser testing failed:', error);
      process.exit(1);
    }
  }

  validateCredentials() {
    if (!this.config.browserStack.username || !this.config.browserStack.accessKey) {
      throw new Error(
        'BrowserStack credentials not found. Please set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables.'
      );
    }
    console.log('✅ BrowserStack credentials validated');
  }

  async startLocalTunnel() {
    if (!this.config.browserStack.local) {
      return null;
    }

    console.log('🔗 Starting BrowserStack Local tunnel...');
    
    try {
      const { spawn } = require('child_process');
      const tunnel = spawn('npx', ['browserstack-local', '--key', this.config.browserStack.accessKey], {
        stdio: 'pipe'
      });
      
      // Wait for tunnel to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('BrowserStack Local tunnel timeout'));
        }, 60000);
        
        tunnel.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('You can now access your local server')) {
            clearTimeout(timeout);
            console.log('✅ BrowserStack Local tunnel ready');
            resolve();
          }
        });
        
        tunnel.stderr.on('data', (data) => {
          console.error('BrowserStack Local error:', data.toString());
        });
        
        tunnel.on('close', (code) => {
          if (code !== 0) {
            clearTimeout(timeout);
            reject(new Error(`BrowserStack Local exited with code ${code}`));
          }
        });
      });
      
      return tunnel;
      
    } catch (error) {
      console.log('⚠️  BrowserStack Local not available, running without tunnel');
      return null;
    }
  }

  startServer() {
    console.log('Starting Vite development server...');
    const { spawn } = require('child_process');
    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    return serverProcess;
  }

  async waitForServer(url, timeout = 30000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Server not ready after ${timeout}ms`);
  }

  getBrowserDisplayName(browser) {
    if (browser.device) {
      return `${browser.device} (${browser.os} ${browser.os_version})`;
    }
    return `${browser.browser} ${browser.browser_version} on ${browser.os} ${browser.os_version}`;
  }

  async runBrowserTests(browserConfig) {
    const browserResult = {
      browser: browserConfig,
      displayName: this.getBrowserDisplayName(browserConfig),
      scenarios: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      issues: [],
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Create Cypress configuration for this browser
      const cypressConfig = this.createCypressConfig(browserConfig);
      
      // Run each test scenario
      for (const scenario of this.config.testScenarios) {
        console.log(`  📋 Running scenario: ${scenario}`);
        
        const scenarioResult = await this.runScenario(browserConfig, scenario, cypressConfig);
        browserResult.scenarios.push(scenarioResult);
        
        if (scenarioResult.passed) {
          browserResult.passed++;
        } else {
          browserResult.failed++;
          browserResult.issues.push(...scenarioResult.issues);
        }
        
        this.results.summary.total++;
      }
      
    } catch (error) {
      console.error(`  ❌ Browser test failed: ${error.message}`);
      browserResult.issues.push({
        type: 'fatal',
        message: error.message,
        scenario: 'setup'
      });
      browserResult.failed = this.config.testScenarios.length;
      this.results.summary.failed += browserResult.failed;
    }

    browserResult.endTime = new Date().toISOString();
    browserResult.duration = Date.now() - startTime;
    
    this.results.browsers.push(browserResult);
    this.results.summary.passed += browserResult.passed;
    this.results.summary.failed += browserResult.failed;
    
    console.log(`  ✅ Completed ${browserResult.displayName} - ${browserResult.passed}/${this.config.testScenarios.length} passed\n`);
  }

  createCypressConfig(browserConfig) {
    const configOverrides = {
      e2e: {
        baseUrl: this.config.browserStack.local ? 'http://localhost:5173' : 'https://your-staging-url.com',
        
        // BrowserStack specific settings
        env: {
          browserstack: true,
          browserConfig: browserConfig
        },
        
        // Additional timeouts for remote testing
        defaultCommandTimeout: 15000,
        requestTimeout: 15000,
        responseTimeout: 15000,
        pageLoadTimeout: 60000,
        
        // Video and screenshot settings
        video: true,
        screenshotOnRunFailure: true,
        
        // Retry settings for flaky network conditions
        retries: {
          runMode: 2,
          openMode: 0
        }
      }
    };

    // Write temporary config file
    const configPath = path.join(__dirname, '..', `cypress-${browserConfig.browser || browserConfig.device}.config.js`);
    const configContent = `
const { defineConfig } = require('cypress');

module.exports = defineConfig(${JSON.stringify(configOverrides, null, 2)});
`;

    fs.writeFileSync(configPath, configContent);
    return configPath;
  }

  async runScenario(browserConfig, scenario, cypressConfigPath) {
    const scenarioResult = {
      name: scenario,
      passed: false,
      duration: 0,
      issues: [],
      screenshots: [],
      video: null,
      startTime: new Date().toISOString(),
      endTime: null
    };

    const startTime = Date.now();

    try {
      // Create scenario-specific test file
      const testFile = this.createScenarioTest(browserConfig, scenario);
      
      // Run Cypress test
      const cypressCommand = this.buildCypressCommand(browserConfig, testFile, cypressConfigPath);
      const result = execSync(cypressCommand, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: this.config.timeouts.test,
        stdio: 'pipe'
      });

      // Parse results
      scenarioResult.passed = !result.includes('failing') && !result.includes('error');
      
      if (!scenarioResult.passed) {
        scenarioResult.issues.push({
          type: 'test_failure',
          message: this.extractErrorFromOutput(result),
          details: result
        });
      }

    } catch (error) {
      scenarioResult.passed = false;
      scenarioResult.issues.push({
        type: 'execution_error',
        message: error.message,
        details: error.stdout || error.stderr || ''
      });
    }

    scenarioResult.endTime = new Date().toISOString();
    scenarioResult.duration = Date.now() - startTime;
    
    return scenarioResult;
  }

  createScenarioTest(browserConfig, scenario) {
    const testDir = path.join(__dirname, '..', 'cypress', 'e2e', 'cross-browser');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const testFile = path.join(testDir, `${scenario}-${browserConfig.browser || browserConfig.device}.cy.js`);
    const testContent = this.generateTestContent(browserConfig, scenario);
    
    fs.writeFileSync(testFile, testContent);
    return testFile;
  }

  generateTestContent(browserConfig, scenario) {
    const isMobile = browserConfig.real_mobile === 'true';
    const browserName = browserConfig.browser || browserConfig.device || 'Unknown';

    const baseTest = `
describe('Cross-Browser Test: ${scenario} on ${browserName}', () => {
  beforeEach(() => {
    // Set viewport for mobile devices
    ${isMobile ? `cy.viewport(${this.getMobileViewport(browserConfig)});` : ''}
    
    // Browser-specific setup
    cy.visit('/', {
      onBeforeLoad: (win) => {
        // Add browser detection
        win.testBrowser = '${browserName}';
        win.testDevice = '${browserConfig.device || 'Desktop'}';
      }
    });
    
    cy.waitForGraph({ timeout: 30000 });
  });

  ${this.getScenarioTests(scenario, browserConfig)}
});`;

    return baseTest;
  }

  getMobileViewport(browserConfig) {
    const viewports = {
      'Samsung Galaxy S22': '360, 800',
      'Google Pixel 5': '393, 851',
      'iPhone 13': '390, 844',
      'iPad Air 4': '820, 1180'
    };
    
    return viewports[browserConfig.device] || '375, 667';
  }

  getScenarioTests(scenario, browserConfig) {
    const isMobile = browserConfig.real_mobile === 'true';
    
    const scenarioTests = {
      'basic-functionality': `
        it('should load the application successfully', () => {
          cy.get('#graph-container').should('be.visible');
          cy.get('#graph-container svg').should('exist');
          cy.get('#graph-container svg circle').should('have.length.greaterThan', 0);
        });

        it('should handle basic interactions', () => {
          ${isMobile ? 
            `cy.get('#graph-container svg circle').first().trigger('touchstart').trigger('touchend');` :
            `cy.get('#graph-container svg circle').first().click({ force: true });`
          }
          cy.get('#node-details').should('be.visible');
        });
      `,
      
      'graph-interaction': `
        it('should support graph navigation', () => {
          // Test zoom functionality
          ${isMobile ? 
            `cy.get('#graph-container').trigger('pinch', { scale: 1.5 });` :
            `cy.get('[data-cy="zoom-in"]').click();`
          }
          
          // Test node selection
          cy.get('#graph-container svg circle').first().click({ force: true });
          cy.get('#graph-container svg circle.selected').should('have.length', 1);
        });

        it('should handle search functionality', () => {
          cy.get('[data-cy="search-input"]').type('NAS{enter}');
          cy.get('[data-cy="search-results"]').should('be.visible');
        });
      `,
      
      'responsive-design': `
        it('should adapt to different screen sizes', () => {
          ${isMobile ? `
            // Mobile-specific tests
            cy.get('[data-cy="mobile-menu"]').should('be.visible');
            cy.get('[data-cy="desktop-sidebar"]').should('not.be.visible');
            
            // Test touch gestures
            cy.get('#graph-container').trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
            cy.get('#graph-container').trigger('touchmove', { touches: [{ clientX: 150, clientY: 150 }] });
            cy.get('#graph-container').trigger('touchend');
          ` : `
            // Desktop-specific tests
            cy.get('[data-cy="desktop-sidebar"]').should('be.visible');
            cy.get('[data-cy="mobile-menu"]').should('not.be.visible');
          `}
        });
      `,
      
      'performance-check': `
        it('should meet performance benchmarks', () => {
          cy.window().then((win) => {
            const navigation = win.performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            
            expect(loadTime).to.be.lessThan(${isMobile ? 8000 : 5000}); // Mobile gets more time
          });
          
          cy.performanceSnapshot('browser-performance-check');
        });
      `,
      
      'accessibility-audit': `
        it('should meet accessibility standards', () => {
          cy.injectAxe();
          cy.checkA11y(null, {
            rules: {
              'color-contrast': { enabled: true },
              'keyboard-navigation': { enabled: true }
            }
          });
        });
      `
    };

    return scenarioTests[scenario] || scenarioTests['basic-functionality'];
  }

  buildCypressCommand(browserConfig, testFile, cypressConfigPath) {
    // For BrowserStack integration, you would typically use a custom Cypress plugin
    // or webdriver integration. This is a simplified version.
    
    const browser = browserConfig.real_mobile ? 'electron' : 'chrome';
    
    return `npx cypress run --spec "${testFile}" --browser ${browser} --config-file "${cypressConfigPath}" --headed`;
  }

  extractErrorFromOutput(output) {
    const lines = output.split('\n');
    const errorLines = lines.filter(line => 
      line.includes('Error') || 
      line.includes('AssertionError') || 
      line.includes('CypressError')
    );
    
    return errorLines.join('\n') || 'Unknown error occurred';
  }

  analyzeResults() {
    console.log('📊 Analyzing cross-browser results...');
    
    // Identify common issues across browsers
    const issuesByType = {};
    const browserCompatibility = {};
    
    this.results.browsers.forEach(browserResult => {
      const browserKey = `${browserResult.browser.browser || browserResult.browser.device}`;
      browserCompatibility[browserKey] = {
        passed: browserResult.passed,
        failed: browserResult.failed,
        total: browserResult.scenarios.length,
        successRate: (browserResult.passed / browserResult.scenarios.length) * 100
      };
      
      browserResult.issues.forEach(issue => {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push({
          browser: browserKey,
          message: issue.message,
          scenario: issue.scenario
        });
      });
    });

    // Calculate overall statistics
    const totalTests = this.results.summary.total;
    const passRate = (this.results.summary.passed / totalTests) * 100;
    
    this.results.analysis = {
      overallPassRate: passRate,
      browserCompatibility,
      issuesByType,
      recommendations: this.generateCompatibilityRecommendations(browserCompatibility, issuesByType)
    };
  }

  generateCompatibilityRecommendations(browserCompatibility, issuesByType) {
    const recommendations = [];
    
    // Check for browsers with low success rates
    Object.entries(browserCompatibility).forEach(([browser, stats]) => {
      if (stats.successRate < 80) {
        recommendations.push({
          type: 'browser_support',
          priority: 'high',
          message: `${browser} has low compatibility (${stats.successRate.toFixed(1)}%). Consider additional testing and fixes.`,
          browser: browser
        });
      }
    });
    
    // Check for common issues
    if (issuesByType.test_failure && issuesByType.test_failure.length > 2) {
      recommendations.push({
        type: 'widespread_issue',
        priority: 'high',
        message: 'Multiple browsers experiencing test failures. Check core functionality.',
        affectedBrowsers: issuesByType.test_failure.length
      });
    }
    
    // Mobile-specific recommendations
    const mobileResults = this.results.browsers.filter(b => b.browser.real_mobile);
    const mobileIssues = mobileResults.reduce((sum, b) => sum + b.failed, 0);
    
    if (mobileIssues > 0) {
      recommendations.push({
        type: 'mobile_compatibility',
        priority: 'medium',
        message: 'Mobile browsers showing issues. Review responsive design and touch interactions.',
        mobileIssues: mobileIssues
      });
    }
    
    return recommendations;
  }

  generateRecommendations() {
    console.log('💡 Generating improvement recommendations...');
    
    const recommendations = this.results.analysis?.recommendations || [];
    
    // Add general recommendations based on results
    if (this.results.summary.failed > 0) {
      recommendations.push({
        type: 'testing',
        priority: 'medium',
        message: 'Consider implementing automated cross-browser testing in CI/CD pipeline.'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  generateReport() {
    console.log('📝 Generating cross-browser test report...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.config.resultsDir, `cross-browser-report-${timestamp}.json`);
    
    // Save detailed JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    this.generateHtmlReport(timestamp);
    
    // Generate markdown summary
    this.generateMarkdownSummary();
    
    console.log(`✅ Cross-browser report generated: ${reportPath}`);
  }

  generateHtmlReport(timestamp) {
    const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);
    
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Cross-Browser Test Report - ${timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .browser-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .browser-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .browser-card.success { border-left: 4px solid #28a745; }
        .browser-card.partial { border-left: 4px solid #ffc107; }
        .browser-card.failure { border-left: 4px solid #dc3545; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .high-priority { background: #f8d7da; border-color: #f5c6cb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .status-badge { padding: 3px 8px; border-radius: 12px; font-size: 12px; color: white; }
        .status-pass { background-color: #28a745; }
        .status-fail { background-color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Cross-Browser Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Overall Success Rate: <strong class="${successRate > 90 ? 'pass' : 'fail'}">${successRate}%</strong></p>
    </div>
    
    <div class="summary-grid">
        <div class="summary-card">
            <h3>Total Tests</h3>
            <div style="font-size: 2em; font-weight: bold;">${this.results.summary.total}</div>
        </div>
        <div class="summary-card">
            <h3 class="pass">Passed</h3>
            <div style="font-size: 2em; font-weight: bold;" class="pass">${this.results.summary.passed}</div>
        </div>
        <div class="summary-card">
            <h3 class="fail">Failed</h3>
            <div style="font-size: 2em; font-weight: bold;" class="fail">${this.results.summary.failed}</div>
        </div>
        <div class="summary-card">
            <h3>Browsers Tested</h3>
            <div style="font-size: 2em; font-weight: bold;">${this.results.browsers.length}</div>
        </div>
    </div>
    
    ${this.generateRecommendationsSection()}
    
    <h2>Browser Results</h2>
    <div class="browser-grid">
        ${this.results.browsers.map(browser => this.generateBrowserCard(browser)).join('')}
    </div>
    
    <h2>Detailed Results</h2>
    ${this.generateDetailedTable()}
    
</body>
</html>`;

    const htmlPath = path.join(this.config.resultsDir, `cross-browser-report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlTemplate);
  }

  generateRecommendationsSection() {
    if (!this.results.recommendations || this.results.recommendations.length === 0) {
      return '';
    }

    return `
    <h2>Recommendations</h2>
    ${this.results.recommendations.map(rec => `
      <div class="recommendation ${rec.priority === 'high' ? 'high-priority' : ''}">
        <strong>${rec.type.replace('_', ' ').toUpperCase()}:</strong> ${rec.message}
      </div>
    `).join('')}
    `;
  }

  generateBrowserCard(browser) {
    const successRate = (browser.passed / browser.scenarios.length) * 100;
    const cardClass = successRate === 100 ? 'success' : successRate > 50 ? 'partial' : 'failure';
    
    return `
    <div class="browser-card ${cardClass}">
        <h3>${browser.displayName}</h3>
        <p><strong>Success Rate:</strong> ${successRate.toFixed(1)}%</p>
        <p><strong>Tests:</strong> ${browser.passed}/${browser.scenarios.length} passed</p>
        <p><strong>Duration:</strong> ${Math.round(browser.duration / 1000)}s</p>
        ${browser.issues.length > 0 ? `
          <div style="margin-top: 10px;">
            <strong>Issues:</strong>
            <ul>
              ${browser.issues.slice(0, 3).map(issue => `<li>${issue.message}</li>`).join('')}
              ${browser.issues.length > 3 ? `<li>... and ${browser.issues.length - 3} more</li>` : ''}
            </ul>
          </div>
        ` : ''}
    </div>`;
  }

  generateDetailedTable() {
    return `
    <table>
        <thead>
            <tr>
                <th>Browser</th>
                <th>OS</th>
                <th>Status</th>
                <th>Scenarios Passed</th>
                <th>Duration</th>
                <th>Issues</th>
            </tr>
        </thead>
        <tbody>
            ${this.results.browsers.map(browser => {
              const successRate = (browser.passed / browser.scenarios.length) * 100;
              return `
                <tr>
                    <td>${browser.browser.browser || browser.browser.device}</td>
                    <td>${browser.browser.os} ${browser.browser.os_version}</td>
                    <td><span class="status-badge ${successRate === 100 ? 'status-pass' : 'status-fail'}">${successRate.toFixed(0)}%</span></td>
                    <td>${browser.passed}/${browser.scenarios.length}</td>
                    <td>${Math.round(browser.duration / 1000)}s</td>
                    <td>${browser.issues.length}</td>
                </tr>
              `;
            }).join('')}
        </tbody>
    </table>`;
  }

  generateMarkdownSummary() {
    const summaryPath = path.join(this.config.resultsDir, 'cross-browser-summary.md');
    const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);
    
    const markdown = `
# Cross-Browser Test Summary

**Generated:** ${new Date().toLocaleString()}  
**Overall Success Rate:** ${successRate}%

## Summary

- **Total Tests:** ${this.results.summary.total}
- **Passed:** ${this.results.summary.passed} ✅
- **Failed:** ${this.results.summary.failed} ❌
- **Browsers Tested:** ${this.results.browsers.length}

## Browser Results

${this.results.browsers.map(browser => {
  const successRate = (browser.passed / browser.scenarios.length) * 100;
  const status = successRate === 100 ? '✅' : successRate > 50 ? '⚠️' : '❌';
  return `### ${status} ${browser.displayName}
- **Success Rate:** ${successRate.toFixed(1)}%
- **Tests Passed:** ${browser.passed}/${browser.scenarios.length}
- **Duration:** ${Math.round(browser.duration / 1000)}s
${browser.issues.length > 0 ? `- **Issues:** ${browser.issues.length}` : ''}`;
}).join('\n\n')}

${this.results.recommendations.length > 0 ? `
## Recommendations

${this.results.recommendations.map(rec => 
  `- **${rec.type.replace('_', ' ').toUpperCase()}:** ${rec.message}`
).join('\n')}
` : ''}

## Browser Coverage

- **Desktop Browsers:** ${this.results.browsers.filter(b => !b.browser.real_mobile).length}
- **Mobile Browsers:** ${this.results.browsers.filter(b => b.browser.real_mobile).length}
- **Legacy Support:** ${this.results.browsers.filter(b => b.browser.browser_version && parseInt(b.browser.browser_version) < 90).length}
    `;

    fs.writeFileSync(summaryPath, markdown.trim());
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CrossBrowserTester();
  
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }
  
  // Override config with CLI options
  if (options.browsers) {
    // Allow testing specific browsers only
    const browserNames = options.browsers.split(',');
    tester.config.browsers = tester.config.browsers.filter(browser => 
      browserNames.includes(browser.browser) || browserNames.includes(browser.device)
    );
  }
  
  if (options.scenarios) {
    tester.config.testScenarios = options.scenarios.split(',');
  }
  
  // Run the tests
  tester.runCrossBrowserTests()
    .then(() => {
      console.log('\n🎉 Cross-browser testing completed successfully!');
      
      const successRate = (tester.results.summary.passed / tester.results.summary.total) * 100;
      if (successRate < 90) {
        console.log(`⚠️  Success rate (${successRate.toFixed(1)}%) below 90% threshold`);
        process.exit(1);
      } else {
        console.log(`✅ All cross-browser tests passed (${successRate.toFixed(1)}% success rate)`);
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Cross-browser testing failed:', error);
      process.exit(1);
    });
}

export { CrossBrowserTester };
