import { TableColumn, TreeNode } from '../src/types';
import {
  buildContextMenuFilters,
  ContextMenuFilterOptions,
} from '../src/plugin/contextMenu';

describe('Task 1.2: buildContextMenuFilters (Superset Context Menu & Drill)', () => {
  const leafNode3Levels: TreeNode = {
    key: 'Europe > Italy > Rome',
    id: 'Europe > Italy > Rome',
    name: 'Rome',
    dimension: 'city',
    depth: 2,
    path: ['Europe', 'Italy', 'Rome'],
    isLeaf: true,
    metrics: { sales: 100 },
  };

  const parentNode1Level: TreeNode = {
    key: 'Europe',
    id: 'Europe',
    name: 'Europe',
    dimension: 'region',
    depth: 0,
    path: ['Europe'],
    isLeaf: false,
    metrics: { sales: 500 },
  };

  const baseOptions: ContextMenuFilterOptions = {
    dimensions: ['region', 'country', 'city'],
    hierarchyType: 'multi_dimension',
  };

  // Case 1: foglia 3 livelli
  it('1. builds filters for 3-level leaf node', () => {
    const result = buildContextMenuFilters(
      { node: leafNode3Levels },
      baseOptions,
    );

    expect(result.drillToDetail).toEqual([
      { col: 'region', op: '==', val: 'Europe', formattedVal: 'Europe' },
      { col: 'country', op: '==', val: 'Italy', formattedVal: 'Italy' },
      { col: 'city', op: '==', val: 'Rome', formattedVal: 'Rome' },
    ]);
    expect(result.drillBy?.filters).toEqual(result.drillToDetail);
    expect(result.drillBy?.groupbyFieldName).toBe('groupby');
  });

  // Case 2: padre 1 livello
  it('2. builds filters for 1-level parent node', () => {
    const result = buildContextMenuFilters(
      { node: parentNode1Level },
      baseOptions,
    );

    expect(result.drillToDetail).toEqual([
      { col: 'region', op: '==', val: 'Europe', formattedVal: 'Europe' },
    ]);
    expect(result.drillBy?.filters).toEqual(result.drillToDetail);
  });

  // Case 3: pivot singolo
  it('3. adds pivot dimension filter for single pivot column', () => {
    const col: TableColumn = {
      key: 'sales___2023-01',
      title: '2023-01',
      dataIndex: 'sales___2023-01',
      isMetric: true,
      pivotValue: '2023-01',
    };

    const result = buildContextMenuFilters(
      { node: parentNode1Level, column: col },
      { ...baseOptions, pivotDimensions: ['period'] },
    );

    expect(result.drillToDetail).toEqual([
      { col: 'region', op: '==', val: 'Europe', formattedVal: 'Europe' },
      { col: 'period', op: '==', val: '2023-01', formattedVal: '2023-01' },
    ]);
    expect(result.drillBy?.filters).toEqual(result.drillToDetail);
  });

  // Case 4: pivot doppio
  it('4. splits compound pivotValue into two filters for double pivot', () => {
    const col: TableColumn = {
      key: 'sales___2023___September',
      title: 'September (sales)',
      dataIndex: 'sales___2023___September',
      isMetric: true,
      pivotValue: '2023 - September',
    };

    const result = buildContextMenuFilters(
      { node: parentNode1Level, column: col },
      { ...baseOptions, pivotDimensions: ['year', 'month'] },
    );

    expect(result.drillToDetail).toEqual([
      { col: 'region', op: '==', val: 'Europe', formattedVal: 'Europe' },
      { col: 'year', op: '==', val: '2023', formattedVal: '2023' },
      { col: 'month', op: '==', val: 'September', formattedVal: 'September' },
    ]);
    expect(result.drillBy?.filters).toEqual(result.drillToDetail);
  });

  // Case 5: ROW_TOTAL / SUBTOTAL
  it('5. omits pivot filters on ROW_TOTAL and SUBTOTAL columns', () => {
    const rowTotalCol: TableColumn = {
      key: 'sales___ROW_TOTAL',
      title: 'Total (sales)',
      dataIndex: 'sales___ROW_TOTAL',
      isMetric: true,
      pivotValue: 'Total',
    };

    const subtotalCol: TableColumn = {
      key: 'sales___2023___SUBTOTAL',
      title: 'Subtotal (sales)',
      dataIndex: 'sales___2023___SUBTOTAL',
      isMetric: true,
      pivotValue: '2023',
    };

    const resRowTotal = buildContextMenuFilters(
      { node: parentNode1Level, column: rowTotalCol },
      { ...baseOptions, pivotDimensions: ['period'] },
    );
    expect(resRowTotal.drillToDetail).toEqual([
      { col: 'region', op: '==', val: 'Europe', formattedVal: 'Europe' },
    ]);

    const resSubtotal = buildContextMenuFilters(
      { node: parentNode1Level, column: subtotalCol },
      { ...baseOptions, pivotDimensions: ['year', 'month'] },
    );
    expect(resSubtotal.drillToDetail).toEqual([
      { col: 'region', op: '==', val: 'Europe', formattedVal: 'Europe' },
    ]);
  });

  // Case 6: cella soppressa
  it('6. omits drillToDetail and drillBy when target cell is suppressed', () => {
    const suppressedNode: TreeNode = {
      ...leafNode3Levels,
      suppressed: {
        'sales___2023-01': '<5',
      },
    };

    const col: TableColumn = {
      key: 'sales___2023-01',
      title: '2023-01',
      dataIndex: 'sales___2023-01',
      isMetric: true,
      pivotValue: '2023-01',
    };

    const result = buildContextMenuFilters(
      { node: suppressedNode, column: col },
      { ...baseOptions, pivotDimensions: ['period'] },
    );

    expect(result.drillToDetail).toBeUndefined();
    expect(result.drillBy).toBeUndefined();
  });

  // Case 7: parent-child
  it('7. builds single filter on idColumn for parent-child hierarchy', () => {
    const parentChildNode: TreeNode = {
      key: '101',
      id: '101',
      name: 'Cardiology Clinic',
      depth: 1,
      path: ['Cardiology Clinic'],
      isLeaf: true,
      metrics: { visits: 42 },
      rawData: { clinic_id: 101, parent_clinic_id: 10, clinic_name: 'Cardiology Clinic' },
    };

    const result = buildContextMenuFilters(
      { node: parentChildNode },
      {
        hierarchyType: 'parent_child',
        idColumn: 'clinic_id',
      },
    );

    expect(result.drillToDetail).toEqual([
      { col: 'clinic_id', op: '==', val: 101, formattedVal: 'Cardiology Clinic' },
    ]);
    expect(result.drillBy?.filters).toEqual(result.drillToDetail);
  });

  // Extra requirements: Grand Total (node === null)
  it('generates only pivot filters for Grand Total (node === null)', () => {
    const col: TableColumn = {
      key: 'sales___2023-01',
      title: '2023-01',
      dataIndex: 'sales___2023-01',
      isMetric: true,
      pivotValue: '2023-01',
    };

    const result = buildContextMenuFilters(
      { node: null, column: col },
      { ...baseOptions, pivotDimensions: ['period'] },
    );

    expect(result.drillToDetail).toEqual([
      { col: 'period', op: '==', val: '2023-01', formattedVal: '2023-01' },
    ]);
  });

  // Extra requirements: null values excluded and rawPath priority
  it('excludes null levels and uses rawPath when present', () => {
    const nodeWithNullAndRaw: TreeNode = {
      key: '(Empty) > 2023-11-14',
      id: '(Empty) > 2023-11-14',
      name: '2023-11-14',
      depth: 1,
      path: ['(Empty)', '2023-11-14'],
      rawPath: [null, 1700000000000],
      isLeaf: true,
      metrics: { sales: 20 },
    };

    const result = buildContextMenuFilters(
      { node: nodeWithNullAndRaw },
      { dimensions: ['region', 'date'] },
    );

    // level 0 is null -> excluded
    // level 1 has rawPath 1700000000000 -> val is number, formattedVal is '2023-11-14'
    expect(result.drillToDetail).toEqual([
      { col: 'date', op: '==', val: 1700000000000, formattedVal: '2023-11-14' },
    ]);
  });
});
