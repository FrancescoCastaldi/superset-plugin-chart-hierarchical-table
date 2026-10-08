import { DataRecord } from '@superset-ui/core';
import { PivotTimeDeltaMode, TreeNode } from '../types';
import { computeGrandTotal } from '../utils/aggregations';
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
}: GrandTotalParams): TreeNode | undefined {
  if (!showGrandTotal || treeData.length === 0) {
    return undefined;
  }

  const grandTotalNode = computeGrandTotal(treeData, metricKeys);
  const periodKeys = (): string[] =>
    chronologicalOrder(collectDistinctPivotKeys(records, pivotDimensions));

  if (isPivotMode && pivotTimeDeltaMode !== 'none') {
    computePivotTimeDelta(
      [grandTotalNode],
      metrics,
      periodKeys(),
      pivotTimeDeltaMode,
      pivotTimeDeltaLag,
    );
  }

  if (isPivotMode && timeDeltaStrategy) {
    computeTreeTimeDeltaByStrategy([grandTotalNode], metrics, periodKeys(), timeDeltaStrategy);
  }

  return grandTotalNode;
}
