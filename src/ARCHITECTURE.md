# Knowledge Graph Modular JavaScript Architecture

This document describes the modular ES6 JavaScript architecture designed for the NAS Knowledge Graph application.

## Directory Structure

```
src/
├── index.js                    # Main entry point, wires everything together
├── core/                       # Core system modules
│   ├── store.js               # Central state store with observable pattern
│   └── graph.js               # Graphiti wrapper for graph data management
├── services/                   # Service layer
│   └── dataLoader.js          # Data loading and processing service
├── ui/                        # User interface components
│   ├── graphView.js           # D3.js-based graph renderer
│   ├── sidePanel.js           # Side panel component for details and controls
│   └── analysis/              # Analysis visualization modules
│       ├── charts.js          # Chart visualizations (pie, bar, line)
│       └── maps.js            # Spatial visualizations and maps
└── utils/                     # Utility modules
    ├── debounce.js            # Debouncing utilities for performance
    ├── search.js              # Comprehensive search and query functionality
    └── filter.js              # Data filtering and manipulation utilities
```

## Module Architecture

### Core Modules

#### `store.js` - Central State Management
- **Purpose**: Observable state management with simple pub/sub pattern
- **Key Features**:
  - Centralized application state
  - Observer pattern for reactive updates
  - State change notifications
  - Supports both specific key and wildcard subscriptions

#### `graph.js` - Graph Data Management
- **Purpose**: Wrapper around Graphiti library for graph operations
- **Key Features**:
  - Node and edge CRUD operations
  - Layout algorithms (force-directed, circular, hierarchical)
  - Graph traversal and pathfinding
  - Data validation and integrity checks

### Services

#### `dataLoader.js` - Data Management Service
- **Purpose**: Handles all data loading, processing, and export operations
- **Key Features**:
  - Multiple data format support (JSON, CSV, URLs)
  - Data validation and transformation
  - Caching mechanisms
  - Export functionality (JSON, CSV, Cytoscape)

### UI Components

#### `graphView.js` - Graph Visualization
- **Purpose**: D3.js-based interactive graph renderer
- **Key Features**:
  - Force-directed layout simulation
  - Interactive node and edge manipulation
  - Zoom and pan capabilities
  - Selection and highlighting

#### `sidePanel.js` - Control Panel
- **Purpose**: Provides UI for details, filters, and analysis
- **Key Features**:
  - Tabbed interface (Details, Filters, Analysis)
  - Node/edge detail display
  - Filter controls and search
  - Export and layout controls

#### Analysis Modules

#### `charts.js` - Data Visualization Charts
- **Purpose**: Creates various chart types for data analysis
- **Key Features**:
  - Node type distribution (pie charts)
  - Degree distribution (bar charts)
  - Connectivity over time (line charts)
  - Network metrics dashboard

#### `maps.js` - Spatial Visualizations
- **Purpose**: Provides spatial and hierarchical visualizations
- **Key Features**:
  - Network topology maps
  - Geographic distribution (if location data available)
  - Hierarchical tree maps
  - Heat maps based on node properties

### Utilities

#### `debounce.js` - Performance Optimization
- **Purpose**: Provides debouncing and throttling utilities
- **Key Features**:
  - Function debouncing with configurable delays
  - Frame-based debouncing for DOM updates
  - Batch processing capabilities
  - Performance monitoring wrappers

#### `search.js` - Search and Query System
- **Purpose**: Comprehensive search functionality for graph data
- **Key Features**:
  - Full-text search with indexing
  - Advanced filtering with multiple criteria
  - Graph traversal and pathfinding
  - Search history and saved searches

#### `filter.js` - Data Filtering
- **Purpose**: Flexible data filtering and manipulation system
- **Key Features**:
  - Multiple filter types and operators
  - Named filter sets with state management
  - Filter history and persistence
  - Quick filter presets for common use cases

### Main Entry Point

#### `index.js` - Application Controller
- **Purpose**: Orchestrates all modules and manages application lifecycle
- **Key Features**:
  - Component initialization and wiring
  - Event coordination between modules
  - Application state management
  - Keyboard shortcuts and global event handling

## Key Design Patterns

### Observer Pattern (Store)
The central store uses the observer pattern to enable reactive programming:
```javascript
store.subscribe('selectedNode', (newNode, oldNode) => {
  // React to selection changes
});
```

### Module Exports
Each module exports both classes and singleton instances:
```javascript
export class Store { /* ... */ }
export const store = new Store(initialState);
```

### Event-Driven Architecture
Components communicate through events and store state changes:
```javascript
// Component emits event
this.container.dispatchEvent(new CustomEvent('filtersChanged', { detail: data }));

// Main controller handles event
sidePanelContainer.addEventListener('filtersChanged', (event) => {
  this.handleFiltersChanged(event.detail);
});
```

### Dependency Injection
Components receive their dependencies through constructor parameters:
```javascript
export class GraphView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    // ...
  }
}
```

## State Management

The application uses a centralized store with the following state structure:
```javascript
{
  // Graph data
  nodes: [],
  edges: [],
  
  // UI state
  selectedNode: null,
  selectedEdge: null,
  viewMode: 'graph',
  sidePanel: { visible: true, activeTab: 'details' },
  
  // Graph view state
  graphView: { zoom: 1, center: { x: 400, y: 300 }, layout: 'force' },
  
  // Filters and search
  filters: { nodeTypes: [], searchTerm: '', dateRange: null },
  
  // Loading states
  loading: { data: false, analysis: false }
}
```

## Usage Example

```javascript
import { createKnowledgeGraph } from './src/index.js';

// Initialize the application
const app = await createKnowledgeGraph({
  graphContainerId: 'graph-container',
  sidePanelContainerId: 'side-panel',
  debug: true
});

// Load data
await app.loadData(graphData);

// Generate analysis
app.generateAnalysis();
```

## Benefits of This Architecture

1. **Modularity**: Clear separation of concerns with focused modules
2. **Reusability**: Components can be used independently or in different contexts
3. **Maintainability**: Easy to understand, modify, and extend individual modules
4. **Testability**: Each module can be tested in isolation
5. **Scalability**: New features can be added as separate modules
6. **Performance**: Debouncing and lazy loading optimize performance
7. **Flexibility**: Observable pattern allows for reactive UI updates

## Extension Points

The architecture supports easy extension through:
- New analysis modules in `ui/analysis/`
- Additional utility functions in `utils/`
- Custom layout algorithms in the graph module
- New data formats in the data loader
- Additional UI components following the same patterns

This modular architecture provides a solid foundation for building complex, interactive knowledge graph applications while maintaining code organization and developer productivity.
