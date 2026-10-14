import { TreeNode } from '../src/types';
import { applyConfidenceIntervals } from '../src/utils/significance';
import { poissonCountInterval, ratioInterval, wilsonInterval, zForLevel } from '../src/utils/statistics';
import { applySuppression, parseSuppressionMetrics } from '../src/utils/suppression';
import { applyMetricDefinitions, normalizeMetricDefinitions } from '../src/utils/metricSemantics';

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

describe('statistics', () => {
  it('uses the standard normal quantiles of the supported levels', () => {
    expect(zForLevel(0.95)).toBeCloseTo(1.96, 2);
    expect(zForLevel(0.998)).toBeCloseTo(3.09, 2);
    expect(zForLevel(0.5)).toBeCloseTo(1.96, 2);
  });

  it('computes the Wilson interval with known reference values', () => {
    // 81 out of 263 (30.8%): the Wilson formula by hand gives 25.53% to 36.62% at 95%.
    const interval = wilsonInterval(81, 263, 0.95)!;
    expect(interval.lower).toBeCloseTo(0.2553, 3);
    expect(interval.upper).toBeCloseTo(0.3662, 3);
    // Extremes stay inside [0, 1].
    expect(wilsonInterval(0, 10)!.lower).toBeCloseTo(0, 10);
    expect(wilsonInterval(10, 10)!.upper).toBeCloseTo(1, 10);
    expect(wilsonInterval(1, 0)).toBeNull();
  });

  it('computes the Byar Poisson interval close to the exact one', () => {
    // Exact 95% interval of 10 events: 4.795 to 18.390.
    const interval = poissonCountInterval(10, 0.95)!;
    expect(interval.lower).toBeCloseTo(4.795, 1);
    expect(interval.upper).toBeCloseTo(18.39, 1);
    const zero = poissonCountInterval(0, 0.95)!;
    expect(zero.lower).toBe(0);
    expect(zero.upper).toBeCloseTo(3.69, 1);
  });

  it('scales intervals of ratios and rejects an empty denominator', () => {
    const wilson = ratioInterval('wilson', 50, 100, 100, 0.95)!;
    expect(wilson.lower).toBeCloseTo(40.4, 1);
    expect(wilson.upper).toBeCloseTo(59.6, 1);
    const rate = ratioInterval('poisson', 10, 5000, 1000, 0.95)!;
    expect(rate.lower).toBeCloseTo(0.959, 2);
    expect(rate.upper).toBeCloseTo(3.678, 2);
    expect(ratioInterval('wilson', 5, 0, 100, 0.95)).toBeNull();
    expect(ratioInterval('none', 5, 10, 100, 0.95)).toBeNull();
  });
});

describe('applyConfidenceIntervals', () => {
  const defs = normalizeMetricDefinitions([
    { metric: 'ok', type: 'sum' },
    { metric: 'tot', type: 'sum' },
    { metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot', scale: 100, ci: 'wilson' },
  ]);

  const build = () => {
    const big = node('big', 1, { ok: 900, tot: 1000, pct: 0 });
    const small = node('small', 1, { ok: 2, tot: 3, pct: 0 });
    const poor = node('poor', 1, { ok: 500, tot: 1000, pct: 0 });
    const root = node('root', 0, {}, [big, small, poor]);
    const total = node('__grand_total__', 0, { ok: 0, tot: 0, pct: 0 });
    applyMetricDefinitions([root], total, defs);
    applyConfidenceIntervals([root], total, defs);
    return { big, small, poor, root, total };
  };

  it('flags only the units whose whole interval lies on one side of the parent value', () => {
    const { big, small, poor, root } = build();
    expect(root.metrics.pct).toBeCloseTo((1402 / 2003) * 100, 5);
    expect(big.intervals!.pct.signal).toBe('above');
    expect(poor.intervals!.pct.signal).toBe('below');
    // 2 of 3 is a wide interval that contains the parent value: no signal.
    expect(small.intervals!.pct.signal).toBeUndefined();
    expect(small.intervals!.pct.upper - small.intervals!.pct.lower).toBeGreaterThan(50);
  });

  it('gives the grand total an interval but no signal', () => {
    const { total } = build();
    expect(total.intervals!.pct.signal).toBeUndefined();
    expect(total.intervals!.pct.level).toBe(0.95);
  });

  it('compares against the goal target when asked', () => {
    const byGoal = normalizeMetricDefinitions([
      { metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot', scale: 100, ci: 'wilson', compareTo: 'goal' },
    ]);
    const a = node('a', 0, { ok: 900, tot: 1000, pct: 90 });
    applyConfidenceIntervals([a], undefined, byGoal, [
      { metricKey: 'pct', target: 80, direction: 'higher_is_better' },
    ]);
    expect(a.intervals!.pct.signal).toBe('above');
    const b = node('b', 0, { ok: 900, tot: 1000, pct: 90 });
    applyConfidenceIntervals([b], undefined, byGoal, []);
    expect(b.intervals!.pct.signal).toBeUndefined();
  });

  it('does nothing without a ci method', () => {
    const plain = normalizeMetricDefinitions([
      { metric: 'pct', type: 'ratio', numerator: 'ok', denominator: 'tot' },
    ]);
    const a = node('a', 0, { ok: 1, tot: 2, pct: 0.5 });
    applyConfidenceIntervals([a], undefined, plain);
    expect(a.intervals).toBeUndefined();
  });
});

describe('applySuppression', () => {
  const options = { threshold: 5, metrics: ['casi'], label: '<{k}', complementary: true };

  it('parses the metric list from text or arrays', () => {
    expect(parseSuppressionMetrics('casi, decessi\nricoveri;')).toEqual(['casi', 'decessi', 'ricoveri']);
    expect(parseSuppressionMetrics([' a ', ''])).toEqual(['a']);
    expect(parseSuppressionMetrics(undefined)).toEqual([]);
  });

  it('hides counts from 1 to threshold - 1 and keeps zeros and larger counts', () => {
    const rows = [
      node('a', 0, { casi: 3 }),
      node('b', 0, { casi: 0 }),
      node('c', 0, { casi: 5 }),
      node('d', 0, { casi: 40 }),
    ];
    applySuppression(rows, { ...options, complementary: false });
    expect(rows[0].metrics.casi).toBeNull();
    expect(rows[0].suppressed).toEqual({ casi: '<5' });
    expect(rows[0].subtotals!.casi).toBeNull();
    expect(rows[1].metrics.casi).toBe(0);
    expect(rows[2].metrics.casi).toBe(5);
    expect(rows[3].metrics.casi).toBe(40);
  });

  it('also hides the smallest visible sibling of a lone hidden cell, never the parent total', () => {
    const a = node('a', 1, { casi: 2 });
    const b = node('b', 1, { casi: 30 });
    const c = node('c', 1, { casi: 18 });
    const root = node('root', 0, { casi: 50 }, [a, b, c]);
    applySuppression([root], options);
    expect(a.metrics.casi).toBeNull();
    expect(c.metrics.casi).toBeNull();
    expect(b.metrics.casi).toBe(30);
    expect(root.metrics.casi).toBe(50);
  });

  it('skips complementary suppression when two cells are hidden or when switched off', () => {
    const make = (second: number) => {
      const a = node('a', 1, { casi: 2 });
      const b = node('b', 1, { casi: second });
      const c = node('c', 1, { casi: 18 });
      return { c, root: node('root', 0, { casi: 40 }, [a, b, c]) };
    };
    const twoHidden = make(3);
    applySuppression([twoHidden.root], options);
    expect(twoHidden.c.metrics.casi).toBe(18);
    const off = make(20);
    applySuppression([off.root], { ...options, complementary: false });
    expect(off.c.metrics.casi).toBe(18);
  });

  it('hides ratios whose operands are hidden and the deltas of hidden cells', () => {
    const defs = normalizeMetricDefinitions([
      { metric: 'tasso', type: 'ratio', numerator: 'casi', denominator: 'popolazione', scale: 1000 },
    ]);
    const a = node('a', 0, { casi: 2, popolazione: 1000, tasso: 2, casi___delta: 1 });
    const b = node('b', 0, { casi: 50, popolazione: 1000, tasso: 50, casi___delta: 4 });
    applySuppression([a, b], { ...options, complementary: false }, defs);
    expect(a.metrics.tasso).toBeNull();
    expect(a.suppressed!.tasso).toBe('<5');
    expect(a.metrics.casi___delta).toBeNull();
    expect(b.metrics.tasso).toBe(50);
    expect(b.metrics.casi___delta).toBe(4);
  });

  it('is off with a zero threshold or without metrics', () => {
    const a = node('a', 0, { casi: 2 });
    applySuppression([a], { ...options, threshold: 0 });
    applySuppression([a], { ...options, metrics: [] });
    expect(a.metrics.casi).toBe(2);
    expect(a.suppressed).toBeUndefined();
  });

  it('clears the interval of a hidden ratio', () => {
    const defs = normalizeMetricDefinitions([
      { metric: 'pct', type: 'ratio', numerator: 'casi', denominator: 'tot', scale: 100, ci: 'wilson' },
    ]);
    const a = node('a', 0, { casi: 2, tot: 100, pct: 2 });
    applyConfidenceIntervals([a], undefined, defs);
    expect(a.intervals!.pct).toBeDefined();
    applySuppression([a], options, defs);
    expect(a.intervals!.pct).toBeUndefined();
  });
});
