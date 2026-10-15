jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `${fmt}(${val})`,
}));

import { TreeNode } from '../src/types';
import {
  computePercentOfTotal,
  computePercentOfParent,
  computeDiffFromPrevious,
  computeDiffFromPreviousPct,
  computeSiblingRanks,
  computeRunningTotalOnPeriods,
  computeRunningTotalOnSiblings,
  applyTableCalculations,
  normalizeTableCalculations,
  TableCalculationConfig,
} from '../src/utils/tableCalculations';

describe('tableCalculations: pure calculation units', () => {
  describe('computePercentOfTotal', () => {
    it('computes correct percentage of total', () => {
      expect(computePercentOfTotal(25, 100)).toBe(25);
      expect(computePercentOfTotal(150, 600)).toBe(25);
      expect(computePercentOfTotal(33.333, 100)).toBeCloseTo(33.333, 3);
    });

    it('returns null when total is zero, null or undefined', () => {
      expect(computePercentOfTotal(25, 0)).toBeNull();
      expect(computePercentOfTotal(25, null)).toBeNull();
      expect(computePercentOfTotal(25, undefined)).toBeNull();
    });

    it('returns null when value is null, undefined or NaN', () => {
      expect(computePercentOfTotal(null, 100)).toBeNull();
      expect(computePercentOfTotal(undefined, 100)).toBeNull();
      expect(computePercentOfTotal(NaN, 100)).toBeNull();
    });
  });

  describe('computePercentOfParent', () => {
    it('computes percentage of parent node value', () => {
      expect(computePercentOfParent(50, 200)).toBe(25);
      expect(computePercentOfParent(200, 200)).toBe(100);
    });

    it('returns null when parent value is zero or missing', () => {
      expect(computePercentOfParent(50, 0)).toBeNull();
      expect(computePercentOfParent(50, null)).toBeNull();
      expect(computePercentOfParent(null, 200)).toBeNull();
    });
  });

  describe('computeDiffFromPrevious and computeDiffFromPreviousPct', () => {
    it('computes absolute difference from previous value', () => {
      expect(computeDiffFromPrevious(120, 100)).toBe(20);
      expect(computeDiffFromPrevious(80, 100)).toBe(-20);
      expect(computeDiffFromPrevious(100, null)).toBeNull();
      expect(computeDiffFromPrevious(null, 100)).toBeNull();
    });

    it('computes percentage difference from previous value', () => {
      expect(computeDiffFromPreviousPct(120, 100)).toBe(20);
      expect(computeDiffFromPreviousPct(50, 100)).toBe(-50);
      expect(computeDiffFromPreviousPct(100, 0)).toBeNull();
      expect(computeDiffFromPreviousPct(100, null)).toBeNull();
    });
  });

  describe('computeSiblingRanks', () => {
    const makeNode = (id: string, val: number | null): TreeNode => ({
      id,
      key: id,
      name: id,
      depth: 1,
      path: [id],
      isLeaf: true,
      metrics: { volume: val },
    });

    it('assigns competition rank (1, 2, 2, 4) in descending order by default', () => {
      const siblings = [
        makeNode('A', 100),
        makeNode('B', 80),
        makeNode('C', 80),
        makeNode('D', 50),
      ];
      const ranks = computeSiblingRanks(siblings, 'volume', 'competition', 'desc');
      expect(ranks.get('A')).toBe(1);
      expect(ranks.get('B')).toBe(2);
      expect(ranks.get('C')).toBe(2);
      expect(ranks.get('D')).toBe(4);
    });

    it('assigns dense rank (1, 2, 2, 3) in descending order', () => {
      const siblings = [
        makeNode('A', 100),
        makeNode('B', 80),
        makeNode('C', 80),
        makeNode('D', 50),
      ];
      const ranks = computeSiblingRanks(siblings, 'volume', 'dense', 'desc');
      expect(ranks.get('A')).toBe(1);
      expect(ranks.get('B')).toBe(2);
      expect(ranks.get('C')).toBe(2);
      expect(ranks.get('D')).toBe(3);
    });

    it('supports ascending order (lowest value gets rank 1)', () => {
      const siblings = [
        makeNode('A', 100),
        makeNode('B', 20),
        makeNode('C', 50),
      ];
      const ranks = computeSiblingRanks(siblings, 'volume', 'competition', 'asc');
      expect(ranks.get('B')).toBe(1);
      expect(ranks.get('C')).toBe(2);
      expect(ranks.get('A')).toBe(3);
    });

    it('assigns null rank to nodes with null or undefined metrics', () => {
      const siblings = [
        makeNode('A', 100),
        makeNode('B', null),
        makeNode('C', 50),
      ];
      const ranks = computeSiblingRanks(siblings, 'volume', 'competition', 'desc');
      expect(ranks.get('A')).toBe(1);
      expect(ranks.get('C')).toBe(2);
      expect(ranks.get('B')).toBeNull();
    });
  });

  describe('running totals', () => {
    it('computes cumulative sum across ordered pivot periods', () => {
      const metrics = {
        'val___2024-01': 100,
        'val___2024-02': 150,
        'val___2024-03': 50,
      };
      const periods = ['2024-01', '2024-02', '2024-03'];
      const running = computeRunningTotalOnPeriods(metrics, 'val', periods);
      expect(running['val___2024-01']).toBe(100);
      expect(running['val___2024-02']).toBe(250);
      expect(running['val___2024-03']).toBe(300);
    });

    it('computes running total on siblings in tree order', () => {
      const siblings: TreeNode[] = [
        { id: '1', key: '1', name: '1', depth: 1, path: ['1'], isLeaf: true, metrics: { cost: 10 } },
        { id: '2', key: '2', name: '2', depth: 1, path: ['2'], isLeaf: true, metrics: { cost: 25 } },
        { id: '3', key: '3', name: '3', depth: 1, path: ['3'], isLeaf: true, metrics: { cost: 15 } },
      ];
      const running = computeRunningTotalOnSiblings(siblings, 'cost');
      expect(running.get('1')).toBe(10);
      expect(running.get('2')).toBe(35);
      expect(running.get('3')).toBe(50);
    });
  });
});

describe('tableCalculations: tree enrichment & normalization', () => {
  it('normalizes table calculations from JSON or array config', () => {
    const raw = JSON.stringify([
      { metric: 'revenue', type: 'pct_of_total', displayMode: 'companion_column' },
      { metric: 'cost', type: 'rank', rankMethod: 'dense', rankOrder: 'asc' },
    ]);
    const configs = normalizeTableCalculations(raw);
    expect(configs).toHaveLength(2);
    expect(configs[0].metric).toBe('revenue');
    expect(configs[0].type).toBe('pct_of_total');
    expect(configs[1].rankMethod).toBe('dense');
    expect(configs[1].rankOrder).toBe('asc');
  });

  it('merges calculation declared in MetricDefinition', () => {
    const definitions = [
      {
        metric: 'admissions',
        type: 'sum' as const,
        calculation: 'pct_of_parent' as const,
      },
    ];
    const configs = normalizeTableCalculations([], definitions);
    expect(configs).toHaveLength(1);
    expect(configs[0].metric).toBe('admissions');
    expect(configs[0].type).toBe('pct_of_parent');
  });

  it('applies table calculations across a multi-level tree', () => {
    const rootA: TreeNode = {
      id: 'A',
      key: 'A',
      name: 'Regione A',
      depth: 0,
      path: ['Regione A'],
      isLeaf: false,
      metrics: { volume: 600 },
      children: [
        {
          id: 'A1',
          key: 'A1',
          name: 'ASL 1',
          depth: 1,
          path: ['Regione A', 'ASL 1'],
          isLeaf: true,
          metrics: { volume: 450 },
        },
        {
          id: 'A2',
          key: 'A2',
          name: 'ASL 2',
          depth: 1,
          path: ['Regione A', 'ASL 2'],
          isLeaf: true,
          metrics: { volume: 150 },
        },
      ],
    };

    const rootB: TreeNode = {
      id: 'B',
      key: 'B',
      name: 'Regione B',
      depth: 0,
      path: ['Regione B'],
      isLeaf: true,
      metrics: { volume: 400 },
    };

    const grandTotal: TreeNode = {
      id: '__grand_total__',
      key: '__grand_total__',
      name: 'Grand Total',
      depth: 0,
      path: ['Grand Total'],
      isLeaf: false,
      metrics: { volume: 1000 },
    };

    const tree = [rootA, rootB];
    const configs: TableCalculationConfig[] = [
      { metric: 'volume', type: 'pct_of_total', displayMode: 'companion_column' },
      { metric: 'volume', type: 'pct_of_parent', displayMode: 'companion_column' },
      { metric: 'volume', type: 'rank', rankMethod: 'competition', rankOrder: 'desc' },
    ];

    applyTableCalculations(tree, grandTotal, configs);

    const calcTotalKey = 'volume___calc_pct_of_total';
    const calcParentKey = 'volume___calc_pct_of_parent';
    const calcRankKey = 'volume___calc_rank';

    // Grand total checks
    expect(grandTotal.metrics[calcTotalKey]).toBe(100);
    expect(grandTotal.metrics[calcParentKey]).toBe(100);

    // Root checks: Regione A has 600/1000 = 60%, Regione B has 400/1000 = 40%
    expect(rootA.metrics[calcTotalKey]).toBe(60);
    expect(rootB.metrics[calcTotalKey]).toBe(40);
    expect(rootA.metrics[calcParentKey]).toBe(60); // Root parent is grand total
    expect(rootB.metrics[calcParentKey]).toBe(40);

    // Root ranks: A is 1, B is 2
    expect(rootA.metrics[calcRankKey]).toBe(1);
    expect(rootB.metrics[calcRankKey]).toBe(2);

    // Children of A checks: ASL 1 has 450/1000 = 45% of total, 450/600 = 75% of parent
    const childA1 = rootA.children![0];
    const childA2 = rootA.children![1];

    expect(childA1.metrics[calcTotalKey]).toBe(45);
    expect(childA1.metrics[calcParentKey]).toBe(75);
    expect(childA1.metrics[calcRankKey]).toBe(1);

    // ASL 2 has 150/1000 = 15% of total, 150/600 = 25% of parent
    expect(childA2.metrics[calcTotalKey]).toBe(15);
    expect(childA2.metrics[calcParentKey]).toBe(25);
    expect(childA2.metrics[calcRankKey]).toBe(2);
  });
});
