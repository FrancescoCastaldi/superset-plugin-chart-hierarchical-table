import { DataRecord, ensureIsArray } from '@superset-ui/core';
import {
  HierarchicalTableChartProps,
  HierarchicalTableTransformedProps,
  TableColumn,
  TreeNode,
} from '../types';
import { buildMultiDimensionTree, buildParentChildTree } from '../utils/treeBuilder';
import { computeGrandTotal } from '../utils/aggregations';
import { formatMetricValue } from '../utils/formatters';

export default function transformProps(
  chartProps: HierarchicalTableChartProps,
): HierarchicalTableTransformedProps {
  const { width, height, formData = {} as any, rawFormData = {} as any, queriesData, hooks, filterState } = chartProps as any;
  const { onAddFilter, setDataMask } = hooks || {};

  const mergedFormData: any = { ...rawFormData, ...formData };
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
    expand_all_by_default,
    expandAllByDefault,
    showSubtotals = true,
    show_rollup_totals,
    showRollupTotals,
    showGrandTotal = true,
    indentSize = 20,
    stickyHeader = true,
    stickyFirstColumn = true,
    enableSearch = true,
    compactMode = false,
    stripedRows = true,
    numberFormat = 'SMART_NUMBER',
    currencySymbol = '',
    emit_filter,
    emitFilter,
    enableCrossFiltering,
    enable_cross_filtering,
  } = mergedFormData;

  const dataRecords: DataRecord[] = queriesData?.[0]?.data || [];

  // Extract metric names
  const metrics: string[] = ensureIsArray(rawMetrics).map((m: any) =>
    typeof m === 'string' ? m : m?.label || String(m),
  );

  // Backward compat: support groupby, hierarchyDimensions, hierarchy_dimensions
  const dimensions: string[] = ensureIsArray(groupby || hierarchyDimensions || hierarchy_dimensions);

  // Calculate expand depth
  let calculatedExpandDepth = initialExpandDepth;
  if (expandAllByDefault || expand_all_by_default) {
    calculatedExpandDepth = -1;
  }

  // Calculate subtotal display
  const isSubtotals = showSubtotals ?? showRollupTotals ?? show_rollup_totals ?? true;

  // Build hierarchical data tree based on mode
  let treeData: TreeNode[] = [];
  if (hierarchyType === 'multi_dimension') {
    treeData = buildMultiDimensionTree(dataRecords, dimensions, metrics);
  } else {
    treeData = buildParentChildTree(dataRecords, idColumn, parentIdColumn, labelColumn, metrics);
  }

  // Create columns definition
  const columns: TableColumn[] = [
    {
      key: '__hierarchy_tree__',
      title:
        hierarchyType === 'multi_dimension'
          ? dimensions.join(' / ') || 'Hierarchy'
          : 'Hierarchy Tree',
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

  const isCrossFilterActive = Boolean(
    emitFilter ?? emit_filter ?? enableCrossFiltering ?? enable_cross_filtering ?? true,
  );

  // Superset 6.1.0 Cross-Filter handler supporting multi-selection
  const handleCrossFilter = (
    dimension: string,
    value: string | string[],
    pathMap?: Record<string, string> | Record<string, string>[],
    isCurrentlySelected?: boolean,
    allSelectedFilters?: any[],
  ) => {
    if (!isCrossFilterActive) return;

    if (setDataMask) {
      if (allSelectedFilters && allSelectedFilters.length === 0) {
        setDataMask({
          extraFormData: {
            filters: [],
          },
          filterState: {
            value: null,
            selectedValues: [],
            filters: null,
            selectedFilters: null,
          },
        });
      } else if (allSelectedFilters && allSelectedFilters.length > 0) {
        // Group values by dimension
        const dimValuesMap: Record<string, string[]> = {};
        for (const item of allSelectedFilters) {
          if (item.pathMap && Object.keys(item.pathMap).length > 0) {
            for (const [col, v] of Object.entries(item.pathMap)) {
              if (!dimValuesMap[col]) dimValuesMap[col] = [];
              if (!dimValuesMap[col].includes(v as string)) dimValuesMap[col].push(v as string);
            }
          } else {
            if (!dimValuesMap[item.dimension]) dimValuesMap[item.dimension] = [];
            if (!dimValuesMap[item.dimension].includes(item.value)) {
              dimValuesMap[item.dimension].push(item.value);
            }
          }
        }

        const filters = Object.entries(dimValuesMap).map(([col, vals]) => ({
          col,
          op: 'IN' as const,
          val: vals,
        }));

        const selectedVals = allSelectedFilters.map(f => f.value);

        setDataMask({
          extraFormData: {
            filters,
          },
          filterState: {
            value: selectedVals,
            selectedValues: selectedVals,
            label: allSelectedFilters.map(f => `${f.dimension}: ${f.value}`).join(', '),
            filters: dimValuesMap,
            selectedFilters: dimValuesMap,
          },
        });
      } else if (isCurrentlySelected) {
        setDataMask({
          extraFormData: {
            filters: [],
          },
          filterState: {
            value: null,
            selectedValues: [],
            filters: null,
            selectedFilters: null,
          },
        });
      } else {
        const valArray = Array.isArray(value) ? value : [value];
        const filters = [
          {
            col: dimension,
            op: 'IN' as const,
            val: valArray,
          },
        ];

        setDataMask({
          extraFormData: {
            filters,
          },
          filterState: {
            value: valArray,
            selectedValues: valArray,
            label: `${dimension}: ${valArray.join(', ')}`,
            filters: { [dimension]: valArray },
            selectedFilters: { [dimension]: valArray },
          },
        });
      }
    } else if (onAddFilter && dimension && value) {
      onAddFilter({ [dimension]: Array.isArray(value) ? value : [value] });
    }
  };

  const handleClearFilter = () => {
    if (setDataMask) {
      setDataMask({
        extraFormData: {
          filters: [],
        },
        filterState: {
          value: null,
          selectedValues: [],
          filters: null,
          selectedFilters: null,
        },
      });
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
    initialExpandDepth: calculatedExpandDepth,
    showSubtotals: isSubtotals,
    showGrandTotal,
    grandTotalNode,
    stickyHeader,
    stickyFirstColumn,
    enableSearch,
    indentSize,
    compactMode,
    stripedRows,
    emitFilter: isCrossFilterActive,
    filterState,
    onCrossFilter: handleCrossFilter,
    onClearFilter: handleClearFilter,
  };
}
