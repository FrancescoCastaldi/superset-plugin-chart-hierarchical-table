# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e questo progetto aderisce al [Semantic Versioning](https://semver.org/lang/it/).

## [Unreleased]

### Aggiunte pianificate
- Supporto per esportazione Excel multi-livello con gruppi raggruppabili (native Excel grouping).
- Integrazione drill-through a dashboard secondarie tramite Superset URL parameters.
- Modalità Pivot dinamica a colonne per metriche temporali (Time Comparison / Period-over-Period).

---

## [0.1.0] - 2026-08-20

### Added
- **Core Architecture**:
  - Inizializzazione della struttura del repository monorepo con cartelle `frontend/`, `backend/`, `docs/`, `examples/`.
  - Configurazione build e linting per TypeScript 5.x e Python 3.9+.
  - Pipeline GitHub Actions CI/CD (`.github/workflows/ci.yml`).

- **Frontend (`frontend/`)**:
  - Plugin Apache Superset 6.1.0 basato su `@superset-ui/core`.
  - `HierarchicalTable.tsx`: componente reattivo con supporto ad albero, expand/collapse dinamico e visualizzazione gerarchica.
  - `treeBuilder.ts`: modulo di trasformazione da record relazionali/tabulari piatti ad albero `TreeNode` con propagazione gerarchica.
  - `aggregations.ts`: motore di calcolo subtotali e roll-up per dimensioni e metriche.
  - `controlPanel.tsx`: interfaccia Explore in Superset per configurare dimensioni gerarchiche, metriche, profondità iniziale, subtotali e formattazione condizionale.
  - `buildQuery.ts`: costruttore query ottimizzato per le API `/api/v1/chart/data` di Superset.
  - `transformProps.ts`: bridge tra il payload di Superset e il componente React.

- **Backend Companion (`backend/`)**:
  - Modulo Python `superset_hierarchical_table` per elaborazioni complesse sul server.
  - `tree_aggregator.py`: elaborazione di DataFrame Pandas per calcolo roll-up multi-livello e gerarchie tabulari.
  - `parent_child.py`: risoluzione di grafi di adiacenza (ID / Parent ID) con calcolo di profondità e percorsi.
  - `sql_builder.py`: generazione di snippet SQL e query ricorsive (CTE) per database relazionali.
  - Suite di test unitari con `pytest`.

- **Documentation & Examples (`docs/`, `examples/`)**:
  - `docs/architecture.md`: specifica completa del flusso dati backend-frontend.
  - `docs/installation.md`: guida all'integrazione e registrazione in Superset 6.1.0.
  - `docs/hierarchy_guide.md`: guida pratica per utenti e data analyst su come strutturare le query.
  - `docs/control_panel_reference.md`: manuale d'uso dei parametri Explore.
  - Tre dataset di esempio: `financial_pnl.csv`, `org_chart.csv`, `sales_hierarchy.csv`.
