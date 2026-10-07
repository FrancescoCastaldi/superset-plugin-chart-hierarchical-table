jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import { resolveTransformOptions } from '../src/plugin/formDataOptions';
import { applyVarianceDelta, buildTreeData } from '../src/plugin/treeData';
import { buildMetricLayout } from '../src/plugin/metricLayout';
import { buildGrandTotalNode } from '../src/plugin/grandTotal';

const records = [
  { presidio: 'Roma', mese: '2026-08', richieste_corr: 100, richieste_conf: 80, delta_richieste_pct: null },
  { presidio: 'Roma', mese: '2026-09', richieste_corr: 120, richieste_conf: 100, delta_richieste_pct: null },
  { presidio: 'Milano', mese: '2026-08', richieste_corr: 50, richieste_conf: 0, delta_richieste_pct: null },
];
const metrics = ['richieste_corr', 'richieste_conf', 'delta_richieste_pct'];

describe('transformProps pipeline modules', () => {
  describe('buildTreeData', () => {
    it('builds the multi-dimension tree with §5.3 deltas recomputed on every node', () => {
      const options = resolveTransformOptions({ groupby: ['presidio', 'mese'], metrics });
      const { treeData, metrics: out } = buildTreeData(records, options);
      expect(out).toEqual(metrics);
      expect(out).not.toBe(options.metrics);
      const roma = treeData.find(n => n.name === 'Roma')!;
      expect(roma.metrics.richieste_corr).toBe(220);
      expect(roma.metrics.delta_richieste_pct).toBe(22.2);
      expect(treeData.find(n => n.name === 'Milano')!.metrics.delta_richieste_pct).toBe('Nuovo');
    });

    it('builds a parent-child tree', () => {
      const options = resolveTransformOptions({
        hierarchyType: 'parent_child',
        idColumn: 'id',
        parentIdColumn: 'parent',
        labelColumn: 'name',
        metrics: ['budget'],
      });
      const { treeData } = buildTreeData(
        [
          { id: '1', parent: null, name: 'CEO', budget: 10 },
          { id: '2', parent: '1', name: 'CTO', budget: 5 },
        ],
        options,
      );
      expect(treeData).toHaveLength(1);
      expect(treeData[0].children?.[0].name).toBe('CTO');
    });

    it('appends ___delta keys only when variance delta is enabled', () => {
      const options = resolveTransformOptions({ groupby: ['mese'], metrics: ['richieste_corr', 'delta_richieste_pct'], showVarianceDelta: true });
      const { treeData, metrics: out } = buildTreeData(records, options);
      expect(out).toEqual(['richieste_corr', 'delta_richieste_pct', 'richieste_corr___delta']);
      expect(treeData.find(n => n.name === '2026-09')!.metrics['richieste_corr___delta']).toBe(-20);
    });

    it('applyVarianceDelta returns a new list without mutating the input', () => {
      const input = ['a', 'variazione_b'];
      const out = applyVarianceDelta([], input);
      expect(out).toEqual(['a', 'variazione_b', 'a___delta']);
      expect(input).toEqual(['a', 'variazione_b']);
    });
  });

  describe('buildMetricLayout + buildGrandTotalNode', () => {
    it('computes pivot deltas and row totals on the tree before the grand total', () => {
      const options = resolveTransformOptions({
        groupby: ['presidio'],
        columns: ['mese'],
        metrics: ['richieste_corr'],
        pivotTimeDeltaMode: 'absolute',
        pivotRowTotalsPosition: 'right',
        pivotSortOrder: 'asc',
      });
      const { treeData, metrics: m } = buildTreeData(records, options);
      const layout = buildMetricLayout(treeData, records, options, m);
      const roma = treeData.find(n => n.name === 'Roma')!;
      expect(roma.metrics['richieste_corr___delta___2026-09']).toBe(20);
      expect(roma.metrics['richieste_corr___ROW_TOTAL']).toBe(220);

      const gt = buildGrandTotalNode({
        treeData,
        records,
        metrics: m,
        metricKeys: layout.metricKeys,
        showGrandTotal: true,
        isPivotMode: options.isPivotMode,
        pivotDimensions: options.pivotDimensions,
        pivotTimeDeltaMode: options.pivotTimeDeltaMode,
        pivotTimeDeltaLag: options.pivotTimeDeltaLag,
      })!;
      expect(gt.metrics['richieste_corr___2026-08']).toBe(150);
      expect(gt.metrics['richieste_corr___2026-09']).toBe(120);
      expect(gt.metrics['richieste_corr___ROW_TOTAL']).toBe(270);
      expect(gt.metrics['richieste_corr___delta___2026-09']).toBe(-30);
      expect(gt.metrics['richieste_corr___delta___2026-08']).toBeNull();
    });

    it('uses the flat layout outside pivot mode', () => {
      const options = resolveTransformOptions({ groupby: ['presidio'], metrics });
      const { treeData, metrics: m } = buildTreeData(records, options);
      const layout = buildMetricLayout(treeData, records, options, m);
      expect(layout.columns.map(c => c.key)).toEqual(['richieste_corr', 'delta_richieste_pct']);
      expect(layout.metricKeys).toEqual(metrics);
    });

    it('returns no grand total when disabled or when the tree is empty', () => {
      const params = {
        records,
        metrics,
        metricKeys: metrics,
        isPivotMode: false,
        pivotDimensions: [],
        pivotTimeDeltaMode: 'none' as const,
        pivotTimeDeltaLag: 1,
      };
      expect(buildGrandTotalNode({ ...params, treeData: [], showGrandTotal: true })).toBeUndefined();
      const { treeData } = buildTreeData(records, resolveTransformOptions({ groupby: ['presidio'], metrics }));
      expect(buildGrandTotalNode({ ...params, treeData, showGrandTotal: false })).toBeUndefined();
      expect(buildGrandTotalNode({ ...params, treeData, showGrandTotal: true })?.metrics.delta_richieste_pct).toBe(50);
    });
  });
});
