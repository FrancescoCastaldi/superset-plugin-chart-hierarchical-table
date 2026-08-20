import React, { useState, useMemo, useCallback } from 'react';
import classNames from 'classnames';
import { HierarchicalTableTransformedProps, TreeNode } from '../types';
import { filterTreeBySearch } from '../utils/treeBuilder';
import './HierarchicalTable.css';

export default function HierarchicalTable(props: HierarchicalTableTransformedProps) {
  const {
    data = [],
    columns = [],
    metrics = [],
    dimensions = [],
    initialExpandDepth = 1,
    showGrandTotal = true,
    grandTotalNode,
    stickyHeader = true,
    stickyFirstColumn = true,
    enableSearch = true,
    indentSize = 20,
    compactMode = false,
    stripedRows = true,
    emitFilter = true,
    filterState,
    onCrossFilter,
    onClearFilter,
  } = props;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const [activeFilterLabel, setActiveFilterLabel] = useState<string | null>(null);

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

  // Filtered data tree based on search
  const filteredData = useMemo(() => {
    return filterTreeBySearch(data, searchTerm);
  }, [data, searchTerm]);

  // Handle Node Click for Cross-Filtering
  const handleNodeClick = useCallback(
    (node: TreeNode) => {
      if (!emitFilter || !onCrossFilter) return;

      const isCurrentlySelected = activeFilterKey === node.key;

      if (isCurrentlySelected) {
        setActiveFilterKey(null);
        setActiveFilterLabel(null);
        if (onClearFilter) {
          onClearFilter();
        } else {
          onCrossFilter(node.dimension || 'Dimension', node.name, undefined, true);
        }
      } else {
        setActiveFilterKey(node.key);
        const dimensionName = node.dimension || dimensions[node.depth] || 'Dimension';
        setActiveFilterLabel(`${dimensionName}: ${node.name}`);

        // Construct path dictionary for multi-dimension hierarchy
        const pathMap: Record<string, string> = {};
        if (dimensions.length > 0 && node.path && node.path.length > 0) {
          for (let i = 0; i <= node.depth && i < dimensions.length; i++) {
            pathMap[dimensions[i]] = node.path[i];
          }
        }

        onCrossFilter(dimensionName, node.name, pathMap, false);
      }
    },
    [activeFilterKey, dimensions, emitFilter, onCrossFilter, onClearFilter],
  );

  const handleClearActiveFilter = useCallback(() => {
    setActiveFilterKey(null);
    setActiveFilterLabel(null);
    if (onClearFilter) {
      onClearFilter();
    }
  }, [onClearFilter]);

  // Flatten visible tree nodes according to expanded state
  const visibleRows = useMemo(() => {
    const rows: TreeNode[] = [];

    function traverse(nodes: TreeNode[]) {
      for (const node of nodes) {
        rows.push(node);
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedKeys.has(node.key) || searchTerm.trim().length > 0;

        if (hasChildren && isExpanded) {
          traverse(node.children!);
        }
      }
    }

    traverse(filteredData);
    return rows;
  }, [filteredData, expandedKeys, searchTerm]);

  if (!data || data.length === 0) {
    return (
      <div className="superset-hierarchical-table-container">
        <div className="empty-state">No data available for hierarchical table.</div>
      </div>
    );
  }

  return (
    <div className="superset-hierarchical-table-container">
      {/* Toolbar */}
      <div className="superset-hierarchical-table-toolbar">
        <div className="table-toolbar-left">
          {enableSearch && (
            <input
              type="text"
              placeholder="Search hierarchy..."
              className="table-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          )}

          {/* Active Cross Filter Indicator */}
          {activeFilterLabel && (
            <div className="active-cross-filter-badge">
              <span className="filter-badge-icon">⚡</span>
              <span className="filter-badge-text">Filter: {activeFilterLabel}</span>
              <button
                type="button"
                className="filter-badge-clear"
                onClick={handleClearActiveFilter}
                title="Clear cross filter"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="table-toolbar-right">
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
            'sticky-first-col': stickyFirstColumn,
            compact: compactMode,
            striped: stripedRows,
          })}
        >
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={classNames({
                    'hierarchy-col': col.isHierarchyDimension,
                    'metric-header': col.isMetric,
                  })}
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Grand Total Row at Top if enabled */}
            {showGrandTotal && grandTotalNode && (
              <tr className="grand-total-row">
                <td className="hierarchy-cell">
                  <span className="node-name">{grandTotalNode.name}</span>
                </td>
                {metrics.map(m => {
                  const col = columns.find(c => c.key === m);
                  const val = grandTotalNode.metrics[m];
                  return (
                    <td key={m} className="metric-cell">
                      {col?.formatter ? col.formatter(val) : String(val ?? '-')}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Tree Rows */}
            {visibleRows.map(node => {
              const hasChildren = node.children && node.children.length > 0;
              const isExpanded = expandedKeys.has(node.key) || searchTerm.trim().length > 0;
              const isFilterSelected = activeFilterKey === node.key;
              const paddingLeft = node.depth * indentSize + 8;

              return (
                <tr
                  key={node.key}
                  className={classNames({
                    'parent-row': hasChildren,
                    'selected-filter-row': isFilterSelected,
                  })}
                >
                  {/* Hierarchy Column */}
                  <td className="hierarchy-cell">
                    <div className="tree-cell-content" style={{ paddingLeft: `${paddingLeft}px` }}>
                      {hasChildren ? (
                        <button
                          type="button"
                          className="tree-toggle-btn"
                          onClick={() => toggleExpand(node.key)}
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
                        onClick={() => handleNodeClick(node)}
                        title={`Click to ${isFilterSelected ? 'clear filter' : 'filter entire dashboard by ' + node.name} (${node.path.join(' > ')})`}
                      >
                        {node.name}
                      </span>
                    </div>
                  </td>

                  {/* Metric Columns */}
                  {metrics.map(m => {
                    const col = columns.find(c => c.key === m);
                    const val = node.metrics[m];
                    return (
                      <td key={m} className="metric-cell">
                        {col?.formatter ? col.formatter(val) : String(val ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
