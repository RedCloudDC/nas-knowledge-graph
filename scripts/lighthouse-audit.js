#!/usr/bin/env node

/**
 * Lighthouse Performance Audit Script
 * Verifies performance targets for the NAS Knowledge Graph app
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Performance targets
const PERFORMANCE_TARGETS = {
    initialLoad: 3000,    // 3 seconds
    graphRender: 2000,    // 2 seconds  
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2500,
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100
};

class PerformanceAuditor {
    constructor() {
        this.results = {};
        this.chrome = null;
    }

    async audit(url = 'http://localhost:3000') {
        console.log('🚀 Starting Lighthouse performance audit...');
        console.log(`Target URL: ${url}`);
        
        try {
            // Launch Chrome
            this.chrome = await chromeLauncher.launch({
                chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
            });

            // Run Lighthouse
            const options = {
                logLevel: 'info',
                output: 'json',
                onlyCategories: ['performance'],
                port: this.chrome.port,
                throttling: {
                    rttMs: 150,
                    throughputKbps: 1.6 * 1024,
                    cpuSlowdownMultiplier: 4
                }
            };

            console.log('Running Lighthouse audit...');
            const runnerResult = await lighthouse(url, options);
            
            await this.processResults(runnerResult);
            await this.generateReport();
            
            return this.results;

        } catch (error) {
            console.error('❌ Lighthouse audit failed:', error.message);
            throw error;
        } finally {
            if (this.chrome) {
                await this.chrome.kill();
            }
        }
    }

    async processResults(runnerResult) {
        const { lhr } = runnerResult;
        const performance = lhr.categories.performance;
        
        this.results = {
            score: Math.round(performance.score * 100),
            metrics: {},
            audits: {},
            opportunities: [],
            diagnostics: [],
            targetsMet: {},
            timestamp: new Date().toISOString()
        };

        // Extract key metrics
        const metrics = lhr.audits;
        
        this.results.metrics = {
            firstContentfulPaint: this.getMetricValue(metrics['first-contentful-paint']),
            largestContentfulPaint: this.getMetricValue(metrics['largest-contentful-paint']),
            firstInputDelay: this.getMetricValue(metrics['max-potential-fid']),
            cumulativeLayoutShift: this.getMetricValue(metrics['cumulative-layout-shift']),
            speedIndex: this.getMetricValue(metrics['speed-index']),
            timeToInteractive: this.getMetricValue(metrics['interactive'])
        };

        // Check performance targets
        this.checkPerformanceTargets();

        // Extract opportunities and diagnostics
        Object.values(metrics).forEach(audit => {
            if (audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0) {
                this.results.opportunities.push({
                    title: audit.title,
                    description: audit.description,
                    savings: audit.displayValue,
                    impact: audit.numericValue
                });
            }
            
            if (audit.scoreDisplayMode === 'numeric' && audit.score < 0.9) {
                this.results.diagnostics.push({
                    title: audit.title,
                    description: audit.description,
                    score: audit.score,
                    displayValue: audit.displayValue
                });
            }
        });

        // Sort by impact
        this.results.opportunities.sort((a, b) => b.impact - a.impact);
        this.results.diagnostics.sort((a, b) => a.score - b.score);
    }

    getMetricValue(audit) {
        if (!audit) return null;
        return {
            value: audit.numericValue,
            displayValue: audit.displayValue,
            score: audit.score
        };
    }

    checkPerformanceTargets() {
        const metrics = this.results.metrics;
        
        this.results.targetsMet = {
            firstContentfulPaint: {
                target: PERFORMANCE_TARGETS.firstContentfulPaint,
                actual: metrics.firstContentfulPaint?.value,
                met: metrics.firstContentfulPaint?.value <= PERFORMANCE_TARGETS.firstContentfulPaint
            },
            largestContentfulPaint: {
                target: PERFORMANCE_TARGETS.largestContentfulPaint,
                actual: metrics.largestContentfulPaint?.value,
                met: metrics.largestContentfulPaint?.value <= PERFORMANCE_TARGETS.largestContentfulPaint
            },
            cumulativeLayoutShift: {
                target: PERFORMANCE_TARGETS.cumulativeLayoutShift,
                actual: metrics.cumulativeLayoutShift?.value,
                met: metrics.cumulativeLayoutShift?.value <= PERFORMANCE_TARGETS.cumulativeLayoutShift
            },
            firstInputDelay: {
                target: PERFORMANCE_TARGETS.firstInputDelay,
                actual: metrics.firstInputDelay?.value,
                met: metrics.firstInputDelay?.value <= PERFORMANCE_TARGETS.firstInputDelay
            }
        };
    }

    async generateReport() {
        console.log('\n📊 LIGHTHOUSE PERFORMANCE AUDIT RESULTS');
        console.log('========================================');
        
        console.log(`\n🎯 Overall Performance Score: ${this.results.score}/100`);
        
        console.log('\n📈 Core Web Vitals:');
        Object.entries(this.results.targetsMet).forEach(([metric, data]) => {
            const status = data.met ? '✅' : '❌';
            const actual = data.actual ? Math.round(data.actual) : 'N/A';
            console.log(`  ${status} ${metric}: ${actual}ms (target: ${data.target}ms)`);
        });

        console.log('\n⚡ Key Metrics:');
        Object.entries(this.results.metrics).forEach(([name, metric]) => {
            if (metric && metric.displayValue) {
                console.log(`  • ${name}: ${metric.displayValue}`);
            }
        });

        if (this.results.opportunities.length > 0) {
            console.log('\n🚀 Top Optimization Opportunities:');
            this.results.opportunities.slice(0, 5).forEach(opp => {
                console.log(`  • ${opp.title}: ${opp.savings}`);
            });
        }

        if (this.results.diagnostics.length > 0) {
            console.log('\n⚠️  Performance Issues:');
            this.results.diagnostics.slice(0, 3).forEach(diag => {
                console.log(`  • ${diag.title} (Score: ${Math.round(diag.score * 100)}/100)`);
            });
        }

        // Save detailed report
        const reportPath = path.join(process.cwd(), 'lighthouse-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }
}

// CLI execution
if (require.main === module) {
    const url = process.argv[2] || 'http://localhost:3000';
    
    const auditor = new PerformanceAuditor();
    auditor.audit(url)
        .then(results => {
            const targetsMet = Object.values(results.targetsMet).every(target => target.met);
            console.log(`\n${targetsMet ? '✅' : '❌'} Performance targets ${targetsMet ? 'MET' : 'NOT MET'}`);
            process.exit(targetsMet ? 0 : 1);
        })
        .catch(error => {
            console.error('Audit failed:', error);
            process.exit(1);
        });
}

module.exports = PerformanceAuditor;
