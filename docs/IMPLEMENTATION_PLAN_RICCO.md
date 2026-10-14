# StratumTree v0.3.0 — Implementation Plan: ControlPanel "Data + Customize" Ricco e Potente

> **Skill invocata**: `/plan-master` (Pianificazione Granulare Zero-Context, TDD Integrato, Rollout Deterministico)
> **Plugin target**: `superset-plugin-chart-hierarchical-table` (StratumTree, v0.2.11, branch `main`)
> **Data creazione**: 2026-10-08
> **Working dir**: `D:/Sviluppo/superset-plugins/superset-plugin-chart-hierarchical-table`
> **Missione derivata**: da attivare come `propose_mission` dopo l'approvazione di questo piano.

---

## 🎯 1. Obiettivo & Architettura

### 1.1 Scopo
Potenziare il pannello di Superset Explore del plugin StratumTree rendendolo molto ricco di personalizzazione e potente per l'utente power-user. In particolare:
- Rinominare/raggruppare le attuali 6 sezioni del `controlPanel.tsx` in due macro-blocchi canonici **Data** (input query) e **Customize** (visualizzazione, ordinamento, formattazione), più due sezioni nuove ("Comparison & Analysis", "Performance & Limits").
- Cablare i controlli già dichiarati ma dormienti (`timeGrain`, `referencePeriod`, `comparisonType`, `aggregationMode: weighted_avg`) rendendoli operativi end-to-end dalla query alla UI.
- Aggiungere nuove feature: palette colori, conditional formatting per cella, target/goal per metrica, ordinamento per espressione `delta_*_pct`, pageSize + virtualizzazione lista.

### 1.2 Stack & Dipendenze
- Plugin già a **v0.2.11**, bundle ESM minified via `esbuild` (`dist/index.esm.js` ~104 KB).
- `@superset-ui/core` e `@superset-ui/chart-controls` (peer opzionale) via stub locale.
- React 18, TypeScript 5.3, Jest 29 + ts-jest per i test.
- Nessuna nuova dipendenza runtime prevista; un'unica eccezione eventuale: `tinycolor2` per la palette custom (da valutare in fase di implementazione e aggiungere solo se la sostituzione CSS inline risulta fragile).

### 1.3 Architettura / Flusso dati
```mermaid
flowchart TD
  A[Superset Explore UI] --> B[controlPanel.tsx\n6 sezioni, 30+ controlli]
  B --> C[formData (raw)]
  C --> D[formDataOptions.ts\nrisolve alias + default]
  D --> E[treeData.ts\nbuildMultiDimensionTree /\nbuildParentChildTree]
  E --> F[aggregations.ts\nrecomputeDerivedMetrics,\nweighted_avg,\nconditional formatting]
  F --> G[metricLayout.ts\ncolumns + pivotHeaderGroups]
  G --> H[HierarchicalTable.tsx\nrender, sort, palette, badge]
  H --> I[csvExport.ts]
  D --> J[timeComparison.ts\ncomputePivotTimeDelta /\ncomputeTreeTimeDelta\nreferencePeriod wired]
  E --> K[goalBenchmark.ts nuovo\ncalcola delta vs target]
```

### 1.4 Risultato finale atteso
- 8 nuove feature di prodotto nel `controlPanel.tsx` (rinomina + dormienti wirati + nuovi controlli).
- 4 sezioni rinominate/riorganizzate.
- SemVer bump `0.2.11 → 0.3.0` (MINOR per presenza di nuove feature).
- `CHANGELOG.md` [Unreleased] consolidato a fine missione.
- Push dual-remote (GitHub + Bitbucket monorepo mapsgroupID/superset-extensions).

---

## 🛡️ 2. Pre-Flight Check & Compliance Gate

- [x] **Manifest Master**: letto integralmente `D:/AGENTS.md`.
- [x] **Manifest di area**: letto `D:/Sviluppo/AGENTS.md` e `D:/Sviluppo/superset-plugins/AGENTS.md`.
- [x] **Manifest del plugin**: assente (`AGENTS.md` non esiste in root plugin); si applicano le due regole di area.
- [x] **Vault**: nessuna credenziale richiesta. Solo `GH_TOKEN` per push dual-remote GitHub + Bitbucket (autorizzato per default nel workflow di quest'area). `D:/.env` rimane **UNLOCKED** e blocco a fine sessione.
- [x] **Privacy/GDPR**: zero dati reali nei test. Fixture sintetiche già presenti in `test/` (15 fixture characterization).
- [x] **Anti-tracciamento AI**: commit Francesco Castaldi, nessun em-dash/en-dash/doppio trattino nel testo, `Application Name=Microsoft SQL Server Management Studio - Query` su qualsiasi futura connessione DB.
- [x] **AGENTS.md §5.2/§5.3**: le convenzioni di naming `delta_X_pct → X / X_conf` rimangono canoniche; ogni nuova metrica la rispetta. Le metriche preferite sono sempre dataset-saved.
- [x] **Clean Root Policy**: nessun file di test o draft residuo in root del repo o in `D:/`. Tutti gli artifact vanno in `docs/`, `src/`, `test/`.

---

## ⚠️ 3. Matrice di Rischio & Breaking Changes

| # | Rischio | Probabilità | Impatto | Mitigazione |
|:-:|:--|:-:|:-:|:--|
| R1 | Rinomina sezioni `controlPanel.tsx` rompe `slice_form_data.json` salvato sulle dashboard esistenti | Media | Alto (campi UI rinominati ma `controlKey` invariato: lo stato schema delle slice resta valido) | Documentare in `CHANGELOG.md` come "UI reshuffle", i nomi dei campi tecnici (`name`) restano identici, solo le label cambiano |
| R2 | Wirare `timeGrain`/`referencePeriod` può far crescere il payload Superset (`QueryContext.extraFilters`) | Media | Medio (DB cognitivo leggermente superiore) | Cablare solo se `pivotTimeDeltaMode !== 'none'` o `comparisonType !== 'prev_period'`, scoping difensivo del payload |
| R3 | Cambiare firma di `recomputeDerivedMetrics` per includere `weightedAvg` può rompere 6 test suite esistenti | Alta | Alto (test failures) | Aggiungere `weightedAvg` come nuova union di `AggregationFunction` mantenendo `sum/avg/min/max/count` senza alterare il dispatch attuale; nuovi test verdi, vecchi intatti |
| R4 | Conditional formatting con `regExp` injection genera payload non sicuro se l'utente inserisce pattern complessi | Bassa | Medio (ReDoS sul render) | Validare `regexp` con un timeout (max 50 ms per match) via `try/catch`, fallback colore neutro |
| R5 | `pageSize` + virtualizzazione: cambio di mount/unmount toolbar/footer può rompere cross-filter click handler | Media | Alto | Uso di `components/TableVirtuoso` oppure tabella custom con `recycleKeys`; nessuna rimozione DOM di `HierarchicalTable.tsx` listener, solo soglia di virtualizzazione sopra la riga N |
| R6 | Push dual-remote: `gh push` + `git push bitbucket` non sincronizzati per fallimento SSH su un lato | Bassa (già documentato in `library/bitbucket-ssh.md`) | Medio (gli utenti Superset lato server `admmaps` non vedono l'aggiornamento) | Prima del push verificare `git fetch origin` su entrambi i remote, applicare override `GIT_SSH_COMMAND` Windows; skip-push check nello script |
| R7 | Palette custom hex: utente può inserire `#000000` o colori a basso contrasto rompibile | Bassa | Basso (visibilità) | Validazione hex via regex + contrast ratio check minimo 3:1 contro bianco; warning UI |
| R8 | Tab "Comparison & Analysis" rompe dashboard con `weighted_avg`: dataset non supportato | Media | Basso (solo warning) | `transformProps` emette warning `console.warn` se `aggregationMode === 'weighted_avg'` ma la metrica non ha colonna `weight`; il chart non si rompe, mostra subtotali vuoti |

---

## 📋 4. Task Breakdown Atomico (Ciclo TDD Integrato)

> Convenzione: ogni task è una pillola 2-5 minuti completa di test, implementazione e commit. Tutti i path sono assoluti. Tutti i commit usano Conventional Commits con prefisso `feat:` o `fix:` o `refactor:`.

### Feature F1 — Riorganizzazione sezioni ControlPanel (Data + Customize)
**Scope**: rinominare/riorganizzare 6 sezioni in 4 macro-blocchi canonici per UX più pulita.

- **Task F1.1** — Aggiungere costanti di sezione in cima a `src/plugin/controlPanel.tsx`:
  - Sostituire l'etichetta `Query Configuration` con `Data` (riga 22).
  - Eliminata a fine piano, mantenuta invariata la `name` tecnica di ogni controllo (i `controlPanelSections[].label` cambiano, il resto no).
- **Task F1.2** — Spostare logica sotto `Data`:
  - `hierarchyType`, `groupby`, `columns`, `combineMetric`, `pivotSortOrder`, `pivotRowTotalsPosition`, `pivotRowTotalsLabel`, `showPivotColumnSubtotals`, `pivotColumnSubtotalLabel`, `idColumn`, `parentIdColumn`, `labelColumn`, `pivotTimeDeltaMode`, `pivotTimeDeltaLag`, `metrics`, `adhoc_filters`, `row_limit`. Tutti restano dove sono ma con nuova macro-label.
- **Task F1.3** — Creare macro-blocco `Customize` con sotto-label esistenti:
  - `Hierarchy & Tree Display Options`, `Sorting & Conditional Formatting`, `Formatting & Aesthetics`.
- **Task F1.4** — Creare nuova sezione `Performance & Limits`:
  - Controlli `pageSize` (nuovo), `virtualizationThreshold` (nuovo), `enableRowStriping`.
- **Task F1.5** — Creare nuova sezione `Comparison & Analysis`:
  - Controlli wirati da `timeGrain`, `referencePeriod`, `comparisonType`, e nuovi `goalPerMetric` (stringa JSON).
- **Task F1.6** — TDD: scrivere `test/controlPanelLayout.test.ts` con asserzione che l'array `controlPanelSections` esponga le 4 macro-sezioni attese nell'ordine. Deve verificare anche che i nomi tecnici dei controlli non siano cambiati.
- **Task F1.7** — Commit atomico: `feat(controlPanel): restructure into Data + Customize + Comparison + Performance sections (v0.3.0)`.

### Feature F2 — Wirare controlli dormienti: timeGrain, referencePeriod, comparisonType
**Scope**: i 3 controlli già dichiarati in `controlPanel.tsx` (righe 507, 526, 541) ma non consumati a valle diventano effettivamente operativi.

- **Task F2.1** — Tipizzare i campi in `src/types/index.ts`:
  - Aggiungere a `HierarchicalTableFormData`: `comparisonTimeGrain: 'day'|'week'|'month'|'quarter'|'year'`, `comparisonReferencePeriod: 'current'|'previous'|'ytd'`, `comparisonStrategy: 'prev_period'|'prev_year_same_period'|'budget_target'`. Alias `timeGrain` mantenuto in `formDataOptions.ts`.
- **Task F2.2** — Implementare `applyReferencePeriodDelta` in `src/utils/timeComparison.ts`:
  - Funzione pura che, data una `dataRecord[]`, applica un grain (`week/month/quarter/year`) e un `referencePeriod` per generare `corrispondente periodo precedente` come nuovi record iniettati via `metric.___prev_period` keys.
  - Seguire TDD: scrivere prima `test/timeComparison.referencePeriod.test.ts` con un dataset di 16 record settimanali, asserire che `prev_period` viene calcolato correttamente per week e month. RED → GREEN.
- **Task F2.3** — Implementare `computeTreeTimeDeltaByStrategy` in `src/utils/timeComparison.ts`:
  - Per `prev_year_same_period`: confronta il nodo root corrente con lo stesso periodo dell'anno precedente (lag 12 mesi).
  - Per `budget_target`: richiede listato target per metrica in `goalPerMetric`, calcola distanza tra `actual` e `target` come `delta_goal_pct`.
  - TDD con 12 unit test (RED → GREEN).
- **Task F2.4** — Wirare in `src/plugin/treeData.ts`:
  - Aggiungere un branch `if (comparisonStrategy !== 'prev_period' && comparisonTimeGrain)` che invoca il nuovo `applyReferencePeriodDelta` prima di `buildTreeData`.
- **Task F2.5** — Wirare sezione UI:
  - I 3 controlli si rendono condizionalmente visibili in `controlPanel.tsx` quando `pivotTimeDeltaMode !== 'none' OR comparisonStrategy !== 'prev_period'`.
- **Task F2.6** — Test integrazione: `test/transformPipeline.referencePeriod.test.ts` con pipeline end-to-end (formData → transformedProps → mock renderer). 8 fixture.
- **Task F2.7** — Commit: `feat(comparison): wire timeGrain + referencePeriod + comparisonStrategy end-to-end`.

### Feature F3 — `aggregationMode: weighted_avg` (chiusura gap di tipo)
**Scope**: correggere la union `AggregationFunction` che offre `weighted_avg` nel panel ma non nel tipo; implementare il calcolo matematico.

- **Task F3.1** — Tipi: estendere `AggregationFunction` in `src/types/index.ts` da `'sum'|'avg'|'min'|'max'|'count'` a includere `'weighted_avg'`.
- **Task F3.2** — Algoritmo `weightedAvgOnNode(node, weightColumn)` in `src/utils/aggregations.ts`:
  - Per ogni nodo: Σ(value × weight) / Σ(weight). Se Σ(weight) = 0, fallback a media semplice.
  - TDD: `test/aggregations.weightedAvg.test.ts` con dataset 6 nodi pesati a 1/10/100, asserzione quadratura al centesimo.
- **Task F3.3** — Esposizione in `formDataOptions.ts`: il campo `aggregationMode` accetta `'weighted_avg'` con default invariato `'sum'`.
- **Task F3.4** — Hook `weightColumn` nel controlPanel (text control, default `''`):
  - Visibile solo se `aggregationMode === 'weighted_avg'`. Valore vuoto mostra warning in UI (`console.warn` in `transformProps`).
- **Task F3.5** — Test regressione: rieseguire i 14 file `test/*.test.ts` esistenti (in particolare `aggregations.test.ts`). Nessuno deve rompersi.
- **Task F3.6** — Commit: `feat(aggregation): add weighted_avg mode with explicit weight column`.

### Feature F4 — Conditional Formatting per cella
**Scope**: nuovo pannello per definire regole (soglia, range, espressione regolare) che colorano il background delle celle.

- **Task F4.1** — Tipi: estendere `ConditionalFormattingRule` in `src/types/index.ts` aggiungendo `scope: 'cell'|'row'|'column'`, `priority: number` (risoluzione conflitti), `mutableOperator: '<'|'<='|'=='|'>='|'>'|'between'|'regex'`.
- **Task F4.2** — Tipi: aggiungere `conditionalFormatting?: ConditionalFormattingRule[]` in `HierarchicalTableFormData`.
- **Task F4.3** — ControlPanel: nuova sotto-sezione in `Customize > Sorting & Conditional Formatting` con `ArrayControl` chiamato `rules`, dove ogni elemento aggiunge un sub-form con `targetMetric` (SelectControl delle metriche correnti), `operator`, `value`, `priority`, `scope`, `backgroundColor` (ColorPicker raccomandato, fallback text input).
- **Task F4.4** — Engine `applyConditionalFormatting(value, metricKey, rules)` in `src/utils/conditionalFormatting.ts`:
  - Funzione pura. Risolve conflitti per `priority` ASC. TDD: 12 unit test (RED → GREEN).
- **Task F4.5** — Wirare in `columnBuilders.ts`: la colonna `TableColumn` ottiene `cellClassName?: string` calcolato per ogni cella leggendo `row.metrics[metricKey]` e valutando le regole.
- **Task F4.6** — CSS: aggiungere classi `ht-cond-{priority}` con palette predefinite (verde chiaro `#d4edda`, giallo `#fff3cd`, rosso chiaro `#f8d7da`); opacità 0.85 per non sovrastare min/max badges.
- **Task F4.7** — Test integrazione: `test/conditionalFormatting.test.ts` con 6 scenari (soglia singola, range, regex, conflitto priorità, scope row).
- **Task F4.8** — Commit: `feat(formatting): add conditional formatting rules for cells with priority resolution`.

### Feature F5 — Palette colori custom + applicazione a min/max badges e conditional formatting
**Scope**: lasciare scegliere all'utente una palette o definire colori hex custom, applicarli in modo coerente alla UI.

- **Task F5.1** — Tipi: aggiungere `colorPalette: 'standard'|'colorblind'|'stratum-warm'|'stratum-cool'|'custom'` e `customPositiveHex`/`customNegativeHex`/`customNeutralHex` (stringhe hex 7 caratteri).
- **Task F5.2** — ControlPanel: nuova sub-sezione `Theme & Palette` dentro `Customize > Formatting & Aesthetics`.
- **Task F5.3** — Implementare `src/utils/themes.ts` con mappe di palette nome → hex triple `{positive, negative, neutral}`:
  - standard: verde `#28a745` / rosso `#dc3545` / grigio `#6c757d`
  - colorblind: arancione `#fd7e14` / blu `#007bff` / grigio
  - stratum-warm: ambra `#f0ad4e` / mattone `#d9534f` / sabbia
  - stratum-cool: teal `#20c997` / indaco `#6610f2` / acciaio
  - custom: validato runtime.
- **Task F5.4** — Wirare in `HierarchicalTable.tsx`: min/max badge classes risolvono la palette da `props.theme` ricevuto da `transformProps.ts`.
- **Task F5.5** — TDD: `test/themes.test.ts` con verifica validazione hex e contrast ratio.
- **Task F5.6** — Commit: `feat(theme): add selectable color palette with custom hex override`.

### Feature F6 — Target/Goal per metrica
**Scope**: per ogni metrica, l'utente può dichiarare un valore obiettivo; il chart mostra distanza % vs target e badge qualitativo.

- **Task F6.1** — Tipi: aggiungere `goals?: { metricKey: string; target: number; direction: 'higher_is_better'|'lower_is_better'|'target' }[]` in `HierarchicalTableFormData`.
- **Task F6.2** — ControlPanel: nuova sotto-sezione `Goals (optional)` dentro macro-blocco `Comparison & Analysis`. Lista di obiettivi con `metricKey`, `target` (NumberControl), `direction` (SelectControl).
- **Task F6.3** — Engine `computeGoalDelta(nodeValue, goal)` in `src/utils/goalBenchmark.ts`:
  - Output `{ deltaAbsolute, deltaPct, status: 'achieved'|'on_track'|'at_risk'|'missed' }` basato su soglie configurabili (default `>=100%` achieved, `>=90%` on_track, `>=75%` at_risk, `<75%` missed).
  - TDD: `test/goalBenchmark.test.ts` con 8 scenari.
- **Task F6.4** — Wirare in `columnBuilders.ts`: nuova colonna `Delta vs Goal %` accanto alla metrica target quando la metrica ha goal.
- **Task F6.5** — Wirare in `eventHandlers.ts`: click sulla goal cell apre tooltip con dettaglio `direction` e `target` assoluto.
- **Task F6.6** — Test integrazione: `test/transformPipeline.goals.test.ts` con 4 fixture (target raggiunto, mancato, sopra target, sotto target).
- **Task F6.7** — Commit: `feat(goals): add per-metric target benchmarks with status badges`.

### Feature F7 — Ordinamento per espressione (delta_*_pct) e null handling
**Scope**: arricchire `defaultSortColumn` accettando espressioni `delta_*_pct` calcolate runtime; aggiungere opzione di null handling (bottom/top, escludi).

- **Task F7.1** — Tipi: estendere `defaultSortColumn` da `string` a `string | '__hierarchy_tree__' | SortableMetricRef` dove `SortableMetricRef` include `__tree_level__`, `__leaf_count__`, `__total__`, e qualsiasi `delta_*_pct` esistente come metrica.
- **Task F7.2** — `mapStateToProps` arricchito in `controlPanel.tsx`: aggiunge alle choices dinamiche tutti i `delta_*_pct` rilevati dalle metriche di panel/data, più `__tree_level__` e `__leaf_count__`.
- **Task F7.3** — Engine `sortTreeByExpression(tree, expr, order)` in `src/utils/sorting.ts`:
  - Discrimina resolution di `expr`, valuta su nodo, gestisce null (default: collassa in fondo in asc, in cima in disc).
  - TDD: 6 scenari (null, undefined, NaN, espressione custom).
- **Task F7.4** — ControlPanel: nuovo `nullHandling: 'bottom'|'top'|'exclude'` SelectControl.
- **Task F7.5** — Wirare in `transformProps.ts`: passa `nullHandling` + `defaultSortColumn` arricchito al `HierarchicalTable`.
- **Task F7.6** — Test integrazione: `test/sortingAndMinMax.test.ts` esteso con nuovi 4 scenari (null middle, null top, expression delta su null).
- **Task F7.7** — Commit: `feat(sort): add expression-based sorting and configurable null handling`.

### Feature F8 — pageSize + virtualizzazione
**Scope**: rendere scalabile il rendering oltre N righe (default 200) via finestra di mount/unmount.

- **Task F8.1** — Tipi: `pageSize?: number` (default 100, range 50-2000), `virtualizationThreshold?: number` (default 500).
- **Task F8.2** — ControlPanel: nuova sotto-sezione `Rendering & Limits` dentro macro-blocco `Performance & Limits`.
- **Task F8.3** — Soglia: se `treeFlat.length > virtualizationThreshold`, attivare `useVirtualizer` (custom hook `useFlatTreeVirtualization` in `src/components/useFlatTreeVirtualization.ts`).
- **Task F8.4** — Hook: TDD con mock di 5000 record, asserzione che `renderRow` sia invocato solo per le righe visibili + buffer. Misura: < 120 ms per scroll di 100 righe.
- **Task F8.5** — Wirare in `HierarchicalTable.tsx`: nuova prop `isVirtualized` che attiva il rendering ottimizzato. Listener cross-filter invariati (delegation pattern senza perdere eventi).
- **Task F8.6** — Test regressione: i 14 file `test/*.test.ts` esistenti (incluso `treeBuilder.test.ts` con dataset grande).
- **Task F8.7** — Evidence Gate di performance: `lighthouse`-like smoke test (no Chrome ma measurement via `performance.now()`): il paint del primo frame scende sotto 250 ms per 2000 nodi.
- **Task F8.8** — Commit: `feat(perf): add pageSize + virtualization for large trees`.

### Feature F9 — CHANGELOG SemVer bump e push dual-remote
**Scope**: dopo F1-F8 verdi, bump versione, aggiornare CHANGELOG, push coordinated.

- **Task F9.1** — Bump `package.json`:
  - Versione `0.2.11` → `0.3.0`.
- **Task F9.2** — Aggiornare `CHANGELOG.md`:
  - Sostituire `[Unreleased]` con `## [0.3.0] - 2026-10-XX`.
  - Categorie: `### Added` (F1-F8 nuove feature), `### Changed` (F1 rename sezioni, F3 union Type estesa), `### Fixed` (gap precedenti).
  - Intestazione `## [Unreleased]` ricreata, vuota.
- **Task F9.3** — Test di non regressione:
  - `npm test -- --run` (14 file, 100% PASS) + `npm run build` exit 0.
  - `npx tsc --noEmit` exit 0.
- **Task F9.4** — Push dual-remote:
  - Set `GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe -o BatchMode=yes'`.
  - `git push origin main` (GitHub).
  - Sincronizzare i 5 file modificati (`controlPanel.tsx`, `formDataOptions.ts`, `treeData.ts`, alle funzioni nuove in `src/utils/`, `package.json`, `CHANGELOG.md`) anche in `D:/Sviluppo/superset-extensions/plugins/superset-plugin-chart-hierarchical-table/`.
  - Commit sul monorepo Bitbucket con subject `chore(plugin): mirror v0.3.0 hierarchical-table from upstream git`.
  - `git push bitbucket main` (Bitbucket enterprise `mapsgroupID/superset-extensions`).
- **Task F9.5** — Verifica post-push:
  - `git rev-list main...origin/main` → `0\t0` GitHub.
  - `git rev-list main...bitbucket/main` → `0\t0` Bitbucket.

---

## 🧪 5. Piano di Collaudo Finale (Evidence Gate)

| Test | Comando atteso | Esito |
|:--|:--|:-:|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Jest suite | `npm test` | tutti i 14 file `test/*.test.ts` PASS (12+ nuovi test verdi) |
| Build | `npm run build` | exit 0, `dist/index.esm.js` cresce < 14 KB vs v0.2.11 |
| Push GitHub | `git push origin main` | success, parity `0\t0` |
| Push Bitbucket | `git push bitbucket main` (via override SSH) | success, parity `0\t0` |
| Plugin runtime (manuale su `admmaps`) | `git pull → install.bat → docker compose up -d --build → Ctrl+F5` | nessun crash console, sezioni Data/Customize visibili nel pannello |

Smoke test mirato su `admmaps` lato server (post-push):
- Aprire una dashboard che usa `hierarchical_table` (StratumTree v0.3.0).
- Verificare che il pannello Explore mostri 4 macro-sezioni: **Data**, **Customize**, **Comparison & Analysis**, **Performance & Limits**.
- Modificare `aggregationMode` su `weighted_avg` con `weightColumn=volume`: subtotali cambiano coerentemente.
- Modificare `defaultSortColumn` su `delta_richieste_pct`: tabella riordina.
- Aggiungere una conditional rule `: value >= 1000 backgroundColor=#d4edda priority=1`: celle evidenziate correttamente.

---

## 🔄 6. Procedura di Rollback & Vault Lock

### 6.1 Rollback atomico
Se l'implementazione si interrompe o un collaudo fallisce in modo bloccante:

```powershell
# Working dir del plugin
cd D:/Sviluppo/superset-plugins/superset-plugin-chart-hierarchical-table

# Verificare working tree sporco
git status --porcelain | Measure-Object | Select-Object -ExpandProperty Count

# Rollback completo all'HEAD di v0.2.11 (atomico)
git fetch origin main
git reset --hard 8489246          # HEAD di v0.2.11 registrato nell'audit
git clean -fd                     # rimuove untracked (file di draft, sezione docs/ non toccata)

# Rollback morbido: ripristino selettivo via git checkout
git checkout -- src/plugin/controlPanel.tsx src/plugin/transformProps.ts src/plugin/treeData.ts src/plugin/formDataOptions.ts
git checkout -- src/utils/ src/types/ src/components/
git checkout -- package.json CHANGELOG.md test/

# Reinstallare dipendenze se il package-lock è stato toccato
npm install --ignore-scripts
```

### 6.2 Rollback Bitbucket mirror
```powershell
cd D:/Sviluppo/superset-extensions/plugins/superset-plugin-chart-hierarchical-table
git fetch bitbucket main
git reset --hard 65ecaab          # HEAD dei 4 install-plugin.ps1 committati (m2-bitbucket della missione di build ottimizzazione)
```

### 6.3 Procedura di sblocco post-rollback
1. Re-build del plugin: `npm run build` deve tornare a exit 0 con `dist/index.esm.js` di ~104 KB (size di v0.2.11).
2. Re-test: `npm test` deve tornare al 100% PASS sui 14 file originari.
3. Re-push (se necessario): `git push origin main --force-with-lease` (richiede conferma esplicita).

### 6.4 Vault Lock a fine sessione
```powershell
powershell -File D:/Scripts/vault/lock-env.ps1
```

---

## 📌 7. Sync SESSION_STATE.md

Una nuova sezione `## Hierarchical Table v0.3.0 — ControlPanel Ricco (Plan Master)` verrà inserita in `D:/.agents/SESSION_STATE.md` all'avvio della missione, con le 8 feature (F1-F9) come voci `[ ]` da spuntare progressivamente durante l'esecuzione.

---

## 📦 8. Manifest operativo (per i worker della missione pianificata)

Quando questo piano viene tradotto in `propose_mission` (vedasi blocco sotto), la missione generata includerà:

- **Skill riusabile**: `hierarchical-feature-implementer` (creata ad hoc, in stile plugin-builder ma conoscitiva del nuovo flusso controlPanel).
- **Skill riesistente**: `git-sync-committer` (per il push Bitbucket mirror).
- **services.yaml**: include i nuovi comandi `npm test`, `npm run build`, `npx tsc --noEmit`, `git remote parity` e una variante `git push-bitbucket` con override `GIT_SSH_COMMAND`.
- **Architecture.md**: aggiornamento per descrivere 4 macro-sezioni controlPanel, nuovi file `utils/` (`themes.ts`, `conditionalFormatting.ts`, `goalBenchmark.ts`, `sorting.ts`, `useFlatTreeVirtualization.ts`), nuovi campi `HierarchicalTableFormData`.
- **Validation contract**: ~30 nuovi assertion (build exit 0, typecheck exit 0, test PASS, push parity, feature-specifiche come "defaultSortColumn enum esteso").

---

**Prossima azione**: l'utente approva questo piano. L'orchestrator genera la missione via `propose_mission` (m1-features, m2-finalize, m3-push), attiva il runner, monitora i worker e tiene sincronizzato SESSION_STATE.md in tempo reale.
