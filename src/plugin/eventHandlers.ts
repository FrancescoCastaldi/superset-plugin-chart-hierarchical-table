import { SelectedFilterItem } from '../types';

export type SetDataMask = (dataMask: any) => void;
export type AddFilter = (filter: any) => void;

export type CrossFilterHandler = (
  dimension: string,
  value: string | string[],
  pathMap?: Record<string, string> | Record<string, string>[],
  isCurrentlySelected?: boolean,
  allSelectedFilters?: any[],
) => void;

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
    },
  };
}

/**
 * Groups the selected nodes by dimension (using each node's full path when available)
 * and builds the IN filters for a multi-selection.
 */
export function groupSelectedFiltersByDimension(
  allSelectedFilters: Array<Pick<SelectedFilterItem, 'dimension' | 'value' | 'pathMap'>>,
): Record<string, string[]> {
  const dimValuesMap: Record<string, string[]> = {};
  for (const item of allSelectedFilters) {
    if (item.pathMap && Object.keys(item.pathMap).length > 0) {
      for (const [col, v] of Object.entries(item.pathMap)) {
        if (!dimValuesMap[col]) dimValuesMap[col] = [];
        if (!dimValuesMap[col].includes(v as string)) dimValuesMap[col].push(v as string);
      }
    } else {
      if (!dimValuesMap[item.dimension]) dimValuesMap[item.dimension] = [];
      if (!dimValuesMap[item.dimension].includes(item.value)) {
        dimValuesMap[item.dimension].push(item.value);
      }
    }
  }
  return dimValuesMap;
}

export function buildMultiSelectionDataMask(allSelectedFilters: any[]) {
  const dimValuesMap = groupSelectedFiltersByDimension(allSelectedFilters);

  const filters = Object.entries(dimValuesMap).map(([col, vals]) => ({
    col,
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
    },
  };
}

export function buildSingleDimensionDataMask(dimension: string, value: string | string[]) {
  const valArray = Array.isArray(value) ? value : [value];
  const filters = [
    {
      col: dimension,
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
    },
  };
}

/**
 * Resolves the data mask emitted for a cross-filter interaction (Superset 6.1.0 multi-selection).
 */
export function computeCrossFilterDataMask(
  dimension: string,
  value: string | string[],
  isCurrentlySelected?: boolean,
  allSelectedFilters?: any[],
) {
  if (allSelectedFilters && allSelectedFilters.length === 0) {
    return buildClearFilterDataMask();
  }
  if (allSelectedFilters && allSelectedFilters.length > 0) {
    return buildMultiSelectionDataMask(allSelectedFilters);
  }
  if (isCurrentlySelected) {
    return buildClearFilterDataMask();
  }
  return buildSingleDimensionDataMask(dimension, value);
}

export function createCrossFilterHandler({
  isCrossFilterActive,
  setDataMask,
  onAddFilter,
}: {
  isCrossFilterActive: boolean;
  setDataMask?: SetDataMask;
  onAddFilter?: AddFilter;
}): CrossFilterHandler {
  return (dimension, value, pathMap, isCurrentlySelected, allSelectedFilters) => {
    if (!isCrossFilterActive) return;

    if (setDataMask) {
      setDataMask(
        computeCrossFilterDataMask(dimension, value, isCurrentlySelected, allSelectedFilters),
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
