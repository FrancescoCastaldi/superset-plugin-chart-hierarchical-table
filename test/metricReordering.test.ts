jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import { reorderArray, reorderMetricsByKey } from '../src/utils/metricReorder';
import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

describe('metricReorder utils', () => {
  describe('reorderArray', () => {
    it('moves an item forward in the array', () => {
      const items = ['a', 'b', 'c', 'd'];
      const result = reorderArray(items, 0, 2);
      expect(result).toEqual(['b', 'c', 'a', 'd']);
      expect(items).toEqual(['a', 'b', 'c', 'd']);
    });

    it('moves an item backward in the array', () => {
      const items = ['a', 'b', 'c', 'd'];
      const result = reorderArray(items, 3, 1);
      expect(result).toEqual(['a', 'd', 'b', 'c']);
    });

    it('returns a shallow copy when startIndex equals endIndex', () => {
      const items = ['a', 'b', 'c'];
      const result = reorderArray(items, 1, 1);
      expect(result).toEqual(['a', 'b', 'c']);
      expect(result).not.toBe(items);
    });

    it('returns a shallow copy when indices are out of bounds', () => {
      const items = ['a', 'b', 'c'];
      expect(reorderArray(items, -1, 1)).toEqual(['a', 'b', 'c']);
      expect(reorderArray(items, 0, 5)).toEqual(['a', 'b', 'c']);
      expect(reorderArray(items, 4, 1)).toEqual(['a', 'b', 'c']);
      expect(reorderArray(items, 1, -2)).toEqual(['a', 'b', 'c']);
    });

    it('handles empty and single-element arrays', () => {
      expect(reorderArray([], 0, 1)).toEqual([]);
      expect(reorderArray(['only'], 0, 0)).toEqual(['only']);
    });
  });

  describe('reorderMetricsByKey', () => {
    it('reorders metrics by their key names', () => {
      const metrics = ['ricoveri', 'costo', 'degenza_media'];
      const result = reorderMetricsByKey(metrics, 'degenza_media', 'ricoveri');
      expect(result).toEqual(['degenza_media', 'ricoveri', 'costo']);
    });

    it('returns copy if a key is not found', () => {
      const metrics = ['ricoveri', 'costo'];
      expect(reorderMetricsByKey(metrics, 'non_existent', 'costo')).toEqual(['ricoveri', 'costo']);
      expect(reorderMetricsByKey(metrics, 'ricoveri', 'non_existent')).toEqual(['ricoveri', 'costo']);
    });

    it('returns copy if source and target keys are the same', () => {
      const metrics = ['ricoveri', 'costo'];
      expect(reorderMetricsByKey(metrics, 'costo', 'costo')).toEqual(['ricoveri', 'costo']);
    });
  });
});

describe('transformProps onReorderMetrics propagation', () => {
  const baseChartProps: HierarchicalTableChartProps = {
    width: 800,
    height: 600,
    formData: {
      metrics: ['ricoveri', 'costo'],
      dimensions: ['regione'],
      hierarchyType: 'flat',
      showSubtotals: false,
      showGrandTotal: false,
      stickyHeader: true,
      compactMode: false,
      stripedRows: true,
    } as any,
    queriesData: [
      {
        data: [
          { regione: 'Lazio', ricoveri: 100, costo: 5000 },
          { regione: 'Umbria', ricoveri: 80, costo: 4000 },
        ],
      },
    ] as any,
  } as any;

  it('propagates onReorderMetrics callback from hooks to transformed props', () => {
    const onReorderMetricsMock = jest.fn();
    const props = transformProps({
      ...baseChartProps,
      hooks: {
        onReorderMetrics: onReorderMetricsMock,
      },
    } as any);

    expect(props.onReorderMetrics).toBeDefined();
    expect(typeof props.onReorderMetrics).toBe('function');
    props.onReorderMetrics?.(['costo', 'ricoveri']);
    expect(onReorderMetricsMock).toHaveBeenCalledWith(['costo', 'ricoveri']);
  });

  it('leaves onReorderMetrics undefined if hooks did not provide it', () => {
    const props = transformProps({
      ...baseChartProps,
      hooks: {},
    } as any);

    expect(props.onReorderMetrics).toBeUndefined();
  });
});
