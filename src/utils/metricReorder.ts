import { TableColumn } from '../types';

/**
 * Utility functions for pure deterministic array and metric reordering.
 */

/**
 * Pure helper to move an item within an array from startIndex to endIndex.
 * Returns a new array instance without modifying the original.
 */
export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  if (!Array.isArray(list) || list.length <= 1) {
    return Array.isArray(list) ? [...list] : [];
  }
  if (
    startIndex < 0 ||
    startIndex >= list.length ||
    endIndex < 0 ||
    endIndex >= list.length ||
    startIndex === endIndex
  ) {
    return [...list];
  }
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/**
 * Moves a metric identified by sourceKey to the position of targetKey.
 * Returns a new array without mutating the input.
 */
export function reorderMetricsByKey(
  metrics: string[],
  sourceKey: string,
  targetKey: string,
): string[] {
  if (!Array.isArray(metrics) || !sourceKey || !targetKey || sourceKey === targetKey) {
    return Array.isArray(metrics) ? [...metrics] : [];
  }
  const startIndex = metrics.indexOf(sourceKey);
  const endIndex = metrics.indexOf(targetKey);
  if (startIndex === -1 || endIndex === -1) {
    return [...metrics];
  }
  return reorderArray(metrics, startIndex, endIndex);
}

/**
 * Moves a metric relative to targetKey either before or after it.
 * Returns a new array without mutating the input.
 */
export function reorderMetricsWithPosition(
  metrics: string[],
  sourceKey: string,
  targetKey: string,
  position: 'before' | 'after' = 'before',
): string[] {
  if (!Array.isArray(metrics) || !sourceKey || !targetKey || sourceKey === targetKey) {
    return Array.isArray(metrics) ? [...metrics] : [];
  }
  const fromIndex = metrics.indexOf(sourceKey);
  const targetIndex = metrics.indexOf(targetKey);
  if (fromIndex === -1 || targetIndex === -1) {
    return [...metrics];
  }
  const result = [...metrics];
  const [removed] = result.splice(fromIndex, 1);
  let insertIndex = result.indexOf(targetKey);
  if (position === 'after') {
    insertIndex += 1;
  }
  result.splice(insertIndex, 0, removed);
  return result;
}

/**
 * Resolves the root metric name from a table column definition.
 * Works across flat columns, composite pivot columns and row totals.
 */
export function getMetricKeyFromColumn(col: TableColumn, metrics: string[]): string | null {
  if (!col || !col.isMetric || !Array.isArray(metrics) || metrics.length === 0) {
    return null;
  }
  if (col.baseMetric && metrics.includes(col.baseMetric)) {
    return col.baseMetric;
  }
  if (metrics.includes(col.key)) {
    return col.key;
  }
  const prefix = col.key.split('___')[0];
  if (metrics.includes(prefix)) {
    return prefix;
  }
  if (col.baseMetric) {
    const found = metrics.find(
      m => col.baseMetric === m || col.baseMetric?.startsWith(m) || col.baseMetric?.endsWith(m),
    );
    if (found) return found;
  }
  return null;
}
