import { MetricGoal, TableColumn } from '../types';
import type { CellConditionalFormat } from '../plugin/columnBuilders';
import { findColumnGoal } from './goalBenchmark';
import { hasDiffToken } from './nameHeuristics';

export interface ColumnMeta {
  key: string;
  title: string;
  width?: number | string;
  formatter?: (val: any) => string;
  isDelta: boolean;
  goal?: MetricGoal;
  conditionalFormat?: CellConditionalFormat;
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
    hasDiffToken(k) ||
    k.includes('p.p.') ||
    k.includes('punti') ||
    t.includes('delta') ||
    t.includes('variazione') ||
    hasDiffToken(t) ||
    t.includes('δ') ||
    (col.title || '').includes('Δ') ||
    t.includes('punti') ||
    t.includes('p.p.')
  );
}

/**
 * Pre-computed column metadata so that rows do not repeat string checks for every cell.
 * `conditionalFormatFor` is buildColumnConditionalFormat bound to the chart rules.
 */
export function buildColumnMetaMap(
  displayCols: TableColumn[],
  goals: MetricGoal[] = [],
  conditionalFormatFor?: (col: TableColumn) => CellConditionalFormat | undefined,
): Map<string, ColumnMeta> {
  const map = new Map<string, ColumnMeta>();
  for (const col of displayCols) {
    const meta: ColumnMeta = {
      key: col.key,
      title: col.title,
      width: col.width,
      formatter: col.formatter,
      isDelta: isDeltaColumn(col),
    };
    const goal = findColumnGoal(col, goals);
    if (goal) meta.goal = goal;
    const conditionalFormat = conditionalFormatFor?.(col);
    if (conditionalFormat) meta.conditionalFormat = conditionalFormat;
    map.set(col.key, meta);
  }
  return map;
}
