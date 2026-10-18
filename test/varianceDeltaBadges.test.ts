jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

describe('Variance Delta Badges and Native Pivot Delta Polarity', () => {
  const baseData = [
    { anno: 2023, reparto: 'Cardiologia', accessi: 100, complicanze: 10 },
    { anno: 2024, reparto: 'Cardiologia', accessi: 120, complicanze: 8 },
    { anno: 2023, reparto: 'Ortopedia', accessi: 80, complicanze: 4 },
    { anno: 2024, reparto: 'Ortopedia', accessi: 90, complicanze: 5 },
  ];

  it('forwards showVarianceDelta in transformProps output', () => {
    const rawProps = {
      width: 800,
      height: 400,
      formData: {
        groupby: ['reparto'],
        metrics: ['accessi'],
        showVarianceDelta: true,
      },
      queriesData: [{ data: [{ reparto: 'Cardiologia', accessi: 100 }] }],
    } as unknown as HierarchicalTableChartProps;

    const transformed = transformProps(rawProps);
    expect(transformed.showVarianceDelta).toBe(true);
  });

  it('computes native pivot delta columns and assigns correct polarity from base metric', () => {
    const rawProps = {
      width: 800,
      height: 400,
      formData: {
        groupby: ['reparto'],
        columns: ['anno'],
        metrics: ['accessi', 'complicanze'],
        pivotTimeDeltaMode: 'percentage',
        metricDefinitionsJson: JSON.stringify([
          {
            metric: 'accessi',
            type: 'sum',
            label: 'Accessi Totali',
            polarity: 'higher_is_better',
          },
          {
            metric: 'complicanze',
            type: 'sum',
            label: 'Complicanze Post-Op',
            polarity: 'lower_is_better',
          },
        ]),
      },
      queriesData: [{ data: baseData }],
    } as unknown as HierarchicalTableChartProps;

    const transformed = transformProps(rawProps);

    // Check columns generated
    const colKeys = transformed.columns.map(c => c.key);
    expect(colKeys).toContain('__hierarchy_tree__');
    expect(colKeys).toContain('accessi___2023');
    expect(colKeys).toContain('accessi___2024');
    expect(colKeys).toContain('accessi___delta_pct___2024');
    expect(colKeys).toContain('complicanze___2023');
    expect(colKeys).toContain('complicanze___2024');
    expect(colKeys).toContain('complicanze___delta_pct___2024');

    // Check polarity inheritance on delta columns
    const accessiDeltaCol = transformed.columns.find(c => c.key === 'accessi___delta_pct___2024');
    expect(accessiDeltaCol?.polarity).toBe('higher_is_better');

    const complicanzeDeltaCol = transformed.columns.find(c => c.key === 'complicanze___delta_pct___2024');
    expect(complicanzeDeltaCol?.polarity).toBe('lower_is_better');
  });

  it('calculates pivot delta percentages for inline badges in pivot mode with showVarianceDelta enabled', () => {
    const rawProps = {
      width: 800,
      height: 400,
      formData: {
        groupby: ['reparto'],
        columns: ['anno'],
        metrics: ['accessi'],
        showVarianceDelta: true,
        pivotTimeDeltaMode: 'none',
      },
      queriesData: [{ data: baseData }],
    } as unknown as HierarchicalTableChartProps;

    const transformed = transformProps(rawProps);
    expect(transformed.showVarianceDelta).toBe(true);

    // Root node Cardiologia should have accessi___delta_pct___2024 computed
    // 2023 was 100, 2024 was 120 -> delta pct = +20%
    const cardioNode = transformed.data.find(n => n.name === 'Cardiologia');
    expect(cardioNode).toBeDefined();
    expect(cardioNode?.metrics?.['accessi___delta_pct___2024']).toBeCloseTo(20.0, 1);
  });
});
