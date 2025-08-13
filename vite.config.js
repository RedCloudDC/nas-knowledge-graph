/**
 * Vite Configuration for Performance Optimization
 * Includes dynamic imports, code splitting, and service worker setup
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base configuration
  base: './',
  
  // Build optimization settings
  build: {
    // Output directory for GitHub Pages
    outDir: 'docs',
    
    // Generate source maps for debugging
    sourcemap: true,
    
    // Code splitting and chunk optimization
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // Service worker as separate entry
        sw: resolve(__dirname, 'src/sw.js')
      },
      
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Core application modules
          'core': [
            'src/core/store.js',
            'src/core/graph.js'
          ],
          
          // UI components
          'ui-components': [
            'src/ui/d3-graph-enhanced.js',
            'src/ui/dashboardUI.js',
            'src/ui/graphView.js',
            'src/ui/sidePanel.js'
          ],
          
          // Data exploration components (lazy loaded)
          'exploration': [
            'src/components/GlobalSearch.js',
            'src/components/AdvancedFilters.js',
            'src/components/NeighborhoodExplorer.js',
            'src/components/PathFinder.js'
          ],
          
          // Utilities
          'utils': [
            'src/utils/debounce.js',
            'src/utils/filter.js',
            'src/utils/search.js',
            'src/utils/urlStateManager.js'
          ],
          
          // Analytics and performance
          'analytics': [
            'src/analytics/AnalyticsEngine.js',
            'src/components/LoadingSpinner.js'
          ]
        },
        
        // Chunk file naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.js', '') 
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        // Entry file naming
        entryFileNames: 'js/[name]-[hash].js',
        
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name)) {
            return `img/[name]-[hash].[ext]`;
          }
          
          if (/\.(css)$/i.test(assetInfo.name)) {
            return `css/[name]-[hash].[ext]`;
          }
          
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `fonts/[name]-[hash].[ext]`;
          }
          
          return `assets/[name]-[hash].[ext]`;
        }
      }
    },
    
    // Target modern browsers for better optimization
    target: 'esnext',
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Asset inlining threshold
    assetsInlineLimit: 4096
  },
  
  // Development server settings
  server: {
    port: 8080,
    open: true,
    cors: true,
    
    // Proxy for development API calls if needed
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // Plugin configuration
  plugins: [
    // Custom plugin for service worker generation
    {
      name: 'service-worker',
      writeBundle() {
        // Service worker will be handled by build process
      }
    }
  ],
  
  // Dependency optimization
  optimizeDeps: {
    exclude: [
      // Exclude large dependencies that should be loaded dynamically
      'src/analytics/AnalyticsEngine.js'
    ]
  },
  
  // Performance optimizations
  define: {
    // Enable performance monitoring in development
    __DEV_PERFORMANCE__: JSON.stringify(process.env.NODE_ENV === 'development'),
    
    // Feature flags for conditional loading
    __ENABLE_ANALYTICS__: JSON.stringify(true),
    __ENABLE_SERVICE_WORKER__: JSON.stringify(true)
  },
  
  // CSS preprocessing
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "src/styles/variables.scss";`
      }
    }
  },
  
  // Asset handling
  assetsInclude: [
    '**/*.json',
    '**/*.csv',
    '**/*.geojson'
  ],
  
  // Worker configuration for web workers
  worker: {
    format: 'es'
  }
});
