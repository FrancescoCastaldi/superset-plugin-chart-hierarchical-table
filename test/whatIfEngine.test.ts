import {
  deepCloneTree,
  snapshotBaseline,
  isSimulatableMetric,
  applyLeafMultipliers,
  computeWhatIfDelta,
  applyWhatIfScenario,
} from '../src/utils/whatIfEngine';
import { TreeNode, MetricDefinition } from '../src/types';

type Metrics = Record<string, number | string | null>;

function leaf(key: string, depth: number, metrics: Metrics): TreeNode {
  return {
    key,
    id: key,
    name: key.split(' > ').pop() as string,
    depth,
    path: key.split(' > '),
    isLeaf: true,
    metrics,
  };
}

function parent(key: string, depth: number, children: TreeNode[], metrics: Metrics = {}): TreeNode {
  return {
    key,
    id: key,
    name: key.split(' > ').pop() as string,
    depth,
    path: key.split(' > '),
    isLeaf: false,
    metrics,
    children,
  };
}

describe('whatIfEngine', () => {
  describe('deepCloneTree', () => {
    it('returns empty array when nodes array is empty or null', () => {
      expect(deepCloneTree([])).toEqual([]);
      expect(deepCloneTree(null as any)).toEqual([]);
    });

    it('produces structurally identical tree without shared references', () => {
      const original = [
        parent('A', 0, [
          leaf('A > 1', 1, { sales: 100, cost: 60 }),
          leaf('A > 2', 1, { sales: 200, cost: 120 }),
        ], { sales: 300, cost: 180 }),
      ];

      const cloned = deepCloneTree(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[0]).not.toBe(original[0]);
      expect(cloned[0].metrics).not.toBe(original[0].metrics);
      expect(cloned[0].children![0]).not.toBe(original[0].children![0]);
      expect(cloned[0].children![0].metrics).not.toBe(original[0].children![0].metrics);

      // Mutating clone does not mutate original
      cloned[0].children![0].metrics.sales = 999;
      expect(original[0].children![0].metrics.sales).toBe(100);
    });
  });

  describe('snapshotBaseline', () => {
    it('captures all node metric values and grand total in a map', () => {
      const tree = [
        parent('A', 0, [
          leaf('A > 1', 1, { sales: 100, visits: 20 }),
        ], { sales: 100, visits: 20 }),
      ];
      const gt = leaf('__grand_total__', 0, { sales: 100, visits: 20 });

      const baseline = snapshotBaseline(tree, gt);
      expect(baseline.nodeBaselines.size).toBe(3);
      expect(baseline.nodeBaselines.get('A > 1')).toEqual({ sales: 100, visits: 20 });
      expect(baseline.nodeBaselines.get('A')).toEqual({ sales: 100, visits: 20 });
      expect(baseline.nodeBaselines.get('__grand_total__')).toEqual({ sales: 100, visits: 20 });
    });
  });

  describe('isSimulatableMetric', () => {
    it('allows standard numeric additive metrics', () => {
      expect(isSimulatableMetric('sales')).toBe(true);
      expect(isSimulatableMetric('cost')).toBe(true);
      expect(isSimulatableMetric('ricoveri')).toBe(true);
    });

    it('rejects derived and percentage delta metrics', () => {
      expect(isSimulatableMetric('delta_sales_pct')).toBe(false);
      expect(isSimulatableMetric('variazione_costi')).toBe(false);
      expect(isSimulatableMetric('% margine')).toBe(false);
    });

    it('rejects metrics defined as ratio, delta_pct or none in metricDefinitions', () => {
      const defs: MetricDefinition[] = [
        { metric: 'occupancy_rate', type: 'ratio' },
        { metric: 'growth_pct', type: 'delta_pct' },
        { metric: 'static_code', type: 'none' },
        { metric: 'active_beds', type: 'sum' },
      ];
      expect(isSimulatableMetric('occupancy_rate', defs)).toBe(false);
      expect(isSimulatableMetric('growth_pct', defs)).toBe(false);
      expect(isSimulatableMetric('static_code', defs)).toBe(false);
      expect(isSimulatableMetric('active_beds', defs)).toBe(true);
    });
  });

  describe('applyLeafMultipliers', () => {
    it('applies multiplier factor strictly to leaf nodes', () => {
      const tree = [
        parent('A', 0, [
          leaf('A > 1', 1, { cost: 100 }),
          leaf('A > 2', 1, { cost: 200 }),
        ], { cost: 300 }),
      ];

      applyLeafMultipliers(tree, [{ metric: 'cost', factor: 1.15 }]);

      // Leaves multiplied by 1.15
      expect(tree[0].children![0].metrics.cost).toBeCloseTo(115);
      expect(tree[0].children![1].metrics.cost).toBeCloseTo(230);
      // Parent is NOT multiplied directly (preserved for rollup)
      expect(tree[0].metrics.cost).toBe(300);
    });

    it('ignores factor 1.0 (identity)', () => {
      const tree = [leaf('A > 1', 1, { cost: 100 })];
      applyLeafMultipliers(tree, [{ metric: 'cost', factor: 1.0 }]);
      expect(tree[0].metrics.cost).toBe(100);
    });

    it('handles non-simulatable metrics by skipping them', () => {
      const tree = [leaf('A > 1', 1, { delta_pct: 10, cost: 100 })];
      applyLeafMultipliers(tree, [
        { metric: 'delta_pct', factor: 1.5 },
        { metric: 'cost', factor: 1.2 },
      ]);
      expect(tree[0].metrics.delta_pct).toBe(10);
      expect(tree[0].metrics.cost).toBe(120);
    });
  });

  describe('computeWhatIfDelta', () => {
    it('calculates absolute difference and percentage delta correctly', () => {
      const res = computeWhatIfDelta(115, 100);
      expect(res.absolute).toBe(15);
      expect(res.pct).toBe(15);
    });

    it('handles negative delta correctly', () => {
      const res = computeWhatIfDelta(80, 100);
      expect(res.absolute).toBe(-20);
      expect(res.pct).toBe(-20);
    });

    it('returns null percentage when baseline is zero', () => {
      const res = computeWhatIfDelta(50, 0);
      expect(res.absolute).toBe(50);
      expect(res.pct).toBeNull();
    });

    it('returns 0 absolute and null pct when inputs are null or undefined', () => {
      expect(computeWhatIfDelta(null, 100)).toEqual({ absolute: 0, pct: null });
      expect(computeWhatIfDelta(100, null)).toEqual({ absolute: 0, pct: null });
      expect(computeWhatIfDelta(undefined, undefined)).toEqual({ absolute: 0, pct: null });
    });
  });

  describe('applyWhatIfScenario end-to-end', () => {
    it('recalculates sums, parents, and grand total when leaf metric is adjusted', () => {
      const tree = [
        parent('Nord', 0, [
          leaf('Nord > Milano', 1, { ricoveri: 100, posti: 10 }),
          leaf('Nord > Torino', 1, { ricoveri: 200, posti: 20 }),
        ], { ricoveri: 300, posti: 30 }),
        parent('Sud', 0, [
          leaf('Sud > Napoli', 1, { ricoveri: 300, posti: 30 }),
        ], { ricoveri: 300, posti: 30 }),
      ];
      const gt = leaf('__grand_total__', 0, { ricoveri: 600, posti: 60 });

      // Apply +10% on ricoveri (factor 1.10)
      const result = applyWhatIfScenario(
        tree,
        gt,
        [{ metric: 'ricoveri', factor: 1.10 }],
        ['ricoveri', 'posti'],
        'sum',
        undefined,
        ['Regione', 'Citta'],
      );

      // Check simulated leaves
      const nordMilano = result.simulatedTree[0].children![0];
      const nordTorino = result.simulatedTree[0].children![1];
      const sudNapoli = result.simulatedTree[1].children![0];

      expect(nordMilano.metrics.ricoveri).toBeCloseTo(110);
      expect(nordTorino.metrics.ricoveri).toBeCloseTo(220);
      expect(sudNapoli.metrics.ricoveri).toBeCloseTo(330);

      // Check simulated parents roll-up
      const nord = result.simulatedTree[0];
      const sud = result.simulatedTree[1];
      expect(nord.metrics.ricoveri).toBeCloseTo(330);
      expect(sud.metrics.ricoveri).toBeCloseTo(330);

      // Posti should remain untouched
      expect(nord.metrics.posti).toBe(30);
      expect(sud.metrics.posti).toBe(30);

      // Check simulated grand total
      expect(result.simulatedGrandTotal!.metrics.ricoveri).toBeCloseTo(660);
      expect(result.simulatedGrandTotal!.metrics.posti).toBe(60);

      // Baseline snapshot retains original values
      expect(result.baseline.nodeBaselines.get('Nord > Milano')!.ricoveri).toBe(100);
      expect(result.baseline.nodeBaselines.get('Nord')!.ricoveri).toBe(300);
      expect(result.baseline.nodeBaselines.get('__grand_total__')!.ricoveri).toBe(600);
    });

    it('recalculates metric definitions such as ratio metrics when operands change', () => {
      const tree = [
        parent('A', 0, [
          leaf('A > 1', 1, { degenze: 500, dimessi: 100, degenza_media: 5.0 }),
          leaf('A > 2', 1, { degenze: 300, dimessi: 100, degenza_media: 3.0 }),
        ], { degenze: 800, dimessi: 200, degenza_media: 4.0 }),
      ];
      const gt = leaf('__grand_total__', 0, { degenze: 800, dimessi: 200, degenza_media: 4.0 });

      const defs: MetricDefinition[] = [
        { metric: 'degenze', type: 'sum' },
        { metric: 'dimessi', type: 'sum' },
        {
          metric: 'degenza_media',
          type: 'ratio',
          numerator: 'degenze',
          denominator: 'dimessi',
        },
      ];

      // Increase degenze by +20% (factor 1.20)
      const result = applyWhatIfScenario(
        tree,
        gt,
        [{ metric: 'degenze', factor: 1.20 }],
        ['degenze', 'dimessi', 'degenza_media'],
        'sum',
        undefined,
        ['Reparto', 'Sezione'],
        defs,
      );

      // Leaves: degenze is 600 and 360, ratio = 600/100 = 6.0 and 360/100 = 3.6
      const leaf1 = result.simulatedTree[0].children![0];
      const leaf2 = result.simulatedTree[0].children![1];
      expect(leaf1.metrics.degenze).toBeCloseTo(600);
      expect(leaf1.metrics.degenza_media).toBeCloseTo(6.0);
      expect(leaf2.metrics.degenze).toBeCloseTo(360);
      expect(leaf2.metrics.degenza_media).toBeCloseTo(3.6);

      // Parent: total degenze = 960, total dimessi = 200, ratio = 960/200 = 4.8
      const parentA = result.simulatedTree[0];
      expect(parentA.metrics.degenze).toBeCloseTo(960);
      expect(parentA.metrics.degenza_media).toBeCloseTo(4.8);

      // Grand total ratio
      expect(result.simulatedGrandTotal!.metrics.degenza_media).toBeCloseTo(4.8);
    });
  });
});
