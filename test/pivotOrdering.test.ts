import {
  chronologicalOrder,
  collectDistinctPivotKeys,
  collectDistinctValues,
  displayOrder,
  toPivotValue,
} from '../src/plugin/pivotOrdering';

describe('pivotOrdering', () => {
  const records = [
    { mese: '2026-09', canale: 'SSN' },
    { mese: '2026-07', canale: null },
    { mese: '2026-09', canale: 'PRIV' },
    { mese: 202608, canale: undefined },
  ];

  it('maps null/undefined to (Empty) and stringifies other values', () => {
    expect(toPivotValue(null)).toBe('(Empty)');
    expect(toPivotValue(undefined)).toBe('(Empty)');
    expect(toPivotValue(0)).toBe('0');
    expect(toPivotValue('x')).toBe('x');
  });

  it('formats epoch millisecond pivot values like the tree builder does', () => {
    expect(toPivotValue(Date.UTC(2024, 0, 1))).toBe('2024-01-01');
    expect(toPivotValue(202608)).toBe('202608');
    expect(
      collectDistinctPivotKeys([{ d: Date.UTC(2024, 0, 1), c: 'SSN' }], ['d', 'c']),
    ).toEqual(['2024-01-01 - SSN']);
  });

  it('collects distinct values in order of first appearance', () => {
    expect(collectDistinctValues(records, 'mese')).toEqual(['2026-09', '2026-07', '202608']);
    expect(collectDistinctValues(records, 'canale')).toEqual(['SSN', '(Empty)', 'PRIV']);
  });

  it('joins multiple pivot dimensions into composite keys', () => {
    expect(collectDistinctPivotKeys(records, ['mese', 'canale'])).toEqual([
      '2026-09 - SSN',
      '2026-07 - (Empty)',
      '2026-09 - PRIV',
      '202608 - (Empty)',
    ]);
    expect(collectDistinctPivotKeys(records, ['mese'])).toEqual(['2026-09', '2026-07', '202608']);
  });

  it('sorts lexicographically without mutating the input', () => {
    const input = ['2026-09', '2026-07', '2026-08'];
    expect(chronologicalOrder(input)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(input).toEqual(['2026-09', '2026-07', '2026-08']);
  });

  it('orders Italian and English month and weekday names by the calendar', () => {
    expect(chronologicalOrder(['Marzo', 'Gennaio', 'Dicembre', 'Febbraio'])).toEqual([
      'Gennaio',
      'Febbraio',
      'Marzo',
      'Dicembre',
    ]);
    expect(chronologicalOrder(['Venerdì', 'Lunedì', 'Domenica', 'Mercoledì'])).toEqual([
      'Lunedì',
      'Mercoledì',
      'Venerdì',
      'Domenica',
    ]);
    expect(chronologicalOrder(['Sep', 'Jan', 'Mar'])).toEqual(['Jan', 'Mar', 'Sep']);
  });

  it('compares whole numbers numerically and composite keys part by part', () => {
    expect(chronologicalOrder(['10', '9', '100'])).toEqual(['9', '10', '100']);
    expect(chronologicalOrder(['2026 - Marzo', '2026 - Gennaio', '2025 - Dicembre'])).toEqual([
      '2025 - Dicembre',
      '2026 - Gennaio',
      '2026 - Marzo',
    ]);
  });

  it('keeps lexicographic order for mixed labels', () => {
    expect(chronologicalOrder(['Nord', 'Centro', 'Sud'])).toEqual(['Centro', 'Nord', 'Sud']);
  });

  it('display order: desc reverses, asc sorts, anything else keeps appearance order', () => {
    const input = ['2026-09', '2026-07', '2026-08'];
    expect(displayOrder(input, 'desc')).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(displayOrder(input, 'asc')).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(displayOrder(input, 'none')).toEqual(input);
    expect(displayOrder(input, 'none')).not.toBe(input);
  });
});
