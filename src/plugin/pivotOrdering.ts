import { DataRecord } from '@superset-ui/core';

export const EMPTY_PIVOT_VALUE = '(Empty)';

export function toPivotValue(raw: unknown): string {
  return raw !== null && raw !== undefined ? String(raw) : EMPTY_PIVOT_VALUE;
}

/**
 * Distinct values of a single dimension, in order of first appearance.
 */
export function collectDistinctValues(records: DataRecord[], dimension: string): string[] {
  const values = new Set<string>();
  for (const record of records) {
    values.add(toPivotValue(record[dimension]));
  }
  return Array.from(values);
}

/**
 * Distinct composite pivot keys (values joined with ' - '), in order of first appearance.
 * The same key format is used by the tree builder for `${metric}___${pivotKey}` cells.
 */
export function collectDistinctPivotKeys(records: DataRecord[], pivotDimensions: string[]): string[] {
  const keys = new Set<string>();
  for (const record of records) {
    const parts: string[] = [];
    for (const pDim of pivotDimensions) {
      parts.push(toPivotValue(record[pDim]));
    }
    keys.add(parts.join(' - '));
  }
  return Array.from(keys);
}

/**
 * Lexicographic order used as the period sequence for time deltas and row totals.
 */
export function chronologicalOrder(values: string[]): string[] {
  return [...values].sort();
}

/**
 * Display order of pivot columns: 'desc' and 'asc' follow the chronological order,
 * any other value keeps the order of first appearance.
 */
export function displayOrder(values: string[], sortOrder: string): string[] {
  const chronological = chronologicalOrder(values);
  if (sortOrder === 'desc') {
    return chronological.reverse();
  }
  if (sortOrder === 'asc') {
    return chronological;
  }
  return [...values];
}
