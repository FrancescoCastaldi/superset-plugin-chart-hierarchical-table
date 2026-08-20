import { DataRecord } from '@superset-ui/core';
import { TreeNode, HierarchyType } from '../types';
import { rollupTreeMetrics } from './aggregations';

/**
 * Builds a hierarchical tree from flat records using an ordered list of dimensions.
 * Example: ['Region', 'Country', 'City']
 */
export function buildMultiDimensionTree(
  records: DataRecord[],
  dimensions: string[],
  metrics: string[],
): TreeNode[] {
  if (!records || records.length === 0 || !dimensions || dimensions.length === 0) {
    return [];
  }

  const rootMap = new Map<string, any>();

  for (const record of records) {
    let currentLevelMap = rootMap;
    const currentPath: string[] = [];

    for (let i = 0; i < dimensions.length; i++) {
      const dim = dimensions[i];
      const rawVal = record[dim];
      const val = rawVal !== null && rawVal !== undefined ? String(rawVal) : '(Empty)';
      currentPath.push(val);

      const pathKey = currentPath.join(' > ');
      const isLeaf = i === dimensions.length - 1;

      if (!currentLevelMap.has(val)) {
        const nodeObj: any = {
          key: pathKey,
          id: pathKey,
          name: val,
          dimension: dim,
          depth: i,
          path: [...currentPath],
          isLeaf,
          metrics: {},
          subtotals: {},
          rawData: isLeaf ? record : undefined,
          childrenMap: isLeaf ? null : new Map<string, any>(),
        };

        if (isLeaf) {
          for (const m of metrics) {
            const rawM = record[m];
            nodeObj.metrics[m] = typeof rawM === 'number' ? rawM : parseFloat(String(rawM)) || 0;
          }
        }

        currentLevelMap.set(val, nodeObj);
      } else if (isLeaf) {
        // If multiple records land on the same leaf path, sum up their metrics
        const existingNode = currentLevelMap.get(val);
        for (const m of metrics) {
          const rawM = record[m];
          const numVal = typeof rawM === 'number' ? rawM : parseFloat(String(rawM)) || 0;
          existingNode.metrics[m] = (existingNode.metrics[m] || 0) + numVal;
        }
      }

      const currentNode = currentLevelMap.get(val);
      if (!isLeaf && currentNode.childrenMap) {
        currentLevelMap = currentNode.childrenMap;
      }
    }
  }

  // Recursive conversion from internal Map structure to TreeNode[]
  function mapToTreeNodes(map: Map<string, any>): TreeNode[] {
    const result: TreeNode[] = [];
    for (const item of map.values()) {
      const node: TreeNode = {
        key: item.key,
        id: item.id,
        name: item.name,
        dimension: item.dimension,
        depth: item.depth,
        path: item.path,
        isLeaf: item.isLeaf,
        metrics: item.metrics,
        subtotals: item.subtotals,
        rawData: item.rawData,
      };

      if (item.childrenMap && item.childrenMap.size > 0) {
        node.children = mapToTreeNodes(item.childrenMap);
      }

      result.push(node);
    }
    return result;
  }

  const tree = mapToTreeNodes(rootMap);
  rollupTreeMetrics(tree, metrics);
  return tree;
}

/**
 * Builds a hierarchical tree from parent-child (adjacency list) records.
 * Example: idColumn = 'employee_id', parentIdColumn = 'manager_id', labelColumn = 'name'
 */
export function buildParentChildTree(
  records: DataRecord[],
  idColumn: string,
  parentIdColumn: string,
  labelColumn: string,
  metrics: string[],
): TreeNode[] {
  if (!records || records.length === 0 || !idColumn) {
    return [];
  }

  const nodeLookup = new Map<string, TreeNode>();
  const parentChildMap = new Map<string, string[]>(); // parentId -> childIds
  const allIds = new Set<string>();

  // 1. Create all nodes
  for (const record of records) {
    const id = String(record[idColumn] ?? '');
    const parentIdRaw = record[parentIdColumn];
    const parentId =
      parentIdRaw !== null && parentIdRaw !== undefined && String(parentIdRaw).trim() !== ''
        ? String(parentIdRaw)
        : null;
    const name = labelColumn && record[labelColumn] !== undefined
      ? String(record[labelColumn])
      : id;

    if (!id) continue;
    allIds.add(id);

    const metricValues: Record<string, number | null> = {};
    for (const m of metrics) {
      const rawM = record[m];
      metricValues[m] = typeof rawM === 'number' ? rawM : parseFloat(String(rawM)) || 0;
    }

    const node: TreeNode = {
      key: id,
      id,
      name,
      depth: 0,
      path: [name],
      isLeaf: true,
      metrics: metricValues,
      subtotals: { ...metricValues },
      rawData: record,
      children: [],
    };

    nodeLookup.set(id, node);

    const pKey = parentId ?? '__ROOT__';
    if (!parentChildMap.has(pKey)) {
      parentChildMap.set(pKey, []);
    }
    parentChildMap.get(pKey)!.push(id);
  }

  // 2. Identify root items (either parentId is null or parentId not in allIds)
  const rootIds: string[] = [];
  for (const record of records) {
    const id = String(record[idColumn] ?? '');
    const parentIdRaw = record[parentIdColumn];
    const parentId =
      parentIdRaw !== null && parentIdRaw !== undefined && String(parentIdRaw).trim() !== ''
        ? String(parentIdRaw)
        : null;

    if (!parentId || !allIds.has(parentId)) {
      if (id && !rootIds.includes(id)) {
        rootIds.push(id);
      }
    }
  }

  // 3. Recursively assemble tree hierarchy and calculate depth/paths
  function assembleNode(id: string, depth: number, parentPath: string[]): TreeNode | null {
    const node = nodeLookup.get(id);
    if (!node) return null;

    node.depth = depth;
    node.path = [...parentPath, node.name];

    const childIds = parentChildMap.get(id) || [];
    if (childIds.length > 0) {
      node.isLeaf = false;
      const childNodes: TreeNode[] = [];
      for (const childId of childIds) {
        if (childId === id) continue; // prevent direct cycle
        const childNode = assembleNode(childId, depth + 1, node.path);
        if (childNode) {
          childNodes.push(childNode);
        }
      }
      node.children = childNodes;
    } else {
      node.isLeaf = true;
      delete node.children;
    }

    return node;
  }

  const roots: TreeNode[] = [];
  for (const rootId of rootIds) {
    const rootNode = assembleNode(rootId, 0, []);
    if (rootNode) {
      roots.push(rootNode);
    }
  }

  rollupTreeMetrics(roots, metrics);
  return roots;
}

/**
 * Filter tree by search term preserving ancestry path for matched nodes.
 */
export function filterTreeBySearch(nodes: TreeNode[], searchTerm: string): TreeNode[] {
  if (!searchTerm || searchTerm.trim() === '') return nodes;
  const term = searchTerm.toLowerCase().trim();

  function searchNode(node: TreeNode): TreeNode | null {
    const nameMatches = node.name.toLowerCase().includes(term);

    let matchingChildren: TreeNode[] = [];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const filteredChild = searchNode(child);
        if (filteredChild) {
          matchingChildren.push(filteredChild);
        }
      }
    }

    if (nameMatches || matchingChildren.length > 0) {
      return {
        ...node,
        children: matchingChildren.length > 0 ? matchingChildren : node.children,
      };
    }

    return null;
  }

  const results: TreeNode[] = [];
  for (const node of nodes) {
    const filtered = searchNode(node);
    if (filtered) {
      results.push(filtered);
    }
  }
  return results;
}
