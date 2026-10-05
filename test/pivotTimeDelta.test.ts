jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) => (Array.isArray(val) ? val : [val]),
}));

import { buildMultiDimensionTree } from '../src/utils/treeBuilder';
import { computeGrandTotal } from '../src/utils/aggregations';
import { computePivotTimeDelta } from '../src/utils/timeComparison';
import { TreeNode } from '../src/types';

describe('Pivot Time Delta & Period-over-Period Calculations', () => {
  const samplePivotRecords = [
    // Presidio Roma -> Dipartimento Chirurgia -> Ambulatorio A1
    { presidio: 'Roma', dipartimento: 'Chirurgia', mese: '2026-08', totale: 100 },
    { presidio: 'Roma', dipartimento: 'Chirurgia', mese: '2026-09', totale: 150 },
    { presidio: 'Roma', dipartimento: 'Chirurgia', mese: '2026-10', totale: 120 },

    // Presidio Roma -> Dipartimento Chirurgia -> Ambulatorio A2
    { presidio: 'Roma', dipartimento: 'Chirurgia', mese: '2026-08', totale: 200 },
    { presidio: 'Roma', dipartimento: 'Chirurgia', mese: '2026-09', totale: 220 },
    { presidio: 'Roma', dipartimento: 'Chirurgia', mese: '2026-10', totale: 260 },

    // Presidio Roma -> Dipartimento Medicina -> Ambulatorio M1 (Starts in Sep)
    { presidio: 'Roma', dipartimento: 'Medicina', mese: '2026-09', totale: 50 },
    { presidio: 'Roma', dipartimento: 'Medicina', mese: '2026-10', totale: 80 },
  ];

  const pivotValues = ['2026-08', '2026-09', '2026-10'];
  let tree: TreeNode[];

  beforeEach(() => {
    tree = buildMultiDimensionTree(
      samplePivotRecords,
      ['presidio', 'dipartimento'],
      ['totale'],
      ['mese'],
    );
  });

  describe('Absolute Delta Calculation (Lag = 1)', () => {
    it('computes absolute delta for leaves, parents, and subtotals', () => {
      computePivotTimeDelta(tree, ['totale'], pivotValues, 'absolute', 1);

      const roma = tree.find(t => t.name === 'Roma')!;
      expect(roma).toBeDefined();

      // Roma total 2026-08: 100 + 200 = 300
      // Roma total 2026-09: 150 + 220 + 50 = 420
      // Roma total 2026-10: 120 + 260 + 80 = 460
      expect(roma.metrics['totale___2026-08']).toBe(300);
      expect(roma.metrics['totale___2026-09']).toBe(420);
      expect(roma.metrics['totale___2026-10']).toBe(460);

      // Delta 2026-08 (first period): null
      expect(roma.metrics['totale___delta___2026-08']).toBeNull();

      // Delta 2026-09: 420 - 300 = +120
      expect(roma.metrics['totale___delta___2026-09']).toBe(120);
      expect(roma.subtotals?.['totale___delta___2026-09']).toBe(120);

      // Delta 2026-10: 460 - 420 = +40
      expect(roma.metrics['totale___delta___2026-10']).toBe(40);
      expect(roma.subtotals?.['totale___delta___2026-10']).toBe(40);

      // Child node: Medicina (started in Sep, so Aug was null or 0)
      const medicina = roma.children?.find(c => c.name === 'Medicina')!;
      expect(medicina).toBeDefined();
      expect(medicina.metrics['totale___2026-08']).toBeUndefined();
      expect(medicina.metrics['totale___2026-09']).toBe(50);
      expect(medicina.metrics['totale___2026-10']).toBe(80);

      // For 2026-09: previous was missing -> delta is null or 50 depending on baseline
      // For 2026-10: 80 - 50 = +30
      expect(medicina.metrics['totale___delta___2026-10']).toBe(30);
    });
  });

  describe('Percentage Delta Calculation (Lag = 1)', () => {
    it('computes rounded percentage delta correctly', () => {
      computePivotTimeDelta(tree, ['totale'], pivotValues, 'percentage', 1);

      const roma = tree.find(t => t.name === 'Roma')!;
      // Roma: 2026-08 = 300, 2026-09 = 420. Delta % = ((420 - 300) / 300) * 100 = 40.0%
      expect(roma.metrics['totale___delta_pct___2026-09']).toBe(40);

      // Roma: 2026-09 = 420, 2026-10 = 460. Delta % = ((460 - 420) / 420) * 100 = 9.5%
      expect(roma.metrics['totale___delta_pct___2026-10']).toBe(9.5);
    });
  });

  describe('Both Absolute and Percentage Delta Mode', () => {
    it('computes both delta keys concurrently', () => {
      computePivotTimeDelta(tree, ['totale'], pivotValues, 'both', 1);

      const roma = tree.find(t => t.name === 'Roma')!;
      expect(roma.metrics['totale___delta___2026-09']).toBe(120);
      expect(roma.metrics['totale___delta_pct___2026-09']).toBe(40);
    });
  });

  describe('Grand Total Delta Calculation', () => {
    it('computes delta on Grand Total node accurately', () => {
      const allMetricKeys = [
        'totale___2026-08',
        'totale___2026-09',
        'totale___2026-10',
      ];
      const grandTotal = computeGrandTotal(tree, allMetricKeys);
      expect(grandTotal.metrics['totale___2026-08']).toBe(300);
      expect(grandTotal.metrics['totale___2026-09']).toBe(420);
      expect(grandTotal.metrics['totale___2026-10']).toBe(460);

      computePivotTimeDelta([grandTotal], ['totale'], pivotValues, 'both', 1);

      expect(grandTotal.metrics['totale___delta___2026-09']).toBe(120);
      expect(grandTotal.metrics['totale___delta_pct___2026-09']).toBe(40);
      expect(grandTotal.metrics['totale___delta___2026-10']).toBe(40);
      expect(grandTotal.metrics['totale___delta_pct___2026-10']).toBe(9.5);
    });
  });

  describe('Custom Lag (Lag = 2)', () => {
    it('compares with offset 2 periods back', () => {
      computePivotTimeDelta(tree, ['totale'], pivotValues, 'absolute', 2);

      const roma = tree.find(t => t.name === 'Roma')!;
      // 2026-08: lag 2 not available -> null
      expect(roma.metrics['totale___delta___2026-08']).toBeNull();
      // 2026-09: lag 2 not available -> null
      expect(roma.metrics['totale___delta___2026-09']).toBeNull();
      // 2026-10 vs 2026-08: 460 - 300 = +160
      expect(roma.metrics['totale___delta___2026-10']).toBe(160);
    });
  });

  describe('transformProps with combineMetric and descending pivot order', () => {
    it('generates combined metrics grouped under descending month headers', () => {
      const transformProps = require('../src/plugin/transformProps').default;
      const chartProps: any = {
        width: 800,
        height: 600,
        formData: {
          hierarchyType: 'multi_dimension',
          groupby: ['presidio', 'dipartimento'],
          columns: ['mese'],
          metrics: ['totale'],
          combineMetric: true,
          pivotSortOrder: 'desc',
          pivotTimeDeltaMode: 'absolute',
          pivotTimeDeltaLag: 1,
        },
        queriesData: [{ data: samplePivotRecords }],
      };

      const transformed = transformProps(chartProps);

      // Verify pivotHeaderGroups are ordered descending: 2026-10, 2026-09, 2026-08
      expect(transformed.pivotHeaderGroups).toBeDefined();
      expect(transformed.pivotHeaderGroups?.map((g: any) => g.title)).toEqual([
        '2026-10',
        '2026-09',
        '2026-08',
      ]);

      // Each month group spans 2 sub-columns: Totale and Delta
      expect(transformed.pivotHeaderGroups?.[0].colSpan).toBe(2);

      // Verify columns: __hierarchy_tree__, then for 2026-10: [totale, Delta], 2026-09: [totale, Delta], 2026-08: [totale, Delta]
      expect(transformed.columns).toHaveLength(7);
      expect(transformed.columns[1].key).toBe('totale___2026-10');
      expect(transformed.columns[1].title).toBe('totale');
      expect(transformed.columns[2].key).toBe('totale___delta___2026-10');
      expect(transformed.columns[2].title).toBe('Delta');

      // Verify data has calculated deltas
      const roma = transformed.data.find((d: any) => d.name === 'Roma')!;
      expect(roma.metrics['totale___2026-10']).toBe(460);
      expect(roma.metrics['totale___delta___2026-10']).toBe(40);
      expect(roma.metrics['totale___2026-09']).toBe(420);
      expect(roma.metrics['totale___delta___2026-09']).toBe(120);
      expect(roma.metrics['totale___delta___2026-08']).toBeNull();
    });
  });
});

