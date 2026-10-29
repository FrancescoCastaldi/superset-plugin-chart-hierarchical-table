jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

const build = (hooks: any, groupby: any[]) =>
  transformProps({
    width: 800,
    height: 400,
    formData: { groupby, metrics: ['Richieste'], hierarchyType: 'multi_dimension' },
    queriesData: [
      {
        data: [
          { 'Mese di Riferimento': '2026-10', Sede: 'IDI - ROMA', Richieste: 10 },
          { 'Mese di Riferimento': '2026-09', Sede: 'IDI - ROMA', Richieste: 8 },
        ],
      },
    ],
    hooks,
  } as unknown as HierarchicalTableChartProps);

describe('cross-filter of a table grouped by custom SQL columns', () => {
  const groupby = [
    { expressionType: 'SQL', label: 'Mese di Riferimento', sqlExpression: 'MESE_SLOT' },
    { expressionType: 'SQL', label: 'Sede', sqlExpression: 'SEDE' },
  ];

  it('filters the dashboard on the columns of the dataset, not on the labels of the table', () => {
    const setDataMask = jest.fn();
    const props = build({ setDataMask }, groupby);
    props.onCrossFilter!('Sede', ['IDI - ROMA'], undefined, false, [
      {
        key: '2026-10/IDI - ROMA',
        dimension: 'Sede',
        value: 'IDI - ROMA',
        pathMap: { 'Mese di Riferimento': '2026-10', Sede: 'IDI - ROMA' },
      },
    ]);

    expect(setDataMask).toHaveBeenCalledTimes(1);
    expect(setDataMask.mock.calls[0][0].extraFormData.filters).toEqual([
      { col: 'MESE_SLOT', op: 'IN', val: ['2026-10'] },
      { col: 'SEDE', op: 'IN', val: ['IDI - ROMA'] },
    ]);
  });

  it('keeps the labels for plain string dimensions', () => {
    const setDataMask = jest.fn();
    const props = build({ setDataMask }, ['Sede']);
    props.onCrossFilter!('Sede', 'IDI - ROMA');
    expect(setDataMask.mock.calls[0][0].extraFormData.filters).toEqual([
      { col: 'Sede', op: 'IN', val: ['IDI - ROMA'] },
    ]);
  });

  it('hands the selection back through the filter state', () => {
    const setDataMask = jest.fn();
    const props = build({ setDataMask }, groupby);
    props.onCrossFilter!('Sede', ['IDI - ROMA'], undefined, false, [
      { key: 'k', dimension: 'Sede', value: 'IDI - ROMA', pathMap: { Sede: 'IDI - ROMA' } },
    ]);
    expect(setDataMask.mock.calls[0][0].filterState.selectedNodes).toEqual([
      { key: 'k', dimension: 'Sede', value: 'IDI - ROMA', pathMap: { Sede: 'IDI - ROMA' } },
    ]);
  });
});
