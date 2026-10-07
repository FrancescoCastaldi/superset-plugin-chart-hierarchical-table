import { TableColumn } from '../types';

export interface ColumnMeta {
  key: string;
  title: string;
  width?: number | string;
  formatter?: (val: any) => string;
  isDelta: boolean;
}

/**
 * Metric columns rendered as cells (the hierarchy column is rendered separately).
 */
export function getDisplayColumns<T extends Pick<TableColumn, 'isMetric'>>(columns: T[]): T[] {
  return columns.filter(c => c.isMetric);
}

/**
 * Delta columns get the green/red/neutral colouring and are detected from key or title.
 */
export function isDeltaColumn(col: Pick<TableColumn, 'key' | 'title'>): boolean {
  const k = col.key.toLowerCase();
  const t = (col.title || '').toLowerCase();
  return (
    k.includes('delta') ||
    k.includes('variazione') ||
    k.includes('diff') ||
    k.includes('p.p.') ||
    t.includes('delta') ||
    t.includes('variazione') ||
    t.includes('diff') ||
    t.includes('δ') ||
    (col.title || '').includes('Δ')
  );
}

/**
 * Pre-computed column metadata so that rows do not repeat string checks for every cell.
 */
export function buildColumnMetaMap(displayCols: TableColumn[]): Map<string, ColumnMeta> {
  const map = new Map<string, ColumnMeta>();
  for (const col of displayCols) {
    map.set(col.key, {
      key: col.key,
      title: col.title,
      width: col.width,
      formatter: col.formatter,
      isDelta: isDeltaColumn(col),
    });
  }
  return map;
}
