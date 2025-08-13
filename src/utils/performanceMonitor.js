/**
 * Performance Monitoring Utility
 * Tracks Core Web Vitals and application-specific metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isEnabled = true;
        this.reportingEndpoint = null;

        this.initCustomMetrics();
        this.setupPerformanceObserver();

        // Report metrics periodically
        setInterval(() => {
            this.reportMetrics();
        }, 60000); // Every minute
    }

    /**
     * Initialize custom application metrics
     */
    initCustomMetrics() {
        // Track initial load performance
        this.trackInitialLoad();

        // Track graph rendering performance
        this.trackGraphRendering();

        // Track search performance
        this.trackSearchPerformance();

        // Track memory usage
        this.trackMemoryUsage();
    }

    /**
     * Setup Performance Observer for detailed metrics
     */
    setupPerformanceObserver() {
        if (!('PerformanceObserver' in window)) {return;}

        // Navigation timing
        const navObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                this.recordMetric('navigation', entry.duration, {
                    type: entry.type,
                    loadEventEnd: entry.loadEventEnd,
                    domContentLoaded: entry.domContentLoadedEventEnd
                });
            });
        });

        try {
            navObserver.observe({ type: 'navigation', buffered: true });
        } catch (e) {
            console.warn('Navigation timing not supported');
        }

        // Resource timing
        const resourceObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.name.includes('d3') ||
                    entry.name.includes('sample-data') ||
                    entry.name.includes('.js') ||
                    entry.name.includes('.css')) {

                    this.recordMetric('resource-load', entry.duration, {
                        name: entry.name,
                        size: entry.transferSize,
                        type: this.getResourceType(entry.name)
                    });
                }
            });
        });

        try {
            resourceObserver.observe({ type: 'resource', buffered: true });
        } catch (e) {
            console.warn('Resource timing not supported');
        }

        // Long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                this.recordMetric('long-task', entry.duration, {
                    startTime: entry.startTime,
                    attribution: entry.attribution
                });
            });
        });

        try {
            longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch (e) {
            console.warn('Long task timing not supported');
        }

        this.observers.set('navigation', navObserver);
        this.observers.set('resource', resourceObserver);
        this.observers.set('longtask', longTaskObserver);
    }

    /**
     * Track initial application load
     */
    trackInitialLoad() {
        const startTime = performance.now();

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.recordMetric('dom-ready', performance.now() - startTime);
            });
        } else {
            this.recordMetric('dom-ready', 0);
        }

        // Track when app is fully initialized
        window.addEventListener('load', () => {
            this.recordMetric('app-load', performance.now() - startTime);

            // Track initial paint
            if ('getEntriesByType' in performance) {
                const paintEntries = performance.getEntriesByType('paint');
                paintEntries.forEach((entry) => {
                    this.recordMetric(`paint-${entry.name}`, entry.startTime);
                });
            }
        });
    }

    /**
     * Track graph rendering performance
     */
    trackGraphRendering() {
        // Listen for custom events from graph components
        document.addEventListener('graph-render-start', (event) => {
            const startTime = performance.now();
            event.detail.startTime = startTime;
        });

        document.addEventListener('graph-render-complete', (event) => {
            const endTime = performance.now();
            const startTime = event.detail.startTime;

            if (startTime) {
                const renderTime = endTime - startTime;
                this.recordMetric('graph-render', renderTime, {
                    nodeCount: event.detail.nodeCount,
                    edgeCount: event.detail.edgeCount,
                    layoutType: event.detail.layoutType
                });

                // Check if render time meets performance targets
                if (renderTime > 2000) { // 2 second target
                    this.recordMetric('graph-render-slow', renderTime);
                    console.warn(`Slow graph render: ${renderTime}ms`);
                }
            }
        });
    }

    /**
     * Track search performance
     */
    trackSearchPerformance() {
        document.addEventListener('search-start', (event) => {
            const startTime = performance.now();
            event.detail.startTime = startTime;
        });

        document.addEventListener('search-complete', (event) => {
            const endTime = performance.now();
            const startTime = event.detail.startTime;

            if (startTime) {
                const searchTime = endTime - startTime;
                this.recordMetric('search-performance', searchTime, {
                    query: event.detail.query,
                    resultCount: event.detail.resultCount,
                    scope: event.detail.scope
                });

                // Track slow searches
                if (searchTime > 500) { // 500ms threshold
                    this.recordMetric('search-slow', searchTime);
                }
            }
        });
    }

    /**
     * Track memory usage
     */
    trackMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.recordMetric('memory-usage', memory.usedJSHeapSize, {
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
                });
            }, 30000); // Every 30 seconds
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(name, value, metadata = {}) {
        if (!this.isEnabled) {return;}

        const timestamp = Date.now();
        const metric = {
            name,
            value,
            timestamp,
            url: location.pathname,
            userAgent: navigator.userAgent,
            metadata
        };

        // Store locally
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        this.metrics.get(name).push(metric);

        // Limit stored metrics to prevent memory bloat
        if (this.metrics.get(name).length > 100) {
            this.metrics.get(name).shift();
        }

        // Emit custom event for real-time monitoring
        document.dispatchEvent(new CustomEvent('performance-metric', {
            detail: metric
        }));
    }

    /**
     * Get resource type from URL
     */
    getResourceType(url) {
        if (url.includes('.css')) {return 'stylesheet';}
        if (url.includes('.js')) {return 'script';}
        if (url.includes('.json')) {return 'data';}
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {return 'image';}
        if (url.includes('d3js.org')) {return 'library';}
        return 'other';
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const summary = {
            customMetrics: {},
            resources: {},
            timestamp: Date.now()
        };

        // Custom metrics
        ['graph-render', 'search-performance', 'app-load'].forEach(metric => {
            const values = this.metrics.get(metric) || [];
            if (values.length > 0) {
                const avg = values.reduce((sum, m) => sum + m.value, 0) / values.length;
                summary.customMetrics[metric] = {
                    average: avg,
                    count: values.length,
                    latest: values[values.length - 1].value
                };
            }
        });

        // Resource performance
        const resourceMetrics = this.metrics.get('resource-load') || [];
        const resourceTypes = {};

        resourceMetrics.forEach(metric => {
            const type = metric.metadata.type;
            if (!resourceTypes[type]) {
                resourceTypes[type] = { count: 0, totalTime: 0 };
            }
            resourceTypes[type].count++;
            resourceTypes[type].totalTime += metric.value;
        });

        Object.keys(resourceTypes).forEach(type => {
            const data = resourceTypes[type];
            summary.resources[type] = {
                count: data.count,
                averageLoadTime: data.totalTime / data.count
            };
        });

        return summary;
    }

    /**
     * Report metrics to console
     */
    reportMetrics() {
        const summary = this.getPerformanceSummary();

        console.group('📊 Performance Report');
        console.log('Custom Metrics:', summary.customMetrics);
        console.log('Resource Performance:', summary.resources);
        console.groupEnd();
    }

    /**
     * Check if performance targets are met
     */
    checkPerformanceTargets() {
        const targets = {
            'app-load': 3000, // 3 seconds initial load
            'graph-render': 2000, // 2 seconds graph render
            'search-performance': 500 // 500ms search
        };

        const results = {};

        Object.entries(targets).forEach(([metric, target]) => {
            const values = this.metrics.get(metric) || [];
            if (values.length > 0) {
                const latest = values[values.length - 1].value;
                results[metric] = {
                    value: latest,
                    target: target,
                    met: latest <= target
                };
            }
        });

        return results;
    }

    /**
     * Destroy performance monitor
     */
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.metrics.clear();
        this.isEnabled = false;
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export for manual usage
export { performanceMonitor, PerformanceMonitor };

// Auto-start monitoring
if (typeof window !== 'undefined') {
    window.performanceMonitor = performanceMonitor;
    console.log('📊 Performance monitoring initialized');
}

export default performanceMonitor;
