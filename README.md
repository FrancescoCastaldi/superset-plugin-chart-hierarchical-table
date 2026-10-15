# @superset-plugin-chart/hierarchical-table

Frontend visualization plugin for **Apache Superset 6.1.0+** providing a rich, interactive Tree Table and Matrix Grid Chart Plugin (StratumTree) with multi-level rollup aggregations, parent-child graph resolution, cross-filtering, explicit metric semantics, confidence intervals and small-number suppression for health data.

## Features

- **Four Macro-Sections Control Panel**: Organized canonically into `Data`, `Customize`, `Comparison & Analysis`, and `Performance & Limits`.
- **Dual-Mode Hierarchy**: Multi-Dimension Level Grouping (e.g. Region, Country, City, Store) and Parent-Child Adjacency (ID / Parent ID / Label).
- **Time Comparison & Variance**: Time grain, reference period (current, previous, ytd), and comparison strategy (prev_period, prev_year_same_period, budget_target) wired end-to-end against pivot periods.
- **Weighted Average Rollup**: Native `weighted_avg` aggregation with explicit `weightColumn` metric selection and fallback to arithmetic mean when weights sum to zero.
- **Prioritized Conditional Formatting**: Cell, row, and column rules with operators (<, <=, ==, >=, >, between, regex) resolved by ascending priority order with static regex safety safeguards.
- **Theme & Palette Profiles**: 5 nominal palette profiles (`standard`, `colorblind`, `stratum-warm`, `stratum-cool`, `custom`) with custom hex overrides and WCAG contrast ratio checks.
- **Goal Benchmarks**: Per-metric target thresholds with attainment calculation, status progression (`achieved`, `on_track`, `at_risk`, `missed`), and directional evaluation (`higher_is_better`, `lower_is_better`).
- **Expression & Metric Sorting**: Sorting by hierarchy name, query metrics, structural properties (`__tree_level__`, `__leaf_count__`), and derived expressions (`delta_*_pct`), paired with configurable `nullHandling` (`bottom`, `top`, `exclude`).
- **Large Tree Virtualization**: Configurable `pageSize` and `virtualizationThreshold` using windowed rendering for high-volume trees with parent-delegated cross-filter interactions.
- **Multi-Selection Cross-Filtering**: Native Superset 6.1.0 `setDataMask` integration with grouped `IN` filters, checkboxes and multi-row highlighting.
- **Automatic Rollups & Grand Total**: Post-order tree aggregation for subtotals (SUM, AVG, MIN, MAX, COUNT, WEIGHTED_AVG), level-aware hybrid MAX/SUM roll-ups for distinct physical unit counters (`Sportelli Attivi`, `Sedi Attive`), automatic averaging for duration/rate metrics (`Tempo Gestione Sportello`), share metrics recomputed as a ratio of sums (`% Totem` = `Totem / Totale`), and a Grand Total row.
- **Two-Way Pivot Matrix Grid**: Horizontal row totals and column subtotals (the pivot time delta columns work with a single pivot dimension).
- **Metric Definitions**: Declare per metric `sum`, `mean`, `distinct_count`, `ratio` (parents and totals are a ratio of sums), `delta_pct` or `none`, plus format and polarity, instead of relying on name heuristics.
- **Confidence Intervals and Significance Signal**: Wilson and Poisson intervals on ratios, with a marker only when the whole interval lies above or below the parent, the total or the goal.
- **Small-Number Suppression**: Hides counts below a threshold with complementary suppression, so published tables do not disclose small cells (hidden values never reach sorting, colours or the CSV export).
- **Trend Sparklines and Indicators**: A Trend column per metric over the periods, and icons on conditional formatting rules.

## Installation & Setup

Install the plugin dependency:

```bash
npm install superset-plugin-chart-hierarchical-table
```

### Registration in Superset

In `superset-frontend/src/visualizations/presets/MainPreset.ts` (or `MainPreset.js`):

```typescript
import { HierarchicalTableChartPlugin } from 'superset-plugin-chart-hierarchical-table';

new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register();
```

### Local Automated Installation

To register and synchronize the plugin directly into a local Apache Superset development environment, run:

```bat
install.bat
```

or use the PowerShell installer:

```powershell
powershell -ExecutionPolicy Bypass -File install-plugin.ps1
```

## Build & Validation

To build declarations and the ESM bundle:

```bash
npm run build
```

The build compiles TypeScript declarations and bundles `dist/index.esm.js` via esbuild.

To run typechecking:

```bash
npx tsc --noEmit
```

To run the complete Jest test suite:

```bash
node ./node_modules/jest/bin/jest.js --preset=ts-jest
```

or:

```bash
npm test
```
