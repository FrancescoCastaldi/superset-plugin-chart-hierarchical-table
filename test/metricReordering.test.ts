jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));
jest.mock('../src/components/HierarchicalTable.css', () => ({}));

import {
  reorderArray,
  reorderMetricsByKey,
  reorderMetricsWithPosition,
  getMetricKeyFromColumn,
} from '../src/utils/metricReorder';
import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps, TableColumn } from '../src/types';

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

  describe('reorderMetricsWithPosition', () => {
    const list = ['m1', 'm2', 'm3', 'm4'];

    it('moves metric before targetKey', () => {
      expect(reorderMetricsWithPosition(list, 'm4', 'm2', 'before')).toEqual([
        'm1',
        'm4',
        'm2',
        'm3',
      ]);
      expect(reorderMetricsWithPosition(list, 'm1', 'm3', 'before')).toEqual([
        'm2',
        'm1',
        'm3',
        'm4',
      ]);
    });

    it('moves metric after targetKey', () => {
      expect(reorderMetricsWithPosition(list, 'm1', 'm3', 'after')).toEqual([
        'm2',
        'm3',
        'm1',
        'm4',
      ]);
      expect(reorderMetricsWithPosition(list, 'm4', 'm1', 'after')).toEqual([
        'm1',
        'm4',
        'm2',
        'm3',
      ]);
    });

    it('returns copy when source or target is invalid or identical', () => {
      expect(reorderMetricsWithPosition(list, 'm1', 'm1', 'before')).toEqual(list);
      expect(reorderMetricsWithPosition(list, 'invalid', 'm2', 'before')).toEqual(list);
      expect(reorderMetricsWithPosition(list, 'm1', 'invalid', 'after')).toEqual(list);
    });
  });

  describe('getMetricKeyFromColumn', () => {
    const activeMetrics = ['ricoveri', 'costo', 'tasso_occupazione'];

    it('returns null for hierarchy dimension column or non-metrics', () => {
      const col: TableColumn = {
        key: '__hierarchy_tree__',
        title: 'Gerarchia',
        isMetric: false,
      };
      expect(getMetricKeyFromColumn(col, activeMetrics)).toBeNull();
    });

    it('identifies flat metric column', () => {
      const col: TableColumn = {
        key: 'ricoveri',
        title: 'Ricoveri',
        isMetric: true,
      };
      expect(getMetricKeyFromColumn(col, activeMetrics)).toBe('ricoveri');
    });

    it('identifies composite pivot column with ___ separator', () => {
      const col: TableColumn = {
        key: 'costo___2023',
        title: '2023',
        isMetric: true,
      };
      expect(getMetricKeyFromColumn(col, activeMetrics)).toBe('costo');
    });

    it('identifies row total composite column', () => {
      const col: TableColumn = {
        key: 'ricoveri___ROW_TOTAL',
        title: 'Totale',
        isMetric: true,
      };
      expect(getMetricKeyFromColumn(col, activeMetrics)).toBe('ricoveri');
    });

    it('identifies column using baseMetric matching active metrics', () => {
      const col: TableColumn = {
        key: 'costo___delta_pct___2023',
        title: 'Δ% 2023',
        isMetric: true,
        baseMetric: 'costo',
      };
      expect(getMetricKeyFromColumn(col, activeMetrics)).toBe('costo');
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

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HierarchicalTable from '../src/components/HierarchicalTable';

describe('HierarchicalTable draggable header rendering', () => {
  const baseChartProps: HierarchicalTableChartProps = {
    width: 800,
    height: 600,
    formData: {
      metrics: ['ricoveri', 'costo'],
      groupby: ['regione'],
      hierarchyType: 'multi_dimension',
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

  it('renders draggable headers and drag handle when onReorderMetrics is provided', () => {
    const transformed = transformProps({
      ...baseChartProps,
      hooks: {
        onReorderMetrics: jest.fn(),
      },
    } as any);

    const html = renderToStaticMarkup(React.createElement(HierarchicalTable, transformed));

    expect(html).toContain('draggable-metric-th');
    expect(html).toContain('draggable="true"');
    expect(html).toContain('drag-handle-icon');
    expect(html).toContain('⠿');
  });

  it('does not render draggable attributes when onReorderMetrics is omitted', () => {
    const transformed = transformProps({
      ...baseChartProps,
      hooks: {},
    } as any);

    const html = renderToStaticMarkup(React.createElement(HierarchicalTable, transformed));

    expect(html).not.toContain('draggable-metric-th');
    expect(html).not.toContain('drag-handle-icon');
    expect(html).not.toContain('⠿');
  });

  it('renders draggable group headers in separated pivot mode', () => {
    const pivotChartProps: HierarchicalTableChartProps = {
      ...baseChartProps,
      formData: {
        ...baseChartProps.formData,
        columns: ['anno'],
        pivot_columns: ['anno'],
        combineMetric: false,
        combine_metric: false,
      } as any,
      queriesData: [
        {
          data: [
            { regione: 'Lazio', anno: '2022', ricoveri: 100, costo: 5000 },
            { regione: 'Lazio', anno: '2023', ricoveri: 110, costo: 5200 },
          ],
        },
      ] as any,
    } as any;

    const transformed = transformProps({
      ...pivotChartProps,
      hooks: {
        onReorderMetrics: jest.fn(),
      },
    } as any);

    const html = renderToStaticMarkup(React.createElement(HierarchicalTable, transformed));

    expect(transformed.isPivotMode).toBe(true);
    expect(html).toContain('metric-group-header');
    expect(html).toContain('draggable-metric-th');
    expect(html).toContain('drag-handle-icon');
  });
});

