import { DataRecord } from '@superset-ui/core';
import {
  HierarchicalTableChartProps,
  HierarchicalTableTransformedProps,
  TableColumn,
} from '../types';
import { buildHierarchyColumn } from './columnBuilders';
import { createClearFilterHandler, createCrossFilterHandler } from './eventHandlers';
import { resolveTransformOptions } from './formDataOptions';
import { buildGrandTotalNode } from './grandTotal';
import { buildMetricLayout } from './metricLayout';
import { buildTreeData } from './treeData';

export default function transformProps(
  chartProps: HierarchicalTableChartProps,
): HierarchicalTableTransformedProps {
  const { width, height, formData = {} as any, rawFormData = {} as any, queriesData, hooks, filterState } = chartProps as any;
  const { onAddFilter, setDataMask } = hooks || {};

  const options = resolveTransformOptions({ ...rawFormData, ...formData });
  const dataRecords: DataRecord[] = queriesData?.[0]?.data || [];

  const { treeData, metrics } = buildTreeData(dataRecords, options);
  const layout = buildMetricLayout(treeData, dataRecords, options, metrics);

  const columns: TableColumn[] = [
    buildHierarchyColumn(options.hierarchyType, options.dimensions),
    ...layout.columns,
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
  });

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
    filterState,
    onCrossFilter: createCrossFilterHandler({
      isCrossFilterActive: options.isCrossFilterActive,
      setDataMask,
      onAddFilter,
    }),
    onClearFilter: createClearFilterHandler(setDataMask),
  };
}
