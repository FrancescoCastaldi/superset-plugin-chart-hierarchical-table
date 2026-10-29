jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import {
  applyPeriodLabels,
  comparisonOffsetLabel,
  detectComparisonOffset,
  formatPeriodLabel,
  formatTimeRange,
  periodRangeLabel,
  resolvePeriodScope,
} from '../src/utils/periodLabels';
import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps, TableColumn } from '../src/types';

const metricColumn = (key: string, title: string, extra: Partial<TableColumn> = {}): TableColumn =>
  ({ key, title, dataIndex: key, isMetric: true, ...extra } as TableColumn);

describe('period labels', () => {
  it('reads one period key at the grain it is asked for', () => {
    expect(formatPeriodLabel('2026-10', 'month')).toBe('ott 2026');
    expect(formatPeriodLabel('2026-10', 'year')).toBe('2026');
    expect(formatPeriodLabel('2026-08', 'quarter')).toBe('Q3 2026');
    expect(formatPeriodLabel('2026-10-12', 'day')).toBe('12/10/2026');
    expect(formatPeriodLabel('Ambulatorio A', 'month')).toBeNull();
  });

  it('spans the period keys, and collapses a single period to one label', () => {
    expect(periodRangeLabel(['2026-09', '2025-11', '2026-10'])).toBe('nov 2025 – ott 2026');
    expect(periodRangeLabel(['2026-10'])).toBe('ott 2026');
    expect(periodRangeLabel(['IDI - IRCCS (ROMA)', 'IDI - V.PAOLA'])).toBeNull();
    expect(periodRangeLabel([])).toBeNull();
  });

  it('falls back to the time range of the query when no key is a period', () => {
    expect(formatTimeRange({ from: '2025-11-01T00:00:00', to: '2026-10-31T00:00:00' })).toBe(
      '01/11/2025 – 31/10/2026',
    );
    expect(formatTimeRange({ from: null, to: null })).toBeNull();
    expect(formatTimeRange(null)).toBeNull();
  });

  it('reads a Superset time offset in Italian', () => {
    expect(comparisonOffsetLabel('1 month ago')).toBe('1 mese fa');
    expect(comparisonOffsetLabel('3 months ago')).toBe('3 mesi fa');
    expect(comparisonOffsetLabel('1 year ago')).toBe('1 anno fa');
    expect(comparisonOffsetLabel('inherited')).toBe('periodo precedente');
    expect(comparisonOffsetLabel('2026-01-01 : 2026-02-01')).toBe('2026-01-01 : 2026-02-01');
    expect(comparisonOffsetLabel('')).toBeNull();
  });

  it('takes the comparison from the offset, the strategy or the periods themselves', () => {
    expect(resolvePeriodScope({ periodKeys: ['2026-09', '2026-10'] })).toEqual({
      reference: 'set 2026 – ott 2026',
      comparison: 'mese precedente',
    });
    expect(
      resolvePeriodScope({ periodKeys: ['2026-10'], comparisonOffset: '1 month ago' }),
    ).toEqual({ reference: 'ott 2026', comparison: '1 mese fa' });
    expect(
      resolvePeriodScope({
        periodKeys: ['2025', '2026'],
        strategy: { timeGrain: 'year', referencePeriod: 'previous', strategy: 'prev_period' },
      }),
    ).toEqual({ reference: '2025 – 2026', comparison: 'anno precedente' });
    expect(
      resolvePeriodScope({
        periodKeys: ['2026-09', '2026-10'],
        strategy: { timeGrain: 'month', referencePeriod: 'ytd', strategy: 'prev_period' },
      }).comparison,
    ).toBe('media da inizio anno');
    expect(
      resolvePeriodScope({
        periodKeys: ['2026-09', '2026-10'],
        strategy: {
          timeGrain: 'month',
          referencePeriod: 'current',
          strategy: 'prev_year_same_period',
        },
      }).comparison,
    ).toBe('stesso periodo anno precedente');
    expect(
      resolvePeriodScope({
        periodKeys: ['Cardiologia'],
        timeRange: { from: '2026-10-01', to: '2026-10-31' },
      }),
    ).toEqual({ reference: '01/10/2026 – 31/10/2026', comparison: null });
  });

  it('writes the span on the value, comparison and delta columns, never on a pivot one', () => {
    const columns = [
      metricColumn('Richieste', 'Richieste'),
      metricColumn('Richieste___comp', 'Richieste (Confronto)'),
      metricColumn('Richieste___delta', 'Δ% Richieste'),
      metricColumn('Richieste___2026-10', '2026-10', { pivotValue: '2026-10' }),
      { key: '__hierarchy_tree__', title: 'Mese', dataIndex: 'name', isMetric: false } as TableColumn,
    ];

    const labelled = applyPeriodLabels(columns, {
      reference: 'ott 2026',
      comparison: '1 mese fa',
    });

    expect(labelled.map(c => c.title)).toEqual([
      'Richieste (ott 2026)',
      'Richieste (Confronto) (1 mese fa)',
      'Δ% Richieste (ott 2026 vs 1 mese fa)',
      '2026-10',
      'Mese',
    ]);
  });

  it('leaves the columns alone when there is no span to write', () => {
    const columns = [metricColumn('Richieste', 'Richieste')];
    expect(applyPeriodLabels(columns, { reference: null, comparison: null })).toBe(columns);
  });

  it('finds the offset of the native comparison in the fetched columns', () => {
    expect(
      detectComparisonOffset([{ Richieste: 10, 'Richieste__1 month ago': 8 }], ['Richieste']),
    ).toBe('1 month ago');
    expect(
      detectComparisonOffset([{ Richieste: 10 }], ['Richieste'], {
        extra_form_data: { time_compare: ['1 year ago'] },
      }),
    ).toBe('1 year ago');
    expect(detectComparisonOffset([{ Richieste: 10 }], ['Richieste'])).toBeNull();
  });
});

describe('period labels in the chart', () => {
  const chartProps = (formData: Record<string, unknown>) =>
    ({
      width: 800,
      height: 400,
      formData: { groupby: ['mese'], metrics: ['Richieste'], ...formData },
      queriesData: [
        {
          data: [
            { mese: '2026-09', Richieste: 100 },
            { mese: '2026-10', Richieste: 120 },
          ],
        },
      ],
    } as unknown as HierarchicalTableChartProps);

  it('writes the spans only when the flag is on', () => {
    const plain = transformProps(chartProps({}));
    expect(plain.columns.map(c => c.title)).toEqual(['mese', 'Richieste']);

    const labelled = transformProps(chartProps({ showPeriodInMetricLabel: true }));
    expect(labelled.columns.map(c => c.title)).toEqual([
      'mese',
      'Richieste (set 2026 – ott 2026)',
    ]);
  });

  it('writes both spans on the variance delta column', () => {
    const labelled = transformProps(
      chartProps({ showVarianceDelta: true, showPeriodInMetricLabel: true }),
    );
    expect(labelled.columns.map(c => c.title)).toEqual([
      'mese',
      'Richieste (set 2026 – ott 2026)',
      'Δ% Richieste (set 2026 – ott 2026 vs mese precedente)',
    ]);
  });
});
