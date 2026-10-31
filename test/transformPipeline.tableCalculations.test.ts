jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

describe('transformPipeline: Table Calculations integration', () => {
  const sampleRecords = [
    { region: 'North', city: 'Milan', sales: 60 },
    { region: 'North', city: 'Turin', sales: 40 },
    { region: 'South', city: 'Naples', sales: 100 },
  ];

  it('enriches flat columns and tree nodes with pct_of_total calculation', () => {
    const props = transformProps({
      width: 800,
      height: 600,
      formData: {
        groupby: ['region', 'city'],
        metrics: ['sales'],
        showGrandTotal: true,
        tableCalculations: JSON.stringify([
          { metric: 'sales', type: 'pct_of_total' },
        ]),
      },
      queriesData: [{ data: sampleRecords }],
    } as unknown as HierarchicalTableChartProps);

    const calcCol = props.columns.find(c => c.key === 'sales___calc_pct_of_total');
    expect(calcCol).toBeDefined();
    expect(calcCol?.title).toBe('% Total (sales)');
    expect(calcCol?.calculationType).toBe('pct_of_total');

    // Total sales = 60 + 40 + 100 = 200
    expect(props.grandTotalNode?.metrics?.['sales']).toBe(200);
    expect(props.grandTotalNode?.metrics?.['sales___calc_pct_of_total']).toBe(100);

    const north = props.data.find(n => n.name === 'North');
    expect(north).toBeDefined();
    // North total = 100 -> 50%
    expect(north?.metrics?.['sales___calc_pct_of_total']).toBe(50);

    const south = props.data.find(n => n.name === 'South');
    expect(south?.metrics?.['sales___calc_pct_of_total']).toBe(50);

    const milan = north?.children?.find(c => c.name === 'Milan');
    // Milan = 60 -> 30% of total
    expect(milan?.metrics?.['sales___calc_pct_of_total']).toBe(30);
  });

  it('enriches tree nodes with pct_of_parent calculation', () => {
    const props = transformProps({
      width: 800,
      height: 600,
      formData: {
        groupby: ['region', 'city'],
        metrics: ['sales'],
        tableCalculations: [
          { metric: 'sales', type: 'pct_of_parent' },
        ],
      },
      queriesData: [{ data: sampleRecords }],
    } as unknown as HierarchicalTableChartProps);

    const calcCol = props.columns.find(c => c.key === 'sales___calc_pct_of_parent');
    expect(calcCol).toBeDefined();

    const north = props.data.find(n => n.name === 'North');
    // Root level: North is 50% of the overall Grand Total (100 / 200)
    expect(north?.metrics?.['sales___calc_pct_of_parent']).toBe(50);

    // Milan = 60 out of North's 100 = 60%
    const milan = north?.children?.find(c => c.name === 'Milan');
    expect(milan?.metrics?.['sales___calc_pct_of_parent']).toBe(60);

    // Turin = 40 out of North's 100 = 40%
    const turin = north?.children?.find(c => c.name === 'Turin');
    expect(turin?.metrics?.['sales___calc_pct_of_parent']).toBe(40);
  });

  it('computes rank among siblings', () => {
    const props = transformProps({
      width: 800,
      height: 600,
      formData: {
        groupby: ['region', 'city'],
        metrics: ['sales'],
        tableCalculations: [
          { metric: 'sales', type: 'rank', rankMethod: 'competition' },
        ],
      },
      queriesData: [{ data: sampleRecords }],
    } as unknown as HierarchicalTableChartProps);

    const calcCol = props.columns.find(c => c.key === 'sales___calc_rank');
    expect(calcCol).toBeDefined();

    const north = props.data.find(n => n.name === 'North');
    const milan = north?.children?.find(c => c.name === 'Milan');
    const turin = north?.children?.find(c => c.name === 'Turin');

    // Milan (60) has rank 1, Turin (40) has rank 2 among North's children
    expect(milan?.metrics?.['sales___calc_rank']).toBe(1);
    expect(turin?.metrics?.['sales___calc_rank']).toBe(2);

    expect(calcCol?.formatter?.(1)).toBe('#1');
    expect(calcCol?.formatter?.(2)).toBe('#2');
  });

  it('applies running total across siblings', () => {
    const props = transformProps({
      width: 800,
      height: 600,
      formData: {
        groupby: ['region', 'city'],
        metrics: ['sales'],
        tableCalculations: [
          { metric: 'sales', type: 'running_total', scope: 'siblings' },
        ],
      },
      queriesData: [{ data: sampleRecords }],
    } as unknown as HierarchicalTableChartProps);

    const calcCol = props.columns.find(c => c.key === 'sales___calc_running_total');
    expect(calcCol).toBeDefined();

    const north = props.data.find(n => n.name === 'North');
    const milan = north?.children?.find(c => c.name === 'Milan');
    const turin = north?.children?.find(c => c.name === 'Turin');

    expect(milan?.metrics?.['sales___calc_running_total']).toBe(60);
    expect(turin?.metrics?.['sales___calc_running_total']).toBe(100);
  });
});
