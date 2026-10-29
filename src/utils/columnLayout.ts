export const MIN_COLUMN_WIDTH = 56;
export const MAX_COLUMN_WIDTH = 900;
export const DEFAULT_METRIC_WIDTH = 120;

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
