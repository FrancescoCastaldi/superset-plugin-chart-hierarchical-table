import { MetricDefinition, TreeNode } from '../src/types';
import {
  applyMetricDefinitions,
  findMetricDefinition,
  formatByDefinition,
  normalizeMetricDefinitions,
} from '../src/utils/metricSemantics';

const node = (
  key: string,
  depth: number,
  metrics: Record<string, number | null>,
  children?: TreeNode[],
): TreeNode => ({
  key,
  id: key,
  name: key,
  depth,
  path: [key],
  isLeaf: !children,
  metrics: { ...metrics },
  subtotals: { ...metrics },
  children,
});

describe('normalizeMetricDefinitions', () => {
  it('accepts JSON text or an array and drops malformed entries', () => {
    const raw = JSON.stringify([
      { metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot', scale: 100, format: 'percent', decimals: 1 },
      { metric: 'bad', type: 'unknown' },
      { metric: 'noOperands', type: 'ratio' },
      { metric: 'pct', type: 'sum' },
      { type: 'sum' },
      'x',
    ]);
    const defs = normalizeMetricDefinitions(raw);
    expect(defs).toEqual([
      { metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot', scale: 100, format: 'percent', decimals: 1 },
    ]);
    expect(normalizeMetricDefinitions(defs)).toEqual(defs);
    expect(normalizeMetricDefinitions('not json')).toEqual([]);
    expect(normalizeMetricDefinitions('')).toEqual([]);
    expect(normalizeMetricDefinitions(undefined)).toEqual([]);
  });

  it('keeps the confidence settings only for ratios and defaults the level and reference', () => {
    const [ratio, sum] = normalizeMetricDefinitions([
      { metric: 'r', type: 'ratio', numerator: 'a', denominator: 'b', ci: 'wilson' },
      { metric: 's', type: 'sum', ci: 'wilson' },
    ]);
    expect(ratio).toMatchObject({ ci: 'wilson', ciLevel: 0.95, compareTo: 'parent', scale: 1 });
    expect(sum.ci).toBeUndefined();
    const [custom] = normalizeMetricDefinitions([
      { metric: 'r', type: 'ratio', numerator: 'a', denominator: 'b', ci: 'poisson', ciLevel: 0.998, compareTo: 'total' },
    ]);
    expect(custom).toMatchObject({ ci: 'poisson', ciLevel: 0.998, compareTo: 'total' });
  });

  it('ignores invalid format, polarity and decimals', () => {
    const [def] = normalizeMetricDefinitions([
      { metric: 'm', type: 'sum', format: 'hex', polarity: 'sideways', decimals: 99 },
    ]);
    expect(def).toEqual({ metric: 'm', type: 'sum' });
  });
});

describe('findMetricDefinition', () => {
  const defs = normalizeMetricDefinitions([
    { metric: 'attesa', type: 'mean', polarity: 'lower_is_better' },
  ]);

  it('matches plain keys, pivot cells and the delta columns of the metric', () => {
    expect(findMetricDefinition('attesa', defs)?.metric).toBe('attesa');
    expect(findMetricDefinition('attesa___2024___SSN', defs)?.metric).toBe('attesa');
    expect(findMetricDefinition('delta_attesa_pct', defs)?.metric).toBe('attesa');
    expect(findMetricDefinition('altro', defs)).toBeUndefined();
    expect(findMetricDefinition('attesa', [])).toBeUndefined();
  });
});

describe('formatByDefinition', () => {
  const def = (extra: Partial<MetricDefinition>): MetricDefinition => ({ metric: 'm', type: 'sum', ...extra });

  it('returns null without an explicit format', () => {
    expect(formatByDefinition(5, def({}))).toBeNull();
  });

  it('formats every supported format in Italian notation', () => {
    expect(formatByDefinition(12345.6, def({ format: 'integer' }))).toBe('12.346');
    expect(formatByDefinition(12.345, def({ format: 'decimal', decimals: 2 }))).toBe('12,35');
    expect(formatByDefinition(87.26, def({ format: 'percent' }))).toBe('87,3%');
    expect(formatByDefinition(8, def({ format: 'days' }))).toBe('8,0 gg');
    expect(formatByDefinition(125, def({ format: 'duration' }))).toBe('02:05');
    expect(formatByDefinition(3725, def({ format: 'duration' }))).toBe('1:02:05');
    expect(formatByDefinition(15000, def({ format: 'currency' }), '€')).toBe('€ 15.000,00');
  });

  it('keeps empty and text values readable', () => {
    expect(formatByDefinition(null, def({ format: 'percent' }))).toBe('-');
    expect(formatByDefinition(Number.NaN, def({ format: 'percent' }))).toBe('-');
    expect(formatByDefinition('Nuovo', def({ format: 'percent' }))).toBe('Nuovo');
  });
});

describe('applyMetricDefinitions', () => {
  const build = () => {
    const leafA = node('A', 2, { ok: 90, tot: 100, pct: 90 });
    const leafB = node('B', 2, { ok: 10, tot: 100, pct: 10 });
    const leafC = node('C', 2, { ok: 50, tot: 50, pct: 100 });
    const sede1 = node('S1', 1, {}, [leafA, leafB]);
    const sede2 = node('S2', 1, {}, [leafC]);
    const root = node('R', 0, {}, [sede1, sede2]);
    const total = node('__grand_total__', 0, { ok: 150, tot: 250, pct: 60 });
    return { tree: [root], total, leafA, sede1, root };
  };

  it('computes a ratio of totals on parents, the grand total and leaves, never an average of ratios', () => {
    const { tree, total, sede1, root } = build();
    const defs = normalizeMetricDefinitions([
      { metric: 'ok', type: 'sum' },
      { metric: 'tot', type: 'sum' },
      { metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot', scale: 100 },
    ]);
    applyMetricDefinitions(tree, total, defs, ['reparto', 'sede', 'servizio']);
    expect(sede1.metrics.ok).toBe(100);
    expect(sede1.metrics.tot).toBe(200);
    expect(sede1.metrics.pct).toBe(50);
    expect(sede1.subtotals?.pct).toBe(50);
    expect(root.metrics.pct).toBe(60);
    expect(total.metrics.pct).toBe(60);
  });

  it('leaves the ratio untouched when an operand is missing and nulls a zero denominator', () => {
    const leaf = node('L', 0, { pct: 12, ok: 3, tot: 0 });
    applyMetricDefinitions(
      [leaf],
      undefined,
      normalizeMetricDefinitions([{ metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot' }]),
    );
    expect(leaf.metrics.pct).toBeNull();
    const lonely = node('M', 0, { pct: 12 });
    applyMetricDefinitions(
      [lonely],
      undefined,
      normalizeMetricDefinitions([{ metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot' }]),
    );
    expect(lonely.metrics.pct).toBe(12);
  });

  it('applies the suffix of pivot keys to the operands of a ratio', () => {
    const leaf = node('L', 0, { 'ok___2024': 3, 'tot___2024': 4, 'pct___2024': 0, 'ok___ROW_TOTAL': 6, 'tot___ROW_TOTAL': 8, 'pct___ROW_TOTAL': 0 });
    applyMetricDefinitions(
      [leaf],
      undefined,
      normalizeMetricDefinitions([{ metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot', scale: 100 }]),
    );
    expect(leaf.metrics['pct___2024']).toBe(75);
    expect(leaf.metrics['pct___ROW_TOTAL']).toBe(75);
  });

  it('sums a metric the name heuristics would treat as derived (class "Differibile")', () => {
    const a = node('A', 1, { differibile: 4 });
    const b = node('B', 1, { differibile: 6 });
    const root = node('R', 0, { differibile: null }, [a, b]);
    const total = node('__grand_total__', 0, {});
    applyMetricDefinitions([root], total, normalizeMetricDefinitions([{ metric: 'differibile', type: 'sum' }]));
    expect(root.metrics.differibile).toBe(10);
    expect(total.metrics.differibile).toBe(10);
  });

  it('averages a mean metric weighted by its weight metric, falling back to the plain mean', () => {
    const a = node('A', 1, { attesa: 10, volume: 90 });
    const b = node('B', 1, { attesa: 20, volume: 10 });
    const root = node('R', 0, {}, [a, b]);
    const unweighted = node('R2', 0, {}, [node('X', 1, { attesa: 10 }), node('Y', 1, { attesa: 20 })]);
    applyMetricDefinitions(
      [root],
      undefined,
      normalizeMetricDefinitions([{ metric: 'attesa', type: 'mean', weight: 'volume' }]),
    );
    applyMetricDefinitions([unweighted], undefined, normalizeMetricDefinitions([{ metric: 'attesa', type: 'mean' }]));
    expect(root.metrics.attesa).toBe(11);
    expect(unweighted.metrics.attesa).toBe(15);
  });

  it('rolls a distinct count up with MAX at and below its entity level and SUM above', () => {
    const slice1 = node('s1', 2, { attivi: 1 });
    const slice2 = node('s2', 2, { attivi: 1 });
    const desk1 = node('d1', 1, {}, [slice1, slice2]);
    const desk2 = node('d2', 1, {}, [node('s3', 2, { attivi: 1 })]);
    const sede = node('sede', 0, {}, [desk1, desk2]);
    const total = node('__grand_total__', 0, {});
    applyMetricDefinitions(
      [sede],
      total,
      normalizeMetricDefinitions([{ metric: 'attivi', type: 'distinct_count', entityDimension: 'sportello' }]),
      ['sede', 'sportello', 'ora'],
    );
    expect(desk1.metrics.attivi).toBe(1);
    expect(sede.metrics.attivi).toBe(2);
    expect(total.metrics.attivi).toBe(2);
  });

  it('empties parent rows of a metric declared as none', () => {
    const root = node('R', 0, { stato: 1 }, [node('A', 1, { stato: 1 })]);
    applyMetricDefinitions([root], undefined, normalizeMetricDefinitions([{ metric: 'stato', type: 'none' }]));
    expect(root.metrics.stato).toBeNull();
  });

  it('recomputes a delta percentage from its operands and ignores a zero baseline', () => {
    const a = node('A', 0, { cur: 120, base: 100, delta: 0 });
    const b = node('B', 0, { cur: 5, base: 0, delta: 7 });
    applyMetricDefinitions(
      [a, b],
      undefined,
      normalizeMetricDefinitions([{ metric: 'delta', type: 'delta_pct', current: 'cur', baseline: 'base' }]),
    );
    expect(a.metrics.delta).toBe(20);
    expect(b.metrics.delta).toBeNull();
  });


  it('accepts a diff definition with its operands and keeps the polarity', () => {
    const defs = normalizeMetricDefinitions([
      { metric: 'delta_pp', type: 'diff', current: 'acc_corr', baseline: 'acc_conf', polarity: 'lower_is_better', decimals: 1 },
      { metric: 'noCurrent', type: 'diff', baseline: 'acc_conf' },
      { metric: 'noBaseline', type: 'diff', current: 'acc_corr' },
    ]);
    expect(defs).toEqual([
      { metric: 'delta_pp', type: 'diff', current: 'acc_corr', baseline: 'acc_conf', decimals: 1, polarity: 'lower_is_better' },
    ]);
  });

  it('computes a node-level difference of the two operands, never a sum or average of child diffs', () => {
    // leafA: corr 40/100 = 40%, conf 10/50 = 20% -> diff 20 p.p.
    // leafB: corr 60/200 = 30%, conf 45/200 = 22,5% -> diff 7,5 p.p.
    // parent: corr 100/300 = 33,3%, conf 55/250 = 22,0% -> diff 11,3 p.p.
    // A sum of child diffs would give 27,5 and an average 13,75: both wrong.
    const leafA = node('A', 1, { n1: 40, d1: 100, acc_corr: 0, n2: 10, d2: 50, acc_conf: 0, delta_pp: 0 });
    const leafB = node('B', 1, { n1: 60, d1: 200, acc_corr: 0, n2: 45, d2: 200, acc_conf: 0, delta_pp: 0 });
    const root = node('R', 0, {}, [leafA, leafB]);
    const total = node('__grand_total__', 0, {});
    const defs = normalizeMetricDefinitions([
      { metric: 'n1', type: 'sum' },
      { metric: 'd1', type: 'sum' },
      { metric: 'n2', type: 'sum' },
      { metric: 'd2', type: 'sum' },
      { metric: 'acc_corr', type: 'ratio', numerator: 'n1', denominator: 'd1', scale: 100 },
      { metric: 'acc_conf', type: 'ratio', numerator: 'n2', denominator: 'd2', scale: 100 },
      { metric: 'delta_pp', type: 'diff', current: 'acc_corr', baseline: 'acc_conf' },
    ]);
    applyMetricDefinitions([root], total, defs);
    expect(leafA.metrics.delta_pp).toBe(20);
    expect(leafB.metrics.delta_pp).toBe(7.5);
    expect(root.metrics.delta_pp).toBe(11.3);
    expect(root.subtotals?.delta_pp).toBe(11.3);
    expect(total.metrics.delta_pp).toBe(11.3);
  });

  it('computes the diff even when declared before its ratio operands', () => {
    const leafA = node('A', 1, { n1: 40, d1: 100, acc_corr: 0, n2: 10, d2: 50, acc_conf: 0, delta_pp: 0 });
    const root = node('R', 0, {}, [leafA]);
    const defs = normalizeMetricDefinitions([
      { metric: 'delta_pp', type: 'diff', current: 'acc_corr', baseline: 'acc_conf' },
      { metric: 'n1', type: 'sum' },
      { metric: 'd1', type: 'sum' },
      { metric: 'n2', type: 'sum' },
      { metric: 'd2', type: 'sum' },
      { metric: 'acc_corr', type: 'ratio', numerator: 'n1', denominator: 'd1', scale: 100 },
      { metric: 'acc_conf', type: 'ratio', numerator: 'n2', denominator: 'd2', scale: 100 },
    ]);
    applyMetricDefinitions([root], undefined, defs);
    expect(root.metrics.delta_pp).toBe(20);
  });

  it('applies the pivot suffix of the diff key to its operands', () => {
    const leaf = node('L', 0, { 'cur___2024': 12.5, 'base___2024': 10, 'delta___2024': 0 });
    applyMetricDefinitions(
      [leaf],
      undefined,
      normalizeMetricDefinitions([{ metric: 'delta', type: 'diff', current: 'cur', baseline: 'base' }]),
    );
    expect(leaf.metrics['delta___2024']).toBe(2.5);
  });

  it('leaves the diff untouched when an operand is missing and accepts negative results', () => {
    const leaf = node('L', 0, { cur: 8, base: 10, delta: 0 });
    applyMetricDefinitions(
      [leaf],
      undefined,
      normalizeMetricDefinitions([{ metric: 'delta', type: 'diff', current: 'cur', baseline: 'base' }]),
    );
    expect(leaf.metrics.delta).toBe(-2);
    const lonely = node('M', 0, { delta: 7 });
    applyMetricDefinitions(
      [lonely],
      undefined,
      normalizeMetricDefinitions([{ metric: 'delta', type: 'diff', current: 'cur', baseline: 'base' }]),
    );
    expect(lonely.metrics.delta).toBe(7);
  });

  it('is a no-op without definitions', () => {
    const { tree, total, sede1 } = build();
    applyMetricDefinitions(tree, total, []);
    expect(sede1.metrics).toEqual({});
  });
});
