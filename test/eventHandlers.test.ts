import {
  buildClearFilterDataMask,
  buildMultiSelectionDataMask,
  buildSingleDimensionDataMask,
  computeCrossFilterDataMask,
  createClearFilterHandler,
  createCrossFilterHandler,
  groupSelectedFiltersByDimension,
} from '../src/plugin/eventHandlers';

const CLEAR_MASK = {
  extraFormData: { filters: [] },
  filterState: { value: null, selectedValues: [], filters: null, selectedFilters: null },
};

describe('eventHandlers', () => {
  describe('buildClearFilterDataMask', () => {
    it('returns an empty filter mask as a fresh object on every call', () => {
      const a = buildClearFilterDataMask();
      const b = buildClearFilterDataMask();
      expect(a).toEqual(CLEAR_MASK);
      expect(a).not.toBe(b);
      expect(a.extraFormData.filters).not.toBe(b.extraFormData.filters);
    });
  });

  describe('groupSelectedFiltersByDimension', () => {
    it('expands path maps into every ancestor dimension without duplicates', () => {
      expect(
        groupSelectedFiltersByDimension([
          { dimension: 'asl', value: 'ASL1', pathMap: { regione: 'Lazio', asl: 'ASL1' } },
          { dimension: 'asl', value: 'ASL2', pathMap: { regione: 'Lazio', asl: 'ASL2' } },
        ]),
      ).toEqual({ regione: ['Lazio'], asl: ['ASL1', 'ASL2'] });
    });

    it('falls back to the node dimension when the path map is missing or empty', () => {
      expect(
        groupSelectedFiltersByDimension([
          { dimension: 'regione', value: 'Lazio' },
          { dimension: 'regione', value: 'Lazio', pathMap: {} },
          { dimension: 'regione', value: 'Umbria' },
        ]),
      ).toEqual({ regione: ['Lazio', 'Umbria'] });
    });
  });

  describe('buildMultiSelectionDataMask', () => {
    it('emits one IN filter per dimension and a readable label', () => {
      const items = [
        { key: 'Lazio > ASL1', dimension: 'asl', value: 'ASL1', pathMap: { regione: 'Lazio', asl: 'ASL1' } },
        { key: 'Umbria', dimension: 'regione', value: 'Umbria', pathMap: { regione: 'Umbria' } },
      ];
      expect(buildMultiSelectionDataMask(items)).toEqual({
        extraFormData: {
          filters: [
            { col: 'regione', op: 'IN', val: ['Lazio', 'Umbria'] },
            { col: 'asl', op: 'IN', val: ['ASL1'] },
          ],
        },
        filterState: {
          value: ['ASL1', 'Umbria'],
          selectedValues: ['ASL1', 'Umbria'],
          label: 'asl: ASL1, regione: Umbria',
          filters: { regione: ['Lazio', 'Umbria'], asl: ['ASL1'] },
          selectedFilters: { regione: ['Lazio', 'Umbria'], asl: ['ASL1'] },
        },
      });
    });
  });

  describe('buildSingleDimensionDataMask', () => {
    it('wraps a single value into an array', () => {
      expect(buildSingleDimensionDataMask('regione', 'Lazio')).toEqual({
        extraFormData: { filters: [{ col: 'regione', op: 'IN', val: ['Lazio'] }] },
        filterState: {
          value: ['Lazio'],
          selectedValues: ['Lazio'],
          label: 'regione: Lazio',
          filters: { regione: ['Lazio'] },
          selectedFilters: { regione: ['Lazio'] },
        },
      });
    });

    it('keeps array values and joins them in the label', () => {
      const mask = buildSingleDimensionDataMask('regione', ['Lazio', 'Umbria']);
      expect(mask.extraFormData.filters[0].val).toEqual(['Lazio', 'Umbria']);
      expect(mask.filterState.label).toBe('regione: Lazio, Umbria');
    });
  });

  describe('computeCrossFilterDataMask', () => {
    it('clears when the selection list is empty, even if a value is passed', () => {
      expect(computeCrossFilterDataMask('regione', 'Lazio', false, [])).toEqual(CLEAR_MASK);
    });

    it('uses the multi-selection list when present, ignoring dimension/value', () => {
      const mask = computeCrossFilterDataMask('ignored', 'ignored', true, [
        { dimension: 'regione', value: 'Lazio' },
      ]);
      expect(mask.extraFormData.filters).toEqual([{ col: 'regione', op: 'IN', val: ['Lazio'] }]);
    });

    it('clears when toggling off a currently selected value without a selection list', () => {
      expect(computeCrossFilterDataMask('regione', 'Lazio', true)).toEqual(CLEAR_MASK);
    });

    it('filters on the single dimension otherwise', () => {
      expect(computeCrossFilterDataMask('regione', 'Lazio')).toEqual(
        buildSingleDimensionDataMask('regione', 'Lazio'),
      );
    });
  });

  describe('createCrossFilterHandler', () => {
    it('does nothing when cross filtering is disabled', () => {
      const setDataMask = jest.fn();
      const onAddFilter = jest.fn();
      createCrossFilterHandler({ isCrossFilterActive: false, setDataMask, onAddFilter })('regione', 'Lazio');
      expect(setDataMask).not.toHaveBeenCalled();
      expect(onAddFilter).not.toHaveBeenCalled();
    });

    it('prefers setDataMask over onAddFilter', () => {
      const setDataMask = jest.fn();
      const onAddFilter = jest.fn();
      createCrossFilterHandler({ isCrossFilterActive: true, setDataMask, onAddFilter })('regione', 'Lazio');
      expect(setDataMask).toHaveBeenCalledWith(buildSingleDimensionDataMask('regione', 'Lazio'));
      expect(onAddFilter).not.toHaveBeenCalled();
    });

    it('falls back to onAddFilter with an array value', () => {
      const onAddFilter = jest.fn();
      const handler = createCrossFilterHandler({ isCrossFilterActive: true, onAddFilter });
      handler('regione', 'Lazio');
      handler('regione', ['Lazio', 'Umbria']);
      expect(onAddFilter).toHaveBeenNthCalledWith(1, { regione: ['Lazio'] });
      expect(onAddFilter).toHaveBeenNthCalledWith(2, { regione: ['Lazio', 'Umbria'] });
    });

    it('skips onAddFilter when dimension or value is empty', () => {
      const onAddFilter = jest.fn();
      const handler = createCrossFilterHandler({ isCrossFilterActive: true, onAddFilter });
      handler('', 'Lazio');
      handler('regione', '');
      expect(onAddFilter).not.toHaveBeenCalled();
    });

    it('is a no-op without hooks', () => {
      expect(() => createCrossFilterHandler({ isCrossFilterActive: true })('regione', 'Lazio')).not.toThrow();
    });
  });

  describe('createClearFilterHandler', () => {
    it('emits the clear mask through setDataMask', () => {
      const setDataMask = jest.fn();
      createClearFilterHandler(setDataMask)();
      expect(setDataMask).toHaveBeenCalledWith(CLEAR_MASK);
    });

    it('is a no-op without setDataMask', () => {
      expect(() => createClearFilterHandler(undefined)()).not.toThrow();
    });
  });
});
