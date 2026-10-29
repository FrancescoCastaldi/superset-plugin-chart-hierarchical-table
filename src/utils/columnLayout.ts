export const MIN_COLUMN_WIDTH = 56;
export const MAX_COLUMN_WIDTH = 900;
export const DEFAULT_METRIC_WIDTH = 120;
export const DEFAULT_HIERARCHY_WIDTH = 280;

/** What the viewer changed of the table layout: column widths and the order of the metric columns. */
export interface ColumnLayoutState {
  widths: Record<string, number>;
  order: string[];
}

export const EMPTY_LAYOUT: ColumnLayoutState = { widths: {}, order: [] };

export function clampWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_METRIC_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}

export interface DynamicColumnWidthsOptions {
  columns: Array<{ key: string; isMetric?: boolean; width?: number | string }>;
  customWidths: Record<string, number>;
  containerWidth: number;
  defaultMetricWidth?: number;
}

export interface DynamicColumnWidthsResult {
  widths: Record<string, number>;
  totalWidth: number;
  isExpanded: boolean;
}

export function getColumnBaseWidth(
  column: { key: string; isMetric?: boolean; width?: number | string },
  defaultMetricWidth = DEFAULT_METRIC_WIDTH,
): number {
  if (typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0) {
    return Math.round(column.width);
  }
  if (typeof column.width === 'string') {
    const parsed = parseFloat(column.width);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return column.isMetric ? defaultMetricWidth : DEFAULT_HIERARCHY_WIDTH;
}

/**
 * Calculates dynamic column widths so that when container space is available,
 * columns expand proportionally to fill 100% of the container width without leaving
 * blank space. If columns exceed container width, base or user widths are preserved
 * to allow smooth horizontal scrolling.
 */
export function calculateDynamicColumnWidths({
  columns,
  customWidths,
  containerWidth,
  defaultMetricWidth = DEFAULT_METRIC_WIDTH,
}: DynamicColumnWidthsOptions): DynamicColumnWidthsResult {
  if (!columns || columns.length === 0) {
    return { widths: {}, totalWidth: 0, isExpanded: false };
  }

  const targetWidth =
    typeof containerWidth === 'number' && Number.isFinite(containerWidth) && containerWidth > 0
      ? Math.round(containerWidth)
      : 0;

  const colDetails = columns.map(col => {
    const hasCustom = customWidths[col.key] !== undefined;
    const baseWidth = hasCustom
      ? clampWidth(customWidths[col.key])
      : getColumnBaseWidth(col, defaultMetricWidth);
    return {
      key: col.key,
      isCustom: hasCustom,
      baseWidth,
    };
  });

  const totalBaseWidth = colDetails.reduce((sum, c) => sum + c.baseWidth, 0);

  // If container width is not measured or columns naturally need more space than available,
  // keep base widths to prevent squishing and let container scroll horizontally.
  if (targetWidth <= totalBaseWidth || targetWidth <= 0) {
    const widths: Record<string, number> = {};
    for (const c of colDetails) {
      widths[c.key] = c.baseWidth;
    }
    return { widths, totalWidth: totalBaseWidth, isExpanded: false };
  }

  // Container is wider than total base widths: expand columns to fill 100% of available space
  const customCols = colDetails.filter(c => c.isCustom);
  const nonCustomCols = colDetails.filter(c => !c.isCustom);
  const widths: Record<string, number> = {};

  if (nonCustomCols.length === 0) {
    // Every column was customized by user: scale proportionally to fill 100%
    const scale = targetWidth / totalBaseWidth;
    let accumulated = 0;
    colDetails.forEach((c, idx) => {
      if (idx === colDetails.length - 1) {
        widths[c.key] = targetWidth - accumulated;
      } else {
        const w = Math.round(c.baseWidth * scale);
        widths[c.key] = w;
        accumulated += w;
      }
    });
    return { widths, totalWidth: targetWidth, isExpanded: true };
  }

  // Custom columns retain user-specified sizes
  let customSum = 0;
  for (const c of customCols) {
    widths[c.key] = c.baseWidth;
    customSum += c.baseWidth;
  }

  const remainingAvailable = targetWidth - customSum;
  const nonCustomBaseSum = nonCustomCols.reduce((sum, c) => sum + c.baseWidth, 0);

  if (remainingAvailable > nonCustomBaseSum) {
    // Non-custom columns scale proportionally to take all remaining space
    const scale = remainingAvailable / nonCustomBaseSum;
    let accumulated = 0;
    nonCustomCols.forEach((c, idx) => {
      if (idx === nonCustomCols.length - 1) {
        widths[c.key] = remainingAvailable - accumulated;
      } else {
        const w = Math.round(c.baseWidth * scale);
        widths[c.key] = w;
        accumulated += w;
      }
    });
    return { widths, totalWidth: targetWidth, isExpanded: true };
  }

  // User made custom columns wider than available space: uncustomized keep base width
  for (const c of nonCustomCols) {
    widths[c.key] = c.baseWidth;
  }
  const finalTotal = customSum + nonCustomBaseSum;
  return { widths, totalWidth: finalTotal, isExpanded: false };
}

/**
 * The columns with the metric ones in the viewer's order. Columns that are not metrics (the
 * hierarchy) keep their place at the front; metric columns the order does not know about (a new
 * filter brought them in) follow, in their original order.
 */
export function applyColumnOrder<T extends { key: string; isMetric?: boolean }>(
  columns: T[],
  order: string[],
): T[] {
  if (order.length === 0) return columns;
  const fixed = columns.filter(column => !column.isMetric);
  const metrics = columns.filter(column => column.isMetric);
  const rank = new Map(order.map((key, index) => [key, index]));
  const known = metrics
    .filter(column => rank.has(column.key))
    .sort((a, b) => (rank.get(a.key) as number) - (rank.get(b.key) as number));
  const unknown = metrics.filter(column => !rank.has(column.key));
  return [...fixed, ...known, ...unknown];
}

/** The keys with `source` taken out and put before or after `target`. */
export function moveKey(
  keys: string[],
  source: string,
  target: string,
  position: 'before' | 'after',
): string[] {
  if (source === target || !keys.includes(source) || !keys.includes(target)) return keys;
  const without = keys.filter(key => key !== source);
  const at = without.indexOf(target) + (position === 'after' ? 1 : 0);
  return [...without.slice(0, at), source, ...without.slice(at)];
}

export function isCustomLayout(state: ColumnLayoutState): boolean {
  return state.order.length > 0 || Object.keys(state.widths).length > 0;
}

export function layoutStorageKey(chartId: string | number | undefined | null): string {
  return `stratumTree:layout:${chartId ?? 'chart'}`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    // Storage can be blocked (private window, site data off): the table works without it.
    return undefined;
  }
}

/** The saved layout, or an empty one when there is none or it cannot be read. */
export function readLayout(key: string, storage: StorageLike | undefined = browserStorage()): ColumnLayoutState {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return EMPTY_LAYOUT;
    const parsed = JSON.parse(raw);
    const widths: Record<string, number> = {};
    if (parsed?.widths && typeof parsed.widths === 'object') {
      for (const [column, value] of Object.entries(parsed.widths)) {
        if (typeof value === 'number' && Number.isFinite(value)) widths[column] = clampWidth(value);
      }
    }
    const order = Array.isArray(parsed?.order)
      ? parsed.order.filter((item: unknown): item is string => typeof item === 'string')
      : [];
    return { widths, order };
  } catch {
    return EMPTY_LAYOUT;
  }
}

export function writeLayout(
  key: string,
  state: ColumnLayoutState,
  storage: StorageLike | undefined = browserStorage(),
): void {
  try {
    if (!storage) return;
    if (isCustomLayout(state)) storage.setItem(key, JSON.stringify(state));
    else storage.removeItem(key);
  } catch {
    // Nothing to do: the layout then lasts until the page is reloaded.
  }
}
