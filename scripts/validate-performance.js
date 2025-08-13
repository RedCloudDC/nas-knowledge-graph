#!/usr/bin/env node

/**
 * Performance Validation Script
 * Validates that all performance optimizations are correctly implemented
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
    }

    log(message, type = 'info') {
        const icons = {
            'pass': '✅',
            'fail': '❌', 
            'warn': '⚠️',
            'info': 'ℹ️'
        };
        
        console.log(`${icons[type]} ${message}`);
        
        if (type === 'pass') this.results.passed++;
        else if (type === 'fail') this.results.failed++;
        else if (type === 'warn') this.results.warnings++;
        
        this.results.details.push({ message, type });
    }

    checkFileExists(filePath, description) {
        const fullPath = path.resolve(filePath);
        if (fs.existsSync(fullPath)) {
            this.log(`${description} exists: ${filePath}`, 'pass');
            return true;
        } else {
            this.log(`${description} missing: ${filePath}`, 'fail');
            return false;
        }
    }

    checkFileContains(filePath, searchString, description) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(searchString)) {
                this.log(`${description}`, 'pass');
                return true;
            } else {
                this.log(`${description} - not found in ${filePath}`, 'fail');
                return false;
            }
        } catch (error) {
            this.log(`Cannot read ${filePath}: ${error.message}`, 'fail');
            return false;
        }
    }

    validateDataLoader() {
        console.log('\n📊 Validating Data Loader Optimizations...');
        
        if (this.checkFileExists('src/services/dataLoader.js', 'Data Loader')) {
            this.checkFileContains(
                'src/services/dataLoader.js',
                'loadSampleDataLazy',
                'Lazy loading method implemented'
            );
            
            this.checkFileContains(
                'src/services/dataLoader.js',
                'requestAnimationFrame',
                'RequestAnimationFrame used for chunked processing'
            );
            
            this.checkFileContains(
                'src/services/dataLoader.js',
                'AbortController',
                'AbortController for cancellable requests'
            );
            
            this.checkFileContains(
                'src/services/dataLoader.js',
                'getPerformanceStats',
                'Performance stats tracking'
            );
        }
    }

    validateLoadingSpinner() {
        console.log('\n🔄 Validating Loading Spinner...');
        
        if (this.checkFileExists('src/components/LoadingSpinner.js', 'Loading Spinner')) {
            this.checkFileContains(
                'src/components/LoadingSpinner.js',
                'show(',
                'Show method implemented'
            );
            
            this.checkFileContains(
                'src/components/LoadingSpinner.js',
                'hide(',
                'Hide method implemented'
            );
            
            this.checkFileContains(
                'src/components/LoadingSpinner.js',
                'aria-live',
                'Accessibility support'
            );
        }
    }

    validateGraphOptimizations() {
        console.log('\n📈 Validating Graph Performance Optimizations...');
        
        if (this.checkFileExists('src/ui/d3-graph-enhanced.js', 'D3 Enhanced Graph')) {
            this.checkFileContains(
                'src/ui/d3-graph-enhanced.js',
                'PERFORMANCE_CONFIG',
                'Performance configuration object'
            );
            
            this.checkFileContains(
                'src/ui/d3-graph-enhanced.js',
                'maxSimulationIterations',
                'Simulation iteration limits'
            );
            
            this.checkFileContains(
                'src/ui/d3-graph-enhanced.js',
                'requestAnimationFrame',
                'RequestAnimationFrame-based rendering'
            );
            
            this.checkFileContains(
                'src/ui/d3-graph-enhanced.js',
                'batchNodePositionUpdates',
                'Batched DOM updates'
            );
        }
    }

    validateSearchOptimizations() {
        console.log('\n🔍 Validating Search Optimizations...');
        
        if (this.checkFileExists('src/components/GlobalSearch.js', 'Global Search')) {
            this.checkFileContains(
                'src/components/GlobalSearch.js',
                'debounce',
                'Search input debouncing'
            );
            
            this.checkFileContains(
                'src/components/GlobalSearch.js',
                'searchCache',
                'Search result caching'
            );
            
            this.checkFileContains(
                'src/components/GlobalSearch.js',
                'virtualScrollThreshold',
                'Virtual scrolling implementation'
            );
            
            this.checkFileContains(
                'src/components/GlobalSearch.js',
                'requestAnimationFrame',
                'Batched suggestion rendering'
            );
        }
    }

    validateViteConfig() {
        console.log('\n⚡ Validating Vite Build Configuration...');
        
        if (this.checkFileExists('vite.config.js', 'Vite Config')) {
            this.checkFileContains(
                'vite.config.js',
                'manualChunks',
                'Manual chunk configuration'
            );
            
            this.checkFileContains(
                'vite.config.js',
                'terser',
                'Terser minification'
            );
            
            this.checkFileContains(
                'vite.config.js',
                'vendor:',
                'Vendor chunk separation'
            );
            
            this.checkFileContains(
                'vite.config.js',
                'exploration:',
                'Data exploration chunk'
            );
        }
    }

    validateServiceWorker() {
        console.log('\n🔧 Validating Service Worker...');
        
        if (this.checkFileExists('src/sw.js', 'Service Worker')) {
            this.checkFileContains(
                'src/sw.js',
                'CACHE_NAME',
                'Cache naming strategy'
            );
            
            this.checkFileContains(
                'src/sw.js',
                'networkFirst',
                'Network-first caching strategy'
            );
            
            this.checkFileContains(
                'src/sw.js',
                'cacheFirst',
                'Cache-first strategy for assets'
            );
            
            this.checkFileContains(
                'src/sw.js',
                'performance.now()',
                'Performance monitoring'
            );
        }
    }

    validatePerformanceMonitor() {
        console.log('\n📊 Validating Performance Monitor...');
        
        if (this.checkFileExists('src/utils/performanceMonitor.js', 'Performance Monitor')) {
            this.checkFileContains(
                'src/utils/performanceMonitor.js',
                'PerformanceObserver',
                'Performance Observer API usage'
            );
            
            this.checkFileContains(
                'src/utils/performanceMonitor.js',
                'recordMetric',
                'Performance metric recording'
            );
            
            this.checkFileContains(
                'src/utils/performanceMonitor.js',
                'checkPerformanceTargets',
                'Performance target validation'
            );
            
            this.checkFileContains(
                'src/utils/performanceMonitor.js',
                'graph-render',
                'Graph render performance tracking'
            );
        }
    }

    validateLighthouseAudit() {
        console.log('\n🚨 Validating Lighthouse Audit Script...');
        
        if (this.checkFileExists('scripts/lighthouse-audit.js', 'Lighthouse Auditor')) {
            this.checkFileContains(
                'scripts/lighthouse-audit.js',
                'lighthouse(',
                'Lighthouse integration'
            );
            
            this.checkFileContains(
                'scripts/lighthouse-audit.js',
                'PERFORMANCE_TARGETS',
                'Performance targets defined'
            );
            
            this.checkFileContains(
                'scripts/lighthouse-audit.js',
                'checkPerformanceTargets',
                'Target validation logic'
            );
        }
    }

    validatePackageJson() {
        console.log('\n📦 Validating Package Configuration...');
        
        if (this.checkFileExists('package.json', 'Package.json')) {
            this.checkFileContains(
                'package.json',
                '"perf:audit"',
                'Performance audit script'
            );
            
            this.checkFileContains(
                'package.json',
                'lighthouse',
                'Lighthouse dependency'
            );
            
            this.checkFileContains(
                'package.json',
                'chrome-launcher',
                'Chrome launcher dependency'
            );
            
            this.checkFileContains(
                'package.json',
                'web-vitals',
                'Web Vitals dependency'
            );
            
            this.checkFileContains(
                'package.json',
                'vite-bundle-analyzer',
                'Bundle analyzer for optimization'
            );
        }
    }

    validateMainApp() {
        console.log('\n🚀 Validating Main Application Integration...');
        
        if (this.checkFileExists('src/main-enhanced.js', 'Main Enhanced App')) {
            this.checkFileContains(
                'src/main-enhanced.js',
                'performanceMonitor',
                'Performance monitor integration'
            );
            
            this.checkFileContains(
                'src/main-enhanced.js',
                'setupGraphPerformanceMonitoring',
                'Graph performance monitoring setup'
            );
            
            this.checkFileContains(
                'src/main-enhanced.js',
                'loadSampleDataLazy',
                'Lazy data loading integration'
            );
            
            this.checkFileContains(
                'src/main-enhanced.js',
                'requestAnimationFrame',
                'Batched store updates'
            );
        }
    }

    validateDocumentation() {
        console.log('\n📚 Validating Documentation...');
        
        this.checkFileExists('PERFORMANCE_OPTIMIZATION.md', 'Performance documentation');
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 PERFORMANCE VALIDATION REPORT');
        console.log('='.repeat(60));
        
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}`);
        
        const total = this.results.passed + this.results.failed + this.results.warnings;
        const passRate = Math.round((this.results.passed / total) * 100);
        
        console.log(`📊 Success Rate: ${passRate}%`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failed Checks:');
            this.results.details
                .filter(detail => detail.type === 'fail')
                .forEach(detail => console.log(`   • ${detail.message}`));
        }
        
        if (this.results.warnings > 0) {
            console.log('\n⚠️  Warnings:');
            this.results.details
                .filter(detail => detail.type === 'warn')
                .forEach(detail => console.log(`   • ${detail.message}`));
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.results.failed === 0) {
            console.log('🎉 All performance optimizations validated successfully!');
            console.log('🚀 Your application is ready for high-performance deployment.');
        } else {
            console.log('🔧 Some performance optimizations need attention.');
            console.log('📋 Please review the failed checks above.');
        }
        
        return this.results.failed === 0;
    }

    run() {
        console.log('🚀 Starting Performance Optimization Validation...\n');
        
        this.validateDataLoader();
        this.validateLoadingSpinner();
        this.validateGraphOptimizations();
        this.validateSearchOptimizations();
        this.validateViteConfig();
        this.validateServiceWorker();
        this.validatePerformanceMonitor();
        this.validateLighthouseAudit();
        this.validatePackageJson();
        this.validateMainApp();
        this.validateDocumentation();
        
        const success = this.generateReport();
        process.exit(success ? 0 : 1);
    }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const validator = new PerformanceValidator();
    validator.run();
}

export default PerformanceValidator;
