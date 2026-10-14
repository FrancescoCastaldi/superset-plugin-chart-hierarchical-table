import { DataRecord } from '@superset-ui/core';
import { EMPTY_DIMENSION_VALUE, toDimensionValue } from '../utils/dimensionValue';

export const EMPTY_PIVOT_VALUE = EMPTY_DIMENSION_VALUE;

export const toPivotValue = toDimensionValue;

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

const CALENDAR_SEQUENCES: string[][] = [
  ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
  ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
  ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'],
  ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'],
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
];

const normalizeLabel = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ.]/g, '');

/** Sequence (month or weekday names) that contains every part, if one does. */
function findCalendarSequence(parts: string[]): string[] | undefined {
  const normalized = parts.map(normalizeLabel);
  return CALENDAR_SEQUENCES.find(seq => normalized.every(p => seq.includes(p)));
}

/**
 * Period sequence used for time deltas and row totals. Month and weekday names (Italian or English)
 * follow the calendar and whole numbers compare numerically; everything else (ISO dates, quarters,
 * free labels) keeps the lexicographic order. Composite keys ('a - b') compare part by part.
 */
export function chronologicalOrder(values: string[]): string[] {
  const split = values.map(v => v.split(' - '));
  const width = Math.max(0, ...split.map(parts => parts.length));
  const comparators: Array<(a: string, b: string) => number> = [];
  for (let i = 0; i < width; i++) {
    const column = split.map(parts => parts[i]).filter((p): p is string => p !== undefined);
    const sequence = findCalendarSequence(column);
    if (sequence) {
      comparators.push((a, b) => sequence.indexOf(normalizeLabel(a)) - sequence.indexOf(normalizeLabel(b)));
    } else if (column.every(p => /^\d+$/.test(p))) {
      comparators.push((a, b) => Number(a) - Number(b));
    } else {
      comparators.push((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }
  }
  return [...values].sort((a, b) => {
    const pa = a.split(' - ');
    const pb = b.split(' - ');
    for (let i = 0; i < width; i++) {
      if (pa[i] === undefined || pb[i] === undefined) return pa.length - pb.length;
      const diff = comparators[i](pa[i], pb[i]);
      if (diff !== 0) return diff;
    }
    return 0;
  });
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
