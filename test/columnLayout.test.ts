import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  applyColumnOrder,
  clampWidth,
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
