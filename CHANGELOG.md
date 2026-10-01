# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e questo progetto aderisce al [Semantic Versioning](https://semver.org/lang/it/).

## [0.2.2] - 2026-10-01

### Fixed
- **Cross-Filtering con mapping colonne fisiche (`dimToPhysicalMap`)**: Risolto bug per cui il click sui nodi della tabella emetteva filtri basati sull'etichetta visualizzata anziché sulla colonna SQL fisica del database.
- **Esposizione Colonne Confronto e Variazione**: Rimosso il filtro di soppressione che nascondeva le colonne di periodo precedente/confronto nelle tabelle gerarchiche.
- **Installer istantaneo**: Aggiunto rilevamento bundle pre-compilato `dist/` in `install-plugin.ps1` per saltare `npm install` e installare istantaneamente.

## [0.1.9] - 2026-09-29

### Fixed

- **Formattazione Unità Metriche Percentuali Accesso Diretto (`formatters.ts`)**:
  - Raffinata la condizione di matching per Delta Accettazione escludendo esplicitamente le colonne relative ad "Accesso Diretto" (`!mName.includes('accesso')`), evitando che `Variazione Accesso Diretto (%)` ricevesse erroneamente l'unità di misura in punti percentuali (`p.p.`) invece del corretto formato percentuale con segno (`+X.X%`).

## [0.1.8] - 2026-09-29

### Fixed

- **Ricalcolo e Rollup Variazioni (%) Nodi Padre (`aggregations.ts`)**:
  - Implementata la funzione `findMetricPair` per risolvere dinamicamente gli operandi Corrente e Confronto sia per le chiavi SQL standard (`richieste_corr`/`richieste_conf`) sia per le etichette semantiche cliniche (`Richieste (Corrente)`, `Richieste (Confronto)`, `Prime Visite (Corrente)`, `Controlli (Corrente)`, `Accesso Diretto (Corrente)`, `Prestazione Programmata (Corrente)`).
  - Esteso il riconoscimento di `recomputeDerivedMetrics` a tutte le variazioni percentuali contenenti `variazione`, `diff` o `delta`, evitando che i nodi padre rimanessero con valori indefiniti (`-`).
  - Aggiunto fallback con media ponderata sui volumi dei figli per tabelle che espongono variazioni percentuali senza la colonna del confronto (es. chart mensili 470 e 471).
  - Prevenuta la somma scorretta delle metriche derivate in caso di record duplicati sullo stesso path foglia (`treeBuilder.ts`).
- **Formattazione e Stili Delta / Variazioni (`formatters.ts` & `HierarchicalTable.tsx`)**:
  - Risolta la collisione semantica in `formatMetricValue`: la sottostringa `lt` presente nella parola `delta` causava l'errata formattazione di `Delta Accettazione (p.p.)` come giorni (`gg`); ora `Delta Accettazione` viene valutata prioritariamente con unità corretta `p.p.`, e il tempo di attesa usa match espliciti su `attesa` e `lt_off`.
  - Estesa la formattazione percentuale con segno (`+X.X%`, `-X.X%`) e la colorazione condizionale verde/rosso (`delta-positive`/`delta-negative`) a tutte le colonne con prefisso `Variazione` e suffissi `%`.

## [0.1.7] - 2026-09-29

### Fixed

- **Rollup e Medie Ponderate Nodi Padre per Metriche di Tasso/Accettazione (`aggregations.ts`)**:
  - Esteso `isRateMetric` per includere `accettazione`, `tasso` e qualsiasi metrica con simbolo `%` non derivata da delta, evitando la somma aritmetica errata dei tassi sui nodi padre.
  - Implementata risoluzione dinamica delle chiavi volume (`weightKey`) in `rollupTreeMetrics`: se non è presente una metrica di volume esplicita, calcola la media aritmetica anziché la somma.
  - Risoluzione flessibile dei nomi di metrica in `recomputeDerivedMetrics` per Delta Accettazione (`delta_acc`) e Delta Lead Time (`delta_lt_off`): ora identifica correttamente gli operandi sia con etichette standard (`acc_corr`, `acc_conf`) sia con etichette semantiche cliniche adhoc (`Accettazione 1ª Disp. (%)`, `Accettazione Confronto (%)`).

## [0.1.6] - 2026-09-21

### Fixed

- **`recomputeDerivedMetrics`: fix calcolo delta per metriche accesso_diretto, programmata, prime_visite, controlli**
  - Rimossa la condizione generica `|| mLower.includes('pct')` nel Branch 1 che intercettava erroneamente tutte le metriche delta percentuali e le ricalcolava con le chiavi `richieste_corr`/`richieste_conf` (non presenti nei chart 442/444), lasciando i delta a `null`.
  - Aggiunti Branch specifici (1a–1d) per `delta_accesso_diretto_pct`, `delta_programmata_pct`, `delta_prime_visite_pct`, `delta_controlli_pct` che cercano i corretti operandi (`accesso_diretto`/`accesso_diretto_conf`, ecc.).
  - Aggiunto Branch 1e come fallback generico `delta_X_pct` che deriva automaticamente i nomi degli operandi dal nome della metrica.
  - Risultato: badge `NUOVO` (verde), colorazione `+X%` verde / `-X%` rosso e calcolo rollup sui nodi padre ora funzionanti su tutti i chart che usano metriche salvate Dataset 70.

## [0.1.5] - 2026-09-14

### Added

- **⚡ In-Tree Hierarchical Sorting (Interactive & Sibling-Aware)**:
  - Ordinamento interattivo su intestazioni di colonna: Categoria A-Z/Z-A e Metriche Asc/Desc con ciclo `asc -> desc -> default` e indicatori visivi (▲ / ▼).
  - Ordinamento ricorsivo per fratelli (sibling-aware): le radici si ordinano tra radici, i figli si ordinano rigorosamente all'interno del proprio padre preservando l'albero e i subtotali aggregati.
  - Grand Total ancorato ed escluso dal riordino.
  - Supporto per tabelle standard e matrici pivot orizzontali.

- **🎨 Multi-Mode Min/Max Conditional Formatting**:
  - Modalità a scelta: `badges` (pillole MIN/MAX), `heatmap` (sfumatura continua cella), `data_bars` (barre orizzontali stile Excel).
  - Ambito di calcolo: `leaves_only` (nodi foglia atomici di default, escludendo i padri per non falsare le scale), `level_aware`, o `all_nodes`.
  - Temi cromatici: `emerald`, `ocean`, `sunset`, `stratum`.
  - Gestione resiliente di valori negativi, 'Nuovo', stringhe numeriche e intervalli nulli.

- **🎛️ Dedicated Explore Control Panel Section**:
  - Nuova sezione `Sorting & Conditional Formatting` in Apache Superset Explore con controlli completi di configurazione predefinita.

- **🧪 Comprehensive Unit Test Suite**:
  - Aggiunti test completi in `test/sortingAndMinMax.test.ts` con 36/36 test Jest passati.


## [0.1.2] - 2026-08-20

### Added

- **🖥️ Integrated Responsive Scrollbar & Graphic Containment Engine**:
  - Implementato il calcolo dinamico di `containerStyle` basato su `width`, `height`, `maxHeight` e `maxWidth` passati da Apache Superset, garantendo il perfetto contenimento all'interno della card del chart senza fuoriuscite visive.
  - Aggiunto `min-height: 0` e `min-width: 0` su `.table-scroll-wrapper` in Flexbox, attivando lo scrolling interno bidirezionale (verticale e orizzontale) ed eliminando il problema delle tabelle tagliate a fondo card.
  - Scrollbar personalizzata integrata sia con standard CSS (`scrollbar-width: thin`) che per motori WebKit (`::-webkit-scrollbar`).
  - Intestazioni di colonna (`th.sticky-header`) e colonna gerarchica (`th.hierarchy-col`, `td.hierarchy-cell`) opache con ombreggiatura di elevazione (`box-shadow`), prevenendo trasparenze durante lo scroll.

- **⚡ Full Native Superset 6.x Cross-Filtering Standardization**:
  - Normalizzazione delle chiavi dimensionali per supportare sia `groupby` che `hierarchyDimensions` (camelCase da `ChartProps`) e `hierarchy_dimensions` (snake_case da `rawFormData`).
  - Standardizzazione del payload `setDataMask` per Superset 6.x con `extraFormData.filters` (operatori `IN` multi-path), `filterState.filters` e `filterState.selectedFilters` come dizionari `{ [col]: valArray }`.
  - Reset atomico dei filtri con `extraFormData: { filters: [] }` e `filterState.value = null`.

## [0.1.1] - 2026-08-20

### Added

- **⚡ Advanced Multi-Selection Cross-Filtering Engine**:
  - Implementata la selezione multipla simultanea di nodi e dimensioni con valutazione a livello di record atomico (`getFilteredRecords()`), eliminando ogni rischio di doppio conteggio.
  - Risoluzione automatica dei sottoalberi ricorsivi per gerarchie Parent-Child (inclusione di tutti gli ID discendenti).
  - Raggruppamento automatico per colonna nei filtri `IN` per l'evento `setDataMask` di Apache Superset.
  - Checkbox interattive sulle righe con evidenziazione visiva `.selected-filter-row` e `.node-filter-active`.
  - Contenitore di badge per i filtri attivi con rimozione del singolo filtro `✕` e pulsante `Clear All (N)`.
  - Sincronizzazione in tempo reale di 4 grafici companion nella dashboard (KPI card, Donut chart, Distribution bar chart con badge `✓`, Quarterly area chart).
  - Gestione sicura delle chiavi gerarchiche tramite codifica URI (`encodeURIComponent`), garantendo piena compatibilità con percorsi complessi e caratteri speciali.
  - Test suite Jest aggiornata in `treeBuilder.test.ts` con test per aggregazioni multi-nodo e grand total.

### Changed

- Rimozione globale del simbolo di marchio registrato (`™`) in favore della denominazione pulita **StratumTree**.

---

## [0.1.0] - 2026-08-20

### Added

- **⚡ Native Apache Superset 6.1.0 Cross-Filtering & Dashboard Interactivity**:
  - Implementato il protocollo `setDataMask` in `src/plugin/transformProps.ts` con emissione di filtri SQL `IN` (`extraFormData.filters`).
  - Filtraggio gerarchico multi-livello (Path-Aware) per trasmettere i filtri di tutti i livelli padre all'intera dashboard.
  - Aggiunto il controllo Explore `emit_filter` in `src/plugin/controlPanel.tsx`.
  - Evidenziazione visiva delle righe selezionate (`.selected-filter-row`) e badge attivo nella toolbar con pulsante di reset rapido.

- **🌐 Live GitHub Pages Site & Superset 6.1.0 Dashboard Simulator**:
  - Applicazione web moderna pubblicata su [GitHub Pages](https://francescocastaldi.github.io/superset-plugin-chart-hierarchical-table/).
  - Simulatore completo di Dashboard Superset 6.1.0 con Navbar, Native Filter Sidebar e grafici companion reattivi (Card KPI Big Number e Bar Chart) che si aggiornano in tempo reale al click sui nodi gerarchici.
  - Console live con tracking dei payload emessi da `setDataMask`.
  - Pipeline di deployment continuo `.github/workflows/deploy-pages.yml` (branch `gh-pages` con file `.nojekyll`).

- **🎬 Risorse Multimediali & Documentazione Grafica**:
  - `docs/images/hierarchical_table_preview.jpg`: Screenshot fotorealistico ad alta risoluzione della dashboard Superset 6.1.0.
  - `docs/images/hierarchical_table_animation.svg`: Animazione vettoriale dinamica dell'interazione multi-grafico e del cross-filtering.
  - `examples/interactive_preview.html`: Test runner HTML locale e autonomo.

- **⚙️ Enterprise Monorepo & Automated Installers**:
  - Riorganizzazione monorepo in NPM Workspaces (`packages/superset-plugin-chart-hierarchical-table` e `packages/superset-hierarchical-table-backend`).
  - `scripts/install.ps1`: Installer automatizzato per ambienti Windows e Docker Compose.
  - `scripts/installer.py`: Motore di iniezione AST/regex con backup e supporto `--rollback`.
  - `scripts/install.sh`: Wrapper per ambienti Unix/macOS.
  - `docs/docker_installation_windows.md`: Guida dettagliata all'installazione su Docker Desktop Windows.

- **🛡️ Governance & Ignorati AI**:
  - Politica di sviluppo solo-maintainer con guida `MAINTAINER.md`.
  - Aggiornato `.gitignore` per escludere tutti i file e directory legati a tool AI (`.agents/`, `AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.windsurf/`, ecc.).

- **Frontend Core (`packages/superset-plugin-chart-hierarchical-table`)**:
  - Registrazione del plugin con `@superset-ui/core` e comportamenti `Behavior.INTERACTIVE_CHART` e `Behavior.DRILL_TO_DETAIL`.
  - Componente `HierarchicalTable.tsx` basato su Ant Design v5.
  - Algoritmi `treeBuilder.ts` e `aggregations.ts` per calcolo roll-up e subtotali ricorsivi.

- **Backend Engine (`packages/superset-hierarchical-table-backend`)**:
  - Pacchetto Python `superset_hierarchical_table` con `tree_aggregator.py`, `parent_child.py` e `sql_builder.py` (query SQL CTE ricorsive).
  - Test unitari con `pytest`.
