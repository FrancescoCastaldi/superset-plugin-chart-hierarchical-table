import { DimensionColumn, FilterValue, SelectedFilterItem } from '../types';

export type SetDataMask = (dataMask: any) => void;
export type AddFilter = (filter: any) => void;

export type CrossFilterHandler = (
  dimension: string,
  value: FilterValue | FilterValue[],
  pathMap?: Record<string, FilterValue> | Record<string, FilterValue>[],
  isCurrentlySelected?: boolean,
  allSelectedFilters?: any[],
) => void;

/** Column by dimension label, only where the filter has to name something other than the label. */
export type ColumnSpecs = Record<string, DimensionColumn>;

const columnOf = (dimension: string, specs?: ColumnSpecs): DimensionColumn => specs?.[dimension] ?? dimension;

/**
 * Data mask that removes every cross-filter emitted by the chart.
 */
export function buildClearFilterDataMask() {
  return {
    extraFormData: {
      filters: [],
    },
    filterState: {
      value: null,
      selectedValues: [],
      filters: null,
      selectedFilters: null,
      selectedNodes: [],
    },
  };
}

/**
 * Groups the selected nodes by dimension (using each node's full path when available)
 * and builds the IN filters for a multi-selection.
 */
export function groupSelectedFiltersByDimension(
  allSelectedFilters: Array<Pick<SelectedFilterItem, 'dimension' | 'value' | 'pathMap' | 'rawValue'>>,
): Record<string, FilterValue[]> {
  const dimValuesMap: Record<string, FilterValue[]> = {};
  for (const item of allSelectedFilters) {
    if (item.pathMap && Object.keys(item.pathMap).length > 0) {
      for (const [col, v] of Object.entries(item.pathMap)) {
        if (!dimValuesMap[col]) dimValuesMap[col] = [];
        if (!dimValuesMap[col].includes(v)) dimValuesMap[col].push(v);
      }
    } else {
      const value = item.rawValue ?? item.value;
      if (!dimValuesMap[item.dimension]) dimValuesMap[item.dimension] = [];
      if (!dimValuesMap[item.dimension].includes(value)) {
        dimValuesMap[item.dimension].push(value);
      }
    }
  }
  return dimValuesMap;
}

/** The selected nodes in the plain form the dashboard stores in the chart's filter state. */
function toStoredNodes(allSelectedFilters: any[]): SelectedFilterItem[] {
  return allSelectedFilters
    .filter(f => f && typeof f.key === 'string')
    .map(f => ({
      key: f.key,
      dimension: f.dimension,
      value: f.value,
      ...(f.rawValue !== undefined ? { rawValue: f.rawValue } : {}),
      ...(f.pathMap ? { pathMap: f.pathMap } : {}),
    }));
}

export function buildMultiSelectionDataMask(allSelectedFilters: any[], specs?: ColumnSpecs) {
  const dimValuesMap = groupSelectedFiltersByDimension(allSelectedFilters);

  const filters = Object.entries(dimValuesMap).map(([dimension, vals]) => ({
    col: columnOf(dimension, specs),
    op: 'IN' as const,
    val: vals,
  }));

  const selectedVals = allSelectedFilters.map(f => f.value);

  return {
    extraFormData: {
      filters,
    },
    filterState: {
      value: selectedVals,
      selectedValues: selectedVals,
      label: allSelectedFilters.map(f => `${f.dimension}: ${f.value}`).join(', '),
      filters: dimValuesMap,
      selectedFilters: dimValuesMap,
      selectedNodes: toStoredNodes(allSelectedFilters),
    },
  };
}

export function buildSingleDimensionDataMask(
  dimension: string,
  value: FilterValue | FilterValue[],
  specs?: ColumnSpecs,
) {
  const valArray = Array.isArray(value) ? value : [value];
  const filters = [
    {
      col: columnOf(dimension, specs),
      op: 'IN' as const,
      val: valArray,
    },
  ];

  return {
    extraFormData: {
      filters,
    },
    filterState: {
      value: valArray,
      selectedValues: valArray,
      label: `${dimension}: ${valArray.join(', ')}`,
      filters: { [dimension]: valArray },
      selectedFilters: { [dimension]: valArray },
      selectedNodes: [],
    },
  };
}

/**
 * Resolves the data mask emitted for a cross-filter interaction (Superset 6.1.0 multi-selection).
 */
export function computeCrossFilterDataMask(
  dimension: string,
  value: FilterValue | FilterValue[],
  isCurrentlySelected?: boolean,
  allSelectedFilters?: any[],
  specs?: ColumnSpecs,
) {
  if (allSelectedFilters && allSelectedFilters.length === 0) {
    return buildClearFilterDataMask();
  }
  if (allSelectedFilters && allSelectedFilters.length > 0) {
    return buildMultiSelectionDataMask(allSelectedFilters, specs);
  }
  if (isCurrentlySelected) {
    return buildClearFilterDataMask();
  }
  return buildSingleDimensionDataMask(dimension, value, specs);
}

export function createCrossFilterHandler({
  isCrossFilterActive,
  setDataMask,
  onAddFilter,
  columnSpecs,
}: {
  isCrossFilterActive: boolean;
  setDataMask?: SetDataMask;
  onAddFilter?: AddFilter;
  columnSpecs?: ColumnSpecs;
}): CrossFilterHandler {
  return (dimension, value, _pathMap, isCurrentlySelected, allSelectedFilters) => {
    if (!isCrossFilterActive) return;

    if (setDataMask) {
      setDataMask(
        computeCrossFilterDataMask(
          dimension,
          value,
          isCurrentlySelected,
          allSelectedFilters,
          columnSpecs,
        ),
      );
    } else if (onAddFilter && dimension && value) {
      onAddFilter({ [dimension]: Array.isArray(value) ? value : [value] });
    }
  };
}

export function createClearFilterHandler(setDataMask?: SetDataMask): () => void {
  return () => {
    if (setDataMask) {
      setDataMask(buildClearFilterDataMask());
    }
  };
}
