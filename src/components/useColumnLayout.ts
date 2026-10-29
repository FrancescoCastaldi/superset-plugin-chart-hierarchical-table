import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ColumnLayoutState,
  DEFAULT_METRIC_WIDTH,
  EMPTY_LAYOUT,
  applyColumnOrder,
  calculateDynamicColumnWidths,
  clampWidth,
  isCustomLayout,
  layoutStorageKey,
  moveKey,
  readLayout,
  writeLayout,
} from '../utils/columnLayout';

export interface LayoutColumn {
  key: string;
  isMetric?: boolean;
  width?: number | string;
}

export interface ColumnLayoutOptions<T extends LayoutColumn> {
  columns: T[];
  /** Column widths can be dragged from the edge of the header. */
  resizable: boolean;
  /** Metric columns can be dragged to another place. Not in pivot layouts, whose headers are grouped. */
  reorderable: boolean;
  isPivotMode: boolean;
  /** Identity of the chart, to keep the layout of each one apart. */
  storageId?: string | number | null;
  /** Available container width for dynamic proportional column distribution. */
  containerWidth?: number;
}

type DropPosition = 'before' | 'after';

export function useColumnLayout<T extends LayoutColumn>({
  columns,
  resizable,
  reorderable,
  isPivotMode,
  storageId,
  containerWidth,
}: ColumnLayoutOptions<T>) {
  const storageKey = layoutStorageKey(storageId);
  const active = resizable || reorderable;
  const [layout, setLayout] = useState<ColumnLayoutState>(() => (active ? readLayout(storageKey) : EMPTY_LAYOUT));
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const commit = useCallback(
    (next: ColumnLayoutState, persist: boolean) => {
      layoutRef.current = next;
      setLayout(next);
      if (persist) writeLayout(storageKey, next);
    },
    [storageKey],
  );

  const canReorder = reorderable && !isPivotMode;
  const orderedColumns = useMemo(
    () => (canReorder ? applyColumnOrder(columns, layout.order) : columns),
    [canReorder, columns, layout.order],
  );

  const dynamicLayout = useMemo(
    () =>
      calculateDynamicColumnWidths({
        columns: orderedColumns,
        customWidths: layout.widths,
        containerWidth: containerWidth ?? 0,
        defaultMetricWidth: DEFAULT_METRIC_WIDTH,
      }),
    [orderedColumns, layout.widths, containerWidth],
  );

  const widthOf = useCallback(
    (column: LayoutColumn): number | string | undefined => {
      if (dynamicLayout.widths[column.key] !== undefined) {
        return dynamicLayout.widths[column.key];
      }
      return resizable && layout.widths[column.key] !== undefined ? layout.widths[column.key] : column.width;
    },
    [dynamicLayout.widths, resizable, layout.widths],
  );

  // ---------------------------------------------------------------- resize
  // A drag that ends over the header would otherwise count as a click and sort the column.
  const justResizedRef = useRef(false);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  const startResize = useCallback(
    (event: React.MouseEvent, key: string, startWidth: number) => {
      if (!resizable) return;
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      justResizedRef.current = false;

      const onMove = (move: MouseEvent) => {
        justResizedRef.current = true;
        const width = clampWidth(startWidth + move.clientX - startX);
        commit({ ...layoutRef.current, widths: { ...layoutRef.current.widths, [key]: width } }, false);
      };
      const stop = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        stopRef.current = null;
      };
      const onUp = () => {
        stop();
        writeLayout(storageKey, layoutRef.current);
        // The click that follows the release is not a click on the header.
        setTimeout(() => {
          justResizedRef.current = false;
        }, 0);
      };
      stopRef.current = stop;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [commit, resizable, storageKey],
  );

  const resetWidth = useCallback(
    (key: string) => {
      const { [key]: _dropped, ...widths } = layoutRef.current.widths;
      commit({ ...layoutRef.current, widths }, true);
    },
    [commit],
  );

  const wasJustResized = useCallback(() => justResizedRef.current, []);

  // ---------------------------------------------------------------- reorder
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ key: string; position: DropPosition } | null>(null);
  const dragKeyRef = useRef<string | null>(null);

  const metricKeys = useMemo(
    () => orderedColumns.filter(column => column.isMetric).map(column => column.key),
    [orderedColumns],
  );

  const onDragStart = useCallback((event: React.DragEvent, key: string) => {
    dragKeyRef.current = key;
    setDragKey(key);
    event.dataTransfer?.setData('text/plain', key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }, []);

  const positionOf = (event: React.DragEvent): DropPosition => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
  };

  const onDragOver = useCallback((event: React.DragEvent, key: string) => {
    if (!dragKeyRef.current) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (dragKeyRef.current === key) {
      setDropTarget(null);
      return;
    }
    const position = positionOf(event);
    setDropTarget(current => (current?.key === key && current.position === position ? current : { key, position }));
  }, []);

  const onDragLeave = useCallback((_event: React.DragEvent, key: string) => {
    setDropTarget(current => (current?.key === key ? null : current));
  }, []);

  const endDrag = useCallback(() => {
    dragKeyRef.current = null;
    setDragKey(null);
    setDropTarget(null);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent, key: string) => {
      event.preventDefault();
      const source = dragKeyRef.current || event.dataTransfer?.getData('text/plain');
      if (source && source !== key) {
        const next = moveKey(metricKeys, source, key, positionOf(event));
        commit({ ...layoutRef.current, order: next }, true);
      }
      endDrag();
    },
    [commit, endDrag, metricKeys],
  );

  // ---------------------------------------------------------------- reset
  const reset = useCallback(() => commit(EMPTY_LAYOUT, true), [commit]);

  return {
    columns: orderedColumns,
    resizable,
    reorderable: canReorder,
    widthOf,
    defaultWidth: DEFAULT_METRIC_WIDTH,
    totalWidth: dynamicLayout.totalWidth,
    isExpanded: dynamicLayout.isExpanded,
    startResize,
    resetWidth,
    wasJustResized,
    drag: { dragKey, dropTarget, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd: endDrag },
    reset,
    customized: active && isCustomLayout(layout),
  };
}
