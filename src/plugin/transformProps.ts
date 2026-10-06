import { DataRecord, ensureIsArray } from '@superset-ui/core';
import {
  HierarchicalTableChartProps,
  HierarchicalTableTransformedProps,
  TableColumn,
  TreeNode,
  PivotHeaderGroup,
} from '../types';
import { buildMultiDimensionTree, buildParentChildTree } from '../utils/treeBuilder';
import { computeGrandTotal, computeHorizontalRowTotals } from '../utils/aggregations';
import { computeTreeTimeComparison, computePivotTimeDelta } from '../utils/timeComparison';
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

  const isCombineMetric = combineMetric ?? combine_metric ?? true;
  const effectivePivotSortOrder = pivotSortOrder || pivot_sort_order || 'desc';
  const effectivePivotRowTotalsPosition =
    pivotRowTotalsPosition || pivot_row_totals_position || 'none';
  const effectivePivotRowTotalsLabel =
    pivotRowTotalsLabel || pivot_row_totals_label || 'Totals';
  const isPivotColSubtotals =
    showPivotColumnSubtotals ?? show_pivot_column_subtotals ?? true;
  const effectivePivotColSubtotalLabel =
    pivotColumnSubtotalLabel || pivot_column_subtotal_label || 'Totale';
  const effectivePivotDeltaMode = pivotTimeDeltaMode || pivot_time_delta_mode || 'none';
  const effectivePivotDeltaLag = Number(pivotTimeDeltaLag || pivot_time_delta_lag || 1);

  const dataRecords: DataRecord[] = queriesData?.[0]?.data || [];

  // Extract metric names
  const metrics: string[] = ensureIsArray(rawMetrics).map((m: any) =>
    typeof m === 'string' ? m : m?.label || m?.metric_name || String(m),
  );

  // Backward compat: support groupby, hierarchyDimensions, hierarchy_dimensions
  const rawDimensions = ensureIsArray(groupby || hierarchyDimensions || hierarchy_dimensions);
  const dimensions: string[] = rawDimensions.map((d: any) =>
    typeof d === 'string'
      ? d
      : d?.column_name || d?.label || d?.sqlExpression || String(d),
  );

  const idColStr = typeof idColumn === 'string' ? idColumn : idColumn?.column_name || idColumn?.label || '';
  const parentIdColStr = typeof parentIdColumn === 'string' ? parentIdColumn : parentIdColumn?.column_name || parentIdColumn?.label || '';
  const labelColStr = typeof labelColumn === 'string' ? labelColumn : labelColumn?.column_name || labelColumn?.label || '';

  // Calculate expand depth
  let calculatedExpandDepth = initialExpandDepth;
  if (expandAllByDefault || expand_all_by_default) {
    calculatedExpandDepth = -1;
  }

  // Calculate subtotal display
  const isSubtotals = showSubtotals ?? showRollupTotals ?? show_rollup_totals ?? true;

  // Extract pivot dimensions
  const rawPivotDims = ensureIsArray(mergedFormData.columns || mergedFormData.pivot_columns);
  const pivotDimensions: string[] = rawPivotDims.map((d: any) =>
    typeof d === 'string'
      ? d
      : d?.column_name || d?.label || d?.sqlExpression || String(d),
  );

  const isPivotMode = hierarchyType === 'multi_dimension' && pivotDimensions.length > 0;

  // Build hierarchical data tree based on mode
  let treeData: TreeNode[] = [];
  if (hierarchyType === 'multi_dimension') {
    treeData = buildMultiDimensionTree(dataRecords, dimensions, metrics, pivotDimensions);
  } else {
    treeData = buildParentChildTree(dataRecords, idColStr, parentIdColStr, labelColStr, metrics);
  }

  if (showVarianceDelta && hierarchyType === 'multi_dimension' && dimensions.length > 0) {
    computeTreeTimeComparison(treeData, metrics);
    // Push the delta keys to metrics array so they get rendered
    for (const m of [...metrics]) {
      if (!m.toLowerCase().includes('delta') && !m.toLowerCase().includes('variazione')) {
        metrics.push(`${m}___delta`);
      }
    }
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

  const pivotHeaderGroups: any[] = [];
  const allMetricKeysToCompute: string[] = [];

  if (isPivotMode) {
    const isMultiPivot = pivotDimensions.length >= 2;

    if (isMultiPivot) {
      const pDim1 = pivotDimensions[0];
      const pDim2 = pivotDimensions[1];
      const dim1ValSet = new Set<string>();
      const dim2ValSet = new Set<string>();

      for (const record of dataRecords) {
        const raw1 = record[pDim1];
        const val1 = raw1 !== null && raw1 !== undefined ? String(raw1) : '(Empty)';
        dim1ValSet.add(val1);

        const raw2 = record[pDim2];
        const val2 = raw2 !== null && raw2 !== undefined ? String(raw2) : '(Empty)';
        dim2ValSet.add(val2);
      }

      const chronologicalDim1 = Array.from(dim1ValSet).sort();
      let displayDim1Values: string[];
      if (effectivePivotSortOrder === 'desc') {
        displayDim1Values = [...chronologicalDim1].reverse();
      } else if (effectivePivotSortOrder === 'asc') {
        displayDim1Values = [...chronologicalDim1];
      } else {
        displayDim1Values = Array.from(dim1ValSet);
      }

      const dim2Values = Array.from(dim2ValSet);

      // Compute horizontal row totals across 1st pivot dimension values
      if (effectivePivotRowTotalsPosition !== 'none') {
        computeHorizontalRowTotals(treeData, metrics, displayDim1Values);
      }

      // Build row totals columns
      const rowTotalsCols: TableColumn[] = [];
      if (effectivePivotRowTotalsPosition !== 'none') {
        for (const m of metrics) {
          if (
            (m.toLowerCase().includes('confronto') || m.toLowerCase().includes('conf')) &&
            !m.toLowerCase().includes('delta') &&
            !m.toLowerCase().includes('variazione')
          ) {
            continue;
          }

          if (isPivotColSubtotals) {
            const rowTotalKey = `${m}___ROW_TOTAL`;
            allMetricKeysToCompute.push(rowTotalKey);
            rowTotalsCols.push({
              key: rowTotalKey,
              title:
                metrics.length > 1
                  ? `${effectivePivotColSubtotalLabel} (${m})`
                  : effectivePivotColSubtotalLabel,
              dataIndex: rowTotalKey,
              isMetric: true,
              pivotValue: effectivePivotRowTotalsLabel,
              baseMetric: `${effectivePivotRowTotalsLabel} ${effectivePivotColSubtotalLabel}`,
              align: 'right',
              width: 130,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });
          }

          for (const v2 of dim2Values) {
            const channelTotalKey = `${m}___ROW_TOTAL___${v2}`;
            allMetricKeysToCompute.push(channelTotalKey);
            rowTotalsCols.push({
              key: channelTotalKey,
              title: metrics.length > 1 ? `${v2} (${m})` : v2,
              dataIndex: channelTotalKey,
              isMetric: true,
              pivotValue: effectivePivotRowTotalsLabel,
              baseMetric: `${effectivePivotRowTotalsLabel} ${v2}`,
              align: 'right',
              width: 130,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });
          }
        }
      }

      const rowTotalsHeaderGroup: PivotHeaderGroup | null =
        effectivePivotRowTotalsPosition !== 'none' && rowTotalsCols.length > 0
          ? {
              title: effectivePivotRowTotalsLabel,
              key: '__pivot_row_totals__',
              colSpan: rowTotalsCols.length,
            }
          : null;

      // Position Row Totals on the left if requested
      if (effectivePivotRowTotalsPosition === 'left' && rowTotalsHeaderGroup) {
        pivotHeaderGroups.push(rowTotalsHeaderGroup);
        for (const c of rowTotalsCols) {
          columns.push(c);
        }
      }

      // Build 1st level pivot header groups and columns
      for (const d1Val of displayDim1Values) {
        let subColsCount = 0;

        for (const m of metrics) {
          if (
            (m.toLowerCase().includes('confronto') || m.toLowerCase().includes('conf')) &&
            !m.toLowerCase().includes('delta') &&
            !m.toLowerCase().includes('variazione')
          ) {
            continue;
          }

          if (isPivotColSubtotals) {
            const subtotalKey = `${m}___${d1Val}___SUBTOTAL`;
            allMetricKeysToCompute.push(subtotalKey);
            subColsCount++;
            columns.push({
              key: subtotalKey,
              title:
                metrics.length > 1
                  ? `${effectivePivotColSubtotalLabel} (${m})`
                  : effectivePivotColSubtotalLabel,
              dataIndex: subtotalKey,
              isMetric: true,
              pivotValue: d1Val,
              baseMetric: `${d1Val} ${effectivePivotColSubtotalLabel}`,
              align: 'right',
              width: 130,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });
          }

          for (const v2 of dim2Values) {
            const cellKey = `${m}___${d1Val}___${v2}`;
            allMetricKeysToCompute.push(cellKey);
            subColsCount++;
            columns.push({
              key: cellKey,
              title: metrics.length > 1 ? `${v2} (${m})` : v2,
              dataIndex: cellKey,
              isMetric: true,
              pivotValue: d1Val,
              baseMetric: `${d1Val} ${v2}`,
              align: 'right',
              width: 130,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });
          }
        }

        if (subColsCount > 0) {
          pivotHeaderGroups.push({
            title: d1Val,
            key: d1Val,
            colSpan: subColsCount,
          });
        }
      }

      // Position Row Totals on the right if requested
      if (effectivePivotRowTotalsPosition === 'right' && rowTotalsHeaderGroup) {
        pivotHeaderGroups.push(rowTotalsHeaderGroup);
        for (const c of rowTotalsCols) {
          columns.push(c);
        }
      }
    } else {
      // 1. Discover all distinct pivot values from dataRecords in appearance order
      const pivotValSet = new Set<string>();
      for (const record of dataRecords) {
        const parts: string[] = [];
        for (const pDim of pivotDimensions) {
          const rawP = record[pDim];
          parts.push(rawP !== null && rawP !== undefined ? String(rawP) : '(Empty)');
        }
        pivotValSet.add(parts.join(' - '));
      }

      const chronologicalPivotValues = Array.from(pivotValSet).sort();

      // 2. Compute dynamic pivot delta if enabled
      if (effectivePivotDeltaMode !== 'none') {
        computePivotTimeDelta(
          treeData,
          metrics,
          chronologicalPivotValues,
          effectivePivotDeltaMode,
          effectivePivotDeltaLag,
        );
      }

      // 2B. Compute horizontal row totals across all pivot values if enabled
      if (effectivePivotRowTotalsPosition !== 'none') {
        computeHorizontalRowTotals(treeData, metrics, chronologicalPivotValues);
      }

      // 3. Determine display order for pivot columns
      let displayPivotValues: string[];
      if (effectivePivotSortOrder === 'desc') {
        displayPivotValues = [...chronologicalPivotValues].reverse();
      } else if (effectivePivotSortOrder === 'asc') {
        displayPivotValues = [...chronologicalPivotValues];
      } else {
        displayPivotValues = Array.from(pivotValSet);
      }

      // Prepare row totals sub-columns and header group
      const rowTotalsCols: TableColumn[] = [];
      if (effectivePivotRowTotalsPosition !== 'none') {
        for (const m of metrics) {
          if (
            (m.toLowerCase().includes('confronto') || m.toLowerCase().includes('conf')) &&
            !m.toLowerCase().includes('delta') &&
            !m.toLowerCase().includes('variazione')
          ) {
            continue;
          }

          const rowTotalKey = `${m}___ROW_TOTAL`;
          allMetricKeysToCompute.push(rowTotalKey);

          rowTotalsCols.push({
            key: rowTotalKey,
            title: m,
            dataIndex: rowTotalKey,
            isMetric: true,
            pivotValue: effectivePivotRowTotalsLabel,
            baseMetric: `${effectivePivotRowTotalsLabel} ${m}`,
            align: 'right',
            width: 130,
            formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
          });
        }
      }

      const rowTotalsHeaderGroup: PivotHeaderGroup | null =
        effectivePivotRowTotalsPosition !== 'none' && rowTotalsCols.length > 0
          ? {
              title: effectivePivotRowTotalsLabel,
              key: '__pivot_row_totals__',
              colSpan: rowTotalsCols.length,
            }
          : null;

      if (isCombineMetric) {
        // 4A. Combined Metrics Layout: Pivot Value (top level) -> Metrics [Totale | Delta | Δ%] (bottom level)
        // Inject Totals at the beginning if left-positioned
        if (effectivePivotRowTotalsPosition === 'left' && rowTotalsHeaderGroup) {
          pivotHeaderGroups.push(rowTotalsHeaderGroup);
          for (const c of rowTotalsCols) {
            columns.push(c);
          }
        }

        for (const pVal of displayPivotValues) {
          let subColsCount = 0;

          for (const m of metrics) {
            if (
              (m.toLowerCase().includes('confronto') || m.toLowerCase().includes('conf')) &&
              !m.toLowerCase().includes('delta') &&
              !m.toLowerCase().includes('variazione')
            ) {
              continue;
            }

            const baseCompositeKey = `${m}___${pVal}`;
            allMetricKeysToCompute.push(baseCompositeKey);
            subColsCount++;

            columns.push({
              key: baseCompositeKey,
              title: m,
              dataIndex: baseCompositeKey,
              isMetric: true,
              pivotValue: pVal,
              baseMetric: m,
              align: 'right',
              width: 130,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });

            // Absolute delta sub-column
            if (effectivePivotDeltaMode === 'absolute' || effectivePivotDeltaMode === 'both') {
              const deltaKey = `${m}___delta___${pVal}`;
              allMetricKeysToCompute.push(deltaKey);
              subColsCount++;

              columns.push({
                key: deltaKey,
                title: metrics.length > 1 ? `Δ ${m}` : 'Delta',
                dataIndex: deltaKey,
                isMetric: true,
                pivotValue: pVal,
                baseMetric: `${m} Delta`,
                align: 'right',
                width: 120,
                formatter: (val: any) =>
                  formatMetricValue(val, numberFormat, currencySymbol, 'delta'),
              });
            }

            // Percentage delta sub-column
            if (effectivePivotDeltaMode === 'percentage' || effectivePivotDeltaMode === 'both') {
              const deltaPctKey = `${m}___delta_pct___${pVal}`;
              allMetricKeysToCompute.push(deltaPctKey);
              subColsCount++;

              columns.push({
                key: deltaPctKey,
                title: metrics.length > 1 ? `Δ% ${m}` : 'Δ%',
                dataIndex: deltaPctKey,
                isMetric: true,
                pivotValue: pVal,
                baseMetric: `${m} Δ%`,
                align: 'right',
                width: 110,
                formatter: (val: any) =>
                  val === null || val === undefined ? '-' : `${val > 0 ? '+' : ''}${val}%`,
              });
            }
          }

          if (subColsCount > 0) {
            pivotHeaderGroups.push({
              title: pVal,
              key: pVal,
              colSpan: subColsCount,
            });
          }
        }

        // Inject Totals at the end if right-positioned
        if (effectivePivotRowTotalsPosition === 'right' && rowTotalsHeaderGroup) {
          pivotHeaderGroups.push(rowTotalsHeaderGroup);
          for (const c of rowTotalsCols) {
            columns.push(c);
          }
        }
      } else {
        // 4B. Traditional Separated Metrics Layout: Metric (top level) -> Pivot Values (bottom level)
        for (const m of metrics) {
          if (
            (m.toLowerCase().includes('confronto') || m.toLowerCase().includes('conf')) &&
            !m.toLowerCase().includes('delta') &&
            !m.toLowerCase().includes('variazione')
          ) {
            continue;
          }

          const hasRowTotal = effectivePivotRowTotalsPosition !== 'none';
          const groupColSpan = displayPivotValues.length + (hasRowTotal ? 1 : 0);

          pivotHeaderGroups.push({
            title: m,
            key: m,
            colSpan: groupColSpan,
          });

          if (effectivePivotRowTotalsPosition === 'left') {
            const rowTotalKey = `${m}___ROW_TOTAL`;
            allMetricKeysToCompute.push(rowTotalKey);
            columns.push({
              key: rowTotalKey,
              title: effectivePivotRowTotalsLabel,
              dataIndex: rowTotalKey,
              isMetric: true,
              pivotValue: effectivePivotRowTotalsLabel,
              baseMetric: `${effectivePivotRowTotalsLabel} ${m}`,
              align: 'right',
              width: 140,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });
          }

          for (const pVal of displayPivotValues) {
            const compositeKey = `${m}___${pVal}`;
            allMetricKeysToCompute.push(compositeKey);

            columns.push({
              key: compositeKey,
              title: pVal,
              dataIndex: compositeKey,
              isMetric: true,
              pivotValue: pVal,
              baseMetric: m,
              align: 'right',
              width: 140,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });
          }

          if (effectivePivotRowTotalsPosition === 'right') {
            const rowTotalKey = `${m}___ROW_TOTAL`;
            allMetricKeysToCompute.push(rowTotalKey);
            columns.push({
              key: rowTotalKey,
              title: effectivePivotRowTotalsLabel,
              dataIndex: rowTotalKey,
              isMetric: true,
              pivotValue: effectivePivotRowTotalsLabel,
              baseMetric: `${effectivePivotRowTotalsLabel} ${m}`,
              align: 'right',
              width: 140,
              formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
            });
          }

          // Add delta group if absolute delta active
          if (effectivePivotDeltaMode === 'absolute' || effectivePivotDeltaMode === 'both') {
            pivotHeaderGroups.push({
              title: `Delta ${m}`,
              key: `delta___${m}`,
              colSpan: displayPivotValues.length,
            });

            for (const pVal of displayPivotValues) {
              const deltaKey = `${m}___delta___${pVal}`;
              allMetricKeysToCompute.push(deltaKey);

              columns.push({
                key: deltaKey,
                title: pVal,
                dataIndex: deltaKey,
                isMetric: true,
                pivotValue: pVal,
                baseMetric: `${m} Delta`,
                align: 'right',
                width: 120,
                formatter: (val: any) =>
                  formatMetricValue(val, numberFormat, currencySymbol, 'delta'),
              });
            }
          }

          // Add percentage delta group if percentage delta active
          if (effectivePivotDeltaMode === 'percentage' || effectivePivotDeltaMode === 'both') {
            pivotHeaderGroups.push({
              title: `Δ% ${m}`,
              key: `delta_pct___${m}`,
              colSpan: displayPivotValues.length,
            });

            for (const pVal of displayPivotValues) {
              const deltaPctKey = `${m}___delta_pct___${pVal}`;
              allMetricKeysToCompute.push(deltaPctKey);

              columns.push({
                key: deltaPctKey,
                title: pVal,
                dataIndex: deltaPctKey,
                isMetric: true,
                pivotValue: pVal,
                baseMetric: `${m} Δ%`,
                align: 'right',
                width: 110,
                formatter: (val: any) =>
                  val === null || val === undefined ? '-' : `${val > 0 ? '+' : ''}${val}%`,
              });
            }
          }
        }
      }
    }
  } else {
    for (const m of metrics) {
      allMetricKeysToCompute.push(m);

      if (
        (m.toLowerCase().includes('confronto') || m.toLowerCase().includes('conf')) &&
        !m.toLowerCase().includes('delta') &&
        !m.toLowerCase().includes('variazione')
      ) {
        continue;
      }

      columns.push({
        key: m,
        title: m.endsWith('___delta') ? `Δ% ${m.replace('___delta', '')}` : m,
        dataIndex: m,
        isMetric: true,
        align: 'right',
        width: 160,
        formatter: (val: any) => formatMetricValue(val, numberFormat, currencySymbol, m),
      });
    }
  }

  // Calculate Grand Total if enabled
  let grandTotalNode: TreeNode | undefined;
  if (showGrandTotal && treeData.length > 0) {
    grandTotalNode = computeGrandTotal(treeData, allMetricKeysToCompute);
    if (isPivotMode && effectivePivotDeltaMode !== 'none') {
      const chronologicalPivotValues = Array.from(
        new Set(
          dataRecords.map(r => {
            const parts: string[] = [];
            for (const pDim of pivotDimensions) {
              const rawP = r[pDim];
              parts.push(rawP !== null && rawP !== undefined ? String(rawP) : '(Empty)');
            }
            return parts.join(' - ');
          }),
        ),
      ).sort();

      computePivotTimeDelta(
        [grandTotalNode],
        metrics,
        chronologicalPivotValues,
        effectivePivotDeltaMode,
        effectivePivotDeltaLag,
      );
    }
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
    pivotHeaderGroups,
    isPivotMode,
    combineMetric: Boolean(isCombineMetric),
    pivotSortOrder: effectivePivotSortOrder,
    pivotRowTotalsPosition: effectivePivotRowTotalsPosition,
    pivotRowTotalsLabel: effectivePivotRowTotalsLabel,
    showPivotColumnSubtotals: isPivotColSubtotals,
    pivotColumnSubtotalLabel: effectivePivotColSubtotalLabel,
    pivotTimeDeltaMode: effectivePivotDeltaMode,
    formData,
    hierarchyType,
    dimensions,
    pivotColumns: pivotDimensions,
    metrics,
    displayMetrics: allMetricKeysToCompute,
    initialExpandDepth: calculatedExpandDepth,
    valueDisplayMode: valueDisplayMode || value_display_mode || 'all',
    showSubtotals: isSubtotals,
    showGrandTotal,
    grandTotalPosition: grandTotalPosition || grand_total_position || 'top',
    grandTotalNode,
    stickyHeader,
    enableSearch,
    enableHierarchicalSort:
      enableHierarchicalSort ?? enable_hierarchical_sort ?? enableSorting ?? enable_sorting ?? true,
    defaultSortColumn: defaultSortColumn || default_sort_column || '__hierarchy_tree__',
    defaultSortOrder: defaultSortOrder || default_sort_order || 'none',
    minMaxDisplayMode: minMaxDisplayMode || min_max_display_mode || 'none',
    minMaxScope: minMaxScope || min_max_scope || 'leaves_only',
    enableExport: enableExport ?? enable_export ?? true,
    compactMode,
    stripedRows,
    emitFilter: isCrossFilterActive,
    filterState,
    onCrossFilter: handleCrossFilter,
    onClearFilter: handleClearFilter,
  };
}
