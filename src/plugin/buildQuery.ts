import { buildQueryContext, QueryContext, ensureIsArray } from '@superset-ui/core';
import { HierarchicalTableFormData } from '../types';
import { buildPeriodMetrics, resolvePeriodColumns } from '../utils/dynamicPeriodLabels';

export default function buildQuery(formData: HierarchicalTableFormData): QueryContext {
  const fd: any = formData || {};
  const {
    hierarchyType = 'multi_dimension',
    groupby,
    hierarchy_dimensions,
    hierarchyDimensions,
    idColumn,
    parentIdColumn,
    labelColumn,
    metrics = [],
  } = fd;

  return buildQueryContext(formData as any, (baseQueryObject: any) => {
    let columns: string[] = [];

    if (hierarchyType === 'multi_dimension') {
      // Backward compat: support groupby, hierarchyDimensions, hierarchy_dimensions
      const rowDims = ensureIsArray(groupby || hierarchyDimensions || hierarchy_dimensions);
      const pivotDims = ensureIsArray(fd.columns || fd.pivot_columns);
      columns = Array.from(new Set([...rowDims, ...pivotDims]));
    } else {
      // Parent-Child hierarchy requires ID, Parent ID, and optional Label column
      const cols = [idColumn, parentIdColumn, labelColumn].filter(Boolean) as string[];
      columns = Array.from(new Set(cols));
    }

    const dashboardTimeCompare = ensureIsArray(
      fd.extra_form_data?.time_compare ||
      baseQueryObject.extra_form_data?.time_compare,
    ).filter(Boolean);

    // With dynamic period labels the query also asks for the periods it is run on.
    const queryMetrics = fd.periodLabelsFromFilters
      ? [...ensureIsArray(metrics), ...buildPeriodMetrics(resolvePeriodColumns(fd))]
      : metrics;

    const query: any = {
      ...baseQueryObject,
      columns,
      metrics: queryMetrics,
    };

    if (dashboardTimeCompare.length > 0) {
      query.time_offsets = dashboardTimeCompare;
    }

    return [query];
  });
}
