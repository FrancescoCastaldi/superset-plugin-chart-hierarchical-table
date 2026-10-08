jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import controlPanel from '../src/plugin/controlPanel';
import transformProps from '../src/plugin/transformProps';
import { resolveTransformOptions } from '../src/plugin/formDataOptions';
import { MetricGoal, TreeNode } from '../src/types';
import {
  applyReferencePeriodDelta,
  computeTreeTimeDeltaByStrategy,
  parsePeriodKey,
} from '../src/utils/timeComparison';

const node = (name: string, metrics: Record<string, number>, children?: TreeNode[]): TreeNode => ({
  key: name,
  id: name,
  name,
  depth: 0,
  path: [name],
  isLeaf: !children,
  children,
  metrics: { ...metrics },
  subtotals: { ...metrics },
});

const monthly2026 = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);

describe('time comparison by reference period and strategy', () => {
  it('referencePeriod current yields a zero delta for every node', () => {
    const child = node('Chirurgia', { 'revenue___2026-01': 40 });
    const root = node('Roma', { 'revenue___2026-01': 40 }, [child]);

    const applied = computeTreeTimeDeltaByStrategy([root], ['revenue'], ['2026-01'], {
      timeGrain: 'month',
      referencePeriod: 'current',
      strategy: 'prev_period',
    });

    expect(applied).toBe(true);
    for (const n of [root, child]) {
      expect(n.metrics.revenue___period_delta).toBe(0);
      expect(n.metrics.revenue___period_delta_pct).toBe(0);
      expect(n.subtotals?.revenue___period_delta).toBe(0);
    }
    expect(applyReferencePeriodDelta({ '2026-01': 40 }, ['2026-01'], 'month', 'current').delta).toBe(0);
  });

  it('referencePeriod previous compares with the immediately preceding period of the grain', () => {
    const weekly = applyReferencePeriodDelta(
      { '2026-01-05': 100, '2026-01-12': 130 },
      ['2026-01-05', '2026-01-12'],
      'week',
      'previous',
    );
    expect(weekly).toEqual({ current: 130, baseline: 100, delta: 30, deltaPct: 30 });

    // Daily keys are bucketed by the grain: February (5 + 7) against January (4 + 4).
    const daily = { '2026-01-10': 4, '2026-01-20': 4, '2026-02-03': 5, '2026-02-14': 7 };
    const monthly = applyReferencePeriodDelta(daily, Object.keys(daily), 'month', 'previous');
    expect(monthly).toEqual({ current: 12, baseline: 8, delta: 4, deltaPct: 50 });

    // A gap in the series leaves no preceding period to compare with.
    const gap = applyReferencePeriodDelta({ '2026-01': 1, '2026-03': 2 }, ['2026-01', '2026-03'], 'month', 'previous');
    expect(gap.delta).toBeNull();
  });

  it('referencePeriod ytd compares the current period with the current year-to-date subset', () => {
    const values: Record<string, number> = { '2025-12': 10000 };
    monthly2026.forEach((key, i) => {
      values[key] = (i + 1) * 10;
    });

    // YTD 2026 averages 10..120 = 65; the 2025 record is outside the subset.
    const result = applyReferencePeriodDelta(values, ['2025-12', ...monthly2026], 'month', 'ytd');
    expect(result).toEqual({ current: 120, baseline: 65, delta: 55, deltaPct: 84.6 });
  });

  it('prev_year_same_period compares with the same period shifted by 12 months', () => {
    const keys = ['2025-02', '2025-03', '2026-02', '2026-03'];
    const root = node('Roma', {
      'revenue___2025-02': 70,
      'revenue___2025-03': 80,
      'revenue___2026-02': 500,
      'revenue___2026-03': 100,
    });

    computeTreeTimeDeltaByStrategy([root], ['revenue'], keys, {
      timeGrain: 'month',
      referencePeriod: 'previous',
      strategy: 'prev_year_same_period',
    });

    expect(root.metrics.revenue___period_delta).toBe(20);
    expect(root.metrics.revenue___period_delta_pct).toBe(25);

    const quarterly = node('Q', { 'revenue___2025-Q2': 50, 'revenue___2026-Q1': 10, 'revenue___2026-Q2': 60 });
    computeTreeTimeDeltaByStrategy([quarterly], ['revenue'], ['2025-Q2', '2026-Q1', '2026-Q2'], {
      timeGrain: 'quarter',
      referencePeriod: 'current',
      strategy: 'prev_year_same_period',
    });
    expect(quarterly.metrics.revenue___period_delta).toBe(10);
  });

  it('budget_target reads the target of the matching goals[] entry', () => {
    const goals: MetricGoal[] = [
      { metricKey: 'cost', target: 1, direction: 'lower_is_better' },
      { metricKey: 'revenue', target: 200, direction: 'higher_is_better' },
    ];
    const root = node('Roma', {
      'revenue___2026-01': 900,
      'revenue___2026-02': 150,
      'visits___2026-02': 10,
    });

    computeTreeTimeDeltaByStrategy([root], ['revenue', 'visits'], ['2026-01', '2026-02'], {
      timeGrain: 'month',
      referencePeriod: 'current',
      strategy: 'budget_target',
      goals,
    });

    expect(root.metrics.revenue___period_delta).toBe(-50);
    expect(root.metrics.revenue___period_delta_pct).toBe(-25);
    // No goal entry for the metric: no budget to compare with.
    expect(root.metrics.visits___period_delta).toBeNull();
    expect(root.metrics.visits___period_delta_pct).toBeNull();
  });

  it('leaves the tree untouched when the pivot keys are not periods', () => {
    const root = node('Roma', { 'revenue___SSN': 5, 'revenue___Privato': 7 });
    const applied = computeTreeTimeDeltaByStrategy([root], ['revenue'], ['Privato', 'SSN'], {
      timeGrain: 'month',
      referencePeriod: 'previous',
      strategy: 'prev_period',
    });
    expect(applied).toBe(false);
    expect(root.metrics).not.toHaveProperty('revenue___period_delta');
  });

  it('parses the supported pivot key formats as UTC period starts', () => {
    expect(parsePeriodKey('2026')?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(parsePeriodKey('2026-Q3')?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(parsePeriodKey('2026-02')?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(parsePeriodKey('2026-02-14T10:30:00')?.toISOString()).toBe('2026-02-14T00:00:00.000Z');
    expect(parsePeriodKey(String(Date.UTC(2026, 4, 1)))?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(parsePeriodKey('2026-13')).toBeNull();
    expect(parsePeriodKey('SSN')).toBeNull();
  });
});

describe('time comparison control aliases', () => {
  it('resolves timeGrain, referencePeriod and comparisonType to the canonical fields', () => {
    expect(resolveTransformOptions({})).toMatchObject({
      comparisonTimeGrain: 'year',
      comparisonReferencePeriod: 'current',
      comparisonStrategy: 'prev_period',
    });

    expect(
      resolveTransformOptions({ timeGrain: 'month', referencePeriod: 'ytd', comparisonType: 'budget_target' }),
    ).toMatchObject({
      comparisonTimeGrain: 'month',
      comparisonReferencePeriod: 'ytd',
      comparisonStrategy: 'budget_target',
    });

    const canonicalFirst = resolveTransformOptions({
      comparisonTimeGrain: 'week',
      timeGrain: 'month',
      comparisonReferencePeriod: 'previous',
      referencePeriod: 'ytd',
      comparisonStrategy: 'prev_year_same_period',
      comparisonType: 'budget_target',
    });
    expect(canonicalFirst).toMatchObject({
      comparisonTimeGrain: 'week',
      comparisonReferencePeriod: 'previous',
      comparisonStrategy: 'prev_year_same_period',
    });

    expect(
      resolveTransformOptions({ timeGrain: 'hour', referencePeriod: 'all', comparisonType: 'x' }),
    ).toMatchObject({
      comparisonTimeGrain: 'year',
      comparisonReferencePeriod: 'current',
      comparisonStrategy: 'prev_period',
    });
  });
});

describe('time comparison control visibility', () => {
  const findControl = (name: string): any =>
    (controlPanel.controlPanelSections as any[])
      .flatMap(section => section.controlSetRows.flat())
      .find((item: any) => item && typeof item === 'object' && item.name === name);

  const state = (columns: string[], comparisonType = 'prev_period') => ({
    controls: {
      hierarchyType: { value: 'multi_dimension' },
      columns: { value: columns },
      comparisonType: { value: comparisonType },
    },
  });

  it('shows the controls only for a single pivot column, keeping their saved names', () => {
    for (const name of ['timeGrain', 'referencePeriod', 'comparisonType']) {
      const { visibility } = findControl(name).config;
      expect(visibility(state(['mese']))).toBe(true);
      expect(visibility(state([]))).toBe(false);
      expect(visibility(state(['anno', 'mese']))).toBe(false);
    }
    expect(findControl('referencePeriod').config.visibility(state(['mese'], 'budget_target'))).toBe(false);
    expect(findControl('timeGrain').config.visibility(state(['mese'], 'budget_target'))).toBe(true);
  });
});

describe('time comparison pipeline wiring', () => {
  const records = [
    { presidio: 'Roma', mese: '2026-01', revenue: 100 },
    { presidio: 'Roma', mese: '2026-02', revenue: 160 },
    { presidio: 'Milano', mese: '2026-01', revenue: 50 },
    { presidio: 'Milano', mese: '2026-02', revenue: 40 },
  ];

  const run = (extra: Record<string, unknown>) =>
    transformProps({
      width: 800,
      height: 600,
      formData: {
        hierarchyType: 'multi_dimension',
        groupby: ['presidio'],
        columns: ['mese'],
        metrics: ['revenue'],
        ...extra,
      },
      queriesData: [{ data: records }],
    } as any);

  it('adds period comparison columns from the pivot keys and recomputes the grand total', () => {
    const out = run({ timeGrain: 'month', referencePeriod: 'previous', comparisonType: 'prev_period' });

    const keys = out.columns.map(c => c.key);
    expect(keys).toEqual(expect.arrayContaining(['revenue___period_delta', 'revenue___period_delta_pct']));
    expect(out.pivotHeaderGroups?.[out.pivotHeaderGroups.length - 1]).toMatchObject({
      key: '__period_comparison__',
      colSpan: 2,
    });

    const roma = out.data.find(n => n.name === 'Roma')!;
    expect(roma.metrics.revenue___period_delta).toBe(60);
    expect(roma.metrics.revenue___period_delta_pct).toBe(60);

    // Grand total: 200 against 150, not the sum of the per-row percentages.
    expect(out.grandTotalNode?.metrics.revenue___period_delta).toBe(50);
    expect(out.grandTotalNode?.metrics.revenue___period_delta_pct).toBe(33.3);
  });

  it('adds nothing with the neutral defaults so saved charts keep their layout', () => {
    const out = run({});
    expect(out.columns.map(c => c.key)).not.toContain('revenue___period_delta');
    expect(out.data[0].metrics).not.toHaveProperty('revenue___period_delta');
  });

  it('feeds budget_target from the goals control', () => {
    const out = run({
      comparisonType: 'budget_target',
      timeGrain: 'month',
      goals: JSON.stringify([{ metricKey: 'revenue', target: 100, direction: 'higher_is_better' }]),
    });
    const milano = out.data.find(n => n.name === 'Milano')!;
    expect(milano.metrics.revenue___period_delta).toBe(-60);
    expect(milano.metrics.revenue___period_delta_pct).toBe(-60);
  });
});
