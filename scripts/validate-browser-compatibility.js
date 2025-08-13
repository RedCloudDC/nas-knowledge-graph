/**
 * Browser Compatibility Validation Script
 * Tests and validates cross-browser support for Chrome, Firefox, Safari, Edge
 */

class BrowserCompatibilityValidator {
    constructor() {
        this.results = {
            browser: this.detectBrowser(),
            features: {},
            accessibility: {},
            performance: {},
            issues: [],
            warnings: []
        };
        
        this.init();
    }
    
    /**
     * Initialize validation tests
     */
    init() {
        this.testBrowserFeatures();
        this.testAccessibilityFeatures();
        this.testCSSFeatures();
        this.testJavaScriptAPIs();
        this.testPerformanceAPIs();
        this.generateReport();
    }
    
    /**
     * Detect current browser and version
     */
    detectBrowser() {
        const userAgent = navigator.userAgent;
        let browser = 'unknown';
        let version = 'unknown';
        
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browser = 'Chrome';
            version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
            version = userAgent.match(/Version\/(\d+)/)?.[1] || 'unknown';
        } else if (userAgent.includes('Edg')) {
            browser = 'Edge';
            version = userAgent.match(/Edg\/(\d+)/)?.[1] || 'unknown';
        }
        
        return { name: browser, version, userAgent };
    }
    
    /**
     * Test core browser features
     */
    testBrowserFeatures() {
        const features = this.results.features;
        
        // ES6+ Features
        features.es6Modules = typeof import !== 'undefined';
        features.asyncAwait = this.testAsyncAwait();
        features.arrowFunctions = this.testArrowFunctions();
        features.destructuring = this.testDestructuring();
        features.templateLiterals = this.testTemplateLiterals();
        features.classes = this.testClasses();
        
        // DOM APIs
        features.querySelector = typeof document.querySelector === 'function';
        features.addEventListener = typeof document.addEventListener === 'function';
        features.classList = 'classList' in document.createElement('div');
        features.dataset = 'dataset' in document.createElement('div');
        features.customElements = typeof customElements !== 'undefined';
        
        // Storage APIs
        features.localStorage = typeof localStorage !== 'undefined';
        features.sessionStorage = typeof sessionStorage !== 'undefined';
        features.indexedDB = typeof indexedDB !== 'undefined';
        
        // Network APIs
        features.fetch = typeof fetch === 'function';
        features.webSockets = typeof WebSocket !== 'undefined';
        features.serviceWorker = 'serviceWorker' in navigator;
        
        console.log('Browser Features:', features);
    }
    
    /**
     * Test accessibility features
     */
    testAccessibilityFeatures() {
        const accessibility = this.results.accessibility;
        
        // ARIA Support
        accessibility.ariaSupport = this.testARIASupport();
        accessibility.roleSupport = this.testRoleSupport();
        accessibility.liveRegions = this.testLiveRegions();
        
        // Focus Management
        accessibility.focusVisible = this.testFocusVisible();
        accessibility.focusWithin = this.testFocusWithin();
        accessibility.tabIndex = this.testTabIndex();
        
        // Media Queries for Accessibility
        accessibility.prefersReducedMotion = this.testPrefersReducedMotion();
        accessibility.prefersColorScheme = this.testPrefersColorScheme();
        accessibility.prefersContrast = this.testPrefersContrast();
        
        // Keyboard Navigation
        accessibility.keyboardEvents = this.testKeyboardEvents();
        accessibility.focusTrapping = this.testFocusTrapping();
        
        console.log('Accessibility Features:', accessibility);
    }
    
    /**
     * Test CSS features
     */
    testCSSFeatures() {
        const css = this.results.css = {};\n        \n        // Layout Features\n        css.flexbox = this.testCSSFeature('display', 'flex');\n        css.grid = this.testCSSFeature('display', 'grid');\n        css.position = this.testCSSFeature('position', 'sticky');\n        \n        // Visual Features\n        css.transforms = this.testCSSFeature('transform', 'scale(1)');\n        css.transitions = this.testCSSFeature('transition', 'all 0.3s');\n        css.animations = this.testCSSFeature('animation', 'none');\n        css.boxShadow = this.testCSSFeature('box-shadow', '0 0 10px rgba(0,0,0,0.1)');\n        css.borderRadius = this.testCSSFeature('border-radius', '5px');\n        css.gradients = this.testCSSGradients();\n        \n        // Modern CSS\n        css.customProperties = this.testCSSCustomProperties();\n        css.calcFunction = this.testCSSFeature('width', 'calc(100% - 20px)');\n        css.viewportUnits = this.testCSSFeature('width', '100vw');\n        css.remUnits = this.testCSSFeature('font-size', '1rem');\n        \n        // Responsive Features\n        css.mediaQueries = this.testMediaQueries();\n        css.containerQueries = this.testContainerQueries();\n        \n        console.log('CSS Features:', css);\n    }\n    \n    /**\n     * Test JavaScript APIs\n     */\n    testJavaScriptAPIs() {\n        const apis = this.results.apis = {};\n        \n        // Modern APIs\n        apis.intersectionObserver = typeof IntersectionObserver !== 'undefined';\n        apis.mutationObserver = typeof MutationObserver !== 'undefined';\n        apis.resizeObserver = typeof ResizeObserver !== 'undefined';\n        apis.performanceObserver = typeof PerformanceObserver !== 'undefined';\n        \n        // Animation APIs\n        apis.requestAnimationFrame = typeof requestAnimationFrame === 'function';\n        apis.webAnimations = typeof Element.prototype.animate === 'function';\n        \n        // Canvas and WebGL\n        apis.canvas2D = this.testCanvas2D();\n        apis.webGL = this.testWebGL();\n        \n        // Audio/Video APIs\n        apis.webAudio = typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';\n        apis.mediaRecorder = typeof MediaRecorder !== 'undefined';\n        \n        console.log('JavaScript APIs:', apis);\n    }\n    \n    /**\n     * Test performance APIs\n     */\n    testPerformanceAPIs() {\n        const performance = this.results.performance;\n        \n        // Performance measurement\n        performance.performanceNow = typeof window.performance?.now === 'function';\n        performance.performanceMark = typeof window.performance?.mark === 'function';\n        performance.performanceMeasure = typeof window.performance?.measure === 'function';\n        \n        // Memory information (Chrome only)\n        performance.memoryInfo = typeof window.performance?.memory !== 'undefined';\n        \n        // Navigation timing\n        performance.navigationTiming = typeof window.performance?.navigation !== 'undefined';\n        performance.resourceTiming = typeof window.performance?.getEntriesByType === 'function';\n        \n        console.log('Performance APIs:', performance);\n    }\n    \n    // Individual test methods\n    testAsyncAwait() {\n        try {\n            eval('(async function() { await Promise.resolve(); })');\n            return true;\n        } catch (e) {\n            return false;\n        }\n    }\n    \n    testArrowFunctions() {\n        try {\n            eval('(() => {})');\n            return true;\n        } catch (e) {\n            return false;\n        }\n    }\n    \n    testDestructuring() {\n        try {\n            eval('const [a, b] = [1, 2]; const {c} = {c: 3};');\n            return true;\n        } catch (e) {\n            return false;\n        }\n    }\n    \n    testTemplateLiterals() {\n        try {\n            eval('`template ${\"literal\"}`');\n            return true;\n        } catch (e) {\n            return false;\n        }\n    }\n    \n    testClasses() {\n        try {\n            eval('class Test { constructor() {} }');\n            return true;\n        } catch (e) {\n            return false;\n        }\n    }\n    \n    testARIASupport() {\n        const div = document.createElement('div');\n        div.setAttribute('aria-label', 'test');\n        return div.getAttribute('aria-label') === 'test';\n    }\n    \n    testRoleSupport() {\n        const div = document.createElement('div');\n        div.setAttribute('role', 'button');\n        return div.getAttribute('role') === 'button';\n    }\n    \n    testLiveRegions() {\n        const div = document.createElement('div');\n        div.setAttribute('aria-live', 'polite');\n        return div.getAttribute('aria-live') === 'polite';\n    }\n    \n    testFocusVisible() {\n        return this.testCSSFeature('outline', ':focus-visible');\n    }\n    \n    testFocusWithin() {\n        return this.testCSSFeature('background', ':focus-within');\n    }\n    \n    testTabIndex() {\n        const div = document.createElement('div');\n        div.tabIndex = 0;\n        return div.tabIndex === 0;\n    }\n    \n    testPrefersReducedMotion() {\n        return typeof window.matchMedia === 'function' && \n               window.matchMedia('(prefers-reduced-motion: reduce)').media === '(prefers-reduced-motion: reduce)';\n    }\n    \n    testPrefersColorScheme() {\n        return typeof window.matchMedia === 'function' && \n               window.matchMedia('(prefers-color-scheme: dark)').media === '(prefers-color-scheme: dark)';\n    }\n    \n    testPrefersContrast() {\n        return typeof window.matchMedia === 'function' && \n               window.matchMedia('(prefers-contrast: high)').media === '(prefers-contrast: high)';\n    }\n    \n    testKeyboardEvents() {\n        return typeof KeyboardEvent !== 'undefined';\n    }\n    \n    testFocusTrapping() {\n        const input = document.createElement('input');\n        return typeof input.focus === 'function' && typeof input.blur === 'function';\n    }\n    \n    testCSSFeature(property, value) {\n        const element = document.createElement('div');\n        const originalValue = element.style[property];\n        \n        try {\n            element.style[property] = value;\n            const supported = element.style[property] !== originalValue;\n            element.style[property] = originalValue;\n            return supported;\n        } catch (e) {\n            return false;\n        }\n    }\n    \n    testCSSGradients() {\n        return this.testCSSFeature('background', 'linear-gradient(to right, #000, #fff)') ||\n               this.testCSSFeature('background', '-webkit-linear-gradient(left, #000, #fff)') ||\n               this.testCSSFeature('background', '-moz-linear-gradient(left, #000, #fff)');\n    }\n    \n    testCSSCustomProperties() {\n        const element = document.createElement('div');\n        element.style.setProperty('--test-prop', 'test-value');\n        return element.style.getPropertyValue('--test-prop') === 'test-value';\n    }\n    \n    testMediaQueries() {\n        return typeof window.matchMedia === 'function';\n    }\n    \n    testContainerQueries() {\n        return this.testCSSFeature('container-type', 'inline-size');\n    }\n    \n    testCanvas2D() {\n        const canvas = document.createElement('canvas');\n        return !!(canvas.getContext && canvas.getContext('2d'));\n    }\n    \n    testWebGL() {\n        const canvas = document.createElement('canvas');\n        try {\n            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));\n        } catch (e) {\n            return false;\n        }\n    }\n    \n    /**\n     * Generate comprehensive report\n     */\n    generateReport() {\n        const report = {\n            timestamp: new Date().toISOString(),\n            browser: this.results.browser,\n            summary: this.generateSummary(),\n            details: this.results,\n            recommendations: this.generateRecommendations()\n        };\n        \n        console.group('🌐 Browser Compatibility Report');\n        console.log('Browser:', report.browser.name, report.browser.version);\n        console.log('Summary:', report.summary);\n        console.log('Full Details:', report.details);\n        \n        if (report.recommendations.length > 0) {\n            console.warn('Recommendations:', report.recommendations);\n        }\n        \n        console.groupEnd();\n        \n        // Store report for external access\n        window.browserCompatibilityReport = report;\n        \n        return report;\n    }\n    \n    /**\n     * Generate compatibility summary\n     */\n    generateSummary() {\n        const features = this.results.features;\n        const accessibility = this.results.accessibility;\n        const css = this.results.css;\n        const apis = this.results.apis;\n        \n        const totalTests = Object.keys(features).length + \n                          Object.keys(accessibility).length + \n                          Object.keys(css || {}).length + \n                          Object.keys(apis || {}).length;\n        \n        const passedTests = Object.values(features).filter(Boolean).length +\n                           Object.values(accessibility).filter(Boolean).length +\n                           Object.values(css || {}).filter(Boolean).length +\n                           Object.values(apis || {}).filter(Boolean).length;\n        \n        const compatibilityScore = Math.round((passedTests / totalTests) * 100);\n        \n        return {\n            totalTests,\n            passedTests,\n            compatibilityScore,\n            status: this.getCompatibilityStatus(compatibilityScore)\n        };\n    }\n    \n    /**\n     * Get compatibility status based on score\n     */\n    getCompatibilityStatus(score) {\n        if (score >= 90) return 'Excellent';\n        if (score >= 80) return 'Good';\n        if (score >= 70) return 'Fair';\n        if (score >= 60) return 'Poor';\n        return 'Critical';\n    }\n    \n    /**\n     * Generate recommendations based on test results\n     */\n    generateRecommendations() {\n        const recommendations = [];\n        const browser = this.results.browser.name;\n        const features = this.results.features;\n        const accessibility = this.results.accessibility;\n        const css = this.results.css;\n        \n        // Browser-specific recommendations\n        if (browser === 'Safari') {\n            if (!css?.customProperties) {\n                recommendations.push('Consider fallbacks for CSS custom properties in older Safari versions');\n            }\n            if (!features.serviceWorker) {\n                recommendations.push('Service Worker support is limited in Safari - consider progressive enhancement');\n            }\n        }\n        \n        if (browser === 'Firefox') {\n            if (!css?.containerQueries) {\n                recommendations.push('Container queries may not be supported - use feature detection');\n            }\n        }\n        \n        if (browser === 'Edge') {\n            if (!features.customElements) {\n                recommendations.push('Custom Elements support may be limited in older Edge versions');\n            }\n        }\n        \n        // General recommendations\n        if (!accessibility.prefersReducedMotion) {\n            recommendations.push('Add fallbacks for reduced motion preferences');\n        }\n        \n        if (!accessibility.prefersColorScheme) {\n            recommendations.push('Consider manual theme switching for color scheme preferences');\n        }\n        \n        if (!features.fetch) {\n            recommendations.push('Include fetch polyfill for older browsers');\n        }\n        \n        if (!css?.grid) {\n            recommendations.push('Provide flexbox fallbacks for CSS Grid layouts');\n        }\n        \n        return recommendations;\n    }\n    \n    /**\n     * Test specific features for the application\n     */\n    testApplicationFeatures() {\n        const appTests = {\n            d3Support: typeof d3 !== 'undefined',\n            svgSupport: document.createElementNS && \n                       typeof document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect === 'function',\n            touchEvents: 'ontouchstart' in window,\n            wheelEvents: 'onwheel' in window,\n            keyboardEvents: this.testKeyboardEvents(),\n            focusManagement: this.testFocusTrapping()\n        };\n        \n        console.log('Application-specific Features:', appTests);\n        return appTests;\n    }\n}\n\n// Auto-run validation when script loads\nif (typeof window !== 'undefined') {\n    window.browserValidator = new BrowserCompatibilityValidator();\n    \n    // Also test application-specific features\n    setTimeout(() => {\n        window.browserValidator.testApplicationFeatures();\n    }, 1000);\n}\n\n// Export for module usage\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = BrowserCompatibilityValidator;\n}\n
