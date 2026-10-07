# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
