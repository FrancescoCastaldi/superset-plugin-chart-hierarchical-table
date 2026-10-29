import {
  buildSelectionItem,
  isExternalSelection,
  readSelectedNodes,
  removeFromSelection,
  selectionEmission,
  selectionSignature,
  toggleSelection,
} from '../src/utils/crossFilterSelection';
import { TreeNode } from '../src/types';

const node = (overrides: Partial<TreeNode> = {}): TreeNode => ({
  key: 'Lazio/ASL1',
  id: 'Lazio/ASL1',
  name: 'ASL Uno',
  dimension: 'asl',
  depth: 1,
  path: ['Lazio', 'ASL Uno'],
  isLeaf: true,
  metrics: {},
  ...overrides,
});

describe('buildSelectionItem', () => {
  it('names the stored value of each level of the path, not what the table shows', () => {
    const item = buildSelectionItem(
      node({ rawPath: ['LAZ', 'A001'], path: ['Lazio', 'ASL Uno'] }),
      ['regione', 'asl'],
    );
    expect(item).toEqual({
      key: 'Lazio/ASL1',
      dimension: 'asl',
      value: 'ASL Uno',
      rawValue: 'A001',
      pathMap: { regione: 'LAZ', asl: 'A001' },
    });
  });

  it('takes the displayed path when there is no raw one, and the dimension of the level otherwise', () => {
    const item = buildSelectionItem(node({ dimension: undefined }), ['regione', 'asl']);
    expect(item.dimension).toBe('asl');
    expect(item.pathMap).toEqual({ regione: 'Lazio', asl: 'ASL Uno' });
    expect(item.rawValue).toBe('ASL Uno');
  });

  it('keeps stored values that are numbers or missing as they are', () => {
    const item = buildSelectionItem(
      node({ depth: 0, path: ['2026'], name: '2026', rawPath: [2026] }),
      ['anno'],
    );
    expect(item.pathMap).toEqual({ anno: 2026 });
    expect(item.rawValue).toBe(2026);
  });
});

describe('selection changes', () => {
  it('adds and removes a node without touching the previous selection', () => {
    const empty = new Map();
    const one = toggleSelection(empty, node(), ['regione', 'asl']);
    expect(empty.size).toBe(0);
    expect(one.size).toBe(1);

    const none = toggleSelection(one, node(), ['regione', 'asl']);
    expect(one.size).toBe(1);
    expect(none.size).toBe(0);

    const another = toggleSelection(one, node({ key: 'x', name: 'X' }), ['regione', 'asl']);
    expect(Array.from(another.keys())).toEqual(['Lazio/ASL1', 'x']);
    expect(removeFromSelection(another, 'x').size).toBe(1);
  });
});

describe('selectionEmission', () => {
  it('asks to clear when nothing is selected', () => {
    expect(selectionEmission(new Map())).toEqual({ kind: 'clear' });
  });

  it('sends the stored values, the path maps and the items of the selection', () => {
    const selection = toggleSelection(
      toggleSelection(new Map(), node({ rawPath: ['LAZ', 'A001'] }), ['regione', 'asl']),
      node({ key: 'k2', name: 'ASL Due', path: ['Lazio', 'ASL Due'], rawPath: ['LAZ', 'A002'] }),
      ['regione', 'asl'],
    );
    const emission = selectionEmission(selection);
    expect(emission.kind).toBe('select');
    if (emission.kind === 'select') {
      expect(emission.dimension).toBe('asl');
      expect(emission.values).toEqual(['A001', 'A002']);
      expect(emission.pathMaps).toEqual([
        { regione: 'LAZ', asl: 'A001' },
        { regione: 'LAZ', asl: 'A002' },
      ]);
      expect(emission.items).toHaveLength(2);
    }
  });
});

describe('selection identity and the dashboard state', () => {
  it('has the same signature whatever the order of the nodes', () => {
    expect(selectionSignature([{ key: 'b' }, { key: 'a' }])).toBe(selectionSignature([{ key: 'a' }, { key: 'b' }]));
    expect(selectionSignature([])).toBe('');
  });

  it('reads the selected nodes the dashboard keeps, and ignores anything else', () => {
    expect(readSelectedNodes(undefined)).toEqual([]);
    expect(readSelectedNodes({})).toEqual([]);
    expect(readSelectedNodes({ selectedNodes: 'x' })).toEqual([]);
    expect(
      readSelectedNodes({
        selectedNodes: [{ key: 'a', dimension: 'd', value: 'A' }, null, { value: 'no key' }],
      }),
    ).toEqual([{ key: 'a', dimension: 'd', value: 'A' }]);
  });

  it('tells a change made elsewhere from the echo of our own click', () => {
    expect(isExternalSelection('a', 'a', [])).toBe(false);
    expect(isExternalSelection('', 'a', [])).toBe(true);
    expect(isExternalSelection('a', '', ['a'])).toBe(false);
  });
});
