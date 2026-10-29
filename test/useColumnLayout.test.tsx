/**
 * @jest-environment jsdom
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useColumnLayout } from '../src/components/useColumnLayout';
import { layoutStorageKey } from '../src/utils/columnLayout';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const baseColumns = [
  { key: '__hierarchy_tree__', isMetric: false, width: 280 },
  { key: 'a', isMetric: true, width: 135 },
  { key: 'b', isMetric: true, width: 135 },
  { key: 'c', isMetric: true, width: 135 },
];

type Api = ReturnType<typeof useColumnLayout>;

function setup(options: { resizable?: boolean; reorderable?: boolean; isPivotMode?: boolean; storageId?: any } = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);
  let api!: Api;
  function Probe() {
    api = useColumnLayout({
      columns: baseColumns,
      resizable: options.resizable ?? false,
      reorderable: options.reorderable ?? false,
      isPivotMode: options.isPivotMode ?? false,
      storageId: options.storageId ?? 'test-chart',
    });
    return <span>{api.columns.map(c => c.key).join(',')}</span>;
  }
  act(() => root.render(<Probe />));
  return {
    get api() {
      return api;
    },
    keys: () => api.columns.map(c => c.key),
    unmount: () => act(() => root.unmount()),
  };
}

const dragEvent = (clientX: number) =>
  ({
    preventDefault: () => undefined,
    clientX,
    currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 100 }) },
    dataTransfer: { setData: () => undefined, getData: () => '', dropEffect: '', effectAllowed: '' },
  } as unknown as React.DragEvent);

const mouse = (type: string, clientX: number) =>
  act(() => {
    document.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
  });

describe('useColumnLayout', () => {
  beforeEach(() => window.localStorage.clear());

  it('does nothing without the flags: same columns, same widths, no saved layout', () => {
    const t = setup();
    expect(t.api.columns).toBe(baseColumns);
    expect(t.api.widthOf(baseColumns[1])).toBe(135);
    expect(t.api.reorderable).toBe(false);
    expect(t.api.customized).toBe(false);
    t.unmount();
  });

  describe('reordering', () => {
    it('moves a column where it is dropped and remembers it', () => {
      const t = setup({ reorderable: true });
      act(() => t.api.drag.onDragStart(dragEvent(0), 'c'));
      act(() => t.api.drag.onDragOver(dragEvent(10), 'a'));
      expect(t.api.drag.dropTarget).toEqual({ key: 'a', position: 'before' });
      act(() => t.api.drag.onDrop(dragEvent(10), 'a'));

      expect(t.keys()).toEqual(['__hierarchy_tree__', 'c', 'a', 'b']);
      expect(t.api.drag.dragKey).toBeNull();
      expect(t.api.customized).toBe(true);
      expect(JSON.parse(window.localStorage.getItem(layoutStorageKey('test-chart')) as string).order).toEqual([
        'c',
        'a',
        'b',
      ]);
      t.unmount();
    });

    it('drops after the target when the pointer is on its right half', () => {
      const t = setup({ reorderable: true });
      act(() => t.api.drag.onDragStart(dragEvent(0), 'a'));
      act(() => t.api.drag.onDrop(dragEvent(90), 'c'));
      expect(t.keys()).toEqual(['__hierarchy_tree__', 'b', 'c', 'a']);
      t.unmount();
    });

    it('ignores a drop on the column being dragged and clears the drag state', () => {
      const t = setup({ reorderable: true });
      act(() => t.api.drag.onDragStart(dragEvent(0), 'b'));
      act(() => t.api.drag.onDragOver(dragEvent(10), 'b'));
      expect(t.api.drag.dropTarget).toBeNull();
      act(() => t.api.drag.onDrop(dragEvent(10), 'b'));
      expect(t.keys()).toEqual(['__hierarchy_tree__', 'a', 'b', 'c']);
      expect(t.api.customized).toBe(false);
      t.unmount();
    });

    it('is not available in a pivot layout, whose headers are grouped', () => {
      const t = setup({ reorderable: true, isPivotMode: true });
      expect(t.api.reorderable).toBe(false);
      expect(t.api.columns).toBe(baseColumns);
      t.unmount();
    });

    it('starts from the order saved in the browser', () => {
      window.localStorage.setItem(
        layoutStorageKey('test-chart'),
        JSON.stringify({ widths: {}, order: ['b', 'c', 'a'] }),
      );
      const t = setup({ reorderable: true });
      expect(t.keys()).toEqual(['__hierarchy_tree__', 'b', 'c', 'a']);
      t.unmount();
    });

    it('keeps the layout of a chart apart from the others', () => {
      window.localStorage.setItem(
        layoutStorageKey('other-chart'),
        JSON.stringify({ widths: {}, order: ['c', 'b', 'a'] }),
      );
      const t = setup({ reorderable: true });
      expect(t.keys()).toEqual(['__hierarchy_tree__', 'a', 'b', 'c']);
      t.unmount();
    });
  });

  describe('resizing', () => {
    const start = (api: Api, x: number, startWidth: number) =>
      act(() =>
        api.startResize(
          { preventDefault: () => undefined, stopPropagation: () => undefined, clientX: x } as unknown as React.MouseEvent,
          'a',
          startWidth,
        ),
      );

    it('follows the pointer, within the limits, and remembers the width on release', () => {
      const t = setup({ resizable: true });
      start(t.api, 100, 135);
      mouse('mousemove', 160);
      expect(t.api.widthOf(baseColumns[1])).toBe(195);
      mouse('mousemove', -500);
      expect(t.api.widthOf(baseColumns[1])).toBe(56);
      mouse('mousemove', 140);
      mouse('mouseup', 140);

      expect(t.api.widthOf(baseColumns[1])).toBe(175);
      expect(t.api.widthOf(baseColumns[2])).toBe(135);
      expect(JSON.parse(window.localStorage.getItem(layoutStorageKey('test-chart')) as string).widths).toEqual({
        a: 175,
      });
      t.unmount();
    });

    it('stops following after the release', () => {
      const t = setup({ resizable: true });
      start(t.api, 100, 135);
      mouse('mousemove', 120);
      mouse('mouseup', 120);
      mouse('mousemove', 400);
      expect(t.api.widthOf(baseColumns[1])).toBe(155);
      t.unmount();
    });

    it('does not count the release over the header as a click, but only for a moment', () => {
      jest.useFakeTimers();
      const t = setup({ resizable: true });
      start(t.api, 100, 135);
      mouse('mousemove', 120);
      mouse('mouseup', 120);
      expect(t.api.wasJustResized()).toBe(true);
      act(() => {
        jest.runAllTimers();
      });
      expect(t.api.wasJustResized()).toBe(false);
      jest.useRealTimers();
      t.unmount();
    });

    it('restores the default width of one column and clears everything on reset', () => {
      const t = setup({ resizable: true });
      start(t.api, 100, 135);
      mouse('mousemove', 180);
      mouse('mouseup', 180);
      expect(t.api.widthOf(baseColumns[1])).toBe(215);

      act(() => t.api.resetWidth('a'));
      expect(t.api.widthOf(baseColumns[1])).toBe(135);

      start(t.api, 100, 135);
      mouse('mousemove', 150);
      mouse('mouseup', 150);
      expect(t.api.customized).toBe(true);
      act(() => t.api.reset());
      expect(t.api.customized).toBe(false);
      expect(window.localStorage.getItem(layoutStorageKey('test-chart'))).toBeNull();
      t.unmount();
    });

    it('ignores the pointer when the columns are not resizable', () => {
      const t = setup({ resizable: false });
      start(t.api, 100, 135);
      mouse('mousemove', 300);
      expect(t.api.widthOf(baseColumns[1])).toBe(135);
      t.unmount();
    });

    it('stops listening when the table goes away mid-drag', () => {
      const t = setup({ resizable: true });
      start(t.api, 100, 135);
      const remove = jest.spyOn(document, 'removeEventListener');
      t.unmount();
      expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function));
      remove.mockRestore();
    });
  });
});
