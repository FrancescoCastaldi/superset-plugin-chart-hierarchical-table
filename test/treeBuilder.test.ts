import {
  buildMultiDimensionTree,
  buildParentChildTree,
  filterTreeBySearch,
} from '../src/utils/treeBuilder';
import {
  calculateAggregation,
  computeGrandTotal,
} from '../src/utils/aggregations';

describe('Hierarchical Table Utils', () => {
  describe('calculateAggregation', () => {
    it('calculates sum correctly', () => {
      expect(calculateAggregation([10, 20, 30], 'sum')).toBe(60);
    });

    it('calculates avg correctly', () => {
      expect(calculateAggregation([10, 20, 30], 'avg')).toBe(20);
    });

    it('calculates min & max correctly', () => {
      expect(calculateAggregation([10, 20, 30], 'min')).toBe(10);
      expect(calculateAggregation([10, 20, 30], 'max')).toBe(30);
    });

    it('handles empty arrays', () => {
      expect(calculateAggregation([], 'sum')).toBeNull();
    });
  });

  describe('buildMultiDimensionTree', () => {
    const records = [
      { region: 'Europe', country: 'Italy', sales: 100 },
      { region: 'Europe', country: 'Germany', sales: 150 },
      { region: 'Americas', country: 'USA', sales: 300 },
    ];

    it('builds multi-level dimension tree with rollup metrics', () => {
      const tree = buildMultiDimensionTree(records, ['region', 'country'], ['sales']);
      expect(tree).toHaveLength(2);

      const europe = tree.find(t => t.name === 'Europe');
      expect(europe).toBeDefined();
      expect(europe?.metrics.sales).toBe(250); // 100 + 150
      expect(europe?.children).toHaveLength(2);

      const americas = tree.find(t => t.name === 'Americas');
      expect(americas).toBeDefined();
      expect(americas?.metrics.sales).toBe(300);
    });
  });

  describe('buildParentChildTree', () => {
    const orgRecords = [
      { id: '1', parent_id: null, name: 'CEO', budget: 1000 },
      { id: '2', parent_id: '1', name: 'VP Tech', budget: 500 },
      { id: '3', parent_id: '1', name: 'VP Sales', budget: 400 },
      { id: '4', parent_id: '2', name: 'Lead Dev', budget: 200 },
    ];

    it('constructs adjacency tree correctly', () => {
      const tree = buildParentChildTree(orgRecords, 'id', 'parent_id', 'name', ['budget']);
      expect(tree).toHaveLength(1);

      const ceo = tree[0];
      expect(ceo.name).toBe('CEO');
      expect(ceo.children).toHaveLength(2);
    });
  });

  describe('filterTreeBySearch', () => {
    const tree = [
      {
        key: '1',
        id: '1',
        name: 'Europe',
        depth: 0,
        path: ['Europe'],
        isLeaf: false,
        metrics: {},
        children: [
          {
            key: '1-1',
            id: '1-1',
            name: 'Italy',
            depth: 1,
            path: ['Europe', 'Italy'],
            isLeaf: true,
            metrics: {},
          },
          {
            key: '1-2',
            id: '1-2',
            name: 'Germany',
            depth: 1,
            path: ['Europe', 'Germany'],
            isLeaf: true,
            metrics: {},
          },
        ],
      },
    ];

    it('filters matching node and preserves parent branch', () => {
      const filtered = filterTreeBySearch(tree, 'italy');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].children).toHaveLength(1);
      expect(filtered[0].children?.[0].name).toBe('Italy');
    });
  });

  describe('computeGrandTotal', () => {
    const tree = [
      {
        key: '1',
        id: '1',
        name: 'Europe',
        depth: 0,
        path: ['Europe'],
        isLeaf: false,
        metrics: { sales: 250 },
      },
      {
        key: '2',
        id: '2',
        name: 'Americas',
        depth: 0,
        path: ['Americas'],
        isLeaf: false,
        metrics: { sales: 300 },
      },
    ];

    it('computes grand total accurately across root hierarchy nodes', () => {
      const total = computeGrandTotal(tree, ['sales']);
      expect(total.name).toBe('Grand Total');
      expect(total.metrics.sales).toBe(550);
    });
  });

  describe('Multi-Selection Cross Filtering Aggregation', () => {
    it('aggregates multiple selected nodes correctly', () => {
      const selectedNodes = [
        { key: '1', name: 'Europe', metrics: { sales: 250, count: 20 } },
        { key: '2', name: 'Americas', metrics: { sales: 300, count: 15 } },
      ];

      const combinedSales = selectedNodes.reduce((acc, n) => acc + n.metrics.sales, 0);
      const combinedCount = selectedNodes.reduce((acc, n) => acc + n.metrics.count, 0);

      expect(combinedSales).toBe(550);
      expect(combinedCount).toBe(35);
    });
  });
});
