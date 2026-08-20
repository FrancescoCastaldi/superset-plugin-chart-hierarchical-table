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

