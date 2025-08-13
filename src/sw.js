/**
 * Service Worker for NAS Knowledge Graph
 * Handles caching of static assets, API responses, and offline functionality
 */

const CACHE_NAME = 'nas-knowledge-graph-v1.2';
const STATIC_CACHE = 'static-assets-v1.2';
const DYNAMIC_CACHE = 'dynamic-content-v1.2';
const API_CACHE = 'api-responses-v1.2';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/src/main-enhanced.js',
  '/src/core/store.js',
  '/src/core/graph.js',
  '/src/utils/debounce.js',
  '/data/sample-data.json',
  '/data/sample-relations.json',
  'https://d3js.org/d3.v7.min.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/data/',
  '/api/'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Performance monitoring
let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  averageResponseTime: 0,
  totalResponseTime: 0
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
          credentials: 'same-origin'
        })));
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    // Clean up old caches
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('🧹 Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        // Take control of all pages
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Activation failed', error);
      })
  );
});

/**
 * Fetch Event Handler with Performance Optimization
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Determine cache strategy based on request type
  let strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
      .then((response) => {
        // Update performance metrics
        updatePerformanceMetrics(request, response);
        return response;
      })
      .catch((error) => {
        console.error('Service Worker: Request failed', error);
        return createErrorResponse(request);
      })
  );
});

/**
 * Determine cache strategy based on request
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Static assets - cache first
  if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // HTML pages - network first with fallback
  if (pathname.endsWith('.html') || pathname === '/') {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // API endpoints - stale while revalidate
  if (API_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Data files - stale while revalidate
  if (pathname.startsWith('/data/') && pathname.endsWith('.json')) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Default to network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

/**
 * Handle request based on cache strategy
 */
async function handleRequest(request, strategy) {
  const startTime = performance.now();
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return await cacheFirst(request, startTime);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return await networkFirst(request, startTime);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return await staleWhileRevalidate(request, startTime);
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return await cacheOnly(request, startTime);
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
    default:
      return await networkOnly(request, startTime);
  }
}

/**
 * Cache First Strategy
 */
async function cacheFirst(request, startTime) {
  const cachedResponse = await getCachedResponse(request);
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    return cachedResponse;
  }
  
  const networkResponse = await fetchAndCache(request, STATIC_CACHE);
  performanceMetrics.cacheMisses++;
  performanceMetrics.networkRequests++;
  
  return networkResponse;
}

/**
 * Network First Strategy
 */
async function networkFirst(request, startTime) {
  try {
    const networkResponse = await fetchAndCache(request, DYNAMIC_CACHE);
    performanceMetrics.networkRequests++;
    return networkResponse;
  } catch (error) {
    const cachedResponse = await getCachedResponse(request);
    
    if (cachedResponse) {
      performanceMetrics.cacheHits++;
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 */
async function staleWhileRevalidate(request, startTime) {
  const cachedResponse = getCachedResponse(request);
  
  // Always try to fetch fresh version in background
  const networkPromise = fetchAndCache(request, API_CACHE)
    .then(() => {
      performanceMetrics.networkRequests++;
    })
    .catch((error) => {
      console.warn('Background fetch failed:', error.message);
    });
  
  // Return cached version immediately if available
  const cached = await cachedResponse;
  if (cached) {
    performanceMetrics.cacheHits++;
    // Don't wait for network request
    return cached;
  }
  
  // Wait for network if no cache available
  try {
    const networkResponse = await networkPromise;
    performanceMetrics.cacheMisses++;
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

/**
 * Cache Only Strategy
 */
async function cacheOnly(request, startTime) {
  const cachedResponse = await getCachedResponse(request);
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    return cachedResponse;
  }
  
  throw new Error('No cached response available');
}

/**
 * Network Only Strategy
 */
async function networkOnly(request, startTime) {
  performanceMetrics.networkRequests++;
  return await fetch(request);
}

/**
 * Get cached response
 */
async function getCachedResponse(request) {
  const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(request);
    
    if (response) {
      return response;
    }
  }
  
  return null;
}

/**
 * Fetch and cache response
 */
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  
  // Only cache successful responses
  if (response.status === 200) {
    const cache = await caches.open(cacheName);
    // Clone the response before caching
    await cache.put(request, response.clone());
  }
  
  return response;
}

/**
 * Create error response for offline scenarios
 */
function createErrorResponse(request) {
  const url = new URL(request.url);
  
  // Return offline page for HTML requests
  if (request.headers.get('accept')?.includes('text/html')) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - NAS Knowledge Graph</title>
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              color: #333; 
            }
            .offline-icon { 
              font-size: 4rem; 
              margin-bottom: 1rem; 
            }
          </style>
        </head>
        <body>
          <div class="offline-icon">📡</div>
          <h1>You're Offline</h1>
          <p>The NAS Knowledge Graph is not available right now.</p>
          <p>Please check your connection and try again.</p>
          <button onclick="location.reload()">Retry</button>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Return JSON error for API requests
  if (request.headers.get('accept')?.includes('application/json')) {
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This content is not available offline'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Generic error response
  return new Response('Service Unavailable', { status: 503 });
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(request, response) {
  const responseTime = performance.now() - Date.now();
  
  performanceMetrics.totalResponseTime += responseTime;
  const totalRequests = performanceMetrics.cacheHits + 
                       performanceMetrics.cacheMisses + 
                       performanceMetrics.networkRequests;
  
  if (totalRequests > 0) {
    performanceMetrics.averageResponseTime = 
      performanceMetrics.totalResponseTime / totalRequests;
  }
  
  // Log performance stats every 100 requests
  if (totalRequests % 100 === 0) {
    console.log('📊 Service Worker Performance Stats:', {
      cacheHitRate: Math.round((performanceMetrics.cacheHits / totalRequests) * 100) + '%',
      averageResponseTime: Math.round(performanceMetrics.averageResponseTime) + 'ms',
      totalRequests: totalRequests
    });
  }
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'GET_PERFORMANCE_STATS':
      event.ports[0].postMessage(performanceMetrics);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(payload.cacheName)
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch((error) => {
          event.ports[0].postMessage({ error: error.message });
        });
      break;
      
    case 'PRECACHE_URLS':
      precacheUrls(payload.urls)
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch((error) => {
          event.ports[0].postMessage({ error: error.message });
        });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
  if (cacheName) {
    return await caches.delete(cacheName);
  } else {
    // Clear all caches
    const cacheNames = await caches.keys();
    return await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
  }
}

/**
 * Precache specific URLs
 */
async function precacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  return await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`Failed to precache ${url}:`, error.message);
      }
    })
  );
}

/**
 * Periodic cleanup of old cache entries
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupOldCacheEntries());
  }
});

/**
 * Cleanup old cache entries to prevent storage bloat
 */
async function cleanupOldCacheEntries() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  
  const cacheNames = [DYNAMIC_CACHE, API_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader) {
        const cacheDate = new Date(dateHeader).getTime();
        
        if (now - cacheDate > maxAge) {
          await cache.delete(request);
          console.log('🧹 Cleaned up old cache entry:', request.url);
        }
      }
    }
  }
}

console.log('📡 Service Worker: Script loaded');
