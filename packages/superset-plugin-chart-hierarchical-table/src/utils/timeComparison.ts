import { TreeNode } from '../types';

export function computeTreeTimeComparison(
  treeData: TreeNode[],
  baseMetrics: string[]
): void {
  if (treeData.length < 2) return;

  // Sort root nodes chronologically (assuming their names are sortable like YYYY-MM)
  const sortedRoots = [...treeData].sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 1; i < sortedRoots.length; i++) {
    const currentRoot = sortedRoots[i];
    const prevRoot = sortedRoots[i - 1];

    compareNodes(currentRoot, prevRoot, baseMetrics);
  }
}

function compareNodes(currentNode: TreeNode, prevNode: TreeNode | undefined, baseMetrics: string[]) {
  // Compute deltas for this node
  for (const m of baseMetrics) {
    // Skip if it's already a delta metric or non-numeric
    if (m.toLowerCase().includes('delta') || m.toLowerCase().includes('variazione')) {
      continue;
    }
    
    const currentVal = currentNode.metrics[m];
    const prevVal = prevNode ? prevNode.metrics[m] : null;
    
    const deltaKey = `${m}___delta`;
    
    if (typeof currentVal === 'number' && typeof prevVal === 'number' && prevVal !== 0) {
      const deltaPct = ((currentVal - prevVal) / prevVal) * 100;
      currentNode.metrics[deltaKey] = Math.round(deltaPct * 10) / 10;
      if (currentNode.subtotals) {
        currentNode.subtotals[deltaKey] = currentNode.metrics[deltaKey];
      }
    } else if (typeof currentVal === 'number' && (prevVal === null || prevVal === 0)) {
      // New item, no previous value
      currentNode.metrics[deltaKey] = null; // or could be +Infinity, but null renders as empty or -
      if (currentNode.subtotals) {
        currentNode.subtotals[deltaKey] = null;
      }
    } else {
      currentNode.metrics[deltaKey] = null;
    }
  }

  // Recurse into children
  if (currentNode.children && currentNode.children.length > 0) {
    for (const child of currentNode.children) {
      // Find matching child in prevNode
      const matchingPrevChild = prevNode?.children?.find(c => c.name === child.name);
      compareNodes(child, matchingPrevChild, baseMetrics);
    }
  }
}
