import { HierarchyValueDisplayMode, TableColumn, TreeNode } from '../types';

export const CSV_EXPORT_FILENAME = 'stratum_tree_export.csv';

export function shouldRenderMetricValue(node: TreeNode, mode: HierarchyValueDisplayMode): boolean {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  if (mode === 'leaves_only') return !hasChildren;
  if (mode === 'parents_only') return hasChildren;
  return true;
}

export interface CsvExportParams {
  columns: TableColumn[];
  displayCols: TableColumn[];
  nodes: TreeNode[];
  displayMode: HierarchyValueDisplayMode;
  showGrandTotal: boolean;
  grandTotalNode?: TreeNode;
  grandTotalPosition: 'top' | 'bottom';
}

function cellValue(node: TreeNode, key: string): string {
  const val = node.metrics?.[key] ?? node.subtotals?.[key];
  return val !== null && val !== undefined ? String(val) : '';
}

/**
 * Rows of the CSV export: header, optional grand total, then the full tree in pre-order
 * (collapsed nodes included) with the hierarchy indented by two spaces per level.
 * Raw metric values are exported, not the formatted strings.
 */
export function buildCsvRows({
  columns,
  displayCols,
  nodes,
  displayMode,
  showGrandTotal,
  grandTotalNode,
  grandTotalPosition,
}: CsvExportParams): string[][] {
  const headerRow = [
    columns[0]?.title || 'Hierarchy',
    ...displayCols.map(c => (c.baseMetric ? `${c.baseMetric} (${c.title || c.key})` : c.title || c.key)),
  ];

  const rows: string[][] = [headerRow];

  const gtRow =
    showGrandTotal && grandTotalNode
      ? [
          grandTotalNode.name,
          ...displayCols.map(c => (displayMode === 'leaves_only' ? '' : cellValue(grandTotalNode, c.key))),
        ]
      : null;

  if (gtRow && grandTotalPosition === 'top') {
    rows.push(gtRow);
  }

  function traverseForExport(nodeList: TreeNode[]) {
    for (const node of nodeList) {
      const indent = '  '.repeat(node.depth ?? 0);
      const renderValues = shouldRenderMetricValue(node, displayMode);
      rows.push([
        indent + node.name,
        ...displayCols.map(c => (renderValues ? cellValue(node, c.key) : '')),
      ]);
      if (node.children && node.children.length > 0) {
        traverseForExport(node.children);
      }
    }
  }

  traverseForExport(nodes);

  if (gtRow && grandTotalPosition === 'bottom') {
    rows.push(gtRow);
  }

  return rows;
}

export function escapeCsvCell(cell: unknown): string {
  const str = String(cell ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeCsv(rows: unknown[][]): string {
  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/**
 * Triggers a browser download; the BOM makes Excel open the file as UTF-8.
 * No-op outside a browser environment.
 */
export function downloadCsv(csvContent: string, filename: string = CSV_EXPORT_FILENAME): void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}
