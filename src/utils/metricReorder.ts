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
