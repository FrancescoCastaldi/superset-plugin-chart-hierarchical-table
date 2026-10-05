# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
