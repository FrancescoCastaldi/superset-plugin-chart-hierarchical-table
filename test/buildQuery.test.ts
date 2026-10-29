jest.mock('@superset-ui/core', () => ({
  buildQueryContext: (formData: any, buildFn: any) => ({
    queries: buildFn({}),
  }),
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import buildQuery from '../src/plugin/buildQuery';
import { HierarchicalTableFormData } from '../src/types';

describe('HierarchicalTable buildQuery', () => {
  it('builds standard multi_dimension query context', () => {
    const formData = {
      datasource: '1__table',
      hierarchyType: 'multi_dimension',
      groupby: ['region', 'department'],
      metrics: ['revenue'],
    } as any as HierarchicalTableFormData;

    const context = buildQuery(formData);
    const q = (context as any).queries[0];
    expect(q.columns).toEqual(['region', 'department']);
    expect(q.metrics).toEqual(['revenue']);
    expect(q.time_offsets).toBeUndefined();
  });

  it('forwards dashboard extra_form_data.time_compare to query.time_offsets', () => {
    const formData = {
      datasource: '1__table',
      hierarchyType: 'multi_dimension',
      groupby: ['region'],
      metrics: ['revenue'],
      extra_form_data: {
        time_compare: ['2026-08-01 : 2026-08-31'],
      },
    } as any as HierarchicalTableFormData;

    const context = buildQuery(formData);
    const q = (context as any).queries[0];
    expect(q.time_offsets).toEqual(['2026-08-01 : 2026-08-31']);
  });
});

describe('HierarchicalTable buildQuery with its own cross-filter', () => {
  const base = {
    datasource: '1__table',
    hierarchyType: 'multi_dimension',
    groupby: ['sede', 'regime'],
    metrics: ['revenue'],
  };
  const selfFilters = [{ col: 'sede', op: 'IN', val: ['ROMA'] }];

  it('adds the own filters to the query when the option is on', () => {
    const context = buildQuery({ ...base, crossFilterAppliesToSelf: true } as any, { ownState: { selfFilters } });
    expect((context as any).queries[0].filters).toEqual(selfFilters);
  });

  it('ignores them with the option off, or when there is no own state', () => {
    expect((buildQuery(base as any, { ownState: { selfFilters } }) as any).queries[0].filters).toBeUndefined();
    expect((buildQuery({ ...base, crossFilterAppliesToSelf: true } as any) as any).queries[0].filters).toBeUndefined();
    expect(
      (buildQuery({ ...base, crossFilterAppliesToSelf: true } as any, { ownState: { selfFilters: [] } }) as any).queries[0].filters,
    ).toBeUndefined();
  });
});
