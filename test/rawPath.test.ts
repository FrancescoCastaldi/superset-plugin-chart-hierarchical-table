import { buildMultiDimensionTree, buildParentChildTree } from '../src/utils/treeBuilder';

describe('Task 1.1: TreeNode.rawPath', () => {
  it('omits rawPath when raw dimension values match displayed string values', () => {
    const records = [
      { region: 'Europe', country: 'Italy', sales: 100 },
    ];
    const tree = buildMultiDimensionTree(records, ['region', 'country'], ['sales']);
    expect(tree[0].path).toEqual(['Europe']);
    expect(tree[0].rawPath).toBeUndefined();
    expect(tree[0].children?.[0].path).toEqual(['Europe', 'Italy']);
    expect(tree[0].children?.[0].rawPath).toBeUndefined();
  });

  it('captures numeric epoch timestamps in rawPath when displayed as ISO dates', () => {
    const epoch = 1700000000000;
    const records = [
      { date: epoch, category: 'A', sales: 50 },
    ];
    const tree = buildMultiDimensionTree(records, ['date', 'category'], ['sales']);
    expect(tree[0].path).toEqual(['2023-11-14']);
    expect(tree[0].rawPath).toEqual([epoch]);
    expect(tree[0].children?.[0].path).toEqual(['2023-11-14', 'A']);
    expect(tree[0].children?.[0].rawPath).toEqual([epoch, 'A']);
  });

  it('captures null values in rawPath when displayed as (Empty)', () => {
    const records = [
      { region: null, country: 'Italy', sales: 10 },
    ];
    const tree = buildMultiDimensionTree(records, ['region', 'country'], ['sales']);
    expect(tree[0].path).toEqual(['(Empty)']);
    expect(tree[0].rawPath).toEqual([null]);
    expect(tree[0].children?.[0].path).toEqual(['(Empty)', 'Italy']);
    expect(tree[0].children?.[0].rawPath).toEqual([null, 'Italy']);
  });

  it('does not populate rawPath for parent_child hierarchy', () => {
    const orgRecords = [
      { id: 1, parent_id: null, name: 'CEO', budget: 1000 },
      { id: 2, parent_id: 1, name: 'VP Tech', budget: 500 },
    ];
    const tree = buildParentChildTree(orgRecords, 'id', 'parent_id', 'name', ['budget']);
    expect(tree[0].rawPath).toBeUndefined();
    expect(tree[0].children?.[0].rawPath).toBeUndefined();
  });
});
