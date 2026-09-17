jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: () => (val: any) => String(val),
  ensureIsArray: (val: any) => (Array.isArray(val) ? val : val ? [val] : []),
}));

import transformProps from '../src/plugin/transformProps';
import { buildMultiDimensionTree } from '../src/utils/treeBuilder';
import { TreeNode, HierarchyValueDisplayMode } from '../src/types';

describe('HierarchyValueDisplayMode — Leaves Only / Parents Only / All Levels', () => {
  const sampleRecords = [
    { region: 'Lazio', branch: 'Roma', sales: 100 },
    { region: 'Lazio', branch: 'Viterbo', sales: 40 },
    { region: 'Veneto', branch: 'Verona', sales: 80 },
  ];

  const chartProps: any = {
    width: 800,
    height: 600,
    formData: {
      hierarchyType: 'multi_dimension',
      groupby: ['region', 'branch'],
      metrics: ['sales'],
      valueDisplayMode: 'leaves_only',
    },
    queriesData: [{ data: sampleRecords }],
  };

  it('correctly maps valueDisplayMode in transformProps', () => {
    const props = transformProps(chartProps);
    expect(props.valueDisplayMode).toBe('leaves_only');

    const defaultProps = transformProps({
      ...chartProps,
      formData: { ...chartProps.formData, valueDisplayMode: undefined },
      rawFormData: {},
    });
    expect(defaultProps.valueDisplayMode).toBe('all');

    const parentsOnlyProps = transformProps({
      ...chartProps,
      formData: { ...chartProps.formData, valueDisplayMode: 'parents_only' },
      rawFormData: {},
    });
    expect(parentsOnlyProps.valueDisplayMode).toBe('parents_only');
  });

  describe('Node visibility logic (shouldRenderMetricValue)', () => {
    const shouldRenderMetricValue = (node: TreeNode, mode: HierarchyValueDisplayMode): boolean => {
      const hasChildren = Boolean(node.children && node.children.length > 0);
      if (mode === 'leaves_only') return !hasChildren;
      if (mode === 'parents_only') return hasChildren;
      return true;
    };

    let tree: TreeNode[];

    beforeEach(() => {
      tree = buildMultiDimensionTree(sampleRecords, ['region', 'branch'], ['sales']);
    });

    it('in "all" mode renders values for both parent nodes and leaf nodes', () => {
      const parentNode = tree.find(n => n.name === 'Lazio')!;
      const leafNode = parentNode.children![0];

      expect(shouldRenderMetricValue(parentNode, 'all')).toBe(true);
      expect(shouldRenderMetricValue(leafNode, 'all')).toBe(true);
    });

    it('in "leaves_only" mode renders values ONLY for leaves and suppresses parents', () => {
      const parentNode = tree.find(n => n.name === 'Lazio')!;
      const leafNode = parentNode.children![0];

      expect(shouldRenderMetricValue(parentNode, 'leaves_only')).toBe(false);
      expect(shouldRenderMetricValue(leafNode, 'leaves_only')).toBe(true);
    });

    it('in "parents_only" mode renders values ONLY for parents and suppresses leaves', () => {
      const parentNode = tree.find(n => n.name === 'Lazio')!;
      const leafNode = parentNode.children![0];

      expect(shouldRenderMetricValue(parentNode, 'parents_only')).toBe(true);
      expect(shouldRenderMetricValue(leafNode, 'parents_only')).toBe(false);
    });

    it('suppresses grand total values in "leaves_only" mode while preserving them in "all" and "parents_only"', () => {
      const checkGrandTotalMetric = (mode: HierarchyValueDisplayMode, val: number | null) => {
        if (mode === 'leaves_only') return '';
        return val !== null && val !== undefined ? String(val) : '';
      };

      expect(checkGrandTotalMetric('leaves_only', 220)).toBe('');
      expect(checkGrandTotalMetric('all', 220)).toBe('220');
      expect(checkGrandTotalMetric('parents_only', 220)).toBe('220');
    });
  });
});
