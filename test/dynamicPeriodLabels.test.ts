jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  buildQueryContext: (formData: any, buildFn: any) => ({ queries: buildFn({}) }),
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import buildQuery from '../src/plugin/buildQuery';
import transformProps from '../src/plugin/transformProps';
import {
  applyDynamicPeriodTitles,
  buildPeriodMetrics,
  classifyPeriodColumn,
  readChartPeriods,
  resolvePeriodColumns,
  stripPeriodColumns,
} from '../src/utils/dynamicPeriodLabels';
import { HierarchicalTableChartProps, HierarchicalTableFormData, TableColumn } from '../src/types';

const periodRow = (ac: unknown, mc: unknown, af: unknown, mf: unknown) => ({
  zz_periodo_referenceYear: ac,
  zz_periodo_referenceMonth: mc,
  zz_periodo_comparisonYear: af,
  zz_periodo_comparisonMonth: mf,
});

const col = (key: string, title = key): TableColumn =>
  ({ key, title, dataIndex: key, isMetric: true } as TableColumn);

describe('period columns', () => {
  it('uses the default column names, or the ones set on the chart', () => {
    expect(resolvePeriodColumns(undefined)).toEqual({
      referenceYear: 'ANNO_CORRENTE',
      referenceMonth: 'MESE_CORRENTE',
      comparisonYear: 'ANNO_CONFRONTO',
      comparisonMonth: 'MESE_CONFRONTO',
    });
    expect(
      resolvePeriodColumns({ periodReferenceYearColumn: ' ANNO_RIF ', periodComparisonMonthColumn: '' }),
    ).toMatchObject({ referenceYear: 'ANNO_RIF', comparisonMonth: 'MESE_CONFRONTO' });
  });

  it('asks for a constant column of the dataset with MAX, one metric per part', () => {
    const metrics = buildPeriodMetrics(resolvePeriodColumns(undefined));
    expect(metrics.map(m => m.sqlExpression)).toEqual([
      'MAX(ANNO_CORRENTE)',
      'MAX(MESE_CORRENTE)',
      'MAX(ANNO_CONFRONTO)',
      'MAX(MESE_CONFRONTO)',
    ]);
    expect(metrics.map(m => m.label)).toEqual([
      'zz_periodo_referenceYear',
      'zz_periodo_referenceMonth',
      'zz_periodo_comparisonYear',
      'zz_periodo_comparisonMonth',
    ]);
  });
});

describe('readChartPeriods', () => {
  it('reads year and month together as a pair, as Italian month labels', () => {
    expect(readChartPeriods([periodRow(2026, 10, 2026, 9)])).toEqual({
      reference: 'ott 2026',
      comparison: 'set 2026',
    });
    expect(readChartPeriods([periodRow('2026', '1', '2025', '12')])).toEqual({
      reference: 'gen 2026',
      comparison: 'dic 2025',
    });
  });

  it('reads nothing from rows without the period columns, or with garbage', () => {
    expect(readChartPeriods(undefined)).toBeNull();
    expect(readChartPeriods([])).toBeNull();
    expect(readChartPeriods([{ SEDE: 'ROMA' }])).toBeNull();
    expect(readChartPeriods([periodRow(null, null, null, null)])).toBeNull();
    expect(readChartPeriods([periodRow(2026, 13, 'x', 9)])).toBeNull();
  });

  it('keeps the part it knows when the other is missing', () => {
    expect(readChartPeriods([periodRow(2026, 10, null, null)])).toEqual({ reference: 'ott 2026', comparison: '' });
  });
});

describe('stripPeriodColumns', () => {
  it('takes the period columns out of the rows and leaves the rest', () => {
    const rows = [{ SEDE: 'ROMA', n: 3, ...periodRow(2026, 10, 2026, 9) }];
    expect(stripPeriodColumns(rows)).toEqual([{ SEDE: 'ROMA', n: 3 }]);
    expect(rows[0]).toHaveProperty('zz_periodo_referenceYear');
  });

  it('returns the same rows when there is nothing to take out', () => {
    const rows = [{ SEDE: 'ROMA' }];
    expect(stripPeriodColumns(rows)).toBe(rows);
  });
});

describe('classifyPeriodColumn', () => {
  it.each([
    ['Richieste (Corrente)', 'reference'],
    ['Richieste (Riferimento)', 'reference'],
    ['Richieste (Confronto)', 'comparison'],
    ['Variazione Richieste (%)', 'delta'],
    ['Δ% Richieste', 'delta'],
    ['Delta Attesa', 'delta'],
    ['Richieste', null],
  ])('%s is %s', (title, role) => {
    expect(classifyPeriodColumn({ key: title, title })).toBe(role);
  });

  it('puts a variation before the period words in its name', () => {
    expect(classifyPeriodColumn({ key: 'v', title: 'Variazione rispetto al confronto' })).toBe('delta');
  });
});

describe('applyDynamicPeriodTitles', () => {
  const periods = { reference: 'ott 2026', comparison: 'set 2026' };
  const columns = [
    col('a', 'Richieste (Corrente)'),
    col('b', 'Richieste (Confronto)'),
    col('c', 'Variazione Richieste (%)'),
    col('d', 'Prime visite'),
    { key: '__hierarchy_tree__', title: 'Sede', isMetric: false } as TableColumn,
  ];

  it('writes the reference period on the current values, the comparison one on the comparison, both on the variation', () => {
    expect(applyDynamicPeriodTitles(columns, periods).map(c => c.title)).toEqual([
      'Richieste (Corrente) · ott 2026',
      'Richieste (Confronto) · set 2026',
      'Variazione Richieste (%) · ott 2026 vs set 2026',
      'Prime visite',
      'Sede',
    ]);
  });

  it('leaves the columns alone without periods, and never writes a period twice', () => {
    expect(applyDynamicPeriodTitles(columns, null)).toBe(columns);
    const once = applyDynamicPeriodTitles(columns, periods);
    expect(applyDynamicPeriodTitles(once, periods).map(c => c.title)).toEqual(once.map(c => c.title));
  });

  it('writes only what it knows when a period is missing', () => {
    const titles = applyDynamicPeriodTitles(columns, { reference: 'ott 2026', comparison: '' }).map(c => c.title);
    expect(titles[0]).toBe('Richieste (Corrente) · ott 2026');
    expect(titles[1]).toBe('Richieste (Confronto)');
    expect(titles[2]).toBe('Variazione Richieste (%)');
  });
});

describe('period labels in the query and in the chart', () => {
  const base = {
    datasource: '78__table',
    hierarchyType: 'multi_dimension',
    groupby: ['SEDE'],
    metrics: ['Richieste (Corrente)', 'Richieste (Confronto)', 'Variazione Richieste (%)'],
  };

  it('leaves the query alone with the flag off', () => {
    const q = (buildQuery(base as any as HierarchicalTableFormData) as any).queries[0];
    expect(q.metrics).toEqual(base.metrics);
  });

  it('adds the four period metrics to the query with the flag on, after the real ones', () => {
    const q = (buildQuery({ ...base, periodLabelsFromFilters: true } as any) as any).queries[0];
    expect(q.metrics.slice(0, 3)).toEqual(base.metrics);
    expect(q.metrics).toHaveLength(7);
    expect((q.metrics[3] as any).sqlExpression).toBe('MAX(ANNO_CORRENTE)');
  });

  it('uses the column names set on the chart', () => {
    const q = (
      buildQuery({ ...base, periodLabelsFromFilters: true, periodReferenceYearColumn: 'ANNO_RIF' } as any) as any
    ).queries[0];
    expect((q.metrics[3] as any).sqlExpression).toBe('MAX(ANNO_RIF)');
  });

  const props = (flags: Record<string, unknown>, extra: Record<string, unknown> = periodRow(2026, 9, 2026, 8)) =>
    transformProps({
      width: 800,
      height: 400,
      formData: { ...base, ...flags },
      queriesData: [
        {
          data: [
            { SEDE: 'ROMA', 'Richieste (Corrente)': 10, 'Richieste (Confronto)': 8, 'Variazione Richieste (%)': 25, ...extra },
          ],
        },
      ],
    } as unknown as HierarchicalTableChartProps);

  it('writes the periods of the query in the titles with the flag on, and keeps them out of the data', () => {
    const t = props({ periodLabelsFromFilters: true });
    expect(t.columns.map(c => c.title)).toEqual([
      'SEDE',
      'Richieste (Corrente) · set 2026',
      'Richieste (Confronto) · ago 2026',
      'Variazione Richieste (%) · set 2026 vs ago 2026',
    ]);
    expect(Object.keys((t.rawRecords as any[])[0])).not.toContain('zz_periodo_referenceYear');
    expect(t.metrics).toEqual(base.metrics);
  });

  it('changes nothing with the flag off, even if the rows carry the period columns', () => {
    const t = props({});
    expect(t.columns.map(c => c.title)).toEqual([
      'SEDE',
      'Richieste (Corrente)',
      'Richieste (Confronto)',
      'Variazione Richieste (%)',
    ]);
  });

  it('keeps the plain titles when the rows report no period', () => {
    const t = props({ periodLabelsFromFilters: true }, {});
    expect(t.columns.map(c => c.title)).toEqual([
      'SEDE',
      'Richieste (Corrente)',
      'Richieste (Confronto)',
      'Variazione Richieste (%)',
    ]);
  });

  it('prefers the periods of the query to the time span of the data when both flags are on', () => {
    const t = props({ periodLabelsFromFilters: true, showPeriodInMetricLabel: true });
    expect(t.columns[1].title).toBe('Richieste (Corrente) · set 2026');
  });
});
