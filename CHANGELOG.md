# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.5] - 2026-10-29
### Added
- **Controllo "Mostra le etichette Δ % accanto ai valori"** (`showVarianceBadges`, attivo di default): se disattivato, con "Mostra le variazioni rispetto al periodo" acceso la variazione resta solo nelle colonne Δ % e i valori assoluti (per esempio Richieste) non portano più l'etichetta percentuale accanto. Nessun cambiamento per i grafici esistenti.

## [0.10.4] - 2026-10-26
### Fixed
- **Controlli non bloccanti in Explore**: Rimossa la validazione obbligatoria (`validators: []`) e aggiunto `clearable: true` per `groupby`, `columns` e `metrics` per prevenire errori di salvataggio o esecuzione per parametri mancanti quando si naviga la vista Explore di Superset.

## [0.10.3] - 2026-10-26
### Added
- **Calibrazione larghezza colonne per viste comparative**: Calibrato il layout a 9 colonne (1260px su standard desktop 1440px) per prevenire overflow e barre di scorrimento orizzontali.
- **Motore di aggregazione gerarchica robusto**: Gestione accurata dei punti percentuali (Delta p.p.) nel calcolo dei subtotali di nodo e del grand total, con preservazione della gerarchia ad albero.

## [0.10.2] - 2026-10-25
### Added
- **Ricalcolo Robusto dei Delta in Punti Percentuali (Delta (punti %), Delta p.p.)**: Estesa la logica di recomputeDerivedMetrics in src/utils/aggregations.ts per calcolare la differenza aritmetica esatta (corr - conf) anziche la variazione percentuale relativa per tutte le metriche espresse in punti percentuali (punti %, p.p., punti percentuali, _pp).
- **Heuristic di Prossimita Posizionale per Tabelle Multi-Blocco**: Introdotto findPrecedingMetricPair che individua le colonne operando (corr e conf) immediatamente precedenti a ciascuna colonna delta nella lista delle metriche, garantendo che tabelle con molteplici KPI affiancati colleghino ciascun delta al proprio blocco di appartenenza.
- **Formattazione e Riconoscimento Colonne Delta**: Aggiornati isDeltaColumn in src/utils/tableColumns.ts e formatMetricValue in src/utils/formatters.ts per riconoscere e formattare automaticamente le metriche in punti percentuali con suffisso esplicito p.p. e segno (es. +4.5 p.p., -2.3 p.p.).

## [0.10.1] - 2026-10-24
### Added
- **Native Dashboard `PeriodCompare` filter support**: extracted and forwarded `extra_form_data.time_compare` to `query.time_offsets` in `buildQuery.ts`, enabling native dual-query execution without cartesian product views or SQL row duplication.

## [0.10.0] - 2026-10-22
### Added
- **New `diff` metric definition type** (`src/utils/metricSemantics.ts`, `src/types/index.ts`): computes `current - baseline` on every node (leaves, parent subtotal rows and the grand total) from the node-level aggregated values of the two operand metrics, never as a sum or average of child differences. Designed for difference columns between node-level ratios (e.g. acceptance % current vs comparison period in percentage points) and for additive delta columns (e.g. waiting time in days) that need exact parent values.
- **Operand ordering guarantee**: `ratio` and `delta_pct` definitions are always computed before `diff` definitions, so a diff may reference ratio metrics as operands regardless of the declaration order in `metricDefinitions`.
- **Polarity support on diff columns**: a diff definition accepts `polarity: "lower_is_better"` so the delta colour scale inverts (negative delta rendered green), e.g. for waiting-time deltas where a decrease is an improvement.
- **What-If engine awareness** (`src/utils/whatIfEngine.ts`): metrics declared as `diff` are excluded from direct leaf multiplication and are always recomputed from their operands, like `ratio` and `delta_pct`.

## [0.9.0] - 2026-10-18
### Added
- **Interactive What-If Simulation Engine (`whatIfEngine.ts`)**: Pure deterministic calculation engine applying percentage multipliers strictly to leaf nodes and recalculating parent rollups, weighted averages, and grand totals with mathematical rigor. Ratio metrics (like length of stay) recalculate from simulated operands rather than averaging averages.
- **Polarity-Aware In-Cell Delta Badges**: Directional delta badges (`▲`/`▼`) rendered directly inside simulated metric cells with polarity awareness (`higher_is_better` vs `lower_is_better`), baseline value tooltips, and distinct background highlighting.
- **Interactive What-If Toolbar (`WhatIfToolbar.tsx`)**: Responsive simulation control panel with metric range sliders (-50% to +50%), manual numeric percentage inputs, active simulation status badge, instant reset button, and collapsible preset scenario manager.
- **Scenario Manager (`whatIfScenarioManager.ts`)**: Persistence layer supporting saving, loading, and renaming up to 10 simulation presets in `sessionStorage` with graceful in-memory fallback.
- **Enriched CSV Export**: Automatic generation of Base, Simulato, and Delta % columns in CSV export when What-If simulation is active, preserving full auditability of simulated data.
- **Dev Studio Integration**: Added What-If simulation toggle in Explore Control Panel under Comparison & Analysis, with live event hook logging (`onWhatIfChange`) in Diagnostics Drawer.

## [0.8.4] - 2026-10-18
### Added
- **Responsive Viewport-Constrained Sizing**: Bound chart dimensions directly to the live viewport container in Dev Studio via `ResizeObserver`, ensuring `transformProps` receives exact pixel width and height without manual window resize events.
- **High-Contrast Bidirectional Scrollbars**: Enhanced native scrollbars in `src/components/HierarchicalTable.css` with 10px width and height, `#94a3b8` thumb with 2px `#f1f5f9` border padding, `#64748b` hover state, and Firefox `scrollbar-color: #94a3b8 #f1f5f9` for instant visual discovery across light and dark themes.

### Fixed
- **Dev Studio Scrollbar Clipping and Double Scrolling**: Removed unconstrained `overflow: auto` and hardcoded 1200x700px dimensions from `.chart-wrapper` and `.chart-canvas` in `studio.css`, locking scrolling exclusively to the authoritative `.table-scroll-wrapper` container. Both horizontal and vertical scrollbars now stay permanently visible and pinned within the visible viewport above the diagnostics drawer.

## [0.8.3] - 2026-10-18
### Added
- **Natural Time Grain Auto-Detection (`detectNaturalGrain`)**: Pure deterministic utility in `src/utils/timeComparison.ts` that automatically infers the natural temporal granularity (`year`, `quarter`, `month`, `week`, `day`) from active pivot period keys.
- **Auto Grain Mode in Control Panel and Dev Studio (`auto`)**: Added `auto` choice (`✨ Auto (Rileva automaticamente dai dati)`) across `ComparisonTimeGrain`, `TIME_GRAINS`, Superset `controlPanel.tsx`, and `PeriodComparisonEditor.tsx`.
- **Superset `time_grain_sqla` Mapping**: Transparently mapped native SQLA time grain codes (`P1D`, `P1W`, `P1M`, `P3M`, `P1Y`) to typed comparison grains in `formDataOptions.ts`.
- **Dynamic Informative Column Titles**: `periodComparisonTitle` generates explicit headers reflecting the selected grain (`Δ vs previous year (YoY)`, `Δ vs previous month (MoM)`, `Δ vs previous quarter (QoQ)`, `Δ vs previous day (DoD)`, `Δ vs previous week (WoW)`).
- **Proactive In-Editor Diagnostics Banner**: `PeriodComparisonEditor` validates whether the selected granularity and baseline strategy have preceding periods in the active dataset, displaying friendly alerts when baseline data is missing and confirming valid comparisons.
- **Multi-Year Mock Scenarios**: Enriched `healthcareScenario` with 2025 baseline data so that YoY, QoQ, MoM, and same-period last year comparisons compute real deltas out of the box.

### Fixed
- **Robust Period Key Parsing**: Hardened `parsePeriodKey` against non-string input, safely parsing numeric year keys (such as `2023`, `2024`) or timestamps without throwing runtime TypeError exceptions.
- **Safe Comparison Fallbacks**: Prevented empty dashes in period comparison tables by resolving `auto` grains against real pivot period keys.

## [0.8.2] - 2026-10-18
### Added
- **Drag and Drop Metrics Reordering (`onReorderMetrics`)**: Native HTML5 drag and drop metrics reordering supporting both interactive chips in the Explore Control Panel and direct column header reordering on the table grid.
- **Draggable Metric Chips in Control Panel**: Replaced simple button pills with rich, accessible chips featuring drag handles (`⠿`), numerical position badges (`#1`, `#2`...), move arrows (`◀`/`▶`) for keyboard and mobile accessibility, quick removal (`✕`), drop indicators, and quick-add buttons for remaining dataset metrics.
- **Direct Table Column Header Reordering**: Table metric headers (`<th>`) in flat and pivot modes become draggable when `onReorderMetrics` is configured, highlighting drop targets with clean visual drop indicators and seamlessly reordering metrics without triggering accidental sorting.
- **Pure Reordering Helpers (`src/utils/metricReorder.ts`)**: Added deterministic pure array and metric key reordering helpers (`reorderArray`, `reorderMetricsByKey`, `reorderMetricsWithPosition`, `getMetricKeyFromColumn`) with full unit test coverage.
- **Dev Studio Live Hook Integration**: Wired `onReorderMetrics` into Dev Studio `App.tsx` and `DiagnosticsDrawer`, providing live event logging and instantaneous chart grid synchronization across all scenarios.

### Fixed
- **Base Metrics Isolation**: Table drop handler now filters against pure base metrics (`props.formData.metrics`), preventing synthetic delta metrics (such as `${metric}___delta`) and table calculations from contaminating `formData.metrics`.
- **Metric Name Disambiguation in Column Resolution**: Hardened `getMetricKeyFromColumn` with word boundary matching and length-descending sorting, preventing collisions when a metric name is a substring or suffix of another metric.
- **Separated Pivot Header Drag Guard**: Restricted draggable headers in separated pivot mode (`combineMetric: false`) to Level 1 metric groups, preventing Level 2 period values from becoming erroneously draggable.
- **Drag Leave Bubbling and Position Loss**: Protected `onDragLeave` in both table headers and Control Panel chips against child element bubbling (`e.currentTarget.contains`), and added direct `clientX` drop position calculation fallback.
- **Cross-Component Drag and Drop**: Enabled dropping table headers dragged from the grid directly onto Control Panel chips.


## [0.8.1] - 2026-10-18
### Added
- **In-Cell Variance Badges (`showVarianceDelta`)**: Complete rendering pipeline for inline variation percentage badges (`.delta-badge`) displaying `▲ +X.X%` or `▼ -X.X%` directly beside numeric values across flat hierarchy tables, horizontal pivot matrices, and grand total rows.
- **Native Pivot Delta Columns and Metric Polarity Inheritance**: Fixed key collisions between flat variance delta metrics and native pivot time deltas (`pivotTimeDeltaMode`: `absolute`, `percentage`, `both`). Automatically propagates custom metric definitions and polarity (`higher_is_better` vs `lower_is_better`) to generated pivot delta columns.
- **On-Demand Add and Remove Time Comparison Architecture**: Redesigned `PeriodComparisonEditor` with 1-click removal of pivot comparison mode to return to flat tables, temporal candidate axis selection, and synchronized dispatch across camelCase and snake_case properties.
- **Visual Showcase and Headless Asset Capture**: High-resolution scenario screenshots (Healthcare, Sales Multi-Pivot, 5k-Row Virtualization Stress Test, Superset REST API Modal) and animated GIF demo (`docs/images/dev_studio_demo.gif`) embedded into repository documentation and README.md.
- **Live Dev Studio (Superset Explore Workbench)**: Interactive development and testing environment located in `dev-studio/` powered by Vite and React 18 with sub-50ms Hot Module Reloading (HMR).
- **Superset Explore Control Panel Replica**: 5 collapsible accordion sections (Data, Customize, Comparison & Analysis, Table Calculations & Cell Visuals, Performance & Limits) reflecting all Superset configuration controls with two-way state binding.
- **Diagnostics and Event Drawer**: Real-time monitor logging Superset `setDataMask` cross-filter payloads, Context Menu drill actions, and pipeline execution time in milliseconds.
- **Benchmark Scenarios**: Included out-of-the-box datasets for Healthcare and Sanita (with deltas and privacy suppression <5), Sales Multi-Pivot (with table calculations and bipolar bars), and High-Volume Stress Test (5,000-row tree).
- **Launcher Scripts**: Root `npm run dev`, `npm run dev:build`, and double-clickable `dev.bat` for Windows environments.
- **Superset REST API Integration (`POST /api/v1/chart/`)**: Support for programmatic chart creation conforming to official Superset `ChartPostSchema`. Includes CLI script `scripts/create_chart_api.py`, interactive modal dialog in Dev Studio with JSON payload export, copyable cURL, Python and PowerShell templates, and live in-browser REST client with automated JWT authentication and CSRF token management.
- **Interactive Metric Definitions Manager (`MetricDefinitionsEditor`)**: Replaced raw JSON textarea with an interactive visual builder in the Explore Control Panel. Automatically detects active chart metrics and provides visual cards to configure rollup semantics (sum, weighted mean, distinct count, ratio, delta %), weighting metrics, entity dimensions, Wilson/Poisson confidence intervals, number formatting, decimals, and ethical polarity (`higher_is_better` vs `lower_is_better`), featuring two-way synchronization with raw JSON mode and 1-click auto-suggestions.
- **Time Comparison and Database Datetime Manager (`PeriodComparisonEditor`)**: Interactive control in Explore Control Panel replacing confusing dropdowns with real-time requirements diagnostic. Automatically scans dataset for temporal/datetime columns (`date`, `data`, `time`, `timestamp`, `anno`, `mese`, `quarter`, `trimestre`, `__timestamp`), providing 1-click quick-set buttons to activate horizontal pivot mode, validation of period formats, selection of comparison baseline (`prev_period`, `prev_year_same_period`, `budget_target`), reference periods (`previous`, `ytd`), time grains (DoD, WoW, MoM, QoQ, YoY), in-grid pivot column deltas (`pivotTimeDeltaMode`), and live preview of generated columns.
- **Extended Database Datetime Parser (`parsePeriodKey`)**: Enhanced temporal parsing in `src/utils/timeComparison.ts` supporting quarter keys (`Q1` to `Q4`), slash dates (`YYYY/MM`, `MM/YYYY`, `YYYY/MM/DD`, `DD/MM/YYYY`), Italian and English month names (`Gennaio..Dicembre`, `Jan..Dec`), single-digit months (`2026-1` to `2026-9`), and Unix epoch timestamps in seconds and milliseconds.


## [0.8.0] - 2026-10-15
### Added
- **Diverging Heatmap with 3-Stop Continuous Gradient (`diverging_heatmap`)**: New visual rendering engine in `src/utils/advancedCellVisuals.ts` supporting continuous three-stop color scales (Min, Neutral Midpoint, Max) with automatic WCAG AA text contrast selection (`#ffffff` or `#212529`) based on calculated background relative luminance.
- **Polarity-Aware Color Mapping**: Heatmap colors and data bars strictly respect metric polarity (`higher_is_better` vs `lower_is_better`). For metrics where lower values represent positive outcomes (for example hospital waiting times or post-op complications), negative variances receive the positive palette color and positive variances receive the alert color.
- **Bipolar Zero-Centered In-Cell Data Bars (`bipolar_data_bars`)**: Bi-directional in-cell data bars anchored to a vertical zero axis line, extending positive values to the right in green and negative values to the left in red.
- **Explore Formatting Controls**: `minMaxDisplayMode` now includes `diverging_heatmap` and `bipolar_data_bars`, accompanied by `heatmapPalette` (`red_white_green`, `red_yellow_green`, `blue_white_red` for colorblind accessibility, and custom theme colors) and `divergingMidpoint`.

## [0.7.0] - 2026-10-15
### Added
- **Dimension Limits per Hierarchy Level (Top N and Bottom N with Synthetic Others Aggregation)**: New dimension limiting engine in `src/utils/dimensionLimits.ts` inspired by Qlik Sense dimension boundaries. Allows analysts to limit deep, high-cardinality trees (for example hospital diagnosis codes, clinical procedures, cost centers) to the most significant Top N or Bottom N contributors per level while aggregating remaining branches into an exact synthetic row.
- **Mathematical Additive Invariant Preservation**: The synthetic "Others" node (`isOthers: true`, `othersCount: K`) computes the exact metric sum of all excluded siblings, ensuring parent subtotals and the overall Grand Total remain mathematically identical to the full dataset down to the penny.
- **Configurable Labels and Placeholders**: Dimension limit rules support custom templated labels via `{k}` or `{count}` placeholders (defaulting to `Altri ({k})`).
- **Context Menu Protection on Synthetic Rows**: Right-clicking on an "Others" row in the tree automatically excludes the synthetic label from the leaf dimension filter, filtering instead by valid ancestor dimensions to prevent empty SQL drill queries.
- **Explore Control (`Dimension Limits & Top N (optional)`)**: JSON configuration control in `Performance & Limits` supporting level-specific or dimension-specific boundaries.

## [0.6.0] - 2026-10-15
### Added
- **Measure Modifiers and Table Calculations (`tableCalculations`)**: New analytical engine in `src/utils/tableCalculations.ts` providing standard business intelligence table calculations and dynamic measure modifiers.
- **Percent of Total (`pct_of_total`)**: Computes each node metric share relative to the overall Grand Total or scoped hierarchy total.
- **Percent of Parent (`pct_of_parent`)**: Evaluates the percentage contribution of each branch relative to its parent row subtotals, guaranteeing exact additive balance across sibling groups.
- **Running Total (`running_total`)**: Cumulative metric summation along ordered chronological pivot periods (`scope: "periods"`) or across hierarchical siblings (`scope: "siblings"`).
- **Difference from Previous (`diff_from_previous` and `diff_from_previous_pct`)**: Period-over-period absolute and percentage variances calculated across chronological pivot intervals without altering raw query metrics.
- **Sibling Ranking (`rank`)**: Computes competition (standard 1224) or dense (1223) rank order among sibling rows, sorted either descending or ascending.
- **Companion Column and Replace Display Modes**: Table calculations can be appended as companion columns with customized titles and dedicated formatters, or directly replace the underlying metric cells.
- **Explore Control (`Table Calculations (optional)`)**: Dedicated JSON control in `Comparison & Analysis` allowing analyst-driven configuration of calculations.

## [0.5.0] - 2026-10-15
### Added
- **Native Apache Superset Context Menu (`Behavior.DrillBy` and `Behavior.DrillToDetail`)**: Support for Superset native right-click context menu on tree cells and rows. Generates binary filter clauses (`buildContextMenuFilters` in `src/plugin/contextMenu.ts`) for drill to detail, drill by, and cross-filtering.
- **Hierarchical Path Preservation with `TreeNode.rawPath`**: Tree nodes record original database values along the dimension path (`TreeNode.rawPath`) to ensure accurate drill-down filters even when dimension values undergo string formatting or label transformations.
- **Pivot Dimension Context Filtering**: Right-clicking on pivoted metric cells adds exact filter clauses for single or composite pivot dimensions (for example `mese` and `canale`), while excluding `ROW_TOTAL` and `SUBTOTAL` columns.
- **Privacy-Preserving Drill Omission**: Cells suppressed by small-number privacy rules (`node.suppressed`) automatically omit drill to detail and drill by filters to prevent identification leaks.
- **Grand Total Context Menu**: Right-clicking on grand total cells retains applicable pivot filters while correctly omitting hierarchy dimension constraints.
- **Explore Control (`enableContextMenu`)**: Checkbox control in `Comparison & Analysis` allowing users to toggle contextual right-click menu actions dynamically.

## [0.4.1] - 2026-10-15
### Fixed
- **Share Metrics `% <Target>` on Parent Rows, Grand Total and Row Totals**: metrics named `% <Target>` (for example `% Totem`, `% Portale`) without a `metricDefinitions` entry were left empty (`-`) on parent rows, `Grand Total` and the horizontal `ROW_TOTAL` columns. `recomputeDerivedMetrics` now evaluates them as `Target / Totale * 100` from the aggregated operands, looking up the numerator by base name and the denominator among the metrics named `Totale`, `Total`, `Volume` or `Tot`; a zero denominator gives an empty cell. On leaf rows the value is recomputed too, so a SQL metric that returns a fraction (`0.4`) is shown on the same 0 to 100 scale as the parents. `% Self ...` metrics keep their dedicated rules, and an explicit `ratio` definition still wins. Covered by new scenarios in `test/aggregations.test.ts`.
- **Fallback Weight for Derived Metrics**: when a derived metric cannot be recomputed from its operands, the weighted mean of the children now prefers a `Totale`/`Total`/`Volume` metric of the same pivot column, and the last resort is `Totale` instead of `richieste_corr`. The match is made on the base metric name, so the `___SUBTOTAL` and `___ROW_TOTAL` pivot suffixes are not mistaken for a total metric.

## [0.4.0] - 2026-10-15
### Added
- **Metric Definitions (`metricDefinitions`)**: new JSON control in `Comparison & Analysis` that states what each metric means and wins over the name-based guesses. Types: `sum`, `mean` (optional `weight` metric), `distinct_count` (`entityDimension`: MAX at and below that level, SUM above), `ratio` (`numerator`, `denominator`, `scale`: parent rows, grand total and row totals are a ratio of sums, never an average of ratios), `delta_pct` (`current`, `baseline`) and `none` (empty on parent rows). Each entry can also set `format` (`integer`, `decimal`, `percent`, `duration` in seconds, `days`, `currency`), `decimals` and `polarity` (`higher_is_better`, `lower_is_better`). Malformed entries are dropped, and charts without definitions behave exactly as before. Logic in `src/utils/metricSemantics.ts`; covered by `test/metricSemantics.test.ts` and `test/transformPipeline.metricDefinitions.test.ts`.
- **Confidence Intervals and Significance Signal**: a `ratio` definition can declare `ci: "wilson"` (proportions, for example the share of bookings within the maximum waiting time) or `ci: "poisson"` (event rates over a population, with `scale` 1000 or 100000), a `ciLevel` (0.9, 0.95, 0.99 or 0.998) and `compareTo` (`parent`, `total` or `goal`). Every cell gets its interval, shown in the tooltip, and a marker (up or down) appears only when the whole interval lies on one side of the reference, so small units are not ranked better or worse by chance, the funnel plot logic of public health benchmarking inside the table. The marker colour follows the polarity. Pure functions in `src/utils/statistics.ts` (Wilson score, Byar approximation of the exact Poisson interval) and `src/utils/significance.ts`; covered by `test/significanceAndSuppression.test.ts`.
- **Small-Number Suppression (`Privacy (small numbers)`)**: `suppressionThreshold`, `suppressionMetrics`, `complementarySuppression` and `suppressionLabel`. Counts from 1 to threshold minus 1 are replaced by a label such as `<5`; the smallest visible nonzero sibling of a lone hidden cell is hidden too (complementary suppression, also among the root rows), so the value cannot be recovered by subtracting from the total; ratios and deltas built on a hidden cell are hidden; the grand total stays visible. Suppression runs last, so sorting, min/max colouring and the CSV export never see the hidden value, and the export writes the label. Logic in `src/utils/suppression.ts`.
- **Trend Sparklines**: `showSparklines` and `sparklineMetrics` add a `Trend` column per metric with a line over the periods in calendar order (single pivot dimension). The geometry is pure and deterministic (`computeSparkline` in `src/components/Sparkline.tsx`), gaps split the line and the colour follows the polarity.
- **Indicators in Conditional Formatting**: rules accept `icon` (`arrow_up`, `arrow_down`, `dot`, `flag`, `check`, `warning`) shown beside the value of a matching cell.
- **Benchmark Script**: `node scripts/bench.mjs [rows] [periods]` runs `transformProps` on a synthetic dataset. Results in `docs/BENCHMARK_v0.4.0.md`. The control audit of this release is in `docs/AUDIT_CONTROLLI_v0.4.0.md`.

### Changed
- **Calendar-Aware Period Order**: pivot periods that are Italian or English month names or weekday names follow the calendar, whole numbers compare numerically and composite keys compare part by part. ISO dates, quarters and free labels keep the lexicographic order.
- **Delta Colours Follow the Polarity**: a metric declared `lower_is_better` shows a decrease in green and an increase in red; without a definition the colours are unchanged.
- **`diff` Is Read as a Token**: names such as `Differibile` or `Prestazioni differite` (priority class D) are no longer taken for difference metrics, so they are summed and shown without a sign. Names with `Prenotazioni`, `Pazienti`, `Numero` or `in attesa` are no longer averaged as waiting times.
- **Control Label**: `Enable CSV / Excel Hierarchy Export` now reads `Enable CSV Hierarchy Export`, since only CSV exists.
- **Dependencies and Bundle**: removed the unused `d3-format` and `@types/lodash`, and the duplicate example image; `dist/index.esm.js` shrinks from 120.7 KB to 109.6 KB before the new features (121.6 KB with them).

### Fixed
- **Pivot Columns on Dates**: epoch timestamps used as pivot values were converted to ISO dates in the tree but not in the column keys, so the pivot cells, row totals and deltas came out empty. Tree and pivot now share one normalization (`src/utils/dimensionValue.ts`).
- **Derived Metrics on Pivoted Leaves**: a derived metric (for example a rate named `tasso_...`) received a value only for the first period of a leaf; every pivot cell now gets its own value.
- **`aggregationMode` avg, min, max and count**: the control offered them but the roll-up always summed. They are now applied to parent rows and the grand total (the weighted average keeps its explicit weight metric).
- **`showSubtotals`**: the option was resolved but never read; with it off, parent rows no longer show values.

### Performance
- Metric name classifiers are memoized, the tree path key is built incrementally, `Intl.NumberFormat` instances are created once, and the virtualization window updates once per block of 10 rows instead of on every scroll event. `transformProps` on 50,000 rows and 24 periods goes from 265 ms to about 180 ms (-30%).

## [0.3.3] - 2026-10-12
### Fixed
- **Volume Acceptance Count Exclusion in `formatMetricValue` and `isRateMetric`**: Additive volume count metrics containing `accettazione` combined with `totale`, `numero` or `conteggio` (such as `Accettazione Totale`) are no longer matched by the acceptance-rate heuristic (`acc_corr` / `acc_conf`), ensuring they are formatted as localized integers without a `%` suffix and summed rather than averaged in parent subtotals and `Grand Total`.
- **Leading-Percent Derived Metric Detection & Roll-up Recomputation (`isDerivedMetric`, `recomputeDerivedMetrics`, `computeHorizontalRowTotals`)**: Metrics whose base label starts with `%` (such as `% Self vs Operatore` and `%Self fallite vs Operatore`) are now recognized by `isDerivedMetric`, recomputed from aggregated `Self`, `Self - Fallite`, `Operatore` and `Accettazione Totale` operands on parent nodes, `Grand Total` and horizontal `ROW_TOTAL` columns, and protected from horizontal summation across pivot periods.
- **Temporal Dimension ISO Formatting in Tree Hierarchy and Pivots**: Epoch millisecond timestamps from database temporal/date columns in hierarchy dimensions and pivot keys are now automatically formatted as ISO date strings (`YYYY-MM-DD`) instead of displaying raw numeric timestamps.

## [0.3.2] - 2026-10-12
### Fixed
- **Distinct Entity Count Protection in `formatMetricValue`**: Physical entity count metrics identified by `isDistinctEntityMetric` (such as `Sportelli Attivi`, `Sedi Attive`, `Stanze Attive`) are now formatted strictly as localized integers (`Intl.NumberFormat('it-IT')`) even when the table-level `numberFormat` is set to `DURATION_COL` or `DURATION`, preventing active counter counts from displaying as `0:00` or sub-millisecond durations.
- **Duration vs Days Format Collision**: The heuristic rule for lead time in days (`gg`) in `formatMetricValue` no longer intercepts duration metrics containing `attesa` (such as `Attesa Media`, `Attesa Media Sportello`, `Attesa Media Preno Sportello`) when `formatterString` starts with `DURATION` or when the metric does not explicitly specify day units (`giorni`, ` gg`, `_gg`, `lt_off`), allowing queue waiting times to render in colon duration notation (`mm:ss`) rather than days (`gg`).

## [0.3.1] - 2026-10-12
### Added
- **Level-Aware Distinct Entity Roll-up (`isDistinctEntityMetric`, `resolveDistinctEntityDepth`)**: Metrics counting distinct physical units such as `Sportelli Attivi`, `Sedi Attive`, `Stanze Attive` and `Punti Attivi` now resolve the hierarchy depth of the counted entity (`entityDepth`, e.g. `depth = 1` for `Sportello` in `SedeDescrizione -> Sportello -> ServizioDescrizione -> GG Settimana -> FasciaOraria`) and apply a hybrid roll-up: `MAX` at and below `entityDepth` (including leaf record collisions and horizontal `ROW_TOTAL` across pivot months for a single desk) so an active unit evaluates to `1` rather than summing hourly/daily slices, and `SUM` above `entityDepth` (`SedeDescrizione` at `depth = 0` and `Grand Total`), yielding the exact count of distinct active units per facility and across the entire dataset while keeping `SUM` on additive volume metrics (`Arrivi`, `Serviti`, `Persi`, `Sportello Cup`, `Prenotazione Sportello`).
- **Duration Rate Metric Recognition (`isRateMetric`)**: Extended `isRateMetric` to match duration and mean metrics containing `tempo`, `durata` or `media` (such as `Tempo Gestione Sportello`), ensuring parent nodes and `Grand Total` compute the arithmetic/weighted average instead of summing averages.

## [0.3.0] - 2026-10-08
### Added
- **Per-Metric Goal Benchmarks**: A new `Goals (optional)` sub-group in `Comparison & Analysis` holds the `goals` control, a JSON list of `{ metricKey, target, direction }` entries where `direction` is `higher_is_better` (default) or `lower_is_better`. The resolved list becomes the typed `goals[]` field of the form data, the single goal model that later features such as the budget comparison read from. The pure engine `computeGoalDelta` in `src/utils/goalBenchmark.ts` returns the absolute and percentage gap to the target plus a status computed on the attainment ratio (actual / target, inverted for `lower_is_better`): `achieved` from 100%, `on_track` from 90%, `at_risk` from 75%, `missed` below. Zero targets and zero values are resolved without any division, so no `Infinity` or `NaN` can reach the table. Each metric cell whose column benchmarks a goal (plain metric columns and pivot value cells, never delta or total columns) shows a small badge with the signed gap, coloured by status. Malformed entries are ignored, and charts without goals render exactly as before. Covered by `test/transformPipeline.goals.test.ts`.
- **Time Comparison Controls Wired to the Pivot Periods**: The `timeGrain`, `referencePeriod` and `comparisonType` controls were saved with every chart but never read. They keep their names, so saved charts load unchanged, and `formDataOptions.ts` now resolves them to the typed fields `comparisonTimeGrain`, `comparisonReferencePeriod` and `comparisonStrategy`, falling back to `year`, `current` and `prev_period` for missing or unknown values. Periods come from the values of the single pivot column (`YYYY`, `YYYY-Qn`, `YYYY-MM`, `YYYY-MM-DD` or epoch timestamps), grouped by the selected grain; no query or time column control was added. The latest period is compared with a baseline chosen by `comparisonType`: with `prev_period` the `referencePeriod` decides it (`current` is the period itself, so the delta is 0; `previous` is the immediately preceding period; `ytd` is the average period of the current year to date), `prev_year_same_period` uses the period 12 months earlier, and `budget_target` uses the `target` of the matching `goals[]` entry. The pure functions `applyReferencePeriodDelta` and `computeTreeTimeDeltaByStrategy` in `src/utils/timeComparison.ts` write the absolute and percentage delta on every node, and the table shows them as a trailing column group, with the grand total recomputed from its own totals rather than summed. The default `current` and `prev_period` pair, and `budget_target` without goals, add nothing, so existing charts keep their layout. The three controls are shown only with exactly one pivot column, and `referencePeriod` only with `prev_period`. Covered by `test/timeComparison.referencePeriod.test.ts`.
- **Weighted Average Roll-up with an Explicit Weight Metric**: `AggregationFunction` now includes `weighted_avg`, and choosing `Weighted Average / Ratio` in the `aggregationMode` control (already offered but never applied) reveals a new `weightColumn` text control, shown only for that mode. When it names one of the query metrics, every parent subtotal and the grand total become `sum(value * weight) / sum(weight)` over the children, matched per pivot column (`price___2024` is weighted by `qty___2024`), while the weight metric itself is summed so each level weights the next one correctly. The explicit weight replaces the automatic `richieste`/`volume` weights that rate metrics used before; when every weight is zero the value falls back to the plain arithmetic mean instead of dividing by zero. Delta metrics are still recomputed from the aggregated operands. With `weightColumn` empty, or with any other aggregation mode, the roll-up is exactly the previous one, so existing charts are unaffected. The pure `weightedAvgOnNode(node, weightColumn, metric)` in `src/utils/aggregations.ts` exposes the calculation; covered by `test/weightedAvg.test.ts`.
- **Conditional Formatting Rules**: The `conditionalFormatting` form data field, typed since the first releases but never exposed, now has a control in the `Sorting & Conditional Formatting` sub-group: an `ArrayControl` that edits the rules as a JSON list and saves them as an array. The existing `ConditionalFormattingRule` model is extended rather than duplicated: `operator` adds `regex` to `<`, `<=`, `==`, `>=`, `>` and `between` (which reads `targetValue2` as the other bound), and the new `priority` and `scope` fields decide which rule applies and where. Rules are resolved by ascending priority and the first match wins, so priority 1 always beats priority 2 on the same value; a rule without a priority takes its position in the list. `cell` colours the matching cell, `row` colours every metric cell of the node row (the legacy `highlightRow` flag means the same), and `column` is tested once against the pivot value of each generated column, so a pattern such as `^2026` highlights every 2026 column. Matches get the `ht-cond-1`, `ht-cond-2` and `ht-cond-3` classes (success, warning and danger, priority 3 and beyond share the last), and `backgroundColor`/`textColor` override them. The regex operator stays deterministic without any execution timeout, since a running JS regex cannot be interrupted: patterns longer than 256 characters, values longer than 1000 characters, patterns that do not compile, and patterns with nested or redundant quantifiers such as `(a+)+b`, `(a|a)*` or `(a*)*` (rejected by a static check before compiling) simply leave the value unformatted, and no error reaches the table. The pure engine `applyConditionalFormatting` lives in `src/utils/conditionalFormatting.ts`; `columnBuilders.ts` turns the rules into per-column metadata that `buildColumnMetaMap` stores in `ColumnMeta`, and the existing row renderer applies it to the metric cells. Charts without rules render as before. Covered by `test/conditionalFormatting.test.ts`.
- **Theme & Palette Profiles**: The min/max badges, the heatmap and the data bars always used the `stratum` style, although the `emerald`, `ocean` and `sunset` styles already existed in the stylesheet and in `getHeatmapBgColor`. A new `Theme & Palette` sub-group at the end of `Formatting & Aesthetics` adds the `themeProfile` control with five profiles, each mapped onto one of those existing styles, which keep their names: `standard` (`stratum`, the default, so existing charts look the same), `colorblind` (`ocean`, with Okabe-Ito blue and vermillion colours), `stratum-warm` (`sunset`), `stratum-cool` (`emerald`) and `custom`. With `custom`, the `customPositiveHex`, `customNegativeHex` and `customNeutralHex` controls colour the MAX badge, the MIN badge and the data bars. Values must match `#RRGGBB`; an empty value keeps the standard colour, and an invalid one keeps it too and adds a warning. The contrast ratio of each custom colour against white is computed with the WCAG formula in plain arithmetic (no new dependency), and colours below 3:1 add a warning to the resolved theme. `getTheme(name, custom)` in `src/utils/themes.ts` resolves the profile, `transformProps` passes it to the table as the `theme` prop (omitted for `standard`), and `HierarchicalTable.tsx` applies the matching `theme-*` class. Covered by `test/themes.test.ts`.
- **Expression Sorting and Empty Value Placement**: The default sort could only target the hierarchy name or a query metric. `defaultSortColumn` now also accepts the structural keys `__tree_level__` (node depth) and `__leaf_count__` (number of leaves under a node) and virtual `delta_*_pct` expressions, and its choices list them dynamically: every `x_corr` metric in the query offers `delta_x_pct`. A delta expression missing from the node metrics is evaluated on a copy through the same `recomputeDerivedMetrics` rules that fill the delta columns, so the table data is never modified. A new `nullHandling` control (`Empty Values`) decides where null, NaN and undefined values go: `bottom` (the default, matching the previous behavior in both ascending and descending order), `top`, or `exclude`, which hides those rows while a metric sort is active and always keeps the grand total. The logic lives in `sortTreeByExpression` in `src/utils/treeBuilder.ts`, which now backs both `sortTreeHierarchy` and the existing sort call in `HierarchicalTable.tsx`, so there is still a single sorting path. Covered by new scenarios in `test/sortingAndMinMax.test.ts`.
- **Row Virtualization for Large Trees**: Expanding a large hierarchy rendered every visible node at once, which made scrolling slow on trees with thousands of rows. `Performance & Limits` now holds `pageSize` (`Page Size`, a slider from 50 to 2000, default 100; the field already existed in the form data but had no control) and `virtualizationThreshold` (`Virtualize Above Rows`, default 500). When the expanded tree has more rows than the threshold, the table renders only `pageSize` rows from the first visible one plus a 20 row buffer on each side, and two spacer rows keep the scroll height of the full tree. Smaller trees render exactly as before. The window comes from the pure, DOM-free `computeRenderWindow` in `src/components/useFlatTreeVirtualization.ts`, wrapped by the `useFlatTreeVirtualization(tree, options)` hook. Rendered rows keep using the click handlers owned by the table, so `onCrossFilter` and `onClearFilter` behave the same inside the window. Covered by `test/virtualization.test.ts`, whose deterministic cases include a 2000 node window calculation that must finish in under 250 ms; no browser paint is measured.
- **Control Panel Layout Test (`test/controlPanelLayout.test.ts`)**: Locks the four macro-sections and their order, the sub-group headings, the placement of each former section's controls and the full set of control `name` keys from v0.2.10, so later control additions cannot silently rename or drop a saved chart setting. The Node Jest environment has no runtime copy of `@superset-ui/chart-controls` (the host Superset provides it), so `jest.config.js` maps the module to a small local test mock (`test/__mocks__/chartControlsMock.ts`); no dependency was added.

### Changed
- **Explore Control Panel Reorganized into Four Macro-Sections**: The six flat sections are regrouped, in order, into `Data` (formerly `Query Configuration`), `Customize`, `Comparison & Analysis` and `Performance & Limits`, so the panel reads from query setup to presentation to analysis and leaves a dedicated place for upcoming performance settings. `Customize` gathers `Hierarchy & Tree Display Options`, `Sorting & Conditional Formatting` and `Formatting & Aesthetics` as sub-groups separated by heading and divider rows; `Comparison & Analysis` gathers `Time Comparison & Period-over-Period Variance` and `Advanced Rollup Calculations` the same way; `row_limit` moves to `Performance & Limits`. The section list stays a flat array and every control keeps its technical `name`, so existing saved charts load unchanged.
- **Single Minified ESM Bundle via esbuild**: New `scripts/build.mjs` (`npm run build:esm`) bundles `src/index.ts` into `dist/index.esm.js` (ES2020 target, minified, linked source map without embedded sources since `src/` ships with the package). React, `@superset-ui/core`, `@superset-ui/chart-controls` and the modular `echarts/*` paths stay external so the host Superset build provides them; `HierarchicalTable.css` is minified and injected at runtime so the bundle is self-contained. `main` and `module` now both point to the bundle and `tsc` emits declarations only, which brings `dist/` from 329,032 B to about 232 KB.
- **Build Chain**: `npm run build` keeps the `tsc || node ../../node_modules/typescript/lib/tsc.js || npx tsc` fallback chain (grouped so it also works under `cmd.exe`) and then runs `build:esm`. `esbuild` ^0.25 added to `devDependencies`.
- **Package Metadata**: `@superset-ui/chart-controls` is now declared in `peerDependencies` (marked optional, the host Superset always provides it; the local type stub stays for standalone typechecks) and `sideEffects` is set to `["*.css"]` so bundlers can tree-shake every JS module while keeping the stylesheet import.
- **Stricter TypeScript**: `noUnusedLocals` and `noUnusedParameters` enabled; the unused `MinMaxBound` import, the unused `metrics` destructuring in `HierarchicalTable.tsx`, the unused `thumbnail-dark.png` import and the unused cross-filter `pathMap` parameter name were cleaned up with no behavior change.

### Removed
- **Dead Runtime Dependencies `lodash`, `antd`, `@ant-design/icons`**: none of them is imported by `src/`; dropping them removes 62 packages from the install tree.

## [0.2.10] - 2026-10-08
### Changed
- **`transformProps.ts` Decomposed into Pure Modules**: The ~850-line monolithic function now only wires the pipeline. Option resolution (camelCase/snake_case aliases and defaults) lives in `src/plugin/formDataOptions.ts`, tree construction and variance deltas in `src/plugin/treeData.ts`, pivot value collection and ordering in `src/plugin/pivotOrdering.ts`, column/header construction for the flat, single-pivot (combined/separated) and two-way pivot layouts in `src/plugin/columnBuilders.ts` (orchestrated by `src/plugin/metricLayout.ts`), the grand total in `src/plugin/grandTotal.ts`, and the `onCrossFilter`/`onClearFilter` handlers with their data mask builders in `src/plugin/eventHandlers.ts`. Output shape, formulas and formats are unchanged.
- **`HierarchicalTable.tsx` Column Metadata and CSV Export Extracted**: Display column selection and delta-column detection moved to `src/utils/tableColumns.ts` (`ColumnMeta` is still re-exported by the component); CSV row building, cell escaping, serialization and download moved to `src/utils/csvExport.ts`.

### Added
- **Direct Unit Tests for the Delta Engine (`test/aggregations.test.ts`)**: `recomputeDerivedMetrics` against the AGENTS.md §5.3 naming conventions (`delta_richieste_pct`, `delta_accesso_diretto_pct`, `delta_programmata_pct`, `delta_prime_visite_pct`, `delta_controlli_pct`, generic `delta_X_pct -> X / X_conf`, pivot suffixes, `Nuovo`/0/null edge cases, saved dataset metrics vs adhoc metrics with custom labels), `rollupTreeMetrics` (multi-level subtotals, weighted rate metrics, derived fallbacks) and `computeGrandTotal`.
- **Characterization Snapshot of `transformProps`** (`test/transformProps.characterization.test.ts`): 15 representative fixtures (flat, snake_case options, variance delta, single and two-way pivot layouts, parent-child, empty data) recorded on the pre-refactor implementation, including formatter outputs and emitted cross-filter data masks.
- **Unit Tests for the Extracted Modules**: `test/formDataOptions.test.ts`, `test/pivotOrdering.test.ts`, `test/columnBuilders.test.ts`, `test/transformPipeline.test.ts`, `test/eventHandlers.test.ts`, `test/tableExport.test.ts`.

## [0.2.9] - 2026-10-07
### Fixed
- **Idempotenza Rigida della Registrazione in `MainPreset.ts`**: La verifica di configurazione esistente in `install-plugin.ps1` e' ora riga-esatta sulla forma canonica `new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }),`: le varianti legacy con `.register()`, le indentazioni anomale e i duplicati vengono normalizzati alla forma canonica invece di essere considerati gia' configurati.

### Removed
- **Copia Annidata Stale `packages/superset-plugin-chart-hierarchical-table` (v0.2.3)**: Eliminata la copia legacy del plugin in `packages/` (il plugin vive nella root del repository). Rimossi di conseguenza i fallback su `packages/` in `install-plugin.ps1` e il percorso sorgente in `scripts/install.ps1`, aggiornato il target `test-frontend` del `Makefile` per eseguire i test dalla root, eliminata la voce extraneous da `package-lock.json` e aggiornati i riferimenti in `MAINTAINER.md` e `docs/installation.md`. Il package Python `packages/superset-hierarchical-table-backend` resta intatto.

## [0.2.8] - 2026-10-06
### Added
- **Two-Way Hierarchical Pivot Columns (Due Colonne Pivot a Incrocio Gerarchico Stile Qlik Sense)**: Architettura universale per la suddivisione multidimensionale orizzontale in presenza di due dimensioni pivot (es. Fascia Oraria e Canale), con mantenimento dell'aggregazione corretta e isolata per ciascuna colonna foglia.
- **Subtotali Intermedi di Colonna (`showPivotColumnSubtotals`)**: Controllo per abilitare la colonna subtotale (`Totale`) all'interno di ciascun gruppo pivot di primo livello, calcolata come aggregazione chiusa delle colonne figlie.
- **Etichetta Personalizzabile Subtotale Colonne (`pivotColumnSubtotalLabel`)**: Campo di testo per personalizzare l'etichetta del subtotale di colonna (default `Totale`).
- **Scomposizione Macro-Blocco Totals per Canale**: Espansione del gruppo Totali Orizzontali di Riga (`Totals`) per includere sia il Grand Total complessivo sia i totali aggregati per ciascun valore della seconda dimensione pivot lungo tutte le fasce.
- **Stili CSS Dedicati per Subtotali di Colonna**: Classi `.pivot-subtotal-col` e `.pivot-subtotal-cell` per la formattazione distinta delle colonne di subtotale rispetto alle celle foglia e ai totali di riga.
- **Suite di Test Dedicata `test/multiPivotColumns.test.ts`**: Test Jest completi per la costruzione dell'albero a due dimensioni pivot, quadratura contabile su Grand Total ed emissione corretta di intestazioni a due livelli.

### Changed
- **Pannello Controlli Explore**: Integrati i controlli per i subtotali di colonna pivot direttamente nel flusso di configurazione query.

## [0.2.7] - 2026-10-06
### Added
- **Two-Way Pivot Matrix Grid (Griglia Bidimensionale a Incrocio Stile Qlik/Excel)**: Architettura universale per il calcolo automatico dei Totali Orizzontali di Riga (`computeHorizontalRowTotals`) per ciascun nodo (foglie, subtotali intermedi e Grand Total).
- **Posizionamento Configurabile dei Totali Orizzontali (`pivotRowTotalsPosition`)**: Nuovo controllo in Explore per posizionare il macro-blocco dei Totali a sinistra (`left`, stile Qlik Sense, visibile subito prima dello scroll orizzontale), a destra (`right`, stile Excel/classico in fondo alla tabella), oppure disattivato (`none`).
- **Etichetta Personalizzabile Totali Orizzontali (`pivotRowTotalsLabel`)**: Controllo testo per personalizzare l'etichetta dell'intestazione (es. `Totals`, `Totale Complessivo`, `Consuntivo`).
- **Quadratura Matematica all'Incrocio dei Totali**: Perfetta coerenza contabile bidirezionale tra la somma dei totali di riga e la somma dei totali di colonna sul Grand Total.
- **Stili CSS Dedicati per Colonne Totali**: Classi `.pivot-row-totals-group`, `.pivot-row-totals-col` e `.pivot-row-totals-cell` per una chiara distinzione visiva delle colonne di aggregazione.
- **Suite di Unit Test Jest**: Aggiunto `test/pivotRowTotals.test.ts` con 5 scenari completi per validazione algebrica, posizionamento a sinistra/destra e compatibilità con Grand Total.

### Fixed
- **Script di Test Resilienti**: Script `test` e `test:watch` in `package.json` aggiornati per supportare sia l'esecuzione autonoma che quella all'interno del monorepo.
### Changed
- **Pannello Controlli Explore**: Spostati i controlli del calcolo delta automatico (`pivotTimeDeltaMode` e `pivotTimeDeltaLag`) direttamente nella sezione principale Query subito sotto le colonne pivot e l'ordinamento, rendendoli immediatamente accessibili senza dover aprire il blocco avanzato.
- **Supporto Ottimizzato a Singola Metrica**: Abilitata la generazione automatica delle sub-colonne Delta sotto ciascun mese anche con una sola metrica numerica selezionata (es. `Totale`), eliminando l'obbligo di calcolare la colonna Delta lato SQL/DWH.

## [0.2.5] - 2026-10-05
### Added
- **combineMetric (Affiancamento Metriche Pivot)**: Nuova opzione nel control panel che inverte la gerarchia delle testate, esponendo le colonne per periodo temporale (es. Ott 2026, Set 2026) al primo livello e affiancando le metriche (`Totale | Delta`) al secondo livello, replicando fedelmente il comportamento di `pivot_table_v2`.
- **pivotSortOrder (Ordinamento Colonne Pivot)**: Supporto per ordinamento temporale decrescente (`desc`, più recente a sinistra), crescente (`asc`, cronologico) o ordine query (`none`).
- **pivotTimeDeltaMode (Delta Temporale Automatico)**: Calcolo nativo e dinamico del Delta assoluto e/o percentuale lungo le colonne pivot senza window functions SQL (`LAG OVER`), con applicazione ricorsiva a foglie, subtotali e Grand Total.
- **pivotTimeDeltaLag (Passo di Confronto)**: Possibilità di selezionare lo scostamento temporale (1 periodo per MoM/YoY, 2 o 3 per QoQ, 12 per YoY mensile).
- **Unit Test Suite**: Aggiunta suite di collaudo completa `test/pivotTimeDelta.test.ts` con 6 test di quadratura matematica per delta assoluto, percentuale, gestione null/nuovi nodi, Grand Total e integrazione `transformProps`.

### Changed
- **HierarchicalTable & Formatters**: Riconoscimento automatico e formattazione con prefissi cromatici (`.delta-positive`, `.delta-negative`, badge `Nuovo`) sia per chiavi generate dinamicamente che per colonne delta native del dataset.

### Fixed
- **Jest Test Script**: Allineato il percorso del binario Jest in `package.json`.

## [0.2.4] - 2026-10-05
### Added
- **Sticky Hierarchy Column**: Implementata colonna gerarchica sticky a sinistra (`position: sticky; left: 0`) con ombra di separazione per mantenere sempre visibile l'albero durante lo scroll orizzontale in tabelle pivot estese.
- **Debounced Search**: Introdotto debouncing a 250ms con input controllato immediato e pulsante di reset rapido per la casella di ricerca testuale.

### Changed
- **React.memo Row Component**: Scorporato e memoizzato il rendering delle righe nel componente `HierarchicalTableRow`, prevenendo re-render a cascata durante l'espansione dei nodi o la digitazione.
- **Precomputed Column Metadata**: Ottimizzato il lookup delle colonne metriche tramite mappa pre-computata (`columnMetaMap`), eliminando controlli ridondanti sulle stringhe ad ogni frame.
- **CSS Layout Isolation**: Aggiunta la direttiva CSS `contain: layout style` sulle righe della tabella per ridurre i tempi di reflow del browser su dataset voluminosi.

## [0.2.3] - 2026-10-05
### Fixed
- **Time Comparison Module Resolution**: Sincronizzato il modulo `src/utils/timeComparison.ts` nella cartella `packages/` e prioritizzato il percorso radice `src/index.ts` nello script `install-plugin.ps1`, risolvendo l'errore di build Webpack `Can't resolve '../utils/timeComparison'`.

## [0.2.2] - 2026-10-02
### Added
- **Inline Data Bars (Excel-style)**: Enhanced the visualization with inline data bars within metric cells when `minMaxDisplayMode` is set to `data_bars`.
- **Glassmorphism CSS**: Upgraded the table styling with modern glassmorphism effects (`backdrop-filter: blur(8px)`) for the sticky header and improved spacing.

### Removed
- **Manual Styling Clutter**: Removed technical UI controls (`indentSize`, `stickyFirstColumn`, `minMaxColorTheme`) from the control panel to reduce configuration fatigue.
- Hardcoded optimal layout logic and removed the deprecated CSS class `.sticky-first-col` as it was causing visual bugs.

## [0.2.1] - 2026-09-01
### Added
- Initial release for the Hierarchical Table plugin.

[Unreleased]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.9.0...v0.10.0
[0.4.1]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.3.3...v0.4.0
[0.3.3]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.10...v0.3.0
[0.2.10]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.9...v0.2.10
[0.2.9]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.5...v0.2.7
[0.2.5]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.1...v0.2.2

