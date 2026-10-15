import {
  BinaryQueryObjectFilterClause,
  ContextMenuFilters,
} from '@superset-ui/core';
import { HierarchyType, TableColumn, TreeNode } from '../types';

export interface ContextMenuTarget {
  node: TreeNode | null;
  column?: TableColumn;
}

export interface ContextMenuFilterOptions {
  dimensions?: string[];
  groupby?: string[];
  hierarchyType?: HierarchyType;
  idColumn?: string;
  pivotDimensions?: string[];
  columns?: string[];
  groupbyFieldName?: string;
  adhocFilterFieldName?: string;
}

function isRowTotalOrSubtotal(column?: TableColumn): boolean {
  if (!column) return false;
  const key = column.dataIndex || column.key || '';
  return key.includes('ROW_TOTAL') || key.includes('SUBTOTAL');
}

/**
 * Builds Superset context menu filter clauses (drillToDetail, drillBy) from the right-clicked target.
 * Supports multi-dimension and parent-child hierarchies, single/double pivot dimensions,
 * raw database values (rawPath), small-number suppression, and Grand Total rows.
 */
export function buildContextMenuFilters(
  target: ContextMenuTarget,
  options: ContextMenuFilterOptions = {},
): ContextMenuFilters {
  const { node, column } = target;

  // Cella soppressa (privacy small numbers, node.suppressed?.[col.dataIndex]): ometti drillToDetail e drillBy
  const colKey = column?.dataIndex || column?.key;
  if (node && colKey && node.suppressed?.[colKey]) {
    return {};
  }

  const filters: BinaryQueryObjectFilterClause[] = [];

  // 1. Hierarchy dimension filters (only when node !== null)
  if (node !== null) {
    if (options.hierarchyType === 'parent_child') {
      const idCol = options.idColumn || 'id';
      const rawVal = node.rawData?.[idCol] ?? node.id;
      if (rawVal !== null && rawVal !== undefined) {
        filters.push({
          col: idCol,
          op: '==',
          val: rawVal as string | number | boolean,
          formattedVal: String(node.name ?? rawVal),
        });
      }
    } else {
      const dimensions = options.dimensions || options.groupby || [];
      const path = node.path || [];
      const rawPath = node.rawPath;
      for (let i = 0; i < path.length; i++) {
        const col = dimensions[i];
        if (!col) continue;
        // Skip synthetic "Others" leaf label since it is not an actual database value
        if (node.isOthers && i === path.length - 1) continue;
        const val = rawPath && i in rawPath ? rawPath[i] : path[i];
        // Livelli con valore null o (Empty) esclusi
        if (val === null || val === undefined || val === '(Empty)') continue;
        filters.push({
          col,
          op: '==',
          val: val as string | number | boolean,
          formattedVal: String(path[i] ?? val),
        });
      }
    }
  }

  // 2. Pivot dimension filters
  // Cella pivot: aggiungi filtro sulla dimensione pivot (pivot doppio: pivotValue composto, due filtri);
  // nessun filtro pivot su colonne ROW_TOTAL/SUBTOTAL.
  const pivotDims = options.pivotDimensions || options.columns || [];
  if (!isRowTotalOrSubtotal(column) && pivotDims.length > 0 && column?.pivotValue) {
    const rawPivotVal = String(column.pivotValue);
    if (pivotDims.length >= 2 && rawPivotVal.includes(' - ')) {
      const parts = rawPivotVal.split(' - ');
      parts.forEach((p, idx) => {
        const dim = pivotDims[idx];
        if (dim) {
          const val = p.trim();
          filters.push({
            col: dim,
            op: '==',
            val,
            formattedVal: val,
          });
        }
      });
    } else if (pivotDims.length === 1) {
      filters.push({
        col: pivotDims[0],
        op: '==',
        val: rawPivotVal,
        formattedVal: rawPivotVal,
      });
    }
  }

  const groupbyFieldName = options.groupbyFieldName || 'groupby';

  return {
    drillToDetail: filters,
    drillBy: {
      filters,
      groupbyFieldName,
      ...(options.adhocFilterFieldName ? { adhocFilterFieldName: options.adhocFilterFieldName } : {}),
    },
  };
}
