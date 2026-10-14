import { MetricDefinition, MetricGoal, TreeNode } from '../types';
import { baseMetricOf } from './metricSemantics';
import { ratioInterval } from './statistics';

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Confidence interval of every cell of a ratio metric that declares a `ci` method, and the
 * significance signal against its reference: the parent row, the grand total or the goal
 * target. A node is flagged only when its whole interval lies on one side of the reference,
 * which keeps small units (wide intervals) from being ranked as better or worse by chance:
 * the funnel plot logic of public health benchmarking, inside the table. Mutates the tree.
 */
export function applyConfidenceIntervals(
  tree: TreeNode[],
  grandTotal: TreeNode | undefined,
  definitions: MetricDefinition[],
  goals: MetricGoal[] = [],
): void {
  const ciDefs = definitions.filter(d => d.type === 'ratio' && d.ci && d.ci !== 'none');
  if (ciDefs.length === 0 || tree.length === 0) return;
  const byBase = new Map(ciDefs.map(d => [d.metric, d]));

  const annotate = (node: TreeNode, parent: TreeNode | undefined) => {
    for (const key of Object.keys(node.metrics)) {
      const def = byBase.get(baseMetricOf(key));
      if (!def) continue;
      const suffix = key.slice(def.metric.length);
      const num = node.metrics[def.numerator! + suffix];
      const den = node.metrics[def.denominator! + suffix];
      if (!isNumber(num) || !isNumber(den)) continue;
      const interval = ratioInterval(def.ci!, num, den, def.scale ?? 1, def.ciLevel ?? 0.95);
      if (!interval) continue;

      let reference: unknown;
      if (def.compareTo === 'goal') {
        reference = goals.find(g => g.metricKey === def.metric)?.target;
      } else if (def.compareTo === 'total') {
        reference = node === grandTotal ? undefined : grandTotal?.metrics[key];
      } else {
        reference = (parent ?? grandTotal)?.metrics[key];
        if (node === grandTotal) reference = undefined;
      }

      const signal = !isNumber(reference)
        ? undefined
        : interval.lower > reference
        ? 'above'
        : interval.upper < reference
        ? 'below'
        : undefined;
      if (!node.intervals) node.intervals = {};
      node.intervals[key] = {
        lower: interval.lower,
        upper: interval.upper,
        level: def.ciLevel ?? 0.95,
        ...(signal ? { signal } : {}),
      };
    }
    node.children?.forEach(child => annotate(child, node));
  };

  tree.forEach(root => annotate(root, undefined));
  if (grandTotal) annotate(grandTotal, undefined);
}
