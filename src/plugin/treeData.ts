import { DataRecord } from '@superset-ui/core';
import { TreeNode } from '../types';
import { buildMultiDimensionTree, buildParentChildTree } from '../utils/treeBuilder';
import { computeTreeTimeComparison } from '../utils/timeComparison';
import { TransformOptions } from './formDataOptions';

export type TreeDataOptions = Pick<
  TransformOptions,
  | 'hierarchyType'
  | 'dimensions'
  | 'pivotDimensions'
  | 'metrics'
  | 'idColumn'
  | 'parentIdColumn'
  | 'labelColumn'
  | 'showVarianceDelta'
>;

/**
 * Appends the `${metric}___delta` keys produced by the period-over-period comparison
 * between chronological root nodes (existing delta/variazione metrics are skipped).
 */
export function applyVarianceDelta(treeData: TreeNode[], metrics: string[]): string[] {
  computeTreeTimeComparison(treeData, metrics);
  const withDeltas = [...metrics];
  for (const m of metrics) {
    if (!m.toLowerCase().includes('delta') && !m.toLowerCase().includes('variazione')) {
      withDeltas.push(`${m}___delta`);
    }
  }
  return withDeltas;
}

/**
 * Builds the hierarchical tree for the configured hierarchy type and returns it together with
 * the list of metric keys to render (base metrics plus optional variance deltas).
 */
export function buildTreeData(
  records: DataRecord[],
  options: TreeDataOptions,
): { treeData: TreeNode[]; metrics: string[] } {
  const { hierarchyType, dimensions, pivotDimensions } = options;
  let metrics = [...options.metrics];

  const treeData =
    hierarchyType === 'multi_dimension'
      ? buildMultiDimensionTree(records, dimensions, metrics, pivotDimensions)
      : buildParentChildTree(
          records,
          options.idColumn,
          options.parentIdColumn,
          options.labelColumn,
          metrics,
        );

  if (options.showVarianceDelta && hierarchyType === 'multi_dimension' && dimensions.length > 0) {
    metrics = applyVarianceDelta(treeData, metrics);
  }

  return { treeData, metrics };
}
