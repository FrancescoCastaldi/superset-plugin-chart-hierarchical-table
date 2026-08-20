import {
  buildQueryContext,
  QueryFormData,
  QueryContext,
  ensureIsArray,
} from '@superset-ui/core';
import { HierarchicalTableFormData } from '../types';

export default function buildQuery(formData: HierarchicalTableFormData): QueryContext {
  const {
    hierarchyType = 'multi_dimension',
    groupby,
    idColumn,
    parentIdColumn,
    labelColumn,
    metrics = [],
  } = formData;

  return buildQueryContext(formData, baseQueryObject => {
    let columns: string[] = [];

    if (hierarchyType === 'multi_dimension') {
      columns = ensureIsArray(groupby);
    } else {
      // Parent-Child hierarchy requires ID, Parent ID, and optional Label column
      const cols = [idColumn, parentIdColumn, labelColumn].filter(Boolean) as string[];
      columns = Array.from(new Set(cols));
    }

    return [
      {
        ...baseQueryObject,
        columns,
        metrics,
      },
    ];
  });
}
