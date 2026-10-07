import { DataRecord } from '@superset-ui/core';
import { TreeNode } from '../types';
import { computeHorizontalRowTotals } from '../utils/aggregations';
import { computePivotTimeDelta } from '../utils/timeComparison';
import {
  ColumnLayout,
  buildFlatColumns,
  buildMultiPivotColumns,
  buildSinglePivotColumns,
} from './columnBuilders';
import { TransformOptions } from './formDataOptions';
import {
  chronologicalOrder,
  collectDistinctPivotKeys,
  collectDistinctValues,
  displayOrder,
} from './pivotOrdering';

/**
 * Builds the metric columns for the active layout (flat, single pivot, two-way pivot).
 * In pivot mode it also enriches `treeData` in place with the pivot time deltas and the
 * horizontal row totals, which must exist before the grand total is computed.
 */
export function buildMetricLayout(
  treeData: TreeNode[],
  records: DataRecord[],
  options: TransformOptions,
  metrics: string[],
): ColumnLayout {
  const format = { numberFormat: options.numberFormat, currencySymbol: options.currencySymbol };
  const { pivotDimensions, pivotRowTotalsPosition, pivotTimeDeltaMode } = options;

  if (!options.isPivotMode) {
    return buildFlatColumns(metrics, format);
  }

  if (pivotDimensions.length >= 2) {
    const displayDim1Values = displayOrder(
      collectDistinctValues(records, pivotDimensions[0]),
      options.pivotSortOrder,
    );
    const dim2Values = collectDistinctValues(records, pivotDimensions[1]);

    if (pivotRowTotalsPosition !== 'none') {
      computeHorizontalRowTotals(treeData, metrics, displayDim1Values);
    }

    return buildMultiPivotColumns({
      metrics,
      displayDim1Values,
      dim2Values,
      rowTotalsPosition: pivotRowTotalsPosition,
      rowTotalsLabel: options.pivotRowTotalsLabel,
      showColumnSubtotals: options.showPivotColumnSubtotals,
      columnSubtotalLabel: options.pivotColumnSubtotalLabel,
      format,
    });
  }

  const pivotKeys = collectDistinctPivotKeys(records, pivotDimensions);
  const chronologicalPivotValues = chronologicalOrder(pivotKeys);

  if (pivotTimeDeltaMode !== 'none') {
    computePivotTimeDelta(
      treeData,
      metrics,
      chronologicalPivotValues,
      pivotTimeDeltaMode,
      options.pivotTimeDeltaLag,
    );
  }

  if (pivotRowTotalsPosition !== 'none') {
    computeHorizontalRowTotals(treeData, metrics, chronologicalPivotValues);
  }

  return buildSinglePivotColumns({
    metrics,
    displayPivotValues: displayOrder(pivotKeys, options.pivotSortOrder),
    combineMetric: options.combineMetric,
    rowTotalsPosition: pivotRowTotalsPosition,
    rowTotalsLabel: options.pivotRowTotalsLabel,
    deltaMode: pivotTimeDeltaMode,
    format,
  });
}
