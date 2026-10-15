jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import transformProps from '../src/plugin/transformProps';
import { buildContextMenuFilters } from '../src/plugin/contextMenu';
import { HierarchicalTableChartProps } from '../src/types';

describe('transformPipeline: Dimension Limits & Top N integration', () => {
  const sampleRecords = [
    { region: 'Lombardia', city: 'Milano', sales: 500 },
    { region: 'Lombardia', city: 'Brescia', sales: 200 },
    { region: 'Lombardia', city: 'Bergamo', sales: 150 },
    { region: 'Lombardia', city: 'Monza', sales: 100 },
    { region: 'Lombardia', city: 'Como', sales: 50 },
    { region: 'Lazio', city: 'Roma', sales: 800 },
    { region: 'Lazio', city: 'Latina', sales: 80 },
    { region: 'Lazio', city: 'Frosinone', sales: 60 },
  ];

  it('limits child dimension level to Top 2 and aggregates remainder into Altri node', () => {
    const props = transformProps({
      width: 800,
      height: 600,
      formData: {
        groupby: ['region', 'city'],
        metrics: ['sales'],
        showGrandTotal: true,
        dimensionLimits: JSON.stringify([
          { level: 1, limit: 2, metric: 'sales', mode: 'top' },
        ]),
      },
      queriesData: [{ data: sampleRecords }],
    } as unknown as HierarchicalTableChartProps);

    // Total sales across all records = 500+200+150+100+50 + 800+80+60 = 1940
    expect(props.grandTotalNode?.metrics?.['sales']).toBe(1940);

    const lombardia = props.data.find(n => n.name === 'Lombardia');
    expect(lombardia).toBeDefined();
    // Lombardia subtotal is exactly 1000
    expect(lombardia?.metrics?.['sales']).toBe(1000);

    // Children in Lombardia: Milano (500), Brescia (200), and Altri (3) with 150+100+50 = 300
    const lombardiaChildren = lombardia!.children!;
    expect(lombardiaChildren).toHaveLength(3);
    expect(lombardiaChildren[0].name).toBe('Milano');
    expect(lombardiaChildren[0].metrics.sales).toBe(500);
    expect(lombardiaChildren[1].name).toBe('Brescia');
    expect(lombardiaChildren[1].metrics.sales).toBe(200);

    const lombardiaOthers = lombardiaChildren[2];
    expect(lombardiaOthers.isOthers).toBe(true);
    expect(lombardiaOthers.othersCount).toBe(3);
    expect(lombardiaOthers.name).toBe('Altri (3)');
    expect(lombardiaOthers.metrics.sales).toBe(300);

    // Mathematical balance check: sum of children = 500 + 200 + 300 = 1000
    const childrenSum = lombardiaChildren.reduce((acc, c) => acc + Number(c.metrics.sales), 0);
    expect(childrenSum).toBe(1000);
  });

  it('safely handles context menu on synthetic Altri node without leaking synthetic label to db filters', () => {
    const props = transformProps({
      width: 800,
      height: 600,
      formData: {
        groupby: ['region', 'city'],
        metrics: ['sales'],
        dimensionLimits: [
          { level: 1, limit: 1, metric: 'sales', mode: 'top' },
        ],
      },
      queriesData: [{ data: sampleRecords }],
    } as unknown as HierarchicalTableChartProps);

    const lazio = props.data.find(n => n.name === 'Lazio');
    const lazioOthers = lazio?.children?.find(c => c.isOthers);
    expect(lazioOthers).toBeDefined();

    // Right-clicking on the Altri node in the hierarchy column
    const filters = buildContextMenuFilters(
      { node: lazioOthers!, column: props.columns[0] },
      { dimensions: ['region', 'city'] },
    );

    // It should filter by parent level region == 'Lazio', but NOT city == 'Altri (2)'
    expect(filters.drillToDetail).toBeDefined();
    expect(filters.drillToDetail).toHaveLength(1);
    expect(filters.drillToDetail![0].col).toBe('region');
    expect(filters.drillToDetail![0].val).toBe('Lazio');
  });
});
