import {
  DEFAULT_HIERARCHY_WIDTH,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  applyColumnOrder,
  calculateDynamicColumnWidths,
  clampWidth,
  getColumnBaseWidth,
  isCustomLayout,
  layoutStorageKey,
  moveKey,
  readLayout,
  writeLayout,
} from '../src/utils/columnLayout';

const columns = [
  { key: '__hierarchy_tree__', isMetric: false },
  { key: 'a', isMetric: true },
  { key: 'b', isMetric: true },
  { key: 'c', isMetric: true },
];

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
};

describe('clampWidth', () => {
  it('keeps a width inside the limits and rounds it', () => {
    expect(clampWidth(10)).toBe(MIN_COLUMN_WIDTH);
    expect(clampWidth(5000)).toBe(MAX_COLUMN_WIDTH);
    expect(clampWidth(150.6)).toBe(151);
    expect(clampWidth(NaN)).toBe(120);
  });
});

describe('applyColumnOrder', () => {
  it('leaves the columns alone without an order', () => {
    expect(applyColumnOrder(columns, [])).toBe(columns);
  });

  it('puts the metric columns in the given order and the hierarchy first', () => {
    expect(applyColumnOrder(columns, ['c', 'a', 'b']).map(c => c.key)).toEqual([
      '__hierarchy_tree__',
      'c',
      'a',
      'b',
    ]);
  });

  it('puts columns the order does not know about after the known ones, and drops stale keys', () => {
    expect(applyColumnOrder(columns, ['c', 'gone']).map(c => c.key)).toEqual([
      '__hierarchy_tree__',
      'c',
      'a',
      'b',
    ]);
  });
});

describe('moveKey', () => {
  const keys = ['a', 'b', 'c', 'd'];

  it('moves a key before or after another', () => {
    expect(moveKey(keys, 'd', 'b', 'before')).toEqual(['a', 'd', 'b', 'c']);
    expect(moveKey(keys, 'a', 'c', 'after')).toEqual(['b', 'c', 'a', 'd']);
    expect(moveKey(keys, 'a', 'd', 'after')).toEqual(['b', 'c', 'd', 'a']);
    expect(moveKey(keys, 'd', 'a', 'before')).toEqual(['d', 'a', 'b', 'c']);
  });

  it('changes nothing for the same key or an unknown one', () => {
    expect(moveKey(keys, 'a', 'a', 'after')).toBe(keys);
    expect(moveKey(keys, 'x', 'a', 'after')).toBe(keys);
    expect(moveKey(keys, 'a', 'x', 'after')).toBe(keys);
  });
});

describe('saved layout', () => {
  it('writes and reads it back', () => {
    const storage = fakeStorage();
    const key = layoutStorageKey(582);
    writeLayout(key, { widths: { a: 200 }, order: ['b', 'a'] }, storage);
    expect(readLayout(key, storage)).toEqual({ widths: { a: 200 }, order: ['b', 'a'] });
  });

  it('removes it when nothing is customised any more', () => {
    const storage = fakeStorage();
    const key = layoutStorageKey(1);
    writeLayout(key, { widths: { a: 100 }, order: [] }, storage);
    writeLayout(key, { widths: {}, order: [] }, storage);
    expect(Object.keys(storage.data)).toEqual([]);
    expect(isCustomLayout({ widths: {}, order: [] })).toBe(false);
  });

  it('keeps the layout of each chart apart', () => {
    expect(layoutStorageKey(1)).not.toBe(layoutStorageKey(2));
    expect(layoutStorageKey(undefined)).toBe(layoutStorageKey(null));
  });

  it('reads nothing from garbage and clamps saved widths', () => {
    const key = layoutStorageKey(3);
    expect(readLayout(key, fakeStorage({ [key]: '{not json' }))).toEqual({ widths: {}, order: [] });
    expect(
      readLayout(key, fakeStorage({ [key]: JSON.stringify({ widths: { a: 5, b: 'x', c: 300 }, order: ['a', 3] }) })),
    ).toEqual({ widths: { a: MIN_COLUMN_WIDTH, c: 300 }, order: ['a'] });
  });

  it('works without a storage, or with one that throws', () => {
    const key = layoutStorageKey(4);
    expect(readLayout(key, undefined)).toEqual({ widths: {}, order: [] });
    expect(() => writeLayout(key, { widths: { a: 100 }, order: [] }, undefined)).not.toThrow();
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readLayout(key, broken)).toEqual({ widths: {}, order: [] });
    expect(() => writeLayout(key, { widths: { a: 100 }, order: [] }, broken)).not.toThrow();
  });
});

describe('getColumnBaseWidth', () => {
  it('reads numeric width when valid', () => {
    expect(getColumnBaseWidth({ key: 'x', width: 250 })).toBe(250);
    expect(getColumnBaseWidth({ key: 'x', width: '180px' })).toBe(180);
  });

  it('uses default hierarchy width for dimensions and metric default for metrics', () => {
    expect(getColumnBaseWidth({ key: 'dim', isMetric: false })).toBe(DEFAULT_HIERARCHY_WIDTH);
    expect(getColumnBaseWidth({ key: 'm', isMetric: true })).toBe(120);
  });
});

describe('calculateDynamicColumnWidths', () => {
  const sampleColumns = [
    { key: '__hierarchy_tree__', isMetric: false, width: 280 },
    { key: 'curr', isMetric: true, width: 135 },
    { key: 'comp', isMetric: true, width: 135 },
    { key: 'delta', isMetric: true, width: 105 },
  ];

  it('returns base widths when container width is 0 or less than base sum', () => {
    const resZero = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: {},
      containerWidth: 0,
    });
    expect(resZero.isExpanded).toBe(false);
    expect(resZero.totalWidth).toBe(655);
    expect(resZero.widths).toEqual({
      __hierarchy_tree__: 280,
      curr: 135,
      comp: 135,
      delta: 105,
    });

    const resNarrow = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: {},
      containerWidth: 500,
    });
    expect(resNarrow.isExpanded).toBe(false);
    expect(resNarrow.totalWidth).toBe(655);
    expect(resNarrow.widths).toEqual({
      __hierarchy_tree__: 280,
      curr: 135,
      comp: 135,
      delta: 105,
    });
  });

  it('expands all columns proportionally to 100% of container when space is available', () => {
    const res = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: {},
      containerWidth: 1200,
    });
    expect(res.isExpanded).toBe(true);
    expect(res.totalWidth).toBe(1200);

    const sum = Object.values(res.widths).reduce((a, b) => a + b, 0);
    expect(sum).toBe(1200);
    expect(res.widths.__hierarchy_tree__).toBe(513);
    expect(res.widths.curr).toBe(247);
    expect(res.widths.comp).toBe(247);
    expect(res.widths.delta).toBe(193);
  });

  it('preserves user custom column width and distributes remaining space to uncustomized columns', () => {
    const res = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: { curr: 300 },
      containerWidth: 1200,
    });
    expect(res.isExpanded).toBe(true);
    expect(res.totalWidth).toBe(1200);
    expect(res.widths.curr).toBe(300);

    const sum = Object.values(res.widths).reduce((a, b) => a + b, 0);
    expect(sum).toBe(1200);
    expect(res.widths.__hierarchy_tree__).toBe(485);
    expect(res.widths.comp).toBe(234);
    expect(res.widths.delta).toBe(181);
  });

  it('widens table and enables scrolling when custom column takes more than container space', () => {
    const res = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: { curr: 900 },
      containerWidth: 1200,
    });
    expect(res.totalWidth).toBe(1420);
    expect(res.widths.curr).toBe(900);
    expect(res.widths.__hierarchy_tree__).toBe(280);
    expect(res.widths.comp).toBe(135);
    expect(res.widths.delta).toBe(105);
  });

  it('handles empty column list and single column', () => {
    expect(calculateDynamicColumnWidths({ columns: [], customWidths: {}, containerWidth: 1000 })).toEqual({
      widths: {},
      totalWidth: 0,
      isExpanded: false,
    });

    const single = [{ key: 'only', isMetric: false, width: 200 }];
    const resSingle = calculateDynamicColumnWidths({ columns: single, customWidths: {}, containerWidth: 800 });
    expect(resSingle.totalWidth).toBe(800);
    expect(resSingle.widths.only).toBe(800);
  });

  it('rounds fractional container width to integer and ensures integer column widths', () => {
    const resFloat = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: {},
      containerWidth: 1200.6,
    });
    expect(resFloat.isExpanded).toBe(true);
    expect(resFloat.totalWidth).toBe(1201);
    for (const val of Object.values(resFloat.widths)) {
      expect(Number.isInteger(val)).toBe(true);
    }
    const sum = Object.values(resFloat.widths).reduce((a, b) => a + b, 0);
    expect(sum).toBe(1201);
  });

  it('proportionally expands when every column is customized and their sum is less than container space', () => {
    const res = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: {
        __hierarchy_tree__: 300,
        curr: 150,
        comp: 150,
        delta: 100,
      },
      containerWidth: 1400,
    });
    expect(res.isExpanded).toBe(true);
    expect(res.totalWidth).toBe(1400);
    const sum = Object.values(res.widths).reduce((a, b) => a + b, 0);
    expect(sum).toBe(1400);
    expect(res.widths.__hierarchy_tree__).toBe(600);
    expect(res.widths.curr).toBe(300);
    expect(res.widths.comp).toBe(300);
    expect(res.widths.delta).toBe(200);
  });

  it('preserves exact custom widths without expanding when all columns sum exceeds container space', () => {
    const res = calculateDynamicColumnWidths({
      columns: sampleColumns,
      customWidths: {
        __hierarchy_tree__: 400,
        curr: 300,
        comp: 300,
        delta: 300,
      },
      containerWidth: 1000,
    });
    expect(res.isExpanded).toBe(false);
    expect(res.totalWidth).toBe(1300);
    expect(res.widths).toEqual({
      __hierarchy_tree__: 400,
      curr: 300,
      comp: 300,
      delta: 300,
    });
  });
});
