import { DataRecord } from '@superset-ui/core';
import {
  HierarchicalTableChartProps,
  HierarchicalTableTransformedProps,
  TableColumn,
} from '../types';
import { buildHierarchyColumn } from './columnBuilders';
import { createClearFilterHandler, createCrossFilterHandler } from './eventHandlers';
import { TransformOptions, resolveTransformOptions } from './formDataOptions';
import { buildGrandTotalNode } from './grandTotal';
import { buildMetricLayout, resolveTimeDeltaStrategy } from './metricLayout';
import { buildTreeData } from './treeData';
import { applyConfidenceIntervals } from '../utils/significance';
import { applySuppression } from '../utils/suppression';
import {
  applyMetricDefinitions,
  findMetricDefinition,
  formatByDefinition,
} from '../utils/metricSemantics';

/**
 * Column with the number format and the polarity of its metric definition. Delta columns keep
 * their own format and only borrow the polarity.
 */
function applyColumnDefinition(column: TableColumn, options: TransformOptions): TableColumn {
  if (!column.isMetric || options.metricDefinitions.length === 0) return column;
  const def = findMetricDefinition(column.baseMetric ?? column.key, options.metricDefinitions);
  if (!def) return column;
  const isDeltaColumn = /delta/i.test(column.key) || /delta/i.test(column.baseMetric ?? '');
  const baseFormatter = column.formatter;
  return {
    ...column,
    ...(def.polarity ? { polarity: def.polarity } : {}),
    ...(def.format && !isDeltaColumn
      ? {
          formatter: (val: any) =>
            formatByDefinition(val, def, options.currencySymbol) ??
            (baseFormatter ? baseFormatter(val) : String(val ?? '-')),
        }
      : {}),
  };
}

export default function transformProps(
  chartProps: HierarchicalTableChartProps,
): HierarchicalTableTransformedProps {
  const { width, height, formData = {} as any, rawFormData = {} as any, queriesData, hooks, filterState } = chartProps as any;
  const { onAddFilter, setDataMask } = hooks || {};

  const options = resolveTransformOptions({ ...rawFormData, ...formData });
  const dataRecords: DataRecord[] = queriesData?.[0]?.data || [];

  const { treeData, metrics } = buildTreeData(dataRecords, options);
  // Explicit metric definitions first, so that the deltas computed by the layout read the right values.
  applyMetricDefinitions(treeData, undefined, options.metricDefinitions, options.dimensions);
  const layout = buildMetricLayout(treeData, dataRecords, options, metrics);

  const columns: TableColumn[] = [
    buildHierarchyColumn(options.hierarchyType, options.dimensions),
    ...layout.columns.map(column => applyColumnDefinition(column, options)),
  ];

  const grandTotalNode = buildGrandTotalNode({
    treeData,
    records: dataRecords,
    metrics,
    metricKeys: layout.metricKeys,
    showGrandTotal: options.showGrandTotal,
    isPivotMode: options.isPivotMode,
    pivotDimensions: options.pivotDimensions,
    pivotTimeDeltaMode: options.pivotTimeDeltaMode,
    pivotTimeDeltaLag: options.pivotTimeDeltaLag,
    timeDeltaStrategy: resolveTimeDeltaStrategy(options),
    weightColumn: options.weightColumn,
    aggregationMode: options.aggregationMode,
  });
  // Again with the grand total and the row totals, which only exist after the layout.
  applyMetricDefinitions(treeData, grandTotalNode, options.metricDefinitions, options.dimensions);
  applyConfidenceIntervals(treeData, grandTotalNode, options.metricDefinitions, options.goals);
  // Last, so that nothing downstream (sorting, colours, export) ever sees a hidden value.
  applySuppression(treeData, options.suppression, options.metricDefinitions);

  return {
    width,
    height,
    data: treeData,
    rawRecords: dataRecords,
    columns,
    pivotHeaderGroups: layout.pivotHeaderGroups,
    isPivotMode: options.isPivotMode,
    combineMetric: Boolean(options.combineMetric),
    pivotSortOrder: options.pivotSortOrder,
    pivotRowTotalsPosition: options.pivotRowTotalsPosition,
    pivotRowTotalsLabel: options.pivotRowTotalsLabel,
    showPivotColumnSubtotals: options.showPivotColumnSubtotals,
    pivotColumnSubtotalLabel: options.pivotColumnSubtotalLabel,
    pivotTimeDeltaMode: options.pivotTimeDeltaMode,
    formData,
    hierarchyType: options.hierarchyType,
    dimensions: options.dimensions,
    pivotColumns: options.pivotDimensions,
    metrics,
    displayMetrics: layout.metricKeys,
    initialExpandDepth: options.initialExpandDepth,
    valueDisplayMode: options.valueDisplayMode,
    showSubtotals: options.showSubtotals,
    showGrandTotal: options.showGrandTotal,
    grandTotalPosition: options.grandTotalPosition,
    grandTotalNode,
    stickyHeader: options.stickyHeader,
    enableSearch: options.enableSearch,
    enableHierarchicalSort: options.enableHierarchicalSort,
    defaultSortColumn: options.defaultSortColumn,
    defaultSortOrder: options.defaultSortOrder,
    minMaxDisplayMode: options.minMaxDisplayMode,
    minMaxScope: options.minMaxScope,
    enableExport: options.enableExport,
    compactMode: options.compactMode,
    stripedRows: options.stripedRows,
    emitFilter: options.isCrossFilterActive,
    // Omitted when unset so charts without goals keep their previous props shape.
    ...(options.goals.length > 0 ? { goals: options.goals } : {}),
    ...(options.conditionalFormatting.length > 0
      ? { conditionalFormatting: options.conditionalFormatting }
      : {}),
    ...(options.theme.name !== 'standard' ? { theme: options.theme } : {}),
    filterState,
    onCrossFilter: createCrossFilterHandler({
      isCrossFilterActive: options.isCrossFilterActive,
      setDataMask,
      onAddFilter,
    }),
    onClearFilter: createClearFilterHandler(setDataMask),
  };
}
