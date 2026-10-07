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

  it('display order: desc reverses, asc sorts, anything else keeps appearance order', () => {
    const input = ['2026-09', '2026-07', '2026-08'];
    expect(displayOrder(input, 'desc')).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(displayOrder(input, 'asc')).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(displayOrder(input, 'none')).toEqual(input);
    expect(displayOrder(input, 'none')).not.toBe(input);
  });
});
