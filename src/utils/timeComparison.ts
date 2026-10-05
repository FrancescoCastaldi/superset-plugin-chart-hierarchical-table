import { TreeNode, PivotTimeDeltaMode } from '../types';

export function computePivotTimeDelta(
  treeData: TreeNode[],
  baseMetrics: string[],
  pivotValues: string[],
  mode: PivotTimeDeltaMode,
  lag: number = 1,
): void {
  if (!mode || mode === 'none' || !pivotValues || pivotValues.length === 0) return;
  const safeLag = Math.max(1, lag || 1);

  function processNode(node: TreeNode) {
    for (const m of baseMetrics) {
      if (m.toLowerCase().includes('delta') || m.toLowerCase().includes('variazione')) {
        continue;
      }

      for (let i = 0; i < pivotValues.length; i++) {
        const currentPVal = pivotValues[i];
        const currentKey = `${m}___${currentPVal}`;
        const deltaKey = `${m}___delta___${currentPVal}`;
        const deltaPctKey = `${m}___delta_pct___${currentPVal}`;

        const rawCurrent = node.metrics?.[currentKey] ?? node.subtotals?.[currentKey];
        const currentVal =
          typeof rawCurrent === 'number' && Number.isFinite(rawCurrent)
            ? rawCurrent
            : typeof rawCurrent === 'string' && rawCurrent.trim() !== '' && Number.isFinite(Number(rawCurrent))
            ? Number(rawCurrent)
            : null;

        if (i < safeLag) {
          // No preceding period available within lag range
          if (mode === 'absolute' || mode === 'both') {
            node.metrics[deltaKey] = null;
            if (node.subtotals) node.subtotals[deltaKey] = null;
          }
          if (mode === 'percentage' || mode === 'both') {
            node.metrics[deltaPctKey] = null;
            if (node.subtotals) node.subtotals[deltaPctKey] = null;
          }
          continue;
        }

        const prevPVal = pivotValues[i - safeLag];
        const prevKey = `${m}___${prevPVal}`;
        const rawPrev = node.metrics?.[prevKey] ?? node.subtotals?.[prevKey];
        const prevVal =
          typeof rawPrev === 'number' && Number.isFinite(rawPrev)
            ? rawPrev
            : typeof rawPrev === 'string' && rawPrev.trim() !== '' && Number.isFinite(Number(rawPrev))
            ? Number(rawPrev)
            : null;

        // Compute Absolute Delta
        if (mode === 'absolute' || mode === 'both') {
          if (currentVal !== null && prevVal !== null) {
            const delta = Math.round((currentVal - prevVal) * 100) / 100;
            node.metrics[deltaKey] = delta;
            if (node.subtotals) node.subtotals[deltaKey] = delta;
          } else {
            node.metrics[deltaKey] = null;
            if (node.subtotals) node.subtotals[deltaKey] = null;
          }
        }

        // Compute Percentage Delta
        if (mode === 'percentage' || mode === 'both') {
          if (currentVal !== null && prevVal !== null && prevVal !== 0) {
            const deltaPct = Math.round(((currentVal - prevVal) / prevVal) * 1000) / 10;
            node.metrics[deltaPctKey] = deltaPct;
            if (node.subtotals) node.subtotals[deltaPctKey] = deltaPct;
          } else {
            node.metrics[deltaPctKey] = null;
            if (node.subtotals) node.subtotals[deltaPctKey] = null;
          }
        }
      }
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  for (const root of treeData) {
    processNode(root);
  }
}


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
