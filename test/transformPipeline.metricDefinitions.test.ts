jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

// Waiting-time compliance by class: the share within the maximum waiting time must be a ratio
// of totals at every level; "Differibile" is a volume although its name looks like a "diff".
const records = [
  { sede: 'S1', classe: 'B', entro_soglia: 90, prenotazioni: 100, differibile: 4, attesa: 8 },
  { sede: 'S1', classe: 'D', entro_soglia: 10, prenotazioni: 100, differibile: 6, attesa: 20 },
  { sede: 'S2', classe: 'B', entro_soglia: 50, prenotazioni: 50, differibile: 5, attesa: 5 },
];

const DEFINITIONS = [
  { metric: 'entro_soglia', type: 'sum' },
  { metric: 'prenotazioni', type: 'sum' },
  { metric: 'differibile', type: 'sum' },
  {
    metric: 'pct_in_soglia',
    type: 'ratio',
    numerator: 'entro_soglia',
    denominator: 'prenotazioni',
    scale: 100,
    format: 'percent',
    decimals: 1,
    polarity: 'higher_is_better',
  },
  { metric: 'attesa', type: 'mean', weight: 'prenotazioni', format: 'days', polarity: 'lower_is_better' },
];

const run = (extra: Record<string, unknown> = {}) => {
  const rows = records.map(r => ({ ...r, pct_in_soglia: (r.entro_soglia / r.prenotazioni) * 100 }));
  const formData = {
    hierarchyType: 'multi_dimension',
    groupby: ['sede', 'classe'],
    metrics: ['entro_soglia', 'prenotazioni', 'differibile', 'pct_in_soglia', 'attesa'],
    metricDefinitions: JSON.stringify(DEFINITIONS),
    ...extra,
  };
  return transformProps({
    width: 800,
    height: 600,
    formData,
    rawFormData: formData,
    queriesData: [{ data: rows }],
    hooks: {},
  } as unknown as HierarchicalTableChartProps);
};

describe('transformProps with metric definitions', () => {
  it('rolls ratios up as a ratio of totals and keeps Differibile additive', () => {
    const out = run();
    const s1 = out.data.find(n => n.name === 'S1')!;
    expect(s1.metrics.entro_soglia).toBe(100);
    expect(s1.metrics.prenotazioni).toBe(200);
    expect(s1.metrics.pct_in_soglia).toBe(50);
    expect(s1.metrics.differibile).toBe(10);
    expect(out.grandTotalNode!.metrics.pct_in_soglia).toBe(60);
    expect(out.grandTotalNode!.metrics.differibile).toBe(15);
  });

  it('weights a mean by the declared weight metric', () => {
    const s1 = run().data.find(n => n.name === 'S1')!;
    expect(s1.metrics.attesa).toBe(14);
  });

  it('applies the explicit format and polarity to the metric columns', () => {
    const out = run();
    const pct = out.columns.find(c => c.key === 'pct_in_soglia')!;
    const attesa = out.columns.find(c => c.key === 'attesa')!;
    expect(pct.formatter!(87.26)).toBe('87,3%');
    expect(attesa.formatter!(14)).toBe('14,0 gg');
    expect(pct.polarity).toBe('higher_is_better');
    expect(attesa.polarity).toBe('lower_is_better');
  });

  it('changes nothing without definitions', () => {
    const out = run({ metricDefinitions: '' });
    const s1 = out.data.find(n => n.name === 'S1')!;
    expect(out.columns.every(c => c.polarity === undefined)).toBe(true);
    expect(s1.metrics.entro_soglia).toBe(100);
  });

  it('applies the avg, min and max aggregation modes to the parent rows', () => {
    const value = (aggregationMode: string) =>
      run({ metricDefinitions: '', aggregationMode }).data.find(n => n.name === 'S1')!.metrics.prenotazioni;
    expect(value('sum')).toBe(200);
    expect(value('avg')).toBe(100);
    expect(value('max')).toBe(100);
  });
});
