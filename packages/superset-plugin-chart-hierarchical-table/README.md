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
- **Dual-Mode Hierarchy**: Multi-Dimension Level Grouping (`Region > Country > City > Store`) and Parent-Child Adjacency (`ID` / `Parent ID` / `Label`).
- **Multi-Selection Cross-Filtering**: Native Superset 6.1.0 `setDataMask` integration with grouped `IN` filters, checkboxes, multi-row highlighting, and URI-safe key handling.
- **Automatic Rollups & Grand Total**: Post-order tree aggregation for subtotals (SUM, AVG, MIN, MAX, COUNT) and sticky Grand Total row.
- **Interactive Navigation**: In-Tree real-time search with path preservation, Expand All, and Collapse All tools.
- **Modern UI & Theming**: Ant Design v5-inspired dark mode styling, sticky headers, and sticky hierarchy column.

## Running Tests

```bash
npm run test
```
