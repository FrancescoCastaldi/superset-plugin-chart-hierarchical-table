import { FilterValue, SelectedFilterItem, TreeNode } from '../types';

export type SelectionMap = Map<string, SelectedFilterItem>;

/** What the chart has to tell the dashboard after a change of the selection. */
export type SelectionEmission =
  | { kind: 'clear' }
  | {
      kind: 'select';
      dimension: string;
      values: FilterValue[];
      pathMaps: Record<string, FilterValue>[];
      items: SelectedFilterItem[];
    };

/**
 * Selection entry of a tree node: its display name, and the raw database value of each level of its
 * path, because the dashboard filters on the stored values and not on what the table shows.
 */
export function buildSelectionItem(node: TreeNode, dimensions: string[]): SelectedFilterItem {
  const dimension = node.dimension || dimensions[node.depth] || 'Dimension';
  const pathMap: Record<string, FilterValue> = {};
  if (dimensions.length > 0 && node.path && node.path.length > 0) {
    for (let i = 0; i <= node.depth && i < dimensions.length; i++) {
      pathMap[dimensions[i]] = node.rawPath ? node.rawPath[i] ?? node.path[i] : node.path[i];
    }
  }
  const rawValue = node.rawPath?.[node.depth] ?? node.name;
  return { key: node.key, dimension, value: node.name, rawValue, pathMap };
}

/** The selection with the node added, or removed when it was already selected. New map, never mutates. */
export function toggleSelection(
  current: SelectionMap,
  node: TreeNode,
  dimensions: string[],
): SelectionMap {
  const next = new Map(current);
  if (next.has(node.key)) next.delete(node.key);
  else next.set(node.key, buildSelectionItem(node, dimensions));
  return next;
}

export function removeFromSelection(current: SelectionMap, key: string): SelectionMap {
  const next = new Map(current);
  next.delete(key);
  return next;
}

export function selectionEmission(selection: SelectionMap): SelectionEmission {
  const items = Array.from(selection.values());
  if (items.length === 0) return { kind: 'clear' };
  return {
    kind: 'select',
    dimension: items[0].dimension,
    values: items.map(item => item.rawValue ?? item.value),
    pathMaps: items.map(item => item.pathMap || {}),
    items,
  };
}

/** Stable identity of a selection, whatever the order the nodes were picked in. */
export function selectionSignature(items: Array<{ key: string }>): string {
  return items
    .map(item => item.key)
    .sort()
    .join('\u0001');
}

/** Nodes the dashboard remembers as selected by this chart (`filterState.selectedNodes`). */
export function readSelectedNodes(filterState: any): SelectedFilterItem[] {
  const nodes = filterState?.selectedNodes;
  if (!Array.isArray(nodes)) return [];
  return nodes.filter(
    (item: any): item is SelectedFilterItem =>
      item && typeof item.key === 'string' && typeof item.dimension === 'string',
  );
}

/**
 * Tells whether the selection coming back from the dashboard is the echo of one of our own clicks
 * or a change made elsewhere (filter bar, another chart, reset), which the table has to follow.
 */
export function isExternalSelection(
  incomingSignature: string,
  localSignature: string,
  recentlyEmitted: string[],
): boolean {
  return incomingSignature !== localSignature && !recentlyEmitted.includes(incomingSignature);
}
