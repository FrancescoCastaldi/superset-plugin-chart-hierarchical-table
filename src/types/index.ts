import {
  ChartProps,
  ChartDataResponse,
  QueryFormData,
  DataRecord,
} from '@superset-ui/core';

export type HierarchyType = 'multi_dimension' | 'parent_child';

export type AggregationFunction = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'weighted_avg';

export type SortOrder = 'asc' | 'desc' | 'none';

export type MinMaxDisplayMode = 'none' | 'badges' | 'heatmap' | 'data_bars';

export type MinMaxScope = 'leaves_only' | 'level_aware' | 'all_nodes';

export type HierarchyValueDisplayMode = 'all' | 'leaves_only' | 'parents_only';

export type PivotTimeDeltaMode = 'none' | 'absolute' | 'percentage' | 'both';

export type PivotSortOrder = 'desc' | 'asc' | 'none';

export type PivotRowTotalsPosition = 'left' | 'right' | 'none';

export type ComparisonTimeGrain = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type ComparisonReferencePeriod = 'current' | 'previous' | 'ytd';

export type ComparisonStrategy = 'prev_period' | 'prev_year_same_period' | 'budget_target';

export interface MinMaxBound {
  min: number;
  max: number;
}

export interface MinMaxBoundsMap {
  global: Record<string, MinMaxBound>;
  byLevel?: Record<string, Record<number, MinMaxBound>>;
}

export interface ConditionalFormattingRule {
  metric: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | 'between';
  targetValue: number;
  targetValue2?: number;
  colorScheme: 'red_green' | 'green_red' | 'blues' | 'custom';
  backgroundColor?: string;
  textColor?: string;
  highlightRow?: boolean;
}

export interface HierarchicalTableFormData extends QueryFormData {
  // Dimension & Metric Controls
  hierarchyType: HierarchyType;
  groupby?: string[];
  columns?: string[];
  pivot_columns?: string[];
  idColumn?: string;
  parentIdColumn?: string;
  labelColumn?: string;
  metrics: any;

  // Pivot & Matrix Options
  combineMetric?: boolean;
  pivotSortOrder?: PivotSortOrder;
  pivotRowTotalsPosition?: PivotRowTotalsPosition;
  pivotRowTotalsLabel?: string;
  showPivotColumnSubtotals?: boolean;
  pivotColumnSubtotalLabel?: string;
  pivotTimeDeltaMode?: PivotTimeDeltaMode;
  pivotTimeDeltaLag?: number;

  // Time Comparison: saved charts store these under the timeGrain, referencePeriod and
  // comparisonType control names, resolved to these fields in formDataOptions.ts.
  comparisonTimeGrain?: ComparisonTimeGrain;
  comparisonReferencePeriod?: ComparisonReferencePeriod;
  comparisonStrategy?: ComparisonStrategy;

  // Display & Hierarchy Options
  initialExpandDepth: number; // 0 = all collapsed, -1 = all expanded, N = expand up to level N
  valueDisplayMode?: HierarchyValueDisplayMode;
  showSubtotals: boolean;
  showGrandTotal: boolean;
  grandTotalPosition?: 'top' | 'bottom';
  stickyHeader: boolean;
  enableSearch: boolean;
  enableSorting: boolean;
  enableHierarchicalSort?: boolean;
  enableExport?: boolean;
  pageSize: number;

  // Sorting & Conditional Formatting
  defaultSortColumn?: string;
  defaultSortOrder?: SortOrder;
  minMaxDisplayMode?: MinMaxDisplayMode;
  minMaxScope?: MinMaxScope;

  // Formatting & Aesthetics
  numberFormat?: string;
  currencySymbol?: string;
  conditionalFormatting?: ConditionalFormattingRule[];
  stripedRows?: boolean;
  compactMode?: boolean;

  // Advanced Rollup Calculations: weightColumn is the metric that weights the weighted_avg rollup.
  aggregationMode?: AggregationFunction;
  weightColumn?: string;

  // Goals (optional)
  goals?: { metricKey: string; target: number; direction: 'higher_is_better' | 'lower_is_better' }[];

  // Cross Filtering (Superset 6.1.0)
  emit_filter?: boolean;
  enableCrossFiltering?: boolean;
}

export type MetricGoal = NonNullable<HierarchicalTableFormData['goals']>[number];

export type GoalDirection = MetricGoal['direction'];

export type GoalStatus = 'achieved' | 'on_track' | 'at_risk' | 'missed';

export interface GoalDelta {
  deltaAbsolute: number;
  /** Signed percentage of the target; null when the target is zero. */
  deltaPct: number | null;
  status: GoalStatus;
}

export interface TreeNode {
  key: string;
  id: string;
  name: string;
  dimension?: string;
  depth: number;
  path: string[];
  isLeaf: boolean;
  children?: TreeNode[];
  metrics: Record<string, number | string | null>;
  subtotals?: Record<string, number | string | null>;
  rawData?: DataRecord;
}

export interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  isMetric: boolean;
  isHierarchyDimension?: boolean;
  pivotValue?: string;
  baseMetric?: string;
  formatter?: (val: any) => any;
}

export interface PivotHeaderGroup {
  title: string;
  key: string;
  colSpan: number;
  subGroups?: PivotHeaderGroup[];
}

export interface HierarchicalTableTransformedProps {
  width: number;
  height: number;
  data: TreeNode[];
  rawRecords: DataRecord[];
  columns: TableColumn[];
  pivotHeaderGroups?: PivotHeaderGroup[];
  isPivotMode?: boolean;
  combineMetric?: boolean;
  pivotSortOrder?: PivotSortOrder;
  pivotRowTotalsPosition?: PivotRowTotalsPosition;
  pivotRowTotalsLabel?: string;
  showPivotColumnSubtotals?: boolean;
  pivotColumnSubtotalLabel?: string;
  pivotTimeDeltaMode?: PivotTimeDeltaMode;
  formData: HierarchicalTableFormData;
  hierarchyType: HierarchyType;
  dimensions: string[];
  pivotColumns?: string[];
  metrics: string[];
  displayMetrics: string[];
  initialExpandDepth: number;
  valueDisplayMode?: HierarchyValueDisplayMode;
  showSubtotals: boolean;
  showGrandTotal: boolean;
  grandTotalPosition?: 'top' | 'bottom';
  grandTotalNode?: TreeNode;
  stickyHeader: boolean;
  enableSearch: boolean;
  enableHierarchicalSort?: boolean;
  defaultSortColumn?: string;
  defaultSortOrder?: SortOrder;
  minMaxDisplayMode?: MinMaxDisplayMode;
  minMaxScope?: MinMaxScope;
  enableExport?: boolean;
  compactMode: boolean;
  stripedRows: boolean;
  emitFilter: boolean;
  goals?: MetricGoal[];
  filterState?: {
    value?: any;
    selectedValues?: string[];
    filters?: any[];
  };
  onCrossFilter?: (
    dimension: string,
    value: string | string[],
    pathMap?: Record<string, string> | Record<string, string>[],
    isCurrentlySelected?: boolean,
    allSelectedFilters?: SelectedFilterItem[],
  ) => void;
  onClearFilter?: () => void;
}

export interface SelectedFilterItem {
  key: string;
  dimension: string;
  value: string;
  pathMap?: Record<string, string>;
}

export type HierarchicalTableChartProps = ChartProps & {
  formData: HierarchicalTableFormData;
  queriesData: ChartDataResponse[];
  filterState?: any;
  hooks?: {
    setDataMask?: (dataMask: any) => void;
    onAddFilter?: (filter: any) => void;
    onContextMenu?: (event: any) => void;
  };
};
