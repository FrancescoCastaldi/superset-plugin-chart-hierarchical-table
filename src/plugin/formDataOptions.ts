import { ensureIsArray } from '@superset-ui/core';
import {
  HierarchyType,
  HierarchyValueDisplayMode,
  MinMaxDisplayMode,
  MinMaxScope,
  PivotRowTotalsPosition,
  PivotSortOrder,
  PivotTimeDeltaMode,
  SortOrder,
} from '../types';

/**
 * Normalized chart options. Every camelCase control has a legacy snake_case alias:
 * the resolution order below is part of the plugin contract with saved charts.
 */
export interface TransformOptions {
  hierarchyType: HierarchyType;
  dimensions: string[];
  pivotDimensions: string[];
  metrics: string[];
  idColumn: string;
  parentIdColumn: string;
  labelColumn: string;
  isPivotMode: boolean;
  initialExpandDepth: number;
  valueDisplayMode: HierarchyValueDisplayMode;
  showSubtotals: boolean;
  showGrandTotal: boolean;
  grandTotalPosition: 'top' | 'bottom';
  stickyHeader: boolean;
  enableSearch: boolean;
  compactMode: boolean;
  stripedRows: boolean;
  numberFormat: string;
  currencySymbol: string;
  isCrossFilterActive: boolean;
  enableHierarchicalSort: boolean;
  defaultSortColumn: string;
  defaultSortOrder: SortOrder;
  minMaxDisplayMode: MinMaxDisplayMode;
  minMaxScope: MinMaxScope;
  enableExport: boolean;
  showVarianceDelta: boolean;
  combineMetric: any;
  pivotSortOrder: PivotSortOrder;
  pivotRowTotalsPosition: PivotRowTotalsPosition;
  pivotRowTotalsLabel: string;
  showPivotColumnSubtotals: boolean;
  pivotColumnSubtotalLabel: string;
  pivotTimeDeltaMode: PivotTimeDeltaMode;
  pivotTimeDeltaLag: number;
}

export function getMetricNames(rawMetrics: any): string[] {
  return ensureIsArray(rawMetrics).map((m: any) =>
    typeof m === 'string' ? m : m?.label || m?.metric_name || String(m),
  );
}

export function getColumnNames(rawColumns: any): string[] {
  return ensureIsArray(rawColumns).map((d: any) =>
    typeof d === 'string'
      ? d
      : d?.column_name || d?.label || d?.sqlExpression || String(d),
  );
}

export function getColumnName(column: any): string {
  return typeof column === 'string' ? column : column?.column_name || column?.label || '';
}

export function resolveTransformOptions(mergedFormData: any): TransformOptions {
  const {
    hierarchyType = 'multi_dimension',
    groupby,
    hierarchy_dimensions,
    hierarchyDimensions,
    idColumn = '',
    parentIdColumn = '',
    labelColumn = '',
    metrics: rawMetrics = [],
    initialExpandDepth = 1,
    valueDisplayMode = 'all',
    value_display_mode,
    expand_all_by_default,
    expandAllByDefault,
    showSubtotals = true,
    show_rollup_totals,
    showRollupTotals,
    showGrandTotal = true,
    grandTotalPosition = 'top',
    grand_total_position,
    stickyHeader = true,
    enableSearch = true,
    compactMode = false,
    stripedRows = true,
    numberFormat = 'SMART_NUMBER',
    currencySymbol = '',
    emit_filter,
    emitFilter,
    enableCrossFiltering,
    enable_cross_filtering,
    enableHierarchicalSort,
    enable_hierarchical_sort,
    enableSorting,
    enable_sorting,
    defaultSortColumn = '__hierarchy_tree__',
    default_sort_column,
    defaultSortOrder = 'none',
    default_sort_order,
    minMaxDisplayMode = 'none',
    min_max_display_mode,
    minMaxScope = 'leaves_only',
    min_max_scope,
    enableExport = true,
    enable_export,
    showVarianceDelta,
    combineMetric = true,
    combine_metric,
    pivotSortOrder = 'desc',
    pivot_sort_order,
    pivotRowTotalsPosition = 'none',
    pivot_row_totals_position,
    pivotRowTotalsLabel = 'Totals',
    pivot_row_totals_label,
    showPivotColumnSubtotals = true,
    show_pivot_column_subtotals,
    pivotColumnSubtotalLabel = 'Totale',
    pivot_column_subtotal_label,
    pivotTimeDeltaMode = 'none',
    pivot_time_delta_mode,
    pivotTimeDeltaLag = 1,
    pivot_time_delta_lag,
  } = mergedFormData;

  const dimensions = getColumnNames(groupby || hierarchyDimensions || hierarchy_dimensions);
  const pivotDimensions = getColumnNames(mergedFormData.columns || mergedFormData.pivot_columns);

  return {
    hierarchyType,
    dimensions,
    pivotDimensions,
    metrics: getMetricNames(rawMetrics),
    idColumn: getColumnName(idColumn),
    parentIdColumn: getColumnName(parentIdColumn),
    labelColumn: getColumnName(labelColumn),
    isPivotMode: hierarchyType === 'multi_dimension' && pivotDimensions.length > 0,
    initialExpandDepth: expandAllByDefault || expand_all_by_default ? -1 : initialExpandDepth,
    valueDisplayMode: valueDisplayMode || value_display_mode || 'all',
    showSubtotals: showSubtotals ?? showRollupTotals ?? show_rollup_totals ?? true,
    showGrandTotal,
    grandTotalPosition: grandTotalPosition || grand_total_position || 'top',
    stickyHeader,
    enableSearch,
    compactMode,
    stripedRows,
    numberFormat,
    currencySymbol,
    isCrossFilterActive: Boolean(
      emitFilter ?? emit_filter ?? enableCrossFiltering ?? enable_cross_filtering ?? true,
    ),
    enableHierarchicalSort:
      enableHierarchicalSort ?? enable_hierarchical_sort ?? enableSorting ?? enable_sorting ?? true,
    defaultSortColumn: defaultSortColumn || default_sort_column || '__hierarchy_tree__',
    defaultSortOrder: defaultSortOrder || default_sort_order || 'none',
    minMaxDisplayMode: minMaxDisplayMode || min_max_display_mode || 'none',
    minMaxScope: minMaxScope || min_max_scope || 'leaves_only',
    enableExport: enableExport ?? enable_export ?? true,
    showVarianceDelta,
    combineMetric: combineMetric ?? combine_metric ?? true,
    pivotSortOrder: pivotSortOrder || pivot_sort_order || 'desc',
    pivotRowTotalsPosition: pivotRowTotalsPosition || pivot_row_totals_position || 'none',
    pivotRowTotalsLabel: pivotRowTotalsLabel || pivot_row_totals_label || 'Totals',
    showPivotColumnSubtotals: showPivotColumnSubtotals ?? show_pivot_column_subtotals ?? true,
    pivotColumnSubtotalLabel: pivotColumnSubtotalLabel || pivot_column_subtotal_label || 'Totale',
    pivotTimeDeltaMode: pivotTimeDeltaMode || pivot_time_delta_mode || 'none',
    pivotTimeDeltaLag: Number(pivotTimeDeltaLag || pivot_time_delta_lag || 1),
  };
}
