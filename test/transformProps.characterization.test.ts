jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import transformProps from '../src/plugin/transformProps';
import { HierarchicalTableChartProps } from '../src/types';

/**
 * Characterization of the full transformProps output on representative fixtures.
 * The snapshot was recorded on the pre-refactor monolithic implementation: any diff
 * means the observable output (tree, columns, headers, totals, formatters, handlers) changed.
 */

const FORMATTER_SAMPLES: any[] = [null, undefined, 0, 1234.567, -12.34, 7, 'Nuovo', NaN];

const CROSS_FILTER_SCENARIOS: Array<{ name: string; args: any[] }> = [
  { name: 'empty selection list', args: ['regione', [], undefined, true, []] },
  {
    name: 'multi selection with path maps',
    args: [
      'asl',
      ['ASL1', 'ASL2'],
      [{ regione: 'Lazio', asl: 'ASL1' }, { regione: 'Lazio', asl: 'ASL2' }],
      false,
      [
        { key: 'Lazio > ASL1', dimension: 'asl', value: 'ASL1', pathMap: { regione: 'Lazio', asl: 'ASL1' } },
        { key: 'Lazio > ASL2', dimension: 'asl', value: 'ASL2', pathMap: { regione: 'Lazio', asl: 'ASL2' } },
      ],
    ],
  },
  {
    name: 'multi selection without path maps (dedup per dimension)',
    args: [
      'regione',
      ['Lazio'],
      undefined,
      false,
      [
        { key: 'Lazio', dimension: 'regione', value: 'Lazio' },
        { key: 'Lazio#2', dimension: 'regione', value: 'Lazio', pathMap: {} },
        { key: 'Umbria', dimension: 'regione', value: 'Umbria' },
      ],
    ],
  },
  { name: 'toggle off currently selected', args: ['regione', 'Lazio', undefined, true] },
  { name: 'single string value', args: ['regione', 'Lazio'] },
  { name: 'array value', args: ['regione', ['Lazio', 'Umbria'], undefined, false] },
];

function recordHandlers(buildProps: (hooks: any) => any) {
  const log: any[] = [];
  const setDataMask = (mask: any) => log.push({ setDataMask: mask });
  const onAddFilter = (f: any) => log.push({ onAddFilter: f });

  const withMask = buildProps({ setDataMask, onAddFilter });
  for (const s of CROSS_FILTER_SCENARIOS) {
    log.push({ scenario: `setDataMask: ${s.name}` });
    withMask.onCrossFilter(...s.args);
  }
  log.push({ scenario: 'setDataMask: clear' });
  withMask.onClearFilter();

  const addOnly = buildProps({ onAddFilter });
  log.push({ scenario: 'onAddFilter: string value' });
  addOnly.onCrossFilter('regione', 'Lazio');
  log.push({ scenario: 'onAddFilter: array value' });
  addOnly.onCrossFilter('regione', ['Lazio', 'Umbria']);
  log.push({ scenario: 'onAddFilter: empty dimension' });
  addOnly.onCrossFilter('', 'Lazio');
  log.push({ scenario: 'onAddFilter: clear (no setDataMask)' });
  addOnly.onClearFilter();

  const noHooks = buildProps(undefined);
  log.push({ scenario: 'no hooks' });
  noHooks.onCrossFilter('regione', 'Lazio');
  noHooks.onClearFilter();

  return log;
}

function serialize(output: any): any {
  const { onCrossFilter, onClearFilter, columns, ...rest } = output;
  return {
    ...rest,
    onCrossFilterType: typeof onCrossFilter,
    onClearFilterType: typeof onClearFilter,
    columns: columns.map((c: any) => {
      const { formatter, ...colRest } = c;
      return {
        ...colRest,
        hasFormatter: typeof formatter === 'function',
        formatted: typeof formatter === 'function' ? FORMATTER_SAMPLES.map(v => formatter(v)) : undefined,
      };
    }),
  };
}

function run(formData: any, records: any[], extra: any = {}) {
  const buildProps = (hooks: any) =>
    transformProps({
      width: 800,
      height: 400,
      formData,
      queriesData: [{ data: records.map(r => ({ ...r })) }],
      hooks,
      filterState: { value: ['Lazio'] },
      ...extra,
    } as unknown as HierarchicalTableChartProps);

  return {
    output: serialize(buildProps({})),
    handlers: recordHandlers(buildProps),
  };
}

const deltaRecords = [
  { regione: 'Lazio', asl: 'ASL1', richieste_corr: 100, richieste_conf: 80, delta_richieste_pct: 25, accesso_diretto: 10, accesso_diretto_conf: 0, delta_accesso_diretto_pct: null },
  { regione: 'Lazio', asl: 'ASL2', richieste_corr: 50, richieste_conf: 70, delta_richieste_pct: -28.6, accesso_diretto: 5, accesso_diretto_conf: 4, delta_accesso_diretto_pct: 25 },
  { regione: 'Umbria', asl: 'USL1', richieste_corr: 30, richieste_conf: 0, delta_richieste_pct: null, accesso_diretto: 0, accesso_diretto_conf: 0, delta_accesso_diretto_pct: null },
  { regione: 'Umbria', asl: 'USL1', richieste_corr: 12, richieste_conf: 3, delta_richieste_pct: null, accesso_diretto: 2, accesso_diretto_conf: 1, delta_accesso_diretto_pct: null },
  { regione: null, asl: 'X', richieste_corr: '7', richieste_conf: 'abc', delta_richieste_pct: null, accesso_diretto: 1, accesso_diretto_conf: 1, delta_accesso_diretto_pct: null },
];

const deltaMetrics = [
  'richieste_corr',
  'richieste_conf',
  'delta_richieste_pct',
  { label: 'accesso_diretto', expressionType: 'SIMPLE' },
  { metric_name: 'accesso_diretto_conf' },
  'delta_accesso_diretto_pct',
];

// Metric and pivot names are kept very short on purpose: composite cell keys
// (`metric___pivot___channel`, `metric___ROW_TOTAL___(Empty)`, ...) of 32+ characters are
// flagged as potential secrets by commit scanners. 'delta%' is still recomputed from
// corr/conf on every node by the generic percentage branch of recomputeDerivedMetrics.
// Period values '1'..'4' keep the same lexicographic order as the months they stand for.
const pivotRecords = [
  { presidio: 'Roma', reparto: 'Chirurgia', mese: '2', canale: 'S', corr: 100, conf: 90, 'delta%': null },
  { presidio: 'Roma', reparto: 'Chirurgia', mese: '3', canale: 'S', corr: 120, conf: 100, 'delta%': null },
  { presidio: 'Roma', reparto: 'Chirurgia', mese: '3', canale: 'P', corr: 20, conf: 0, 'delta%': null },
  { presidio: 'Roma', reparto: 'Ortopedia', mese: '1', canale: 'S', corr: 40, conf: 50, 'delta%': null },
  { presidio: 'Milano', reparto: 'Cardiologia', mese: '2', canale: 'P', corr: 70, conf: 70, 'delta%': null },
  { presidio: 'Milano', reparto: 'Cardiologia', mese: '4', canale: null, corr: 10, conf: 5, 'delta%': null },
];

const pivotMetrics = ['corr', 'conf', 'delta%'];

const FIXTURES: Record<string, () => any> = {
  'flat multi-dimension with §5.3 delta metrics and object metrics/groupby': () =>
    run(
      {
        hierarchyType: 'multi_dimension',
        groupby: [{ column_name: 'regione' }, 'asl'],
        metrics: deltaMetrics,
        initialExpandDepth: 2,
        showGrandTotal: true,
      },
      deltaRecords,
    ),

  'flat with snake_case options, bottom total, cross filter disabled': () =>
    run(
      {
        hierarchy_dimensions: [{ label: 'regione' }, { sqlExpression: 'asl' }],
        metrics: deltaMetrics,
        expand_all_by_default: true,
        value_display_mode: 'leaves_only',
        valueDisplayMode: '',
        grandTotalPosition: '',
        grand_total_position: 'bottom',
        show_rollup_totals: false,
        showSubtotals: undefined,
        emit_filter: false,
        enable_sorting: false,
        default_sort_column: 'richieste_corr',
        defaultSortColumn: '',
        default_sort_order: 'desc',
        defaultSortOrder: '',
        min_max_display_mode: 'heatmap',
        minMaxDisplayMode: '',
        min_max_scope: 'level_aware',
        minMaxScope: '',
        enable_export: false,
        enableExport: undefined,
        numberFormat: ',.2f',
        currencySymbol: '€',
        compactMode: true,
        stripedRows: false,
        stickyHeader: false,
        enableSearch: false,
      },
      deltaRecords,
    ),

  'rawFormData merged under formData': () =>
    run(
      { groupby: ['regione'], metrics: ['richieste_corr'] },
      deltaRecords,
      { rawFormData: { groupby: ['asl'], metrics: ['accesso_diretto'], showGrandTotal: false, enableCrossFiltering: false } },
    ),

  'variance delta across chronological roots': () =>
    run(
      {
        groupby: ['mese', 'presidio'],
        metrics: pivotMetrics,
        showVarianceDelta: true,
      },
      pivotRecords,
    ),

  'single pivot combined layout, delta both, totals left, asc order': () =>
    run(
      {
        groupby: ['presidio', 'reparto'],
        columns: ['mese'],
        metrics: pivotMetrics,
        combineMetric: true,
        pivotTimeDeltaMode: 'both',
        pivotTimeDeltaLag: 1,
        pivotRowTotalsPosition: 'left',
        pivotRowTotalsLabel: 'Totali',
        pivotSortOrder: 'asc',
      },
      pivotRecords,
    ),

  'single pivot combined layout, percentage delta lag 2, totals right, desc order': () =>
    run(
      {
        groupby: ['presidio'],
        pivot_columns: ['mese'],
        metrics: ['corr'],
        combine_metric: true,
        combineMetric: undefined,
        pivot_time_delta_mode: 'percentage',
        pivotTimeDeltaMode: '',
        pivot_time_delta_lag: '2',
        pivotTimeDeltaLag: 0,
        pivot_row_totals_position: 'right',
        pivotRowTotalsPosition: '',
        pivot_row_totals_label: 'Consuntivo',
        pivotRowTotalsLabel: '',
        pivot_sort_order: 'desc',
        pivotSortOrder: '',
      },
      pivotRecords,
    ),

  'single pivot separated layout, delta both, totals left, insertion order': () =>
    run(
      {
        groupby: ['presidio', 'reparto'],
        columns: ['mese'],
        metrics: pivotMetrics,
        combineMetric: false,
        pivotTimeDeltaMode: 'both',
        pivotRowTotalsPosition: 'left',
        pivotSortOrder: 'none',
      },
      pivotRecords,
    ),

  'single pivot separated layout, absolute delta, totals right, desc order': () =>
    run(
      {
        groupby: ['presidio'],
        columns: ['mese'],
        metrics: ['corr', 'conf'],
        combineMetric: false,
        pivotTimeDeltaMode: 'absolute',
        pivotRowTotalsPosition: 'right',
        pivotSortOrder: 'desc',
        showGrandTotal: true,
      },
      pivotRecords,
    ),

  'single pivot on a dimension with null values, percentage delta, no totals': () =>
    run(
      {
        groupby: ['presidio'],
        columns: [{ column_name: 'canale' }],
        metrics: ['corr'],
        pivotTimeDeltaMode: 'percentage',
      },
      pivotRecords,
    ),

  'multi pivot with column subtotals and totals right': () =>
    run(
      {
        groupby: ['presidio', 'reparto'],
        columns: ['mese', 'canale'],
        metrics: pivotMetrics,
        showPivotColumnSubtotals: true,
        pivotColumnSubtotalLabel: 'Sub',
        pivotRowTotalsPosition: 'right',
        pivotSortOrder: 'asc',
      },
      pivotRecords,
    ),

  'multi pivot without subtotals, totals left, single metric, desc, delta both': () =>
    run(
      {
        groupby: ['presidio'],
        columns: ['mese', 'canale'],
        metrics: ['corr'],
        showPivotColumnSubtotals: false,
        pivotRowTotalsPosition: 'left',
        pivotSortOrder: 'desc',
        pivotTimeDeltaMode: 'both',
      },
      pivotRecords,
    ),

  'multi pivot, insertion order, no totals, snake_case subtotal label': () =>
    run(
      {
        groupby: ['presidio'],
        columns: ['mese', 'canale'],
        metrics: ['corr', 'conf'],
        show_pivot_column_subtotals: true,
        pivot_column_subtotal_label: 'Parziale',
        pivotColumnSubtotalLabel: '',
        pivotSortOrder: 'none',
      },
      pivotRecords,
    ),

  'parent-child hierarchy with object id columns': () =>
    run(
      {
        hierarchyType: 'parent_child',
        idColumn: { column_name: 'id' },
        parentIdColumn: { label: 'parent_id' },
        labelColumn: 'name',
        metrics: ['budget'],
        columns: ['ignored_in_parent_child'],
      },
      [
        { id: '1', parent_id: null, name: 'CEO', budget: 1000 },
        { id: '2', parent_id: '1', name: 'VP Tech', budget: 500 },
        { id: '3', parent_id: '1', name: 'VP Sales', budget: 300 },
        { id: '4', parent_id: '2', name: 'Dev', budget: 200 },
      ],
    ),

  'empty data': () => run({ groupby: ['regione'], metrics: ['richieste_corr'] }, []),

  'no queriesData and no formData': () => {
    const out = transformProps({ width: 10, height: 20 } as unknown as HierarchicalTableChartProps);
    return { output: serialize(out) };
  },
};

describe('transformProps characterization (pre-refactor snapshot)', () => {
  for (const [name, build] of Object.entries(FIXTURES)) {
    it(name, () => {
      expect(build()).toMatchSnapshot();
    });
  }
});
