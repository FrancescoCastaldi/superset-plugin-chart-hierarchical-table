import {
  ChartProps,
  ChartDataResponsePayload,
  QueryFormData,
  DataRecord,
  NumberFormatter,
} from '@superset-ui/core';

export type HierarchyType = 'multi_dimension' | 'parent_child';

export type AggregationFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';

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
  idColumn?: string;
  parentIdColumn?: string;
  labelColumn?: string;
  metrics: Array<string | { label: string; expressionType: string }>;

  // Display & Hierarchy Options
  initialExpandDepth: number; // 0 = all collapsed, -1 = all expanded, N = expand up to level N
  showSubtotals: boolean;
  showGrandTotal: boolean;
  indentSize: number; // pixels
  stickyHeader: boolean;
  stickyFirstColumn: boolean;
  enableSearch: boolean;
  enableSorting: boolean;
  pageSize: number;

  // Formatting & Aesthetics
  numberFormat?: string;
  currencySymbol?: string;
  conditionalFormatting?: ConditionalFormattingRule[];
  stripedRows?: boolean;
  compactMode?: boolean;

  // Cross Filtering (Superset 6.1.0)
  emit_filter?: boolean;
  enableCrossFiltering?: boolean;
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
  metrics: Record<string, number | null>;
  subtotals?: Record<string, number | null>;
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
  formatter?: (val: any) => string;
}

export interface HierarchicalTableTransformedProps {
  width: number;
  height: number;
  data: TreeNode[];
  rawRecords: DataRecord[];
  columns: TableColumn[];
  formData: HierarchicalTableFormData;
  hierarchyType: HierarchyType;
  dimensions: string[];
  metrics: string[];
  initialExpandDepth: number;
  showSubtotals: boolean;
  showGrandTotal: boolean;
  grandTotalNode?: TreeNode;
  stickyHeader: boolean;
  stickyFirstColumn: boolean;
  enableSearch: boolean;
  indentSize: number;
  compactMode: boolean;
  stripedRows: boolean;
  emitFilter: boolean;
  filterState?: {
    value?: any;
    selectedValues?: string[];
    filters?: any[];
  };
  onCrossFilter?: (
    dimension: string,
    value: string,
    pathMap?: Record<string, string>,
    isCurrentlySelected?: boolean,
  ) => void;
  onClearFilter?: () => void;
}

export type HierarchicalTableChartProps = ChartProps & {
  formData: HierarchicalTableFormData;
  queriesData: ChartDataResponsePayload[];
  filterState?: any;
  hooks?: {
    setDataMask?: (dataMask: any) => void;
    onAddFilter?: (filter: any) => void;
    onContextMenu?: (event: any) => void;
  };
};

