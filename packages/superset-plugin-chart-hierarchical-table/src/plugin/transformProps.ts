import {
  ChartProps,
  DataRecord,
  ensureIsArray,
  getNumberFormatter,
} from '@superset-ui/core';
import {
  HierarchicalTableChartProps,
  HierarchicalTableFormData,
  HierarchicalTableTransformedProps,
  TableColumn,
  TreeNode,
} from '../types';
import {
  buildMultiDimensionTree,
  buildParentChildTree,
} from '../utils/treeBuilder';
import { computeGrandTotal } from '../utils/aggregations';
import { formatMetricValue } from '../utils/formatters';

export default function transformProps(
  chartProps: HierarchicalTableChartProps,
): HierarchicalTableTransformedProps {
  const { width, height, formData, queriesData, hooks } = chartProps;
  const { onAddFilter } = hooks || {};

  const {
    hierarchyType = 'multi_dimension',
    groupby,
    idColumn = '',
    parentIdColumn = '',
    labelColumn = '',
    metrics: rawMetrics = [],
    initialExpandDepth = 1,
    showSubtotals = true,
    showGrandTotal = true,
    indentSize = 20,
    stickyHeader = true,
    stickyFirstColumn = true,
    enableSearch = true,
    compactMode = false,
    stripedRows = true,
    numberFormat = 'SMART_NUMBER',
    currencySymbol = '',
  } = formData as HierarchicalTableFormData;

  const dataRecords: DataRecord[] = queriesData?.[0]?.data || [];

  // Extract metric names
  const metrics: string[] = ensureIsArray(rawMetrics).map(m =>
    typeof m === 'string' ? m : m.label,
  );

  const dimensions: string[] = ensureIsArray(groupby);

  // Build hierarchical data tree based on mode
  let treeData: TreeNode[] = [];
  if (hierarchyType === 'multi_dimension') {
    treeData = buildMultiDimensionTree(dataRecords, dimensions, metrics);
  } else {
    treeData = buildParentChildTree(
      dataRecords,
      idColumn,
      parentIdColumn,
      labelColumn,
      metrics,
    );
  }

  // Create columns definition
  const columns: TableColumn[] = [
    {
      key: '__hierarchy_tree__',
      title: hierarchyType === 'multi_dimension' ? dimensions.join(' / ') || 'Hierarchy' : 'Hierarchy Tree',
      dataIndex: 'name',
      isMetric: false,
      isHierarchyDimension: true,
      align: 'left',
      width: 320,
    },
  ];

  for (const m of metrics) {
    columns.push({
      key: m,
      title: m,
      dataIndex: m,
      isMetric: true,
      align: 'right',
      width: 160,
      formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol),
    });
  }

  // Calculate Grand Total if enabled
  let grandTotalNode: TreeNode | undefined;
  if (showGrandTotal && treeData.length > 0) {
    grandTotalNode = computeGrandTotal(treeData, metrics);
  }

  const handleCrossFilter = (dimension: string, value: string) => {
    if (onAddFilter && dimension && value) {
      onAddFilter({ [dimension]: [value] });
    }
  };

  return {
    width,
    height,
    data: treeData,
    rawRecords: dataRecords,
    columns,
    formData,
    hierarchyType,
    dimensions,
    metrics,
    initialExpandDepth,
    showSubtotals,
    showGrandTotal,
    grandTotalNode,
    stickyHeader,
    stickyFirstColumn,
    enableSearch,
    indentSize,
    compactMode,
    stripedRows,
    onCrossFilter: handleCrossFilter,
  };
}
