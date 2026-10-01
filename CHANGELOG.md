# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
