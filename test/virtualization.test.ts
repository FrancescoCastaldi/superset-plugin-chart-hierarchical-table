import { performance } from 'perf_hooks';
import {
  computeRenderWindow,
  sliceRenderWindow,
} from '../src/components/useFlatTreeVirtualization';
import {
  createClearFilterHandler,
  createCrossFilterHandler,
} from '../src/plugin/eventHandlers';
import { TreeNode } from '../src/types';

function syntheticFlatTree(count: number): TreeNode[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `region-${i}`,
    name: `Region ${i}`,
    depth: 0,
    dimension: 'region',
    path: [`Region ${i}`],
    metrics: { sales: i },
    children: [],
  })) as unknown as TreeNode[];
}

describe('useFlatTreeVirtualization visible window', () => {
  it('renders every node when the flat tree does not exceed the threshold', () => {
    expect(computeRenderWindow(500, { threshold: 500, pageSize: 100 })).toEqual({
      start: 0,
      end: 500,
      padTop: 0,
      padBottom: 0,
    });
  });

  it('activates above the threshold with a stride of pageSize plus buffer from the top', () => {
    expect(
      computeRenderWindow(2000, { threshold: 500, pageSize: 100, rowHeight: 30, buffer: 20 }),
    ).toEqual({ start: 0, end: 120, padTop: 0, padBottom: 1880 * 30 });
  });

  it('moves the window with scrollTop and keeps a buffer before the first visible node', () => {
    const win = computeRenderWindow(2000, {
      pageSize: 100,
      scrollTop: 30 * 1000,
      rowHeight: 30,
      buffer: 20,
    });
    expect(win).toEqual({ start: 980, end: 1120, padTop: 980 * 30, padBottom: 880 * 30 });
    expect(win.padTop + (win.end - win.start) * 30 + win.padBottom).toBe(2000 * 30);
  });

  it('clamps the window at the end of the flat tree and is deterministic', () => {
    const opts = { pageSize: 100, scrollTop: 10 ** 9, rowHeight: 30, buffer: 20 };
    const win = computeRenderWindow(2000, opts);
    expect(win.end).toBe(2000);
    expect(win.padBottom).toBe(0);
    expect(win.start).toBeLessThan(2000);
    expect(computeRenderWindow(2000, opts)).toEqual(win);
  });

  it('applies the defaults pageSize 100 and threshold 500', () => {
    expect(computeRenderWindow(500, {}).end).toBe(500);
    const win = computeRenderWindow(501, {});
    expect(win.start).toBe(0);
    expect(win.end).toBeGreaterThanOrEqual(100);
    expect(win.end).toBeLessThan(501);
  });

  it('virtualization cross-filter keeps the delegated callbacks wired for rendered nodes', () => {
    const tree = syntheticFlatTree(2000);
    const { rows, renderWindow } = sliceRenderWindow(tree, { scrollTop: 32 * 1500 });
    expect(renderWindow.start).toBeGreaterThan(0);
    const node = rows[10];
    expect(node).toBe(tree[renderWindow.start + 10]);

    const setDataMask = jest.fn();
    const onCrossFilter = createCrossFilterHandler({ isCrossFilterActive: true, setDataMask });
    const onClearFilter = createClearFilterHandler(setDataMask);
    onCrossFilter(node.dimension!, node.name, { region: node.name }, false, [
      { key: node.key, dimension: 'region', value: node.name, pathMap: { region: node.name } },
    ]);
    expect(setDataMask.mock.calls[0][0].extraFormData.filters).toEqual([
      { col: 'region', op: 'IN', val: [node.name] },
    ]);
    onClearFilter();
    expect(setDataMask.mock.calls[1][0].extraFormData.filters).toEqual([]);
  });

  it('window budget: computes and processes the window for 2000 synthetic nodes under 250 ms', () => {
    const tree = syntheticFlatTree(2000);
    const t0 = performance.now();
    let rendered = 0;
    for (let scrollTop = 0; scrollTop < 2000 * 32; scrollTop += 32 * 50) {
      const { rows } = sliceRenderWindow(tree, { scrollTop });
      rendered += rows.reduce((acc, n) => acc + Number(n.metrics?.sales ?? 0) * 0 + 1, 0);
    }
    const elapsedMs = performance.now() - t0;
    expect(rendered).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(250);
  });
});
