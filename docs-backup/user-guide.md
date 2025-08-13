# User Guide: NAS Knowledge Graph Demo

Welcome to the NAS Knowledge Graph Demo! This interactive visualization tool helps you explore relationships between Network Attached Storage (NAS) concepts, hardware, protocols, and management processes.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Navigation Tutorial](#navigation-tutorial)
4. [Features Guide](#features-guide)
5. [Advanced Usage](#advanced-usage)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing the Demo

1. **Live Demo**: Visit [https://USERNAME.github.io/nas-knowledge-graph-demo](https://USERNAME.github.io/nas-knowledge-graph-demo)
2. **Local Setup**: Follow the installation instructions in the [README.md](../README.md)

### System Requirements

- **Browser**: Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Device**: Desktop or mobile (responsive design)
- **Internet**: Required for live demo, optional for local setup

## Interface Overview

The application interface consists of four main areas:

### 1. Graph Visualization Area
- **Location**: Center of the screen
- **Purpose**: Interactive knowledge graph display
- **Features**: Zoom, pan, node selection, edge visualization

### 2. Control Panel (Top)
- **Reset View**: Return to default graph view
- **Expand All**: Expand all node connections
- **Collapse All**: Collapse secondary connections
- **Layout Options**: Switch between different graph layouts

### 3. Information Panel (Right)
- **Node Details**: Selected node information
- **Connection Info**: Related nodes and relationships
- **Analytics**: Node statistics and metrics

### 4. Search and Filters (Left)
- **Global Search**: Find nodes by name or properties
- **Advanced Filters**: Filter by node type, date, connections
- **Saved Searches**: Quick access to common queries

## Navigation Tutorial

### Step 1: Initial View
![Initial Graph View](screenshots/initial-view.png)
*Screenshot: Default graph view showing NAS concepts*

When you first load the application:
1. You'll see the main knowledge graph with sample NAS data
2. Nodes represent different concepts (hardware, protocols, processes)
3. Edges show relationships between concepts
4. Different colors indicate different node types

### Step 2: Exploring Nodes
![Node Selection](screenshots/node-selection.gif)
*Animation: Clicking and selecting nodes*

**To interact with nodes:**
1. **Click** any node to select it
2. The **Information Panel** updates with node details
3. **Connected edges** are highlighted
4. **Related nodes** are emphasized

**Node Information Includes:**
- Node name and type
- Number of connections
- Related concepts
- Detailed properties

### Step 3: Using Search Features
![Search Interface](screenshots/search-interface.png)
*Screenshot: Global search and filtering options*

**Global Search:**
1. Type in the search box (top-left)
2. Results appear as you type
3. Click results to navigate to nodes
4. Use filters to narrow results

**Advanced Filters:**
1. Click "Advanced Filters" button
2. Select node types to display
3. Set date ranges (if applicable)
4. Apply connection-based filters

### Step 4: Graph Navigation
![Graph Controls](screenshots/graph-controls.gif)
*Animation: Zooming, panning, and layout changes*

**Mouse/Touch Controls:**
- **Pan**: Click and drag empty space
- **Zoom**: Mouse wheel or pinch gesture
- **Select**: Click nodes or edges
- **Multi-select**: Hold Ctrl/Cmd while clicking

**Layout Options:**
1. **Force-Directed** (default): Dynamic positioning
2. **Circular**: Nodes arranged in circles
3. **Hierarchical**: Tree-like structure
4. **Grid**: Regular grid arrangement

### Step 5: Using Analytics Features
![Analytics Dashboard](screenshots/analytics-dashboard.png)
*Screenshot: Analytics panel with charts and metrics*

**Available Analytics:**
1. **Node Distribution**: Pie chart of node types
2. **Connection Metrics**: Bar chart of connectivity
3. **Trend Analysis**: Time-based data (if available)
4. **Network Health**: Overall graph statistics

## Features Guide

### Interactive Graph Visualization

#### Node Types and Colors
- 🔴 **Hardware** (Red): Physical NAS devices, storage arrays
- 🔵 **Concepts** (Blue): Abstract ideas like RAID, storage pools
- 🟢 **Protocols** (Green): Network protocols (SMB, NFS, iSCSI)
- 🟡 **Processes** (Orange): Management and operational procedures

#### Edge Relationships
- **Solid lines**: Direct relationships
- **Dashed lines**: Indirect or potential relationships
- **Line thickness**: Relationship strength
- **Edge labels**: Relationship type (uses, connects, implements)

### Advanced Search

#### Search Operators
- **Exact match**: Use quotes "NAS Device"
- **Wildcard**: Use * for partial matches (RAID*)
- **Exclude**: Use minus sign (-protocol)
- **Property search**: Use property:value syntax

#### Filter Categories
1. **Node Type Filters**
   - Hardware components
   - Software concepts
   - Network protocols
   - Management processes

2. **Connection Filters**
   - Highly connected nodes (hubs)
   - Isolated nodes
   - Bridge nodes (connecting different clusters)

3. **Date Filters** (if temporal data available)
   - Creation date
   - Last modified
   - Usage frequency

### Path Finding

#### Finding Connections
1. Select a **source node**
2. Click **"Find Path"** button
3. Select a **target node**
4. View the **shortest path** highlighted
5. Explore **alternative paths** if available

#### Use Cases
- Understanding how concepts relate
- Finding indirect connections
- Exploring system dependencies
- Discovering knowledge gaps

### Data Export

#### Export Formats
1. **JSON**: Complete graph data structure
2. **CSV**: Nodes and edges as tabular data
3. **Image**: PNG/SVG of current view
4. **Cytoscape**: Compatible with Cytoscape software

#### Export Options
1. **Current View**: Only visible nodes and edges
2. **Selected Nodes**: Only selected elements
3. **Full Dataset**: Complete knowledge graph
4. **Filtered Data**: Based on current filters

## Advanced Usage

### Customizing Views

#### Layout Algorithms
- **Force-Directed**: Best for general exploration
- **Circular**: Good for seeing all connections
- **Hierarchical**: Perfect for tree-like data
- **Custom**: Create your own arrangements

#### Visual Customization
- **Node sizes**: Based on connections or importance
- **Color schemes**: Custom color palettes
- **Label display**: Show/hide node and edge labels
- **Animation**: Enable/disable transitions

### Working with Large Datasets

#### Performance Tips
1. Use **filters** to reduce visible nodes
2. Enable **clustering** for dense networks
3. **Limit connections** per node display
4. Use **level-of-detail** rendering

#### Memory Management
- The application automatically manages memory
- Large datasets are loaded progressively
- Unused nodes are cached efficiently

### Integration Options

#### Embedding
```html
<iframe src="https://USERNAME.github.io/nas-knowledge-graph-demo?embed=true" 
        width="800" height="600"></iframe>
```

#### URL Parameters
- `?data=url`: Load custom data from URL
- `?filter=type`: Apply initial filters
- `?node=id`: Start with specific node selected
- `?layout=name`: Set initial layout

## Keyboard Shortcuts

### Navigation
- **Space**: Pan mode toggle
- **R**: Reset view to default
- **F**: Fit graph to screen
- **+/-**: Zoom in/out
- **Arrow keys**: Pan graph

### Selection
- **Ctrl+A**: Select all visible nodes
- **Ctrl+D**: Deselect all
- **Delete**: Hide selected nodes
- **Ctrl+Z**: Undo last action

### Search and Filters
- **Ctrl+F**: Focus search box
- **Escape**: Clear search/close panels
- **Enter**: Apply current filters
- **Ctrl+Shift+F**: Advanced search

### Views and Layouts
- **1-4**: Switch between layout algorithms
- **Tab**: Cycle through information panels
- **Ctrl+E**: Toggle edge labels
- **Ctrl+L**: Toggle node labels

## Tips and Best Practices

### Efficient Navigation
1. **Start with search** for specific concepts
2. **Use filters early** to reduce complexity
3. **Follow connections** to discover relationships
4. **Save interesting views** using bookmarks
5. **Export data** for deeper analysis

### Understanding the Data
1. **Node size** often indicates importance
2. **Central nodes** are usually key concepts
3. **Isolated nodes** might need more connections
4. **Dense clusters** represent related concept groups

### Performance Optimization
1. **Close unused panels** to improve performance
2. **Use appropriate zoom levels** for your task
3. **Filter large datasets** before detailed exploration
4. **Clear search frequently** to avoid memory buildup

## Troubleshooting

For common issues and solutions, see the [Troubleshooting Guide](troubleshooting.md).

### Quick Solutions
- **Graph not loading**: Refresh page, check internet connection
- **Slow performance**: Apply filters, reduce visible nodes
- **Missing nodes**: Check filters, verify data source
- **Export issues**: Try different format, reduce data size

## Need Help?

- 📖 **Technical Documentation**: [technical.md](technical.md)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/USERNAME/nas-knowledge-graph-demo/issues)
- 💬 **Community**: [GitHub Discussions](https://github.com/USERNAME/nas-knowledge-graph-demo/discussions)
- 📧 **Contact**: [Project maintainers](../CONTRIBUTING.md#maintainers)

---

*Last updated: December 2024*
