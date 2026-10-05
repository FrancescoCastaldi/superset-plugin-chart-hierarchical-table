import React, { useState, useMemo, useCallback, useEffect } from 'react';
import classNames from 'classnames';
import {
  HierarchicalTableTransformedProps,
  TreeNode,
  SortOrder,
  MinMaxBound,
  MinMaxBoundsMap,
  MinMaxDisplayMode,
  MinMaxScope,
  HierarchyValueDisplayMode,
} from '../types';
import {
  filterTreeBySearch,
  sortTreeHierarchy,
  calculateMinMaxBounds,
} from '../utils/treeBuilder';
import { getNormalizedMetricValue, getHeatmapBgColor } from '../utils/formatters';
import './HierarchicalTable.css';

export interface ColumnMeta {
  key: string;
  title: string;
  width?: number | string;
  formatter?: (val: any) => string;
  isDelta: boolean;
}

function isHierarchySortKey(key?: string, dims?: string[]): boolean {
  if (!key) return false;
  return (
    key === '__hierarchy_tree__' ||
    key === 'name' ||
    key === 'hierarchy' ||
    key === 'category' ||
    Boolean(dims && dims.includes(key))
  );
}

interface HierarchicalTableRowProps {
  node: TreeNode;
  displayCols: any[];
  columnMetaMap: Map<string, ColumnMeta>;
  isExpanded: boolean;
  isFilterSelected: boolean;
  emitFilter: boolean;
  activeDisplayMode: HierarchyValueDisplayMode;
  minMaxDisplayMode: MinMaxDisplayMode;
  minMaxScope: MinMaxScope;
  minMaxBounds: MinMaxBoundsMap | null;
  onToggleExpand: (key: string) => void;
  onNodeClick: (node: TreeNode) => void;
}

const HierarchicalTableRow = React.memo(function HierarchicalTableRow({
  node,
  displayCols,
  columnMetaMap,
  isExpanded,
  isFilterSelected,
  emitFilter,
  activeDisplayMode,
  minMaxDisplayMode,
  minMaxScope,
  minMaxBounds,
  onToggleExpand,
  onNodeClick,
}: HierarchicalTableRowProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const paddingLeft = node.depth * 20 + 8;
  const hasMinMax = minMaxDisplayMode !== 'none' && Boolean(minMaxBounds);
  const inScope = hasMinMax
    ? minMaxScope === 'all_nodes' || minMaxScope === 'level_aware'
      ? true
      : Boolean(node.isLeaf || !hasChildren)
    : false;

  return (
    <tr
      className={classNames({
        'parent-row': hasChildren,
        'selected-filter-row': isFilterSelected,
      })}
    >
      {/* Hierarchy Column */}
      <td className="hierarchy-cell">
        <div className="tree-cell-content" style={{ paddingLeft: `${paddingLeft}px` }}>
          {emitFilter && (
            <input
              type="checkbox"
              className="node-checkbox"
              checked={isFilterSelected}
              onChange={() => onNodeClick(node)}
              aria-label={`Select ${node.name} for cross-filtering`}
            />
          )}
          {hasChildren ? (
            <button
              type="button"
              className="tree-toggle-btn"
              onClick={() => onToggleExpand(node.key)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          ) : (
            <span className="tree-spacer" />
          )}
          <span
            className={classNames('node-name', {
              'node-parent': hasChildren,
              'node-filter-active': isFilterSelected,
            })}
            onClick={() => onNodeClick(node)}
            title={`Click to ${isFilterSelected ? 'remove from filter' : 'filter dashboard by ' + node.name} (${node.path.join(' > ')})`}
          >
            {node.name}
          </span>
        </div>
      </td>

      {/* Metric / Pivot Columns */}
      {displayCols.map(col => {
        const renderValues =
          activeDisplayMode === 'all'
            ? true
            : activeDisplayMode === 'leaves_only'
            ? !hasChildren
            : hasChildren;

        if (!renderValues) {
          return <td key={col.key} className="metric-cell empty-metric-cell" />;
        }

        const meta = columnMetaMap.get(col.key);
        const val = node.metrics?.[col.key] ?? node.subtotals?.[col.key];
        const isDelta = meta?.isDelta ?? false;
        const isNuovo = val === 'Nuovo';

        const bound =
          inScope && hasMinMax
            ? minMaxScope === 'level_aware'
              ? minMaxBounds?.byLevel?.[col.key]?.[node.depth ?? 0]
              : minMaxBounds?.global[col.key]
            : undefined;

        const numericVal =
          typeof val === 'number' && Number.isFinite(val)
            ? val
            : typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))
            ? Number(val)
            : null;
        const isNumeric = numericVal !== null;
        const range = bound && bound.max > bound.min ? bound.max - bound.min : 0;
        const normalized =
          isNumeric && bound && range > 0
            ? getNormalizedMetricValue(numericVal, bound)
            : 0;

        const isMin = inScope && isNumeric && bound && range > 0 && numericVal === bound.min;
        const isMax = inScope && isNumeric && bound && range > 0 && numericVal === bound.max;

        // Base metric content
        const baseContent = isNuovo ? (
          <span className="badge-delta-nuovo">Nuovo</span>
        ) : isDelta && typeof val === 'number' ? (
          <span
            className={
              val > 0
                ? 'delta-positive'
                : val < 0
                ? 'delta-negative'
                : 'delta-neutral'
            }
          >
            {col?.formatter ? col.formatter(val) : String(val ?? '-')}
          </span>
        ) : col?.formatter ? (
          col.formatter(val)
        ) : (
          String(val ?? '-')
        );

        // Cell heatmap background style
        const cellStyle: React.CSSProperties = {};
        if (minMaxDisplayMode === 'heatmap' && inScope && isNumeric && range > 0) {
          cellStyle.backgroundColor = getHeatmapBgColor(normalized, 'stratum');
        }

        return (
          <td key={col.key} className="metric-cell" style={cellStyle}>
            {minMaxDisplayMode === 'badges' ? (
              <div className="metric-cell-badges-wrapper">
                <span className="metric-val">{baseContent}</span>
                {isMax && (
                  <span
                    className="minmax-badge minmax-max theme-stratum"
                    title={`Maximum value: ${val}`}
                  >
                    MAX
                  </span>
                )}
                {isMin && (
                  <span
                    className="minmax-badge minmax-min theme-stratum"
                    title={`Minimum value: ${val}`}
                  >
                    MIN
                  </span>
                )}
              </div>
            ) : minMaxDisplayMode === 'data_bars' ? (
              <div className="data-bar-container">
                {inScope && isNumeric && range > 0 && (
                  <div
                    className="data-bar-fill theme-stratum"
                    style={{ width: `${Math.round(normalized * 100)}%` }}
                  />
                )}
                <span className="data-bar-value">{baseContent}</span>
              </div>
            ) : (
              baseContent
            )}
          </td>
        );
      })}
    </tr>
  );
});

export default function HierarchicalTable(props: HierarchicalTableTransformedProps) {
  const {
    width,
    height,
    data = [],
    columns = [],
    metrics = [],
    dimensions = [],
    initialExpandDepth = 1,
    valueDisplayMode = 'all',
    showGrandTotal = true,
    grandTotalPosition = 'top',
    grandTotalNode,
    stickyHeader = true,
    enableSearch = true,
    enableHierarchicalSort = true,
    defaultSortColumn = '__hierarchy_tree__',
    defaultSortOrder = 'none',
    minMaxDisplayMode = 'none',
    minMaxScope = 'leaves_only',
    enableExport = true,
    compactMode = false,
    stripedRows = true,
    emitFilter = true,
    onCrossFilter,
    onClearFilter,
  } = props;

  const [activeDisplayMode, setActiveDisplayMode] = useState<HierarchyValueDisplayMode>(
    valueDisplayMode || 'all',
  );

  useEffect(() => {
    if (valueDisplayMode) {
      setActiveDisplayMode(valueDisplayMode);
    }
  }, [valueDisplayMode]);

  const shouldRenderMetricValue = useCallback(
    (node: TreeNode, mode: HierarchyValueDisplayMode): boolean => {
      const hasChildren = Boolean(node.children && node.children.length > 0);
      if (mode === 'leaves_only') return !hasChildren;
      if (mode === 'parents_only') return hasChildren;
      return true;
    },
    [],
  );

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [selectedFilterMap, setSelectedFilterMap] = useState<
    Map<string, { key: string; dimension: string; value: string; pathMap?: Record<string, string> }>
  >(new Map());

  const containerStyle = useMemo(() => {
    const style: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box',
    };
    if (typeof width === 'number' && width > 0) {
      style.width = `${width}px`;
      style.maxWidth = `${width}px`;
    } else if (typeof width === 'string' && width) {
      style.width = width;
      style.maxWidth = width;
    } else {
      style.width = '100%';
    }
    if (typeof height === 'number' && height > 0) {
      style.height = `${height}px`;
      style.maxHeight = `${height}px`;
    } else if (typeof height === 'string' && height) {
      style.height = height;
      style.maxHeight = height;
    } else {
      style.height = '100%';
    }
    return style;
  }, [width, height]);

  // Set of expanded node keys
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const initialKeys = new Set<string>();

    function collectInitialKeys(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          if (initialExpandDepth === -1 || node.depth < initialExpandDepth) {
            initialKeys.add(node.key);
            collectInitialKeys(node.children);
          }
        }
      }
    }

    collectInitialKeys(data);
    return initialKeys;
  });

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const allKeys = new Set<string>();
    function collectAllKeys(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          allKeys.add(node.key);
          collectAllKeys(node.children);
        }
      }
    }
    collectAllKeys(data);
    setExpandedKeys(allKeys);
  }, [data]);

  const handleCollapseAll = useCallback(() => {
    setExpandedKeys(new Set<string>());
  }, []);

  // Sorting state (initialized from formData defaultSortColumn & defaultSortOrder)
  const [sortColumn, setSortColumn] = useState<string>(defaultSortColumn || '__hierarchy_tree__');
  const [sortDirection, setSortDirection] = useState<SortOrder>(defaultSortOrder || 'none');

  useEffect(() => {
    if (defaultSortColumn) {
      setSortColumn(defaultSortColumn);
    }
  }, [defaultSortColumn]);

  useEffect(() => {
    if (defaultSortOrder) {
      setSortDirection(defaultSortOrder);
    }
  }, [defaultSortOrder]);

  const handleHeaderSort = useCallback(
    (columnKey: string) => {
      if (!enableHierarchicalSort) return;
      const isCurrent =
        sortColumn === columnKey ||
        (isHierarchySortKey(sortColumn, dimensions) && isHierarchySortKey(columnKey, dimensions));
      if (isCurrent) {
        // Cycle: asc -> desc -> none -> asc
        setSortDirection(prev => {
          if (prev === 'asc') return 'desc';
          if (prev === 'desc') return 'none';
          return 'asc';
        });
      } else {
        setSortColumn(columnKey);
        setSortDirection('asc');
      }
    },
    [dimensions, enableHierarchicalSort, sortColumn],
  );

  // Sibling-aware recursive in-tree sorting
  const sortedData = useMemo(() => {
    if (!enableHierarchicalSort || sortDirection === 'none' || !sortColumn) {
      return data;
    }
    return sortTreeHierarchy(data, sortColumn, sortDirection, dimensions, grandTotalPosition);
  }, [data, dimensions, enableHierarchicalSort, grandTotalPosition, sortColumn, sortDirection]);

  // Filtered data tree based on search
  const filteredData = useMemo(() => {
    return filterTreeBySearch(sortedData, debouncedSearch);
  }, [sortedData, debouncedSearch]);

  // Handle Node Click for Multi-Selection Cross-Filtering
  const handleNodeClick = useCallback(
    (node: TreeNode) => {
      if (!emitFilter || !onCrossFilter) return;

      setSelectedFilterMap(prev => {
        const next = new Map(prev);
        if (next.has(node.key)) {
          next.delete(node.key);
        } else {
          const dimensionName = node.dimension || dimensions[node.depth] || 'Dimension';
          const pathMap: Record<string, string> = {};
          if (dimensions.length > 0 && node.path && node.path.length > 0) {
            for (let i = 0; i <= node.depth && i < dimensions.length; i++) {
              pathMap[dimensions[i]] = node.path[i];
            }
          }
          next.set(node.key, {
            key: node.key,
            dimension: dimensionName,
            value: node.name,
            pathMap,
          });
        }

        const filterItems = Array.from(next.values());
        if (filterItems.length === 0) {
          if (onClearFilter) {
            onClearFilter();
          } else {
            onCrossFilter(node.dimension || 'Dimension', [], undefined, true, []);
          }
        } else {
          const dimensionName = node.dimension || dimensions[node.depth] || 'Dimension';
          const values = filterItems.map(f => f.value);
          const pathMaps = filterItems.map(f => f.pathMap || {});
          onCrossFilter(dimensionName, values, pathMaps, false, filterItems);
        }

        return next;
      });
    },
    [dimensions, emitFilter, onCrossFilter, onClearFilter],
  );

  const handleRemoveSingleFilter = useCallback(
    (key: string) => {
      setSelectedFilterMap(prev => {
        const next = new Map(prev);
        next.delete(key);
        const filterItems = Array.from(next.values());
        if (filterItems.length === 0) {
          if (onClearFilter) onClearFilter();
        } else if (onCrossFilter) {
          const values = filterItems.map(f => f.value);
          const pathMaps = filterItems.map(f => f.pathMap || {});
          onCrossFilter(filterItems[0].dimension, values, pathMaps, false, filterItems);
        }
        return next;
      });
    },
    [onCrossFilter, onClearFilter],
  );

  const handleClearActiveFilter = useCallback(() => {
    setSelectedFilterMap(new Map());
    if (onClearFilter) {
      onClearFilter();
    }
  }, [onClearFilter]);

  // Flatten visible tree nodes according to expanded state
  const visibleRows = useMemo(() => {
    const rows: TreeNode[] = [];
    const hasSearch = debouncedSearch.trim().length > 0;

    function traverse(nodes: TreeNode[]) {
      for (const node of nodes) {
        rows.push(node);
        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isExpanded = expandedKeys.has(node.key) || hasSearch;

        if (hasChildren && isExpanded) {
          traverse(node.children!);
        }
      }
    }

    traverse(filteredData);
    return rows;
  }, [filteredData, expandedKeys, debouncedSearch]);

  const displayCols = useMemo(() => {
    return columns.filter(c => c.isMetric);
  }, [columns]);

  // Pre-computed column metadata (avoids 10k+ string checks during rendering)
  const columnMetaMap = useMemo(() => {
    const map = new Map<string, ColumnMeta>();
    for (const col of displayCols) {
      const k = col.key.toLowerCase();
      const isDelta =
        k.includes('delta') ||
        k.includes('variazione') ||
        k.includes('diff') ||
        k.includes('p.p.');
      map.set(col.key, {
        key: col.key,
        title: col.title,
        width: col.width,
        formatter: col.formatter,
        isDelta,
      });
    }
    return map;
  }, [displayCols]);

  // Min/Max bounds calculation for conditional formatting
  const minMaxBounds = useMemo(() => {
    if (minMaxDisplayMode === 'none') return null;
    const metricKeys = displayCols.map(c => c.key);
    return calculateMinMaxBounds(data, metricKeys, minMaxScope);
  }, [data, displayCols, minMaxDisplayMode, minMaxScope]);

  const renderSortIndicator = (columnKey: string) => {
    if (!enableHierarchicalSort) return null;
    const isCurrent =
      sortColumn === columnKey ||
      (isHierarchySortKey(sortColumn, dimensions) && isHierarchySortKey(columnKey, dimensions));
    const isActive = isCurrent && sortDirection !== 'none';
    if (!isActive) {
      return <span className="sort-indicator sort-indicator-inactive" aria-hidden="true" />;
    }
    return (
      <span
        className="sort-indicator sort-indicator-active"
        aria-label={`Sorted ${sortDirection}`}
      >
        {sortDirection === 'asc' ? ' ▲' : ' ▼'}
      </span>
    );
  };

  const handleExportCSV = useCallback(() => {
    const exportCols = displayCols;
    const headerRow = [
      columns[0]?.title || 'Hierarchy',
      ...exportCols.map(c => (c.baseMetric ? `${c.baseMetric} (${c.title || c.key})` : c.title || c.key)),
    ];

    const rows: string[][] = [headerRow];

    const gtRow =
      showGrandTotal && grandTotalNode
        ? [
            grandTotalNode.name,
            ...exportCols.map(c => {
              if (activeDisplayMode === 'leaves_only') return '';
              const val = grandTotalNode.metrics?.[c.key] ?? grandTotalNode.subtotals?.[c.key];
              return val !== null && val !== undefined ? String(val) : '';
            }),
          ]
        : null;

    if (gtRow && grandTotalPosition === 'top') {
      rows.push(gtRow);
    }

    function traverseForExport(nodes: TreeNode[]) {
      for (const node of nodes) {
        const indent = '  '.repeat(node.depth ?? 0);
        const renderValues = shouldRenderMetricValue(node, activeDisplayMode);
        const nodeRow = [
          indent + node.name,
          ...exportCols.map(c => {
            if (!renderValues) return '';
            const val = node.metrics?.[c.key] ?? node.subtotals?.[c.key];
            return val !== null && val !== undefined ? String(val) : '';
          }),
        ];
        rows.push(nodeRow);
        if (node.children && node.children.length > 0) {
          traverseForExport(node.children);
        }
      }
    }

    traverseForExport(filteredData);

    if (gtRow && grandTotalPosition === 'bottom') {
      rows.push(gtRow);
    }

    const csvContent = rows
      .map(row =>
        row
          .map(cell => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(','),
      )
      .join('\r\n');

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'stratum_tree_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  }, [
    displayCols,
    columns,
    showGrandTotal,
    grandTotalNode,
    grandTotalPosition,
    filteredData,
    activeDisplayMode,
    shouldRenderMetricValue,
  ]);

  if (!data || data.length === 0) {
    return (
      <div className="superset-hierarchical-table-container" style={containerStyle}>
        <div className="empty-state">No data available for hierarchical table.</div>
      </div>
    );
  }

  return (
    <div className="superset-hierarchical-table-container" style={containerStyle}>
      {/* Toolbar */}
      <div className="superset-hierarchical-table-toolbar">
        <div className="table-toolbar-left">
          {enableSearch && (
            <div className="table-search-wrapper">
              <input
                type="text"
                placeholder="Search hierarchy..."
                className="table-search-input"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  className="table-search-clear-btn"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Active Cross Filters Multi-Indicator */}
          {selectedFilterMap.size > 0 && (
            <div className="active-cross-filter-container">
              {Array.from(selectedFilterMap.values()).map(filter => (
                <div key={filter.key} className="active-cross-filter-badge">
                  <span className="filter-badge-icon">⚡</span>
                  <span className="filter-badge-text">{filter.value}</span>
                  <button
                    type="button"
                    className="filter-badge-clear"
                    onClick={() => handleRemoveSingleFilter(filter.key)}
                    title={`Remove ${filter.value} filter`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {selectedFilterMap.size > 1 && (
                <button
                  type="button"
                  className="filter-clear-all-btn"
                  onClick={handleClearActiveFilter}
                  title="Clear all filters"
                >
                  Clear All ({selectedFilterMap.size})
                </button>
              )}
            </div>
          )}
        </div>

        <div className="table-toolbar-right">
          <div className="toolbar-display-mode-selector">
            <span className="toolbar-label">Valori:</span>
            <select
              value={activeDisplayMode}
              onChange={e => setActiveDisplayMode(e.target.value as HierarchyValueDisplayMode)}
              className="toolbar-select"
              aria-label="Modalità visualizzazione valori metriche"
            >
              <option value="all">Tutti i livelli</option>
              <option value="leaves_only">Solo foglie</option>
              <option value="parents_only">Solo padri</option>
            </select>
          </div>
          {enableExport && (
            <button
              type="button"
              className="toolbar-btn toolbar-export-btn"
              onClick={handleExportCSV}
              title="Download hierarchy CSV with preserved order and subtotals"
            >
              Export CSV
            </button>
          )}
          <button type="button" className="toolbar-btn" onClick={handleExpandAll}>
            Expand All
          </button>
          <button type="button" className="toolbar-btn" onClick={handleCollapseAll}>
            Collapse All
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-scroll-wrapper">
        <table
          className={classNames('hierarchical-table', {
            'sticky-header': stickyHeader,
            compact: compactMode,
            striped: stripedRows,
            'pivot-matrix-mode': props.isPivotMode,
          })}
        >
          <thead>
            {props.isPivotMode && props.pivotHeaderGroups && props.pivotHeaderGroups.length > 0 ? (
              <>
                {/* Level 1: Main Metric Header Row */}
                <tr className="pivot-group-header-row">
                  <th
                    rowSpan={2}
                    className={classNames('hierarchy-col', {
                      'sortable-header': enableHierarchicalSort,
                    })}
                    onClick={
                      enableHierarchicalSort
                        ? () => handleHeaderSort('__hierarchy_tree__')
                        : undefined
                    }
                    tabIndex={enableHierarchicalSort ? 0 : undefined}
                    onKeyDown={
                      enableHierarchicalSort
                        ? e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleHeaderSort('__hierarchy_tree__');
                            }
                          }
                        : undefined
                    }
                    aria-sort={
                      !enableHierarchicalSort
                        ? undefined
                        : isHierarchySortKey(sortColumn, dimensions) && sortDirection !== 'none'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    style={{
                      width: columns[0]?.width,
                      minWidth: columns[0]?.width,
                      cursor: enableHierarchicalSort ? 'pointer' : undefined,
                    }}
                  >
                    <span>{columns[0]?.title}</span>
                    {renderSortIndicator('__hierarchy_tree__')}
                  </th>
                  {props.pivotHeaderGroups.map(group => {
                    const isSortable = Boolean(enableHierarchicalSort);
                    const isGroupActive = sortColumn === group.key && sortDirection !== 'none';
                    return (
                      <th
                        key={group.key}
                        colSpan={group.colSpan}
                        className={classNames('metric-group-header', {
                          'sortable-header': isSortable,
                        })}
                        onClick={isSortable ? () => handleHeaderSort(group.key) : undefined}
                        tabIndex={isSortable ? 0 : undefined}
                        onKeyDown={
                          isSortable
                            ? e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleHeaderSort(group.key);
                                }
                              }
                            : undefined
                        }
                        aria-sort={
                          !isSortable
                            ? undefined
                            : isGroupActive
                            ? sortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        style={{
                          textAlign: 'center',
                          borderBottom: '1px solid #d1d5db',
                          cursor: isSortable ? 'pointer' : undefined,
                        }}
                      >
                        <span>{group.title}</span>
                        {renderSortIndicator(group.key)}
                      </th>
                    );
                  })}
                </tr>
                {/* Level 2: Sub-column Pivot Dimension Values Row */}
                <tr className="pivot-sub-header-row">
                  {displayCols.map(col => {
                    const isSortable = Boolean(enableHierarchicalSort);
                    const isColActive = sortColumn === col.key && sortDirection !== 'none';
                    return (
                      <th
                        key={col.key}
                        className={classNames('metric-header pivot-sub-header', {
                          'sortable-header': isSortable,
                        })}
                        onClick={
                          isSortable ? () => handleHeaderSort(col.key) : undefined
                        }
                        tabIndex={isSortable ? 0 : undefined}
                        onKeyDown={
                          isSortable
                            ? e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleHeaderSort(col.key);
                                }
                              }
                            : undefined
                        }
                        aria-sort={
                          !isSortable
                            ? undefined
                            : isColActive
                            ? sortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          cursor: isSortable ? 'pointer' : undefined,
                        }}
                      >
                        <span>{col.title}</span>
                        {renderSortIndicator(col.key)}
                      </th>
                    );
                  })}
                </tr>
              </>
            ) : (
              <tr>
                {columns.map(col => {
                  const isSortable = Boolean(enableHierarchicalSort);
                  const sortKey = col.isHierarchyDimension ? '__hierarchy_tree__' : col.key;
                  const isColActive =
                    (sortColumn === sortKey ||
                      (col.isHierarchyDimension && isHierarchySortKey(sortColumn, dimensions))) &&
                    sortDirection !== 'none';
                  return (
                    <th
                      key={col.key}
                      className={classNames({
                        'hierarchy-col': col.isHierarchyDimension,
                        'metric-header': col.isMetric,
                        'sortable-header': isSortable,
                      })}
                      onClick={isSortable ? () => handleHeaderSort(sortKey) : undefined}
                      tabIndex={isSortable ? 0 : undefined}
                      onKeyDown={
                        isSortable
                          ? e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleHeaderSort(sortKey);
                              }
                            }
                          : undefined
                      }
                      aria-sort={
                        !isSortable
                          ? undefined
                          : isColActive
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        cursor: isSortable ? 'pointer' : undefined,
                      }}
                    >
                      <span>{col.title}</span>
                      {renderSortIndicator(sortKey)}
                    </th>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody>
            {/* Grand Total Row at Top if enabled and position is top */}
            {showGrandTotal && grandTotalNode && grandTotalPosition === 'top' && (
              <tr className="grand-total-row">
                <td className="hierarchy-cell">
                  <span className="node-name">{grandTotalNode.name}</span>
                </td>
                {displayCols.map(col => {
                  if (activeDisplayMode === 'leaves_only') {
                    return <td key={col.key} className="metric-cell empty-metric-cell" />;
                  }
                  const val = grandTotalNode.metrics?.[col.key] ?? grandTotalNode.subtotals?.[col.key];
                  const isDelta = columnMetaMap.get(col.key)?.isDelta ?? false;
                  const isNuovo = val === 'Nuovo';

                  return (
                    <td key={col.key} className="metric-cell">
                      {isNuovo ? (
                        <span className="badge-delta-nuovo">Nuovo</span>
                      ) : isDelta && typeof val === 'number' ? (
                        <span
                          className={
                            val > 0
                              ? 'delta-positive'
                              : val < 0
                              ? 'delta-negative'
                              : 'delta-neutral'
                          }
                        >
                          {col?.formatter ? col.formatter(val) : String(val ?? '-')}
                        </span>
                      ) : col?.formatter ? (
                        col.formatter(val)
                      ) : (
                        String(val ?? '-')
                      )}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Tree Rows with React.memo optimization */}
            {visibleRows.map((node: TreeNode) => {
              const isExpanded = expandedKeys.has(node.key) || debouncedSearch.trim().length > 0;
              const isFilterSelected = selectedFilterMap.has(node.key);

              return (
                <HierarchicalTableRow
                  key={node.key}
                  node={node}
                  displayCols={displayCols}
                  columnMetaMap={columnMetaMap}
                  isExpanded={isExpanded}
                  isFilterSelected={isFilterSelected}
                  emitFilter={emitFilter}
                  activeDisplayMode={activeDisplayMode}
                  minMaxDisplayMode={minMaxDisplayMode}
                  minMaxScope={minMaxScope}
                  minMaxBounds={minMaxBounds}
                  onToggleExpand={toggleExpand}
                  onNodeClick={handleNodeClick}
                />
              );
            })}

            {/* Grand Total Row at Bottom if enabled and position is bottom */}
            {showGrandTotal && grandTotalNode && grandTotalPosition === 'bottom' && (
              <tr className="grand-total-row">
                <td className="hierarchy-cell">
                  <span className="node-name">{grandTotalNode.name}</span>
                </td>
                {displayCols.map(col => {
                  if (activeDisplayMode === 'leaves_only') {
                    return <td key={col.key} className="metric-cell empty-metric-cell" />;
                  }
                  const val = grandTotalNode.metrics?.[col.key] ?? grandTotalNode.subtotals?.[col.key];
                  const isDelta = columnMetaMap.get(col.key)?.isDelta ?? false;
                  const isNuovo = val === 'Nuovo';

                  return (
                    <td key={col.key} className="metric-cell">
                      {isNuovo ? (
                        <span className="badge-delta-nuovo">Nuovo</span>
                      ) : isDelta && typeof val === 'number' ? (
                        <span
                          className={
                            val > 0
                              ? 'delta-positive'
                              : val < 0
                              ? 'delta-negative'
                              : 'delta-neutral'
                          }
                        >
                          {col?.formatter ? col.formatter(val) : String(val ?? '-')}
                        </span>
                      ) : col?.formatter ? (
                        col.formatter(val)
                      ) : (
                        String(val ?? '-')
                      )}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
