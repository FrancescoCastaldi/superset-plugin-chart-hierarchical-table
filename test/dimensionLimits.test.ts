import { TreeNode, DimensionLimitRule } from '../src/types';
import {
  normalizeDimensionLimits,
  formatOthersLabel,
  findMatchingLimitRule,
  applyDimensionLimits,
} from '../src/utils/dimensionLimits';

describe('dimensionLimits: pure unit and integration tests', () => {
  describe('normalizeDimensionLimits', () => {
    it('parses JSON string correctly', () => {
      const json = JSON.stringify([
        { level: 1, limit: 5, metric: 'volume', mode: 'top' },
      ]);
      const normalized = normalizeDimensionLimits(json);
      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toEqual({
        level: 1,
        limit: 5,
        metric: 'volume',
        mode: 'top',
        othersLabel: 'Altri ({k})',
      });
    });

    it('filters out rules with non-positive limit', () => {
      const rules = [
        { level: 0, limit: 0 },
        { level: 1, limit: -3 },
        { level: 2, limit: 5 },
      ];
      const normalized = normalizeDimensionLimits(rules);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].level).toBe(2);
      expect(normalized[0].limit).toBe(5);
    });

    it('returns empty array on invalid inputs', () => {
      expect(normalizeDimensionLimits(null)).toEqual([]);
      expect(normalizeDimensionLimits(undefined)).toEqual([]);
      expect(normalizeDimensionLimits('invalid json')).toEqual([]);
      expect(normalizeDimensionLimits(123)).toEqual([]);
    });
  });

  describe('formatOthersLabel', () => {
    it('formats label with {k} count', () => {
      expect(formatOthersLabel('Altri ({k})', 4)).toBe('Altri (4)');
      expect(formatOthersLabel('Remaining ({count}) items', 12)).toBe('Remaining (12) items');
      expect(formatOthersLabel(undefined, 3)).toBe('Altri (3)');
    });
  });

  describe('findMatchingLimitRule', () => {
    const rules: DimensionLimitRule[] = [
      { level: 0, limit: 3, othersLabel: 'Altri ({k})' },
      { dimension: 'city', limit: 2, othersLabel: 'Altri ({k})' },
    ];

    it('matches by level', () => {
      const rule = findMatchingLimitRule(rules, 0, 'region');
      expect(rule?.limit).toBe(3);
    });

    it('matches by dimension when level does not match', () => {
      const rule = findMatchingLimitRule(rules, 1, 'city');
      expect(rule?.limit).toBe(2);
    });

    it('returns undefined when no rule matches', () => {
      const rule = findMatchingLimitRule(rules, 2, 'hospital');
      expect(rule).toBeUndefined();
    });
  });

  describe('applyDimensionLimits', () => {
    const createNode = (name: string, sales: number | null, depth: number = 0, dimension: string = 'city'): TreeNode => ({
      key: name,
      id: name,
      name,
      depth,
      dimension,
      path: [name],
      isLeaf: true,
      metrics: { sales },
    });

    it('collapses siblings beyond Top N into an Others node and preserves exact metric sum', () => {
      const siblings: TreeNode[] = [
        createNode('Rome', 100),
        createNode('Milan', 250),
        createNode('Naples', 80),
        createNode('Turin', 50),
        createNode('Florence', 30),
      ];

      // Total sales: 100 + 250 + 80 + 50 + 30 = 510
      const rules: DimensionLimitRule[] = [{ level: 0, limit: 2, metric: 'sales', mode: 'top' }];

      const result = applyDimensionLimits(siblings, rules, 'sales');

      // Top 2 kept: Milan (250), Rome (100) + 1 Others node (Naples 80 + Turin 50 + Florence 30 = 160)
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Milan');
      expect(result[0].metrics.sales).toBe(250);
      expect(result[1].name).toBe('Rome');
      expect(result[1].metrics.sales).toBe(100);

      const others = result[2];
      expect(others.isOthers).toBe(true);
      expect(others.othersCount).toBe(3);
      expect(others.name).toBe('Altri (3)');
      expect(others.metrics.sales).toBe(160);

      // Exact additive invariant check
      const totalSum = result.reduce((acc, n) => acc + (Number(n.metrics.sales) || 0), 0);
      expect(totalSum).toBe(510);
    });

    it('keeps all items when sibling count is less than or equal to limit', () => {
      const siblings: TreeNode[] = [
        createNode('Rome', 100),
        createNode('Milan', 200),
      ];
      const rules: DimensionLimitRule[] = [{ level: 0, limit: 5 }];
      const result = applyDimensionLimits(siblings, rules, 'sales');

      expect(result).toHaveLength(2);
      expect(result.some(n => n.isOthers)).toBe(false);
    });

    it('supports bottom mode (smallest values kept, largest collapsed into others)', () => {
      const siblings: TreeNode[] = [
        createNode('A', 10),
        createNode('B', 50),
        createNode('C', 5),
        createNode('D', 100),
      ];
      // Total = 165
      const rules: DimensionLimitRule[] = [{ level: 0, limit: 2, metric: 'sales', mode: 'bottom' }];
      const result = applyDimensionLimits(siblings, rules, 'sales');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('C'); // 5
      expect(result[1].name).toBe('A'); // 10

      const others = result[2];
      expect(others.isOthers).toBe(true);
      expect(others.othersCount).toBe(2);
      // B (50) + D (100) = 150
      expect(others.metrics.sales).toBe(150);

      const totalSum = result.reduce((acc, n) => acc + (Number(n.metrics.sales) || 0), 0);
      expect(totalSum).toBe(165);
    });

    it('recursively limits children at nested depth without modifying parent level', () => {
      const parentRoot: TreeNode = {
        key: 'Italy',
        id: 'Italy',
        name: 'Italy',
        depth: 0,
        dimension: 'country',
        path: ['Italy'],
        isLeaf: false,
        metrics: { sales: 300 },
        children: [
          createNode('Rome', 150, 1, 'city'),
          createNode('Milan', 100, 1, 'city'),
          createNode('Naples', 50, 1, 'city'),
        ],
      };

      // Rule only on level 1 (limit: 1 for city)
      const rules: DimensionLimitRule[] = [{ level: 1, limit: 1, metric: 'sales' }];
      const result = applyDimensionLimits([parentRoot], rules, 'sales');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Italy');
      expect(result[0].metrics.sales).toBe(300);

      const children = result[0].children!;
      expect(children).toHaveLength(2);
      expect(children[0].name).toBe('Rome');
      expect(children[0].metrics.sales).toBe(150);

      const others = children[1];
      expect(others.isOthers).toBe(true);
      expect(others.othersCount).toBe(2);
      expect(others.metrics.sales).toBe(150); // Milan (100) + Naples (50)
    });

    it('handles null and missing metric values placing them after valid numbers', () => {
      const siblings: TreeNode[] = [
        createNode('A', 50),
        createNode('B', null),
        createNode('C', 100),
      ];
      const rules: DimensionLimitRule[] = [{ level: 0, limit: 1, metric: 'sales', mode: 'top' }];
      const result = applyDimensionLimits(siblings, rules, 'sales');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('C'); // 100
      expect(result[1].isOthers).toBe(true);
      expect(result[1].metrics.sales).toBe(50); // A (50) + B (null -> 0)
    });
  });
});
