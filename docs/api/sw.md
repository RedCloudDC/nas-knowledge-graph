# sw

**Module**: `sw`

### Constants

<dl>
<dt><a href="#CACHE_NAME">CACHE_NAME</a></dt>
<dd><p>Service Worker for NAS Knowledge Graph
Handles caching of static assets, API responses, and offline functionality</p>
</dd>
</dl>

### Functions

<dl>
<dt><a href="#getCacheStrategy">getCacheStrategy()</a></dt>
<dd><p>Determine cache strategy based on request</p>
</dd>
<dt><a href="#handleRequest">handleRequest()</a></dt>
<dd><p>Handle request based on cache strategy</p>
</dd>
<dt><a href="#cacheFirst">cacheFirst()</a></dt>
<dd><p>Cache First Strategy</p>
</dd>
<dt><a href="#networkFirst">networkFirst()</a></dt>
<dd><p>Network First Strategy</p>
</dd>
<dt><a href="#staleWhileRevalidate">staleWhileRevalidate()</a></dt>
<dd><p>Stale While Revalidate Strategy</p>
</dd>
<dt><a href="#cacheOnly">cacheOnly()</a></dt>
<dd><p>Cache Only Strategy</p>
</dd>
<dt><a href="#networkOnly">networkOnly()</a></dt>
<dd><p>Network Only Strategy</p>
</dd>
<dt><a href="#getCachedResponse">getCachedResponse()</a></dt>
<dd><p>Get cached response</p>
</dd>
<dt><a href="#fetchAndCache">fetchAndCache()</a></dt>
<dd><p>Fetch and cache response</p>
</dd>
<dt><a href="#createErrorResponse">createErrorResponse()</a></dt>
<dd><p>Create error response for offline scenarios</p>
</dd>
<dt><a href="#updatePerformanceMetrics">updatePerformanceMetrics()</a></dt>
<dd><p>Update performance metrics</p>
</dd>
<dt><a href="#clearCache">clearCache()</a></dt>
<dd><p>Clear specific cache</p>
</dd>
<dt><a href="#precacheUrls">precacheUrls()</a></dt>
<dd><p>Precache specific URLs</p>
</dd>
<dt><a href="#cleanupOldCacheEntries">cleanupOldCacheEntries()</a></dt>
<dd><p>Cleanup old cache entries to prevent storage bloat</p>
</dd>
</dl>

<a name="CACHE_NAME"></a>

### CACHE\_NAME
Service Worker for NAS Knowledge Graph
Handles caching of static assets, API responses, and offline functionality

**Kind**: global constant  
<a name="getCacheStrategy"></a>

### getCacheStrategy()
Determine cache strategy based on request

**Kind**: global function  
<a name="handleRequest"></a>

### handleRequest()
Handle request based on cache strategy

**Kind**: global function  
<a name="cacheFirst"></a>

### cacheFirst()
Cache First Strategy

**Kind**: global function  
<a name="networkFirst"></a>

### networkFirst()
Network First Strategy

**Kind**: global function  
<a name="staleWhileRevalidate"></a>

### staleWhileRevalidate()
Stale While Revalidate Strategy

**Kind**: global function  
<a name="cacheOnly"></a>

### cacheOnly()
Cache Only Strategy

**Kind**: global function  
<a name="networkOnly"></a>

### networkOnly()
Network Only Strategy

**Kind**: global function  
<a name="getCachedResponse"></a>

### getCachedResponse()
Get cached response

**Kind**: global function  
<a name="fetchAndCache"></a>

### fetchAndCache()
Fetch and cache response

**Kind**: global function  
<a name="createErrorResponse"></a>

### createErrorResponse()
Create error response for offline scenarios

**Kind**: global function  
<a name="updatePerformanceMetrics"></a>

### updatePerformanceMetrics()
Update performance metrics

**Kind**: global function  
<a name="clearCache"></a>

### clearCache()
Clear specific cache

**Kind**: global function  
<a name="precacheUrls"></a>

### precacheUrls()
Precache specific URLs

**Kind**: global function  
<a name="cleanupOldCacheEntries"></a>

### cleanupOldCacheEntries()
Cleanup old cache entries to prevent storage bloat

**Kind**: global function  


---

*Auto-generated from JSDoc comments*
