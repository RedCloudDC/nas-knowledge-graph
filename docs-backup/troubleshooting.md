# Troubleshooting Guide: NAS Knowledge Graph Demo

This guide covers common issues, solutions, and debugging techniques for the NAS Knowledge Graph Demo application.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Installation Problems](#installation-problems)
3. [Runtime Errors](#runtime-errors)
4. [Performance Issues](#performance-issues)
5. [Browser Compatibility](#browser-compatibility)
6. [Data Loading Problems](#data-loading-problems)
7. [Development Issues](#development-issues)
8. [Debugging Techniques](#debugging-techniques)

## Common Issues

### Application Won't Load

#### Problem: Blank page or loading indefinitely

**Symptoms:**
- White/blank screen after loading
- Loading spinner never disappears
- Console shows JavaScript errors

**Solutions:**
1. **Check browser compatibility:**
   ```javascript
   // Open browser console and check for errors
   console.log('Browser support check:', {
       es6Modules: 'noModule' in HTMLScriptElement.prototype,
       fetch: typeof fetch !== 'undefined',
       promises: typeof Promise !== 'undefined'
   });
   ```

2. **Verify network connectivity:**
   - Check if you can access other websites
   - Try loading the demo from a different network
   - Disable browser extensions temporarily

3. **Clear browser cache:**
   - Press `Ctrl+Shift+Del` (Windows) or `Cmd+Shift+Del` (Mac)
   - Select "Cached images and files"
   - Clear and reload the page

4. **Check JavaScript console:**
   - Open Developer Tools (`F12`)
   - Look for error messages in Console tab
   - Common errors and solutions below

### Graph Not Displaying

#### Problem: Interface loads but graph visualization is empty

**Symptoms:**
- Side panel and controls are visible
- Graph area is blank or shows error message
- Data appears to load but doesn't render

**Solutions:**
1. **Check data format:**
   ```javascript
   // In browser console, check data structure
   console.log('Graph data:', window.debugGraph?.toJSON());
   ```

2. **Verify SVG support:**
   ```javascript
   // Test SVG creation
   const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
   console.log('SVG support:', svg instanceof SVGSVGElement);
   ```

3. **Reset view:**
   - Click the "Reset View" button
   - Try different layout algorithms
   - Check if nodes exist but are positioned off-screen

### Node Selection Not Working

#### Problem: Clicking nodes doesn't show details or highlight connections

**Symptoms:**
- Nodes don't respond to clicks
- Information panel remains empty
- No visual feedback on interaction

**Solutions:**
1. **Check event listeners:**
   ```javascript
   // Verify event handlers are attached
   const nodes = document.querySelectorAll('.node');
   console.log('Nodes with click handlers:', nodes.length);
   ```

2. **Test click detection:**
   ```javascript
   // Add temporary click handler
   document.addEventListener('click', (e) => {
       console.log('Click target:', e.target, e.target.classList);
   });
   ```

3. **Reload application:**
   - Refresh the page
   - Clear browser cache if issue persists

## Installation Problems

### Node.js/npm Issues

#### Problem: npm install fails or shows errors

**Common Errors:**
```bash
# Error: EACCES permission denied
sudo npm install -g npm

# Error: node-gyp rebuild failed
npm install --no-optional

# Error: package-lock.json conflicts
rm package-lock.json node_modules/
npm install
```

**Solutions:**
1. **Update Node.js and npm:**
   ```bash
   # Check versions
   node --version  # Should be 18+
   npm --version   # Should be 8+
   
   # Update if needed
   npm install -g npm@latest
   ```

2. **Use Node Version Manager:**
   ```bash
   # Install nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use Node 18
   nvm install 18
   nvm use 18
   ```

3. **Clear npm cache:**
   ```bash
   npm cache clean --force
   npm install
   ```

### Dependency Conflicts

#### Problem: Package version conflicts or missing dependencies

**Solutions:**
1. **Check for peer dependencies:**
   ```bash
   npm ls
   npm audit
   npm audit fix
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use exact versions:**
   ```bash
   npm install --save-exact
   ```

## Runtime Errors

### JavaScript Errors

#### TypeError: Cannot read property 'X' of undefined

**Common Causes:**
- Data not loaded before accessing
- Asynchronous timing issues
- Missing error handling

**Solutions:**
1. **Add null checks:**
   ```javascript
   // Before
   const nodeData = graph.nodes.map(n => n.label);
   
   // After
   const nodeData = graph?.nodes?.map(n => n?.label) || [];
   ```

2. **Use async/await properly:**
   ```javascript
   // Before
   loadData(source);
   renderGraph(data); // data might not be loaded yet
   
   // After
   const data = await loadData(source);
   renderGraph(data);
   ```

#### ReferenceError: X is not defined

**Common Causes:**
- Missing import statements
- Variable scope issues
- Library not loaded

**Solutions:**
1. **Check imports:**
   ```javascript
   // Verify all required imports
   import { KnowledgeGraph } from './src/main.js';
   import * as d3 from 'd3'; // if using D3
   ```

2. **Check script loading order:**
   ```html
   <!-- Ensure libraries load before application -->
   <script src="lib/d3.min.js"></script>
   <script type="module" src="src/main.js"></script>
   ```

### Memory Errors

#### Problem: Page becomes unresponsive or crashes

**Symptoms:**
- Browser tab freezes
- "Out of memory" errors
- Slow performance with large datasets

**Solutions:**
1. **Implement data pagination:**
   ```javascript
   // Limit visible nodes
   const MAX_VISIBLE_NODES = 1000;
   const visibleNodes = allNodes.slice(0, MAX_VISIBLE_NODES);
   ```

2. **Use requestAnimationFrame for heavy operations:**
   ```javascript
   function processNodesInBatches(nodes, batchSize = 100) {
       let index = 0;
       
       function processBatch() {
           const end = Math.min(index + batchSize, nodes.length);
           for (let i = index; i < end; i++) {
               processNode(nodes[i]);
           }
           index = end;
           
           if (index < nodes.length) {
               requestAnimationFrame(processBatch);
           }
       }
       
       processBatch();
   }
   ```

## Performance Issues

### Slow Graph Rendering

#### Problem: Graph takes too long to render or update

**Symptoms:**
- Long delays when loading data
- Laggy interactions
- Browser becomes unresponsive

**Solutions:**
1. **Enable performance monitoring:**
   ```javascript
   // Add to main.js
   const observer = new PerformanceObserver((list) => {
       list.getEntries().forEach(entry => {
           console.log('Performance:', entry.name, entry.duration);
       });
   });
   observer.observe({ entryTypes: ['measure'] });
   ```

2. **Optimize rendering:**
   ```javascript
   // Use debouncing for frequent updates
   const debouncedRender = debounce(() => {
       graphView.render(currentData);
   }, 100);
   
   // Limit DOM updates
   requestAnimationFrame(() => {
       updateVisibleNodes();
   });
   ```

3. **Reduce visual complexity:**
   - Hide edge labels for large graphs
   - Use simplified node shapes
   - Implement level-of-detail rendering

### Memory Leaks

#### Problem: Memory usage increases over time

**Detection:**
```javascript
// Monitor memory usage
setInterval(() => {
    if (performance.memory) {
        console.log('Memory:', {
            used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB'
        });
    }
}, 5000);
```

**Solutions:**
1. **Remove event listeners:**
   ```javascript
   // Store references for cleanup
   const handleResize = () => { /* ... */ };
   window.addEventListener('resize', handleResize);
   
   // Clean up on destroy
   window.removeEventListener('resize', handleResize);
   ```

2. **Clear intervals and timeouts:**
   ```javascript
   const intervalId = setInterval(updateGraph, 1000);
   
   // Clear when done
   clearInterval(intervalId);
   ```

## Browser Compatibility

### Unsupported Features

#### Problem: Application doesn't work in older browsers

**Check Support:**
```javascript
const features = {
    es6Modules: 'noModule' in HTMLScriptElement.prototype,
    fetch: typeof fetch !== 'undefined',
    promises: typeof Promise !== 'undefined',
    arrow: (() => true)(),
    destructuring: (() => { try { eval('const {a} = {}'); return true; } catch(e) { return false; } })(),
    svg: document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg', 'svg') instanceof SVGSVGElement
};

console.log('Browser feature support:', features);
```

**Solutions:**
1. **Add polyfills:**
   ```html
   <!-- For older browsers -->
   <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
   ```

2. **Provide fallback:**
   ```html
   <script nomodule>
       alert('This application requires a modern browser. Please update your browser.');
   </script>
   ```

### Mobile Issues

#### Problem: Touch interactions don't work properly

**Solutions:**
1. **Add touch event handlers:**
   ```javascript
   // Support both mouse and touch
   element.addEventListener('mousedown', handleStart);
   element.addEventListener('touchstart', handleStart);
   ```

2. **Viewport configuration:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
   ```

## Data Loading Problems

### CORS Errors

#### Problem: Cross-origin requests blocked

**Error Message:**
```
Access to fetch at 'file:///path/to/data.json' from origin 'null' has been blocked by CORS policy
```

**Solutions:**
1. **Use local server:**
   ```bash
   # Python 3
   python -m http.server 8080
   
   # Node.js
   npx http-server
   
   # npm script
   npm run serve
   ```

2. **Use relative paths:**
   ```javascript
   // Instead of absolute paths
   const data = await fetch('./data/sample-data.json');
   ```

### Invalid Data Format

#### Problem: Data doesn't load or displays incorrectly

**Validation:**
```javascript
function validateGraphData(data) {
    const errors = [];
    
    if (!data.nodes || !Array.isArray(data.nodes)) {
        errors.push('Missing or invalid nodes array');
    }
    
    if (!data.edges || !Array.isArray(data.edges)) {
        errors.push('Missing or invalid edges array');
    }
    
    data.nodes?.forEach((node, index) => {
        if (!node.id) errors.push(`Node ${index} missing id`);
        if (!node.label) errors.push(`Node ${index} missing label`);
    });
    
    return errors;
}

// Usage
const errors = validateGraphData(loadedData);
if (errors.length > 0) {
    console.error('Data validation errors:', errors);
}
```

## Development Issues

### Build Errors

#### Problem: npm run build fails

**Common Solutions:**
1. **Clear build cache:**
   ```bash
   rm -rf dist/
   npm run build
   ```

2. **Check for syntax errors:**
   ```bash
   npm run lint
   npm run lint:fix
   ```

### Test Failures

#### Problem: npm test shows failing tests

**Solutions:**
1. **Run specific test:**
   ```bash
   npm test -- --testNamePattern="graph rendering"
   ```

2. **Update snapshots:**
   ```bash
   npm test -- --updateSnapshot
   ```

3. **Check test environment:**
   ```javascript
   // In test file
   console.log('Test environment:', {
       jsdom: typeof window !== 'undefined',
       node: typeof process !== 'undefined'
   });
   ```

## Debugging Techniques

### Browser DevTools

#### Performance Analysis
1. Open DevTools (`F12`)
2. Go to Performance tab
3. Click Record
4. Interact with application
5. Stop recording and analyze

#### Memory Profiling
1. Open DevTools
2. Go to Memory tab
3. Take heap snapshot
4. Interact with application
5. Take another snapshot
6. Compare for memory leaks

### Console Debugging

#### Debug Mode
```javascript
// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
    window.DEBUG = {
        graph: graph,
        store: store,
        logState: () => console.log('State:', store.getState()),
        logGraph: () => console.log('Graph:', graph.toJSON()),
        clearCache: () => localStorage.clear()
    };
}
```

#### Logging Utilities
```javascript
// Enhanced logging
const logger = {
    info: (msg, data) => console.log(`ℹ️ ${msg}`, data),
    warn: (msg, data) => console.warn(`⚠️ ${msg}`, data),
    error: (msg, data) => console.error(`❌ ${msg}`, data),
    debug: (msg, data) => {
        if (window.DEBUG) console.log(`🐛 ${msg}`, data);
    }
};

// Usage
logger.info('Graph rendered', { nodeCount: nodes.length });
```

### Network Issues

#### Check Network Requests
1. Open DevTools Network tab
2. Reload page
3. Look for failed requests (red entries)
4. Check response status codes

#### Common Status Codes
- **404**: File not found - check file paths
- **403**: Forbidden - check permissions
- **500**: Server error - check server logs
- **CORS**: Cross-origin blocked - use local server

## Getting Help

### Before Reporting Issues

1. **Check browser console** for error messages
2. **Try in incognito/private mode** to rule out extensions
3. **Test in different browser** to isolate browser-specific issues
4. **Clear cache and cookies**
5. **Check network connectivity**

### Reporting Bugs

Include this information:
- **Browser and version**
- **Operating system**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Console error messages**
- **Network requests (if relevant)**

### Debug Information Collection
```javascript
// Copy this to console and include output in bug reports
const debugInfo = {
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    errors: [],
    performance: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
    } : 'Not available',
    features: {
        modules: 'noModule' in HTMLScriptElement.prototype,
        fetch: typeof fetch !== 'undefined',
        svg: document.createElementNS !== undefined
    }
};

// Collect recent errors
window.addEventListener('error', (e) => {
    debugInfo.errors.push({
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno
    });
});

console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));
```

### Community Support

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/USERNAME/nas-knowledge-graph-demo/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/USERNAME/nas-knowledge-graph-demo/discussions)
- **Documentation**: [User guide](user-guide.md) and [technical documentation](technical.md)

---

*If you've tried the solutions above and still have issues, please create a detailed issue report with the debug information.*
