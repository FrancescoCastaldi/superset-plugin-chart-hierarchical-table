import { MetricDefinition, TreeNode } from '../types';
import { baseMetricOf } from './metricSemantics';

export interface SuppressionOptions {
  /** Counts from 1 up to threshold - 1 are hidden; 0 turns suppression off. */
  threshold: number;
  /** Count metrics (base names) subject to suppression. */
  metrics: string[];
  /** Text shown in place of a hidden value; {k} stands for the threshold. */
  label: string;
  /** Also hide the smallest visible sibling of a lone hidden cell, so the hidden value cannot be recovered by subtraction. */
  complementary: boolean;
}

export const DEFAULT_SUPPRESSION_LABEL = '<{k}';

/** Metric names from a comma or line separated text, or from an array. */
export function parseSuppressionMetrics(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,\n;]/) : [];
  return parts.map(p => String(p).trim()).filter(p => p !== '');
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDeltaKey = (key: string): boolean => key.includes('___') && /delta/i.test(key.slice(key.indexOf('___')));

function hide(node: TreeNode, key: string, label: string): void {
  node.metrics[key] = null;
  if (node.subtotals) node.subtotals[key] = null;
  if (node.intervals) delete node.intervals[key];
  if (!node.suppressed) node.suppressed = {};
  node.suppressed[key] = label;
}

/**
 * Small-number suppression for publication. Hides the count cells below the threshold, the
 * smallest visible sibling of a lone hidden cell (complementary suppression, the parent total
 * stays visible), every ratio whose numerator or denominator is hidden and the deltas of a
 * hidden cell. Runs after roll-ups, deltas and intervals, and before rendering and export, so
 * sorting, min/max colouring and CSV never see the hidden value. Mutates the tree; the grand
 * total is left visible.
 */
export function applySuppression(
  tree: TreeNode[],
  options: SuppressionOptions,
  definitions: MetricDefinition[] = [],
): void {
  const { threshold, metrics, complementary } = options;
  if (!(threshold > 0) || metrics.length === 0 || tree.length === 0) return;
  const label = options.label.split('{k}').join(String(threshold));
  const counted = new Set(metrics);
  const ratios = definitions.filter(d => d.type === 'ratio');

  const isSmall = (v: unknown): boolean => isNumber(v) && v > 0 && v < threshold;
  const countKeys = (node: TreeNode): string[] =>
    Object.keys(node.metrics).filter(k => counted.has(baseMetricOf(k)) && !isDeltaKey(k));

  const visit = (node: TreeNode) => {
    node.children?.forEach(visit);

    // Counts below the threshold.
    for (const key of countKeys(node)) {
      if (isSmall(node.metrics[key])) hide(node, key, label);
    }

    if (node.children) complementAmong(node.children);
  };

  // A lone hidden cell among siblings could be recovered by subtracting the visible ones from
  // the parent total (the grand total for the roots): hide the smallest visible sibling too.
  const complementAmong = (siblings: TreeNode[]) => {
    if (!complementary || siblings.length < 2) return;
    const keys = new Set<string>();
    siblings.forEach(sibling => countKeys(sibling).forEach(k => keys.add(k)));
    keys.forEach(key => {
      const hidden = siblings.filter(s => s.suppressed?.[key] !== undefined);
      if (hidden.length !== 1) return;
      const visible = siblings
        .filter(s => s.suppressed?.[key] === undefined && isNumber(s.metrics[key]) && s.metrics[key]! > 0)
        .sort((a, b) => (a.metrics[key] as number) - (b.metrics[key] as number));
      if (visible.length > 0) hide(visible[0], key, label);
    });
  };

  // Second pass, once every count is final: deltas follow the base cell they compare and
  // ratios follow their operands.
  const followHidden = (node: TreeNode) => {
    node.children?.forEach(followHidden);
    for (const key of Object.keys(node.metrics)) {
      if (node.suppressed?.[key] !== undefined) continue;
      const base = baseMetricOf(key);
      const suffix = key.slice(base.length);
      if (isDeltaKey(key) && counted.has(base)) {
        const baseHidden = Object.keys(node.suppressed ?? {}).some(k => baseMetricOf(k) === base && !isDeltaKey(k));
        if (baseHidden) hide(node, key, label);
        continue;
      }
      const ratio = ratios.find(d => d.metric === base);
      if (ratio && (node.suppressed?.[ratio.numerator! + suffix] !== undefined || node.suppressed?.[ratio.denominator! + suffix] !== undefined)) {
        hide(node, key, label);
      }
    }
  };

  tree.forEach(visit);
  complementAmong(tree);
  tree.forEach(followHidden);
}
