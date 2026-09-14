jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) => (Array.isArray(val) ? val : [val]),
}));

import {
  sortTreeHierarchy,
  calculateMinMaxBounds,
  buildMultiDimensionTree,
  filterTreeBySearch,
} from '../src/utils/treeBuilder';
import {
  getNormalizedMetricValue,
  getHeatmapBgColor,
} from '../src/utils/formatters';
import { TreeNode } from '../src/types';

describe('In-Tree Hierarchical Sorting & Min/Max Conditional Formatting', () => {
  const sampleRecords = [
    { region: 'West', category: 'Furniture', sales: 200, profit: -50 },
    { region: 'West', category: 'Appliances', sales: 100, profit: 20 },
    { region: 'East', category: 'Technology', sales: 400, profit: 80 },
    { region: 'East', category: 'Furniture', sales: 150, profit: -10 },
    { region: 'Central', category: 'Supplies', sales: 50, profit: 5 },
  ];

  let tree: TreeNode[];

  beforeEach(() => {
    tree = buildMultiDimensionTree(sampleRecords, ['region', 'category'], ['sales', 'profit']);
  });

  describe('R1. Recursive In-Tree Hierarchical Sorting (Interactive & Sibling-Aware)', () => {
    it('sorts hierarchy category names alphabetically A-Z across roots and recursively within children', () => {
      const sorted = sortTreeHierarchy(tree, '__hierarchy_tree__', 'asc');

      // Roots: Central, East, West
      const rootNames = sorted.map(r => r.name);
      expect(rootNames).toEqual(['Central', 'East', 'West']);

      // East children: Furniture, Technology (A-Z)
      const east = sorted.find(r => r.name === 'East');
      expect(east?.children?.map(c => c.name)).toEqual(['Furniture', 'Technology']);

      // West children: Appliances, Furniture (A-Z)
      const west = sorted.find(r => r.name === 'West');
      expect(west?.children?.map(c => c.name)).toEqual(['Appliances', 'Furniture']);

      // Roll-up sums and nesting intact
      expect(east?.metrics.sales).toBe(550); // 400 + 150
      expect(west?.metrics.sales).toBe(300); // 200 + 100
    });

    it('sorts hierarchy category names alphabetically Z-A across roots and recursively within children', () => {
      const sorted = sortTreeHierarchy(tree, '__hierarchy_tree__', 'desc');

      // Roots: West, East, Central
      const rootNames = sorted.map(r => r.name);
      expect(rootNames).toEqual(['West', 'East', 'Central']);

      // East children: Technology, Furniture (Z-A)
      const east = sorted.find(r => r.name === 'East');
      expect(east?.children?.map(c => c.name)).toEqual(['Technology', 'Furniture']);

      // West children: Furniture, Appliances (Z-A)
      const west = sorted.find(r => r.name === 'West');
      expect(west?.children?.map(c => c.name)).toEqual(['Furniture', 'Appliances']);
    });

    it('sorts sibling nodes by metric value ascending', () => {
      const sorted = sortTreeHierarchy(tree, 'sales', 'asc');

      // Root totals: Central (50), West (300), East (550)
      const rootNames = sorted.map(r => r.name);
      expect(rootNames).toEqual(['Central', 'West', 'East']);

      // East children sales: Furniture (150) < Technology (400)
      const east = sorted.find(r => r.name === 'East');
      expect(east?.children?.map(c => c.name)).toEqual(['Furniture', 'Technology']);

      // West children sales: Appliances (100) < Furniture (200)
      const west = sorted.find(r => r.name === 'West');
      expect(west?.children?.map(c => c.name)).toEqual(['Appliances', 'Furniture']);
    });

    it('sorts sibling nodes by metric value descending', () => {
      const sorted = sortTreeHierarchy(tree, 'sales', 'desc');

      // Root totals: East (550), West (300), Central (50)
      const rootNames = sorted.map(r => r.name);
      expect(rootNames).toEqual(['East', 'West', 'Central']);

      // East children sales: Technology (400) > Furniture (150)
      const east = sorted.find(r => r.name === 'East');
      expect(east?.children?.map(c => c.name)).toEqual(['Technology', 'Furniture']);
    });

    it('correctly handles negative numbers when sorting', () => {
      // profit has negative values: West (-30), East (70), Central (5)
      const sortedAsc = sortTreeHierarchy(tree, 'profit', 'asc');
      const ascRoots = sortedAsc.map(r => r.name);
      // West (-30) < Central (5) < East (70)
      expect(ascRoots).toEqual(['West', 'Central', 'East']);

      const sortedDesc = sortTreeHierarchy(tree, 'profit', 'desc');
      const descRoots = sortedDesc.map(r => r.name);
      // East (70) > Central (5) > West (-30)
      expect(descRoots).toEqual(['East', 'Central', 'West']);
    });

    it('sorts null and undefined metric values to the end for both asc and desc', () => {
      const treeWithNulls: TreeNode[] = [
        { key: '1', id: '1', name: 'NodeA', depth: 0, path: ['NodeA'], isLeaf: true, metrics: { sales: null } },
        { key: '2', id: '2', name: 'NodeB', depth: 0, path: ['NodeB'], isLeaf: true, metrics: { sales: 20 } },
        { key: '3', id: '3', name: 'NodeC', depth: 0, path: ['NodeC'], isLeaf: true, metrics: { sales: undefined } },
        { key: '4', id: '4', name: 'NodeD', depth: 0, path: ['NodeD'], isLeaf: true, metrics: { sales: 10 } },
      ];

      const sortedAsc = sortTreeHierarchy(treeWithNulls, 'sales', 'asc');
      expect(sortedAsc.map(n => n.name)).toEqual(['NodeD', 'NodeB', 'NodeA', 'NodeC']);

      const sortedDesc = sortTreeHierarchy(treeWithNulls, 'sales', 'desc');
      expect(sortedDesc.map(n => n.name)).toEqual(['NodeB', 'NodeD', 'NodeA', 'NodeC']);
    });

    it('handles string metric values like "Nuovo" gracefully without NaN or errors', () => {
      const treeWithStrings: TreeNode[] = [
        { key: '1', id: '1', name: 'Alpha', depth: 0, path: ['Alpha'], isLeaf: true, metrics: { delta: 'Nuovo' } },
        { key: '2', id: '2', name: 'Beta', depth: 0, path: ['Beta'], isLeaf: true, metrics: { delta: 15.5 } },
        { key: '3', id: '3', name: 'Gamma', depth: 0, path: ['Gamma'], isLeaf: true, metrics: { delta: -5.0 } },
      ];

      const sortedAsc = sortTreeHierarchy(treeWithStrings, 'delta', 'asc');
      expect(sortedAsc).toBeDefined();
      expect(sortedAsc).toHaveLength(3);
      // Numeric values sorted (-5.0, 15.5), string handled
      expect(sortedAsc[0].name).toBe('Gamma');
      expect(sortedAsc[1].name).toBe('Beta');

      const sortedDesc = sortTreeHierarchy(treeWithStrings, 'delta', 'desc');
      expect(sortedDesc).toBeDefined();
      expect(sortedDesc[0].name).toBe('Beta');
      expect(sortedDesc[1].name).toBe('Gamma');
    });

    it('preserves original order when sortOrder is "none" or sortColumn is undefined', () => {
      const originalRoots = tree.map(r => r.name);
      const noneSorted = sortTreeHierarchy(tree, 'sales', 'none');
      expect(noneSorted.map(r => r.name)).toEqual(originalRoots);

      const undefinedSorted = sortTreeHierarchy(tree, undefined, 'asc');
      expect(undefinedSorted.map(r => r.name)).toEqual(originalRoots);
    });
  });

  describe('R3. Min/Max Conditional Formatting Engine & Scopes', () => {
    it('leaves_only scope excludes aggregated parent subtotals and includes only leaf values', () => {
      // Leaf sales:
      // West -> Furniture: 200, Appliances: 100
      // East -> Technology: 400, Furniture: 150
      // Central -> Supplies: 50
      // Parent subtotals (West: 300, East: 550, Central: 50) MUST be excluded
      const bounds = calculateMinMaxBounds(tree, ['sales'], 'leaves_only');
      expect(bounds.global.sales).toBeDefined();
      expect(bounds.global.sales.min).toBe(50); // Central -> Supplies
      expect(bounds.global.sales.max).toBe(400); // East -> Technology (NOT 550 from East parent subtotal!)
    });

    it('all_nodes scope includes both parent subtotals and leaf nodes', () => {
      const bounds = calculateMinMaxBounds(tree, ['sales'], 'all_nodes');
      expect(bounds.global.sales).toBeDefined();
      expect(bounds.global.sales.min).toBe(50);
      expect(bounds.global.sales.max).toBe(550); // Includes East parent rollup total 550
    });

    it('level_aware scope calculates min and max per hierarchy depth', () => {
      const bounds = calculateMinMaxBounds(tree, ['sales'], 'level_aware');
      expect(bounds.byLevel).toBeDefined();
      expect(bounds.byLevel?.sales).toBeDefined();

      // Depth 0 (Roots: Central 50, West 300, East 550)
      expect(bounds.byLevel?.sales[0]).toEqual({ min: 50, max: 550 });

      // Depth 1 (Leaves: 50, 100, 150, 200, 400)
      expect(bounds.byLevel?.sales[1]).toEqual({ min: 50, max: 400 });
    });

    it('handles zero range (min === max) without dividing by zero or producing NaN', () => {
      const identicalNodes: TreeNode[] = [
        { key: '1', id: '1', name: 'A', depth: 0, path: ['A'], isLeaf: true, metrics: { sales: 100 } },
        { key: '2', id: '2', name: 'B', depth: 0, path: ['B'], isLeaf: true, metrics: { sales: 100 } },
      ];

      const bounds = calculateMinMaxBounds(identicalNodes, ['sales'], 'leaves_only');
      expect(bounds.global.sales).toEqual({ min: 100, max: 100 });

      // getNormalizedMetricValue should return 0, never NaN
      const normalized = getNormalizedMetricValue(100, bounds.global.sales);
      expect(normalized).toBe(0);
      expect(isNaN(normalized)).toBe(false);
    });

    it('smoothly scales negative numbers and zero in normalization', () => {
      const bounds = { min: -100, max: 100 };

      expect(getNormalizedMetricValue(-100, bounds)).toBe(0);
      expect(getNormalizedMetricValue(0, bounds)).toBe(0.5);
      expect(getNormalizedMetricValue(100, bounds)).toBe(1);
      expect(getNormalizedMetricValue(-50, bounds)).toBe(0.25);
      expect(getNormalizedMetricValue(50, bounds)).toBe(0.75);
    });

    it('returns 0 for null, undefined, or string values', () => {
      const bounds = { min: 0, max: 100 };
      expect(getNormalizedMetricValue(null, bounds)).toBe(0);
      expect(getNormalizedMetricValue(undefined, bounds)).toBe(0);
      expect(getNormalizedMetricValue('Nuovo', bounds)).toBe(0);
    });

    it('getHeatmapBgColor generates valid RGBA colors for all 4 themes', () => {
      const themes = ['stratum', 'emerald', 'ocean', 'sunset'] as const;

      for (const theme of themes) {
        const colorZero = getHeatmapBgColor(0, theme);
        expect(colorZero).toBe('transparent');

        const colorHalf = getHeatmapBgColor(0.5, theme);
        expect(colorHalf).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);

        const colorFull = getHeatmapBgColor(1.0, theme);
        expect(colorFull).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      }
    });

    it('excludes Grand Total node from min/max bounds calculations', () => {
      const treeWithGrandTotal: TreeNode[] = [
        { key: '__grand_total__', id: '__grand_total__', name: 'Grand Total', depth: 0, path: ['Grand Total'], isLeaf: true, metrics: { sales: 99999 } },
        { key: '1', id: '1', name: 'A', depth: 0, path: ['A'], isLeaf: true, metrics: { sales: 10 } },
        { key: '2', id: '2', name: 'B', depth: 0, path: ['B'], isLeaf: true, metrics: { sales: 50 } },
      ];

      const bounds = calculateMinMaxBounds(treeWithGrandTotal, ['sales'], 'all_nodes');
      expect(bounds.global.sales.max).toBe(50); // NOT 99999
    });

    it('handles string-encoded numeric values in calculateMinMaxBounds and getNormalizedMetricValue', () => {
      const treeWithStringNumbers: TreeNode[] = [
        { key: '1', id: '1', name: 'A', depth: 0, path: ['A'], isLeaf: true, metrics: { sales: '25.5' } },
        { key: '2', id: '2', name: 'B', depth: 0, path: ['B'], isLeaf: true, metrics: { sales: '100' } },
        { key: '3', id: '3', name: 'C', depth: 0, path: ['C'], isLeaf: true, metrics: { sales: 'Nuovo' } },
      ];

      const bounds = calculateMinMaxBounds(treeWithStringNumbers, ['sales'], 'leaves_only');
      expect(bounds.global.sales).toBeDefined();
      expect(bounds.global.sales.min).toBe(25.5);
      expect(bounds.global.sales.max).toBe(100);

      // Normalization handles numeric strings smoothly
      expect(getNormalizedMetricValue('25.5', bounds.global.sales)).toBe(0);
      expect(getNormalizedMetricValue('100', bounds.global.sales)).toBe(1);
      expect(getNormalizedMetricValue('Nuovo', bounds.global.sales)).toBe(0);
    });

    it('falls back to node.subtotals when metrics[metric] is undefined in calculateMinMaxBounds', () => {
      const treeWithSubtotalsOnly: TreeNode[] = [
        {
          key: '1',
          id: '1',
          name: 'Parent',
          depth: 0,
          path: ['Parent'],
          isLeaf: false,
          metrics: {},
          subtotals: { sales: 450 },
        },
      ];

      const bounds = calculateMinMaxBounds(treeWithSubtotalsOnly, ['sales'], 'all_nodes');
      expect(bounds.global.sales).toBeDefined();
      expect(bounds.global.sales.min).toBe(450);
      expect(bounds.global.sales.max).toBe(450);
    });
  });

  describe('Edge Cases: Pivot Mode Sorting & Deep Hierarchies (Depth > 4)', () => {
    it('sorts nodes in Pivot Matrix Mode when sorting by base metric name (aggregating composite keys)', () => {
      const pivotNodes: TreeNode[] = [
        {
          key: '1',
          id: '1',
          name: 'Category Alpha',
          depth: 0,
          path: ['Category Alpha'],
          isLeaf: true,
          metrics: { 'sales___2023': 100, 'sales___2024': 50 }, // total sales = 150
        },
        {
          key: '2',
          id: '2',
          name: 'Category Beta',
          depth: 0,
          path: ['Category Beta'],
          isLeaf: true,
          metrics: { 'sales___2023': 300, 'sales___2024': 200 }, // total sales = 500
        },
        {
          key: '3',
          id: '3',
          name: 'Category Gamma',
          depth: 0,
          path: ['Category Gamma'],
          isLeaf: true,
          metrics: { 'sales___2023': 50, 'sales___2024': 20 }, // total sales = 70
        },
      ];

      // Sort by base metric 'sales' ascending
      const sortedAsc = sortTreeHierarchy(pivotNodes, 'sales', 'asc');
      expect(sortedAsc.map(n => n.name)).toEqual(['Category Gamma', 'Category Alpha', 'Category Beta']);

      // Sort by base metric 'sales' descending
      const sortedDesc = sortTreeHierarchy(pivotNodes, 'sales', 'desc');
      expect(sortedDesc.map(n => n.name)).toEqual(['Category Beta', 'Category Alpha', 'Category Gamma']);
    });

    it('recursively sorts deep hierarchies with depth > 4 preserving parent-child nesting', () => {
      // 5-level deep hierarchy: L0 -> L1 -> L2 -> L3 -> L4 -> L5
      const deepTree: TreeNode[] = [
        {
          key: 'root2',
          id: 'root2',
          name: 'Z-Root',
          depth: 0,
          path: ['Z-Root'],
          isLeaf: false,
          metrics: { volume: 200 },
          children: [
            {
              key: 'r2-l1-b',
              id: 'r2-l1-b',
              name: 'L1-Beta',
              depth: 1,
              path: ['Z-Root', 'L1-Beta'],
              isLeaf: false,
              metrics: { volume: 120 },
              children: [
                {
                  key: 'r2-l2-y',
                  id: 'r2-l2-y',
                  name: 'L2-Yellow',
                  depth: 2,
                  path: ['Z-Root', 'L1-Beta', 'L2-Yellow'],
                  isLeaf: false,
                  metrics: { volume: 80 },
                  children: [
                    {
                      key: 'r2-l3-q',
                      id: 'r2-l3-q',
                      name: 'L3-Quark',
                      depth: 3,
                      path: ['Z-Root', 'L1-Beta', 'L2-Yellow', 'L3-Quark'],
                      isLeaf: false,
                      metrics: { volume: 50 },
                      children: [
                        {
                          key: 'r2-l4-m2',
                          id: 'r2-l4-m2',
                          name: 'L4-M2',
                          depth: 4,
                          path: ['Z-Root', 'L1-Beta', 'L2-Yellow', 'L3-Quark', 'L4-M2'],
                          isLeaf: false,
                          metrics: { volume: 30 },
                          children: [
                            {
                              key: 'r2-l5-leaf2',
                              id: 'r2-l5-leaf2',
                              name: 'Leaf-Z',
                              depth: 5,
                              path: ['Z-Root', 'L1-Beta', 'L2-Yellow', 'L3-Quark', 'L4-M2', 'Leaf-Z'],
                              isLeaf: true,
                              metrics: { volume: 30 },
                            },
                          ],
                        },
                        {
                          key: 'r2-l4-m1',
                          id: 'r2-l4-m1',
                          name: 'L4-M1',
                          depth: 4,
                          path: ['Z-Root', 'L1-Beta', 'L2-Yellow', 'L3-Quark', 'L4-M1'],
                          isLeaf: false,
                          metrics: { volume: 20 },
                          children: [
                            {
                              key: 'r2-l5-leaf1',
                              id: 'r2-l5-leaf1',
                              name: 'Leaf-A',
                              depth: 5,
                              path: ['Z-Root', 'L1-Beta', 'L2-Yellow', 'L3-Quark', 'L4-M1', 'Leaf-A'],
                              isLeaf: true,
                              metrics: { volume: 20 },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          key: 'root1',
          id: 'root1',
          name: 'A-Root',
          depth: 0,
          path: ['A-Root'],
          isLeaf: false,
          metrics: { volume: 500 },
          children: [],
        },
      ];

      // 1. Sort by name A-Z
      const nameSorted = sortTreeHierarchy(deepTree, '__hierarchy_tree__', 'asc');
      expect(nameSorted[0].name).toBe('A-Root');
      expect(nameSorted[1].name).toBe('Z-Root');

      // Check depth 4 children sorted A-Z (L4-M1 before L4-M2)
      const l3 = nameSorted[1].children?.[0].children?.[0].children?.[0];
      expect(l3?.children?.map(c => c.name)).toEqual(['L4-M1', 'L4-M2']);

      // 2. Sort by volume desc
      const volSorted = sortTreeHierarchy(deepTree, 'volume', 'desc');
      expect(volSorted[0].name).toBe('A-Root'); // 500 > 200
      expect(volSorted[1].name).toBe('Z-Root');

      // Depth 4 children sorted by volume desc (L4-M2 [30] before L4-M1 [20])
      const volL3 = volSorted[1].children?.[0].children?.[0].children?.[0];
      expect(volL3?.children?.map(c => c.name)).toEqual(['L4-M2', 'L4-M1']);

      // 3. Level aware bounds across depth 0 to 5
      const levelBounds = calculateMinMaxBounds(deepTree, ['volume'], 'level_aware');
      expect(levelBounds.byLevel?.volume[0]).toEqual({ min: 200, max: 500 });
      expect(levelBounds.byLevel?.volume[4]).toEqual({ min: 20, max: 30 });
      expect(levelBounds.byLevel?.volume[5]).toEqual({ min: 20, max: 30 });
    });

    it('correctly aggregates disjoint pivot keys across asymmetric nodes when sorting by base metric', () => {
      // Disjoint pivot nodes: Node A only in 2023, Node B only in 2024, Node C in both, Node D in neither
      const asymmetricPivotNodes: TreeNode[] = [
        {
          key: 'n1',
          id: 'n1',
          name: 'Product A (2023 only)',
          depth: 0,
          path: ['Product A (2023 only)'],
          isLeaf: true,
          metrics: { 'sales___2023': 100 }, // total = 100
        },
        {
          key: 'n2',
          id: 'n2',
          name: 'Product B (2024 only)',
          depth: 0,
          path: ['Product B (2024 only)'],
          isLeaf: true,
          metrics: { 'sales___2024': 200 }, // total = 200
        },
        {
          key: 'n3',
          id: 'n3',
          name: 'Product C (Both years)',
          depth: 0,
          path: ['Product C (Both years)'],
          isLeaf: true,
          metrics: { 'sales___2023': 50, 'sales___2024': 30 }, // total = 80
        },
        {
          key: 'n4',
          id: 'n4',
          name: 'Product D (Empty)',
          depth: 0,
          path: ['Product D (Empty)'],
          isLeaf: true,
          metrics: {}, // total = null/undefined
        },
      ];

      // Sort by base metric 'sales' ascending: C (80) < A (100) < B (200) < D (null)
      const sortedAsc = sortTreeHierarchy(asymmetricPivotNodes, 'sales', 'asc');
      expect(sortedAsc.map(n => n.name)).toEqual([
        'Product C (Both years)',
        'Product A (2023 only)',
        'Product B (2024 only)',
        'Product D (Empty)',
      ]);

      // Sort by base metric 'sales' descending: B (200) > A (100) > C (80) > D (null)
      const sortedDesc = sortTreeHierarchy(asymmetricPivotNodes, 'sales', 'desc');
      expect(sortedDesc.map(n => n.name)).toEqual([
        'Product B (2024 only)',
        'Product A (2023 only)',
        'Product C (Both years)',
        'Product D (Empty)',
      ]);
    });

    it('keeps Grand Total pinned at the top regardless of sort column or direction', () => {
      const treeWithGrandTotal: TreeNode[] = [
        {
          key: '__grand_total__',
          id: '__grand_total__',
          name: 'Grand Total',
          depth: 0,
          path: ['Grand Total'],
          isLeaf: true,
          metrics: { sales: 9999 },
        },
        {
          key: 'item1',
          id: 'item1',
          name: 'Item Beta',
          depth: 0,
          path: ['Item Beta'],
          isLeaf: true,
          metrics: { sales: 50 },
        },
        {
          key: 'item2',
          id: 'item2',
          name: 'Item Alpha',
          depth: 0,
          path: ['Item Alpha'],
          isLeaf: true,
          metrics: { sales: 200 },
        },
      ];

      // Sort by metric asc: Grand Total remains first
      const metricAsc = sortTreeHierarchy(treeWithGrandTotal, 'sales', 'asc');
      expect(metricAsc[0].key).toBe('__grand_total__');
      expect(metricAsc[1].name).toBe('Item Beta'); // 50 < 200
      expect(metricAsc[2].name).toBe('Item Alpha');

      // Sort by metric desc: Grand Total remains first
      const metricDesc = sortTreeHierarchy(treeWithGrandTotal, 'sales', 'desc');
      expect(metricDesc[0].key).toBe('__grand_total__');
      expect(metricDesc[1].name).toBe('Item Alpha'); // 200 > 50
      expect(metricDesc[2].name).toBe('Item Beta');

      // Sort by name A-Z: Grand Total remains first
      const nameAsc = sortTreeHierarchy(treeWithGrandTotal, '__hierarchy_tree__', 'asc');
      expect(nameAsc[0].key).toBe('__grand_total__');
      expect(nameAsc[1].name).toBe('Item Alpha');
      expect(nameAsc[2].name).toBe('Item Beta');
    });

    it('handles non-finite values (Infinity, -Infinity, NaN) safely without corrupting bounds or normalization', () => {
      const treeWithInfinity: TreeNode[] = [
        {
          key: '1',
          id: '1',
          name: 'FiniteLow',
          depth: 0,
          path: ['FiniteLow'],
          isLeaf: true,
          metrics: { sales: 10 },
        },
        {
          key: '2',
          id: '2',
          name: 'FiniteHigh',
          depth: 0,
          path: ['FiniteHigh'],
          isLeaf: true,
          metrics: { sales: 50 },
        },
        {
          key: '3',
          id: '3',
          name: 'DivZeroPos',
          depth: 0,
          path: ['DivZeroPos'],
          isLeaf: true,
          metrics: { sales: Infinity },
        },
        {
          key: '4',
          id: '4',
          name: 'DivZeroNeg',
          depth: 0,
          path: ['DivZeroNeg'],
          isLeaf: true,
          metrics: { sales: -Infinity },
        },
      ];

      const bounds = calculateMinMaxBounds(treeWithInfinity, ['sales'], 'leaves_only');
      expect(bounds.global.sales.min).toBe(10);
      expect(bounds.global.sales.max).toBe(50);

      // getNormalizedMetricValue never returns NaN for non-finite values
      expect(getNormalizedMetricValue(Infinity, bounds.global.sales)).toBe(0);
      expect(getNormalizedMetricValue(-Infinity, bounds.global.sales)).toBe(0);
      expect(getNormalizedMetricValue(NaN, bounds.global.sales)).toBe(0);
      expect(getNormalizedMetricValue(30, bounds.global.sales)).toBe(0.5);
    });

    it('preserves descending pivot column sorted order when search filter is applied', () => {
      const pivotTree: TreeNode[] = [
        {
          key: 'p1',
          id: 'p1',
          name: 'Tech Alpha',
          depth: 0,
          path: ['Tech Alpha'],
          isLeaf: true,
          metrics: { 'revenue___2024': 300 },
        },
        {
          key: 'p2',
          id: 'p2',
          name: 'Office Supplies',
          depth: 0,
          path: ['Office Supplies'],
          isLeaf: true,
          metrics: { 'revenue___2024': 500 },
        },
        {
          key: 'p3',
          id: 'p3',
          name: 'Tech Beta',
          depth: 0,
          path: ['Tech Beta'],
          isLeaf: true,
          metrics: { 'revenue___2024': 800 },
        },
      ];

      // 1. Sort descending by pivot column 'revenue___2024'
      const sorted = sortTreeHierarchy(pivotTree, 'revenue___2024', 'desc');
      expect(sorted.map(n => n.name)).toEqual(['Tech Beta', 'Office Supplies', 'Tech Alpha']);

      // 2. Filter by search term 'tech'
      const filtered = filterTreeBySearch(sorted, 'tech');
      expect(filtered.map(n => n.name)).toEqual(['Tech Beta', 'Tech Alpha']); // Preserves descending order (800 > 300)
    });

    it('keeps Grand Total pinned at the bottom when grandTotalPosition is bottom', () => {
      const treeWithGrandTotal: TreeNode[] = [
        {
          key: 'item1',
          id: 'item1',
          name: 'Item Beta',
          depth: 0,
          path: ['Item Beta'],
          isLeaf: true,
          metrics: { sales: 50 },
        },
        {
          key: '__grand_total__',
          id: '__grand_total__',
          name: 'Grand Total',
          depth: 0,
          path: ['Grand Total'],
          isLeaf: true,
          metrics: { sales: 9999 },
        },
        {
          key: 'item2',
          id: 'item2',
          name: 'Item Alpha',
          depth: 0,
          path: ['Item Alpha'],
          isLeaf: true,
          metrics: { sales: 200 },
        },
      ];

      // Sort by metric asc: Grand Total pinned at the bottom
      const metricAsc = sortTreeHierarchy(treeWithGrandTotal, 'sales', 'asc', undefined, 'bottom');
      expect(metricAsc[0].name).toBe('Item Beta'); // 50
      expect(metricAsc[1].name).toBe('Item Alpha'); // 200
      expect(metricAsc[2].key).toBe('__grand_total__');

      // Sort by metric desc: Grand Total pinned at the bottom
      const metricDesc = sortTreeHierarchy(treeWithGrandTotal, 'sales', 'desc', undefined, 'bottom');
      expect(metricDesc[0].name).toBe('Item Alpha'); // 200
      expect(metricDesc[1].name).toBe('Item Beta'); // 50
      expect(metricDesc[2].key).toBe('__grand_total__');

      // Sort by name A-Z: Grand Total pinned at the bottom
      const nameAsc = sortTreeHierarchy(treeWithGrandTotal, '__hierarchy_tree__', 'asc', undefined, 'bottom');
      expect(nameAsc[0].name).toBe('Item Alpha');
      expect(nameAsc[1].name).toBe('Item Beta');
      expect(nameAsc[2].key).toBe('__grand_total__');
    });

    it('sorts nodes in Pivot Matrix Mode when pivot keys exist only in subtotals with empty metrics object', () => {
      const subtotalsOnlyNodes: TreeNode[] = [
        {
          key: 'p1',
          id: 'p1',
          name: 'Category Alpha',
          depth: 0,
          path: ['Category Alpha'],
          isLeaf: false,
          metrics: {},
          subtotals: { 'sales___2023': 100, 'sales___2024': 50 }, // sum = 150
        },
        {
          key: 'p2',
          id: 'p2',
          name: 'Category Beta',
          depth: 0,
          path: ['Category Beta'],
          isLeaf: false,
          metrics: {},
          subtotals: { 'sales___2023': 300, 'sales___2024': 200 }, // sum = 500
        },
      ];

      // Ascending sort by base metric 'sales'
      const sortedAsc = sortTreeHierarchy(subtotalsOnlyNodes, 'sales', 'asc');
      expect(sortedAsc.map(n => n.name)).toEqual(['Category Alpha', 'Category Beta']);

      // Descending sort by base metric 'sales'
      const sortedDesc = sortTreeHierarchy(subtotalsOnlyNodes, 'sales', 'desc');
      expect(sortedDesc.map(n => n.name)).toEqual(['Category Beta', 'Category Alpha']);
    });

    it('calculateMinMaxBounds handles null, undefined, and empty arrays safely', () => {
      expect(calculateMinMaxBounds(null as any, ['sales'])).toEqual({ global: {}, byLevel: undefined });
      expect(calculateMinMaxBounds(undefined as any, ['sales'])).toEqual({ global: {}, byLevel: undefined });
      expect(calculateMinMaxBounds([], ['sales'])).toEqual({ global: {}, byLevel: undefined });
      expect(calculateMinMaxBounds([], ['sales'], 'level_aware')).toEqual({ global: {}, byLevel: {} });
      expect(calculateMinMaxBounds([{ key: '1', id: '1', name: 'A', depth: 0, path: ['A'], isLeaf: true, metrics: { sales: 10 } }], []))
        .toEqual({ global: {}, byLevel: undefined });
    });
  });
});
