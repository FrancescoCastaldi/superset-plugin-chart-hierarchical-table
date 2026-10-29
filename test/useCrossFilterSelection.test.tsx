/**
 * @jest-environment jsdom
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useCrossFilterSelection } from '../src/components/useCrossFilterSelection';
import { TreeNode } from '../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const dimensions = ['regione', 'asl'];
const node = (key: string, name: string): TreeNode => ({
  key,
  id: key,
  name,
  dimension: 'asl',
  depth: 1,
  path: ['Lazio', name],
  isLeaf: true,
  metrics: {},
});
const A = node('a', 'ASL Uno');
const B = node('b', 'ASL Due');

type Api = ReturnType<typeof useCrossFilterSelection>;

function setup(initial: { filterState?: any; onCrossFilter?: any; onClearFilter?: any } = {}) {
  const container = document.createElement('div');
  const root: Root = createRoot(container);
  let api!: Api;
  const calls: any[] = [];
  const onCrossFilter = initial.onCrossFilter ?? ((...args: any[]) => calls.push(['select', ...args]));
  const onClearFilter = initial.onClearFilter ?? (() => calls.push(['clear']));

  function Probe({ filterState }: { filterState?: any }) {
    api = useCrossFilterSelection({
      dimensions,
      emitFilter: true,
      onCrossFilter,
      onClearFilter,
      filterState,
    });
    return <span>{Array.from(api.selection.keys()).join(',')}</span>;
  }

  const render = (filterState?: any) => act(() => root.render(<Probe filterState={filterState} />));
  render(initial.filterState);
  return {
    calls,
    render,
    get api() {
      return api;
    },
    keys: () => Array.from(api.selection.keys()),
    unmount: () => act(() => root.unmount()),
  };
}

describe('useCrossFilterSelection', () => {
  let errors: jest.SpyInstance;
  beforeEach(() => {
    errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => errors.mockRestore());

  it('selects on click, tells the dashboard once, and clears on the second click', () => {
    const t = setup();
    act(() => t.api.toggleNode(A));
    expect(t.keys()).toEqual(['a']);
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0][0]).toBe('select');
    expect(t.calls[0][1]).toBe('asl');
    expect(t.calls[0][2]).toEqual(['ASL Uno']);

    act(() => t.api.toggleNode(A));
    expect(t.keys()).toEqual([]);
    expect(t.calls[1]).toEqual(['clear']);
    t.unmount();
  });

  it('keeps every click of a quick succession, each building on the previous one', () => {
    const t = setup();
    act(() => {
      t.api.toggleNode(A);
      t.api.toggleNode(B);
    });
    expect(t.keys()).toEqual(['a', 'b']);
    expect(t.calls).toHaveLength(2);
    expect(t.calls[1][2]).toEqual(['ASL Uno', 'ASL Due']);
    t.unmount();
  });

  it('does not update the dashboard in the middle of its own render', () => {
    let setDashboard!: (v: number) => void;
    function Dashboard() {
      const [count, set] = React.useState(0);
      setDashboard = set;
      return <span>{count}</span>;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    let api!: Api;
    function Probe() {
      api = useCrossFilterSelection({
        dimensions,
        emitFilter: true,
        // Like the real handler: telling the dashboard updates the state of another component.
        onCrossFilter: () => setDashboard(Math.random()),
        onClearFilter: () => setDashboard(Math.random()),
      });
      return <b>{api.selection.size}</b>;
    }
    act(() =>
      root.render(
        <>
          <Dashboard />
          <Probe />
        </>,
      ),
    );
    act(() => api.toggleNode(A));
    act(() => api.toggleNode(B));
    act(() => api.clearSelection());

    const warned = errors.mock.calls.some(call => /while rendering a different component/i.test(String(call[0])));
    expect(warned).toBe(false);
    act(() => root.unmount());
  });

  it('starts from the selection the dashboard remembers', () => {
    const t = setup({ filterState: { selectedNodes: [{ key: 'a', dimension: 'asl', value: 'ASL Uno' }] } });
    expect(t.keys()).toEqual(['a']);
    expect(t.calls).toHaveLength(0);
    t.unmount();
  });

  it('follows a selection cleared elsewhere, without telling the dashboard again', () => {
    const t = setup({ filterState: { selectedNodes: [{ key: 'a', dimension: 'asl', value: 'ASL Uno' }] } });
    t.render({ value: null, selectedNodes: [] });
    expect(t.keys()).toEqual([]);
    expect(t.calls).toHaveLength(0);
    t.unmount();
  });

  it('follows a selection changed elsewhere', () => {
    const t = setup();
    t.render({ selectedNodes: [{ key: 'b', dimension: 'asl', value: 'ASL Due' }] });
    expect(t.keys()).toEqual(['b']);
    expect(t.calls).toHaveLength(0);
    t.unmount();
  });

  it('is not thrown off by the echo of its own click, even a late one', () => {
    const t = setup();
    act(() => t.api.toggleNode(A));
    act(() => t.api.toggleNode(B));
    // The dashboard answers the first click after the second one was made.
    t.render({ selectedNodes: [{ key: 'a', dimension: 'asl', value: 'ASL Uno' }] });
    expect(t.keys()).toEqual(['a', 'b']);
    t.render({
      selectedNodes: [
        { key: 'a', dimension: 'asl', value: 'ASL Uno' },
        { key: 'b', dimension: 'asl', value: 'ASL Due' },
      ],
    });
    expect(t.keys()).toEqual(['a', 'b']);
    // After the echoes are settled, a clear from the filter bar is followed.
    t.render({ selectedNodes: [] });
    expect(t.keys()).toEqual([]);
    expect(t.calls).toHaveLength(2);
    t.unmount();
  });

  it('follows an external clear even after the chart had cleared its own selection before', () => {
    const t = setup();
    act(() => t.api.toggleNode(A));
    act(() => t.api.toggleNode(A));
    t.render({ selectedNodes: [] });
    act(() => t.api.toggleNode(B));
    t.render({ selectedNodes: [{ key: 'b', dimension: 'asl', value: 'ASL Due' }] });
    t.render({ selectedNodes: [] });
    expect(t.keys()).toEqual([]);
    t.unmount();
  });

  it('removes a single node and clears everything on request', () => {
    const t = setup();
    act(() => {
      t.api.toggleNode(A);
      t.api.toggleNode(B);
    });
    act(() => t.api.removeNode('a'));
    expect(t.keys()).toEqual(['b']);
    act(() => t.api.clearSelection());
    expect(t.keys()).toEqual([]);
    expect(t.calls[t.calls.length - 1]).toEqual(['clear']);
    t.unmount();
  });

  it('ignores clicks when cross-filtering is off', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const calls: any[] = [];
    let api!: Api;
    function Probe() {
      api = useCrossFilterSelection({
        dimensions,
        emitFilter: false,
        onCrossFilter: (...a: any[]) => calls.push(a),
      });
      return null;
    }
    act(() => root.render(<Probe />));
    act(() => api.toggleNode(A));
    expect(api.selection.size).toBe(0);
    expect(calls).toHaveLength(0);
    act(() => root.unmount());
  });
});
