import { TreeNode, AggregationFunction } from '../types';

/**
 * Calculates aggregate values for a list of child numbers based on the aggregation function.
 */
export function calculateAggregation(
  values: number[],
  aggFunc: AggregationFunction = 'sum',
): number | null {
  if (!values || values.length === 0) return null;

  switch (aggFunc) {
    case 'sum':
      return values.reduce((acc, curr) => acc + curr, 0);
    case 'avg':
      return values.reduce((acc, curr) => acc + curr, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    default:
      return values.reduce((acc, curr) => acc + curr, 0);
  }
}

/**
 * Recursively rolls up metric calculations from leaves to parent nodes.
 */
export function rollupTreeMetrics(
  nodes: TreeNode[],
  metricNames: string[],
  aggFunc: AggregationFunction = 'sum',
): void {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      // Rollup children first (post-order traversal)
      rollupTreeMetrics(node.children, metricNames, aggFunc);

      // Aggregate each metric for the current parent node
      for (const metric of metricNames) {
        const childMetricValues: number[] = [];

        for (const child of node.children) {
          const val = child.metrics[metric];
          if (val !== null && val !== undefined && typeof val === 'number' && !isNaN(val)) {
            childMetricValues.push(val);
          }
        }

        const aggregatedVal = calculateAggregation(childMetricValues, aggFunc);
        node.metrics[metric] = aggregatedVal;
        if (!node.subtotals) {
          node.subtotals = {};
        }
        node.subtotals[metric] = aggregatedVal;
      }
    }
  }
}

/**
 * Computes a Grand Total node aggregating all top-level roots.
 */
export function computeGrandTotal(
  rootNodes: TreeNode[],
  metricNames: string[],
  aggFunc: AggregationFunction = 'sum',
): TreeNode {
  const grandTotalMetrics: Record<string, number | null> = {};

  for (const metric of metricNames) {
    const rootValues: number[] = [];
    for (const root of rootNodes) {
      const val = root.metrics[metric];
      if (val !== null && val !== undefined && typeof val === 'number' && !isNaN(val)) {
        rootValues.push(val);
      }
    }
    grandTotalMetrics[metric] = calculateAggregation(rootValues, aggFunc);
  }

  return {
    key: '__grand_total__',
    id: '__grand_total__',
    name: 'Grand Total',
    depth: 0,
    path: ['Grand Total'],
    isLeaf: true,
    metrics: grandTotalMetrics,
    subtotals: grandTotalMetrics,
  };
}
