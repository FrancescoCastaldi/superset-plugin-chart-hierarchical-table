# StratumTree — Hierarchical Matrix Grid & Tree Table for Apache Superset 6.1.0

[![Apache Superset](https://img.shields.io/badge/Apache%20Superset-6.1.0-007A87.svg?logo=apache-superset&logoColor=white)](https://superset.apache.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-StratumTree%20Sandbox-0ea5e9.svg)](https://francescocastaldi.github.io/superset-plugin-chart-hierarchical-table/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-v5-1890FF.svg?logo=antdesign&logoColor=white)](https://ant.design/)
[![Python](https://img.shields.io/badge/Python-3.9%20%7C%203.10%20%7C%203.11-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)

**StratumTree** is an enterprise-grade visualization plugin and companion aggregation engine designed for **Apache Superset 6.1.0+**. It delivers an interactive **Hierarchical Tree Table and Matrix Grid** with dual-mode hierarchy processing (multi-dimensional level grouping and recursive parent-child graph traversal), automated roll-up calculations, native Superset dashboard cross-filtering (`setDataMask`), and automated cross-platform installation tooling.

---

## 📑 Sommario

- [Anteprima Visiva & Animazione Interattiva](#-anteprima-visiva--animazione-interattiva)
- [Simulatore Dashboard Live](#-simulatore-dashboard-live-su-github-pages)
- [Architettura & Funzionalità Chiave](#-architettura--funzionalità-chiave)
- [Struttura del Repository (Monorepo Layout)](#-struttura-del-repository-monorepo-layout)
- [Guida all'Installazione](#-guida-allinstallazione)
  - [Installazione Automatica (Docker Compose)](#1-installazione-automatica-consigliata)
  - [Installazione Manuale](#2-installazione-manuale)
- [Parametri Explore (Control Panel)](#-parametri-explore-control-panel)
- [Collaudo & Test Suite](#-collaudo--test-suite)
- [Maintainer & Governance](#-maintainer--governance)
- [Licenza](#-licenza)

---

## 📸 Anteprima Visiva & Animazione Interattiva

### 🎬 Animazione Dinamica del Cross-Filtering & Interattività Multi-Grafico
L'animazione vettoriale illustra l'interazione ad albero, l'espansione dei rami dimensionali, l'emissione dell'evento `setDataMask` e la reattività dei grafici companion della dashboard:

![Hierarchical Table Dynamic Animation](docs/images/hierarchical_table_animation.svg)

### 🖼️ Screenshot UI in Apache Superset 6.1.0
![Apache Superset Hierarchical Table Preview](docs/images/hierarchical_table_preview.jpg)

---

## 🌐 Simulatore Dashboard Live su GitHub Pages

È disponibile una simulazione interattiva completa di una dashboard Apache Superset 6.1.0 con 4 grafici companion collegati in tempo reale:

👉 **[Accedi al Simulatore Live su GitHub Pages](https://francescocastaldi.github.io/superset-plugin-chart-hierarchical-table/)**

- **Tabella Gerarchica Principale**: Espansione/collasso nodi, ricerca in-tree con conservazione del path e selezione attiva.
- **Card KPI Big Number con Sparkline**: Ricalcolo istantaneo del totale filtrato e variazione percentuale.
- **Donut Share Composition Chart**: Ripartizione percentuale dinamica della quota del nodo selezionato.
- **Sub-Level Distribution Bar Chart**: Ripartizione orizzontale dei nodi figli con supporto al drill-down.
- **Quarterly Performance Area Chart**: Traiettoria temporale (Q1–Q4) del ramo selezionato.
- **Console Eventi Superset**: Ispezione in tempo reale del payload emesso da `setDataMask`.

---

## 🏛️ Architettura & Funzionalità Chiave

```mermaid
flowchart LR
    A[Superset Explore / Dashboard] -->|FormData / Control Panel| B[buildQuery.ts]
    B -->|QueryContext /api/v1/chart/data| C[Superset Backend Engine]
    C -->|SQL Query Execution| D[(Database / DW)]
    D -->|Raw Tabular Records| C
    C -->|Companion Post-Processing| E[Python Engine: superset_hierarchical_table]
    E -->|JSON Dataset| F[transformProps.ts]
    F -->|Recursive TreeNode Tree| G[HierarchicalTable.tsx UI Component]
    G -->|setDataMask Event| A
```

### 1. Elaborazione Gerarchica Dual-Mode
- **Multi-Dimension Level Grouping**: Raggruppamento per serie ordinata di dimensioni (es. `Region > Country > City > Store`).
- **Parent-Child Adjacency Graph**: Risoluzione ricorsiva di grafi di adiacenza (es. Organigrammi `employee_id -> manager_id`, Piani dei Conti `account_code -> parent_account_code`).

### 2. Cross-Filtering Nativo Superset 6.1.0 (`setDataMask`)
- Emissione di filtri relazionali `IN` verso l'intera dashboard al click su nodi dimensionali.
- **Path-Aware Filtering**: Trasmissione automatica di tutti i livelli gerarchici antenati per garantire la corretta contestualizzazione del filtro.
- Evidenziazione visiva della riga attiva (`.selected-filter-row`) e badge di reset rapido nella toolbar.

### 3. Calcolo Automatico di Roll-up & Subtotali
- Algoritmo di attraversamento post-order per il calcolo di subtotali su tutti i nodi non-foglia (Somma, Media, Min, Max, Conteggio).
- Generazione automatica della riga di riepilogo complessivo (**Grand Total**).

### 4. Companion Engine Backend (Python)
- Pacchetto `superset_hierarchical_table` per elaborazioni pesanti lato server su grandi DataFrame Pandas e generazione di query SQL con CTE ricorsive.

---

## 📂 Struttura del Repository (Monorepo Layout)

```
superset-plugin-chart-hierarchical-table/
├── .github/
│   └── workflows/
│       ├── ci.yml                             # Pipeline CI: test TypeScript e Pytest
│       └── deploy-pages.yml                   # Pipeline CD: deploy automatico GitHub Pages
│
├── configs/
│   └── tsconfig.base.json                     # Configurazione TypeScript di base condivisa
│
├── packages/
│   ├── superset-plugin-chart-hierarchical-table/  # Plugin Frontend (React 18 / TypeScript)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                       # Entry point e registrazione del plugin
│   │   │   ├── plugin/                        # buildQuery, controlPanel, transformProps
│   │   │   ├── components/                    # HierarchicalTable UI, stili Ant Design v5
│   │   │   ├── types/                         # Definizioni TypeScript e interfacce
│   │   │   └── utils/                         # treeBuilder, aggregations, formatters
│   │   └── test/                              # Test unitari Jest
│   │
│   └── superset-hierarchical-table-backend/       # Companion Engine Backend (Python)
│       ├── pyproject.toml                     # Configurazione PEP 621 e dipendenze
│       ├── superset_hierarchical_table/
│       │   ├── processors/                    # tree_aggregator, parent_child
│       │   └── queries/                       # sql_builder e CTE ricorsive
│       └── tests/                             # Test suite Pytest
│
├── site/                                      # Documentazione interattiva & Dashboard Simulator
│   ├── index.html                             # UI del simulatore dashboard Superset 6.1.0
│   ├── styles.css                             # Design system ultra-minimal dark
│   ├── app.js                                 # Motore client-side e sincronizzazione grafici
│   ├── favicon.svg                            # Favicon vettoriale SVG
│   ├── favicon.png                            # Favicon bitmap 32x32 px
│   ├── favicon.ico                            # Favicon formato ICO
│   └── .nojekyll                              # Bypass elaborazione Jekyll su GitHub Pages
│
├── scripts/                                   # Strumenti di automazione e iniezione
│   ├── install.ps1                            # Installer automatizzato Windows PowerShell
│   ├── install.sh                             # Installer automatizzato Linux / macOS
│   ├── installer.py                           # Motore di iniezione AST/regex con backup & rollback
│   └── docker-compose.override.example.yml    # Template mount sorgenti per Docker Compose
│
├── docs/                                      # Specifiche tecniche e manuali
│   ├── architecture.md                        # Flusso dati dettagliato e pipeline di trasformazione
│   ├── docker_installation_windows.md         # Guida passo-passo per Windows e Docker Desktop
│   ├── installation.md                        # Guida all'installazione generale
│   ├── hierarchy_guide.md                     # Modellazione dati (Dimensioni vs Parent-Child)
│   ├── control_panel_reference.md             # Riferimento completo controlli Explore
│   └── images/                                # Risorse grafiche e animazioni SVG
│
├── examples/                                  # Dataset di esempio per collaudo
│   ├── financial_pnl.csv                      # Dataset Conto Economico / P&L
│   ├── org_chart.csv                          # Dataset Organigramma aziendale
│   ├── sales_hierarchy.csv                    # Dataset Vendite retail multi-livello
│   └── interactive_preview.html               # Test runner HTML locale autonomo
│
├── Makefile                                   # Automazione task (install, build, test, lint)
├── package.json                               # Configurazione NPM Workspace monorepo root
├── CHANGELOG.md                               # Storico rilasci conforme a Keep a Changelog
├── MAINTAINER.md                              # Operational runbook per il maintainer
├── LICENSE                                    # Licenza Open Source Apache 2.0
└── README.md                                  # Documento principale
```

---

## 🚀 Guida all'Installazione

### 1. Installazione Automatica (Consigliata)

Se utilizzi un'istanza locale di Apache Superset 6.1.0 avviata tramite **Docker Compose**, puoi eseguire l'installer automatico che effettua backup, iniezione AST e build in un solo passaggio.

#### Su Windows (PowerShell):
```powershell
.\scripts\install.ps1 -SupersetPath "C:\path\to\superset"
```

#### Su Linux / macOS / Git Bash:
```bash
./scripts/install.sh --superset-path "/path/to/superset"
```

*Per la procedura dettagliata in ambiente Windows con WSL 2 e Docker Desktop, consultare la [Guida all'Installazione su Windows](docs/docker_installation_windows.md).*

---

### 2. Installazione Manuale

#### Prerequisiti:
- **Node.js**: `>= 20.x` LTS
- **npm**: `>= 10.x`
- **Python**: `>= 3.9`
- **Apache Superset**: `6.1.0+`

#### Passo A: Registrazione del Plugin Frontend
Posizionarsi all'interno della cartella `superset-frontend/` dell'istanza Superset:

```bash
cd superset-frontend
npm install superset-plugin-chart-hierarchical-table
```

Nel file `superset-frontend/src/visualizations/presets/MainPreset.js` (o `MainPreset.ts`), registrare il plugin:

```typescript
import { HierarchicalTableChartPlugin } from 'superset-plugin-chart-hierarchical-table';

new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register();
```

#### Passo B: Installazione del Backend Companion (Opzionale)
```bash
cd packages/superset-hierarchical-table-backend
pip install -e .
```

---

## 🎛️ Parametri Explore (Control Panel)

| Parametro | Tipo | Descrizione |
|---|---|---|
| **Hierarchy Mode** | Select | `Multi-Dimension Grouping` o `Parent-Child Adjacency`. |
| **Hierarchy Dimensions** | Multi-Select | Lista ordinata delle colonne dimensionali (dal livello radice al livello foglia). |
| **Node ID Column** | Select | Colonna ID univoco (visibile in modalità Parent-Child). |
| **Parent ID Column** | Select | Colonna Parent ID di riferimento (visibile in modalità Parent-Child). |
| **Metrics** | Metrics | Metriche numeriche da aggregare ed esporre nella matrice. |
| **Initial Expand Depth** | Select | Livello di apertura iniziale (`Collapse All`, `Level 1`, `Level 2`, `Expand All`). |
| **Show Subtotals / Rollup** | Checkbox | Abilita il calcolo dei totali intermedi sui nodi padre. |
| **Show Grand Total Row** | Checkbox | Visualizza la riga del Totale Generale in cima alla tabella. |
| **Emit Dashboard Cross-Filters** | Checkbox | Emette eventi `setDataMask` al click sulle righe per filtrare l'intera dashboard. |
| **Enable In-Tree Search** | Checkbox | Barra di ricerca in tempo reale con evidenziazione del path. |
| **Sticky Table Header** | Checkbox | Blocca le intestazioni durante lo scroll verticale. |
| **Sticky Hierarchy Column** | Checkbox | Blocca la prima colonna durante lo scroll orizzontale. |

*Per il manuale completo di tutti i controlli, consultare il [Riferimento del Control Panel](docs/control_panel_reference.md).*

---

## 🧪 Collaudo & Test Suite

Per eseguire l'intera suite di test automatizzati (TypeScript + Pytest):

```bash
# Esegue tutti i test del monorepo
make test

# Test frontend isolati (Jest)
npm run test

# Test backend isolati (Pytest)
cd packages/superset-hierarchical-table-backend && pytest tests/ -v
```

---

## 👤 Maintainer & Governance

Questo repository è sviluppato e mantenuto in modo esclusivo da **[Francesco Castaldi](https://github.com/FrancescoCastaldi)**.

> **Nota di Accesso**: Il progetto è gestito a sviluppo personale. Non vengono accettate Pull Request o segnalazioni esterne.

---

## 📄 Licenza

Rilasciato sotto i termini della licenza **[Apache License 2.0](LICENSE)**. Compatibile con Apache Superset 6.1.0+.
