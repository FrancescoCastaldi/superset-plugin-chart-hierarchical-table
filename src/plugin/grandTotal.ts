import { DataRecord } from '@superset-ui/core';
import { PivotTimeDeltaMode, TreeNode } from '../types';
import { computeGrandTotal } from '../utils/aggregations';
import { computePivotTimeDelta } from '../utils/timeComparison';
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
}

/**
 * Grand total row over all root nodes, including the pivot time deltas computed on the totals
 * themselves (never summed from the children).
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
}: GrandTotalParams): TreeNode | undefined {
  if (!showGrandTotal || treeData.length === 0) {
    return undefined;
  }

  const grandTotalNode = computeGrandTotal(treeData, metricKeys);

  if (isPivotMode && pivotTimeDeltaMode !== 'none') {
    computePivotTimeDelta(
      [grandTotalNode],
      metrics,
      chronologicalOrder(collectDistinctPivotKeys(records, pivotDimensions)),
      pivotTimeDeltaMode,
      pivotTimeDeltaLag,
    );
  }

  return grandTotalNode;
}
