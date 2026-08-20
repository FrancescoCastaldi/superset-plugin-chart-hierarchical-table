# @superset-plugin-chart/hierarchical-table

Frontend visualization plugin for **Apache Superset 6.1.0+** providing a rich, interactive Tree Table / Hierarchical Grid with rollup aggregations, parent-child graph resolution, cross-filtering, and Ant Design v5 theming.

## Installation

```bash
npm install superset-plugin-chart-hierarchical-table
```

## Registration in Superset

In `superset-frontend/src/visualizations/presets/MainPreset.js`:

```javascript
import { HierarchicalTableChartPlugin } from 'superset-plugin-chart-hierarchical-table';

new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register();
```

## Features
- Multi-Dimension Level Grouping (`Region > Country > City > Store`)
- Parent-Child Adjacency (`ID` / `Parent ID` / `Label`)
- Automatic Subtotal Rollup & Grand Total Row
- Sticky Headers & Sticky First Column
- In-Tree Realtime Search & Path Highlighting
- Superset Cross-Filtering Native Events
