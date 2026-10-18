import { DataRecord } from '@superset-ui/core';
import { AggregationFunction, PivotTimeDeltaMode, TreeNode } from '../types';
import { computeGrandTotal, rollupFunction } from '../utils/aggregations';
import {
  TimeDeltaStrategyConfig,
  computePivotTimeDelta,
  computeTreeTimeDeltaByStrategy,
} from '../utils/timeComparison';
import { chronologicalOrder, collectDistinctPivotKeys } from './pivotOrdering';

export interface GrandTotalParams {
  treeData: TreeNode[];
  records: DataRecord[];
  metrics: string[];
  metricKeys: string[];
  showGrandTotal: boolean;
  isPivotMode: boolean;
  pivotDimensions: string[];
  pivotTimeDeltaMode: PivotTimeDeltaMode;
  pivotTimeDeltaLag: number;
  timeDeltaStrategy?: TimeDeltaStrategyConfig | null;
  weightColumn?: string;
  aggregationMode?: AggregationFunction;
  showVarianceDelta?: boolean;
}

/**
 * Grand total row over all root nodes, including the pivot time deltas and the time comparison
 * deltas computed on the totals themselves (never summed from the children).
 */
export function buildGrandTotalNode({
  treeData,
  records,
  metrics,
  metricKeys,
  showGrandTotal,
  isPivotMode,
  pivotDimensions,
  pivotTimeDeltaMode,
  pivotTimeDeltaLag,
  timeDeltaStrategy,
  weightColumn = '',
  aggregationMode = 'sum',
  showVarianceDelta = false,
}: GrandTotalParams): TreeNode | undefined {
  if (!showGrandTotal || treeData.length === 0) {
    return undefined;
  }

  const grandTotalNode = computeGrandTotal(
    treeData,
    metricKeys,
    rollupFunction(weightColumn, aggregationMode),
    weightColumn,
  );
  const periodKeys = (): string[] =>
    chronologicalOrder(collectDistinctPivotKeys(records, pivotDimensions));

  const effectivePivotDeltaMode =
    pivotTimeDeltaMode && pivotTimeDeltaMode !== 'none'
      ? pivotTimeDeltaMode
      : showVarianceDelta
      ? 'percentage'
      : 'none';

  if (isPivotMode && effectivePivotDeltaMode !== 'none') {
    computePivotTimeDelta(
      [grandTotalNode],
      metrics,
      periodKeys(),
      effectivePivotDeltaMode,
      pivotTimeDeltaLag,
    );
  }

  if (isPivotMode && timeDeltaStrategy) {
    computeTreeTimeDeltaByStrategy([grandTotalNode], metrics, periodKeys(), timeDeltaStrategy);
  }

  return grandTotalNode;
}
