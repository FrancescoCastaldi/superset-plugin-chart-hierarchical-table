# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.11...v0.3.0
[0.2.10]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.9...v0.2.10
[0.2.9]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.5...v0.2.7
[0.2.5]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/FrancescoCastaldi/superset-plugin-chart-hierarchical-table/compare/v0.2.1...v0.2.2

