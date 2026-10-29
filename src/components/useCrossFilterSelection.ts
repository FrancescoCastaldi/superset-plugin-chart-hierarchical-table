import { useCallback, useEffect, useRef, useState } from 'react';
import { TreeNode } from '../types';
import {
  SelectionMap,
  isExternalSelection,
  readSelectedNodes,
  removeFromSelection,
  selectionEmission,
  selectionSignature,
  toggleSelection,
} from '../utils/crossFilterSelection';

export interface CrossFilterSelectionOptions {
  dimensions: string[];
  emitFilter: boolean;
  onCrossFilter?: (...args: any[]) => void;
  onClearFilter?: () => void;
  /** The chart's own filter state as the dashboard keeps it. */
  filterState?: any;
}

const toMap = (items: Array<{ key: string }>): SelectionMap =>
  new Map(items.map(item => [item.key, item as any]));

// How many of our own emissions we remember, to recognise their echo coming back from the dashboard.
const EMITTED_HISTORY = 6;

/**
 * Rows picked for cross-filtering. The selection lives in a ref as well as in state, so that clicks in
 * quick succession each build on the previous one, and the dashboard is told from the click handler
 * itself: a state updater runs while React renders, and telling the dashboard from there updates
 * another component in the middle of this one's render, which is how a click could leave the table
 * behind. The dashboard's own state is followed too: a selection cleared or changed elsewhere (filter
 * bar, another chart, reset) is shown here as well.
 */
export function useCrossFilterSelection({
  dimensions,
  emitFilter,
  onCrossFilter,
  onClearFilter,
  filterState,
}: CrossFilterSelectionOptions) {
  const [selection, setSelection] = useState<SelectionMap>(() => toMap(readSelectedNodes(filterState)));
  const selectionRef = useRef(selection);
  const emittedRef = useRef<string[]>([]);
  const handlersRef = useRef({ onCrossFilter, onClearFilter });
  handlersRef.current = { onCrossFilter, onClearFilter };

  const apply = useCallback((next: SelectionMap, emit: boolean) => {
    selectionRef.current = next;
    setSelection(next);
    if (!emit) return;

    const items = Array.from(next.values());
    emittedRef.current = [...emittedRef.current, selectionSignature(items)].slice(-EMITTED_HISTORY);

    const { onCrossFilter: crossFilter, onClearFilter: clearFilter } = handlersRef.current;
    const emission = selectionEmission(next);
    if (emission.kind === 'clear') {
      if (clearFilter) clearFilter();
      else if (crossFilter) crossFilter('', [], undefined, true, []);
    } else if (crossFilter) {
      crossFilter(emission.dimension, emission.values, emission.pathMaps, false, emission.items);
    }
  }, []);

  // Follow the dashboard when the selection changes somewhere else.
  const incoming = readSelectedNodes(filterState);
  const incomingSignature = selectionSignature(incoming);
  useEffect(() => {
    const echo = emittedRef.current.lastIndexOf(incomingSignature);
    if (echo >= 0) {
      // Our own click coming back: nothing to change, and what came before it is settled.
      emittedRef.current = emittedRef.current.slice(echo + 1);
      return;
    }
    const localSignature = selectionSignature(Array.from(selectionRef.current.values()));
    if (isExternalSelection(incomingSignature, localSignature, [])) {
      apply(toMap(incoming), false);
    }
    // `incoming` follows `incomingSignature`: the signature is the dependency that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingSignature, apply]);

  const toggleNode = useCallback(
    (node: TreeNode) => {
      if (!emitFilter || !handlersRef.current.onCrossFilter) return;
      apply(toggleSelection(selectionRef.current, node, dimensions), true);
    },
    [apply, dimensions, emitFilter],
  );

  const removeNode = useCallback(
    (key: string) => apply(removeFromSelection(selectionRef.current, key), true),
    [apply],
  );

  const clearSelection = useCallback(() => apply(new Map(), true), [apply]);

  return { selection, toggleNode, removeNode, clearSelection };
}
