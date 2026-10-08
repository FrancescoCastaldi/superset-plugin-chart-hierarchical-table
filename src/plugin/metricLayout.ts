import { DataRecord } from '@superset-ui/core';
import { TreeNode } from '../types';
import { computeHorizontalRowTotals } from '../utils/aggregations';
import {
  TimeDeltaStrategyConfig,
  computePivotTimeDelta,
  computeTreeTimeDeltaByStrategy,
} from '../utils/timeComparison';
import {
  ColumnLayout,
  appendPeriodComparisonColumns,
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
 * Time comparison of the single pivot layout, whose pivot keys are the periods. Null when it
 * cannot apply or adds nothing: the default current/prev_period pair always yields 0, and
 * budget_target needs at least one goal.
 */
export function resolveTimeDeltaStrategy(
  options: Pick<
    TransformOptions,
    | 'isPivotMode'
    | 'pivotDimensions'
    | 'comparisonTimeGrain'
    | 'comparisonReferencePeriod'
    | 'comparisonStrategy'
    | 'goals'
  >,
): TimeDeltaStrategyConfig | null {
  const { comparisonStrategy: strategy, comparisonReferencePeriod: referencePeriod } = options;
  if (!options.isPivotMode || options.pivotDimensions.length !== 1) return null;
  if (strategy === 'prev_period' && referencePeriod === 'current') return null;
  if (strategy === 'budget_target' && options.goals.length === 0) return null;
  return { timeGrain: options.comparisonTimeGrain, referencePeriod, strategy, goals: options.goals };
}

/**
 * Builds the metric columns for the active layout (flat, single pivot, two-way pivot).
 * In pivot mode it also enriches `treeData` in place with the pivot time deltas, the time
 * comparison deltas and the horizontal row totals, which must exist before the grand total is
 * computed.
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

  const layout = buildSinglePivotColumns({
    metrics,
    displayPivotValues: displayOrder(pivotKeys, options.pivotSortOrder),
    combineMetric: options.combineMetric,
    rowTotalsPosition: pivotRowTotalsPosition,
    rowTotalsLabel: options.pivotRowTotalsLabel,
    deltaMode: pivotTimeDeltaMode,
    format,
  });

  const timeDeltaStrategy = resolveTimeDeltaStrategy(options);
  if (
    timeDeltaStrategy &&
    computeTreeTimeDeltaByStrategy(treeData, metrics, chronologicalPivotValues, timeDeltaStrategy)
  ) {
    appendPeriodComparisonColumns(layout, metrics, timeDeltaStrategy, format);
  }

  return layout;
}
