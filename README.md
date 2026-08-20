# Apache Superset Hierarchical Table Chart Plugin

[![Apache Superset](https://img.shields.io/badge/Apache%20Superset-6.1.0-blue.svg)](https://superset.apache.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.9%20%7C%203.10%20%7C%203.11-brightgreen.svg)](https://www.python.org/)

Un plugin di visualizzazione avanzato per **Apache Superset 6.1.0+** che implementa una tabella gerarchica ad albero (**Tree Table / Hierarchical Grid**) con supporto completo alla gestione delle gerarchie sia a **livello backend** (generazione query SQL, post-processing e aggregazioni roll-up) che a **livello frontend** (esplorazione interattiva, expand/collapse, formattazione condizionale, cross-filtering e paginazione virtualizzata).

---

## 🌟 Caratteristiche Principali

### 1. Gestione Gerarchica Dual-Mode (Backend & Frontend)
- **Multi-Dimension Level Hierarchy (Group-By)**: Raggruppamento dinamico su più livelli dimensionali (es. `Regione > Nazione > Città > Store` oppure `Divisione > Categoria > Prodotto`).
- **Parent-Child Adjacency Hierarchy**: Risoluzione di strutture ad albero ricorsive (es. Organigrammi `Employee -> Manager`, Piani dei Conti contabili / P&L `Account -> Parent Account`).
- **Rollup & Subtotali Automatici**: Calcolo degli aggregati intermedi su tutti i nodi non-foglia (Somma, Media, Min, Max, Conteggio, ecc.) sia a livello query/post-processing sia client-side.

### 2. Frontend Moderno & Reattivo (Superset 6.1.0)
- **Ant Design v5 & `@superset-ui/core`**: Piena aderenza al nuovo design system di Superset 6.x.
- **Interattività Completa**:
  - Espansione/collasso selettivo dei rami con memoria di stato.
  - Profondità di espansione iniziale configurabile da Explore (`Collapse All`, `Expand to Level N`, `Expand All`).
  - Colonne Sticky (fissate) per intestazioni e prima colonna gerarchica.
  - Ricerca istantanea nell'albero con evidenziazione del percorso (path highlighting).
- **Cross-Filtering & Drill-Down**: Emette eventi di filtro nativi di Superset cliccando su nodi o celle della tabella.
- **Formattazione Condizionale**: Heatmap celle, barre di avanzamento orizzontali, indicatori di trend/delta con colori semantici.

### 3. Backend Processing Engine (Python)
- Modulo companion `superset_hierarchical_table` per calcoli pesanti di gerarchia, matrici pivot e roll-up su grandi moli di dati prima della serializzazione JSON verso il frontend.

---

## 📂 Struttura del Repository

```
superset-plugin-chart-hierarchical-table/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Test automatici e linting (TS + Python)
│       └── release.yml            # Automazione di rilascio
├── frontend/                      # Plugin React & TypeScript per Superset
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts               # Registrazione del plugin
│   │   ├── plugin/                # buildQuery, controlPanel, transformProps
│   │   ├── components/            # HierarchicalTable UI component & stili
│   │   ├── types/                 # Interfacce TypeScript
│   │   └── utils/                 # Algoritmi albero, aggregazioni, formattatori
│   └── test/                      # Test frontend (Jest / Vitest)
├── backend/                       # Companion Python per elaborazioni gerarchiche
│   ├── pyproject.toml
│   ├── superset_hierarchical_table/
│   │   ├── processors/            # Tree aggregator, roll-up & parent-child
│   │   └── queries/               # Helper SQL & CTE ricorsive
│   └── tests/                     # Test Python (pytest)
├── docs/                          # Guide e specifiche architetturali
│   ├── architecture.md            # Dettagli flusso dati backend/frontend
│   ├── installation.md            # Guida all'installazione in Superset 6.1.0
│   ├── hierarchy_guide.md         # Modellazione gerarchie (Dimensioni vs Parent-Child)
│   └── control_panel_reference.md # Riferimento a tutti i controlli Explore
├── examples/                      # Dataset CSV di esempio per test rapidi
│   ├── financial_pnl.csv          # Esempio Conto Economico / P&L
│   ├── org_chart.csv              # Esempio Organigramma Parent-Child
│   └── sales_hierarchy.csv        # Esempio Vendite multi-dimensione
├── CHANGELOG.md                   # Storico versioni e modifiche
├── CONTRIBUTING.md                # Linee guida per i contributori
├── LICENSE                        # Apache License 2.0
└── README.md
```

---

## 🚀 Quick Start & Installazione

### Requisiti
- **Node.js**: `>= 18.x` (consigliato 20.x LTS)
- **npm** o **yarn**
- **Python**: `>= 3.9`
- **Apache Superset**: `6.1.0+`

### 1. Installazione Frontend nel Superset Codebase
Clona o installa il pacchetto all'interno dell'ambiente Superset frontend (`superset-frontend/`):

```bash
cd superset-frontend
npm install @superset-plugin-chart/hierarchical-table
```

Nel file `superset-frontend/src/visualizations/presets/MainPreset.js` (o nel file di registrazione plugin di Superset 6.1.0):

```typescript
import { HierarchicalTableChartPlugin } from 'superset-plugin-chart-hierarchical-table';

new HierarchicalTableChartPlugin().configure({ key: 'hierarchical_table' }).register();
```

### 2. Installazione Companion Backend (Opzionale per elaborazioni avanzate)
```bash
cd backend
pip install -e .
```

---

## 📖 Documentazione

Per maggiori dettagli, consulta la documentazione dedicata nella cartella [`docs/`](docs/):
- [Architettura del Sistema & Flussi Dati](docs/architecture.md)
- [Guida all'Installazione & Configurazione](docs/installation.md)
- [Guida alla Modellazione delle Gerarchie](docs/hierarchy_guide.md)
- [Riferimento Controlli del Control Panel Explore](docs/control_panel_reference.md)

---

## 🧪 Esecuzione dei Test

### Test Frontend
```bash
cd frontend
npm test
```

### Test Backend
```bash
cd backend
pytest tests/
```

---

## 📄 Licenza
Rilasciato sotto licenza [Apache License 2.0](LICENSE).
