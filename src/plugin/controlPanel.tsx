import {
  ControlPanelConfig,
  sharedControls,
  D3_FORMAT_OPTIONS,
} from '@superset-ui/chart-controls';

const t = (str: string) => str;

// Explore renders a React element placed in a control row as-is: this gives macro-sections
// visual sub-groups while controlPanelSections stays a flat list of sections.
const subsectionHeader = (label: string) => <h4 className="section-header">{label}</h4>;
const subsectionDivider = () => <hr />;

// Explore also accepts a component as control type: the list is edited as JSON and stored in
// the form data as a real array; text that does not parse to an array is not saved.
function ArrayControl({
  label,
  description,
  value,
  onChange,
}: {
  label?: string;
  description?: string;
  value?: unknown[];
  onChange?: (value: unknown[]) => void;
}) {
  return (
    <label title={description}>
      {label}
      <textarea
        rows={6}
        style={{ width: '100%' }}
        defaultValue={JSON.stringify(value ?? [], null, 2)}
        onChange={e => {
          try {
            const parsed = JSON.parse(e.target.value);
            if (Array.isArray(parsed)) onChange?.(parsed);
          } catch {
            // Incomplete JSON while typing: the last valid list stays saved.
          }
        }}
      />
    </label>
  );
}

// The time comparison reads its periods from the values of a single pivot column.
const isSinglePivot = ({ controls }: { controls: any }) =>
  controls?.hierarchyType?.value === 'multi_dimension' &&
  Array.isArray(controls?.columns?.value) &&
  controls.columns.value.length === 1;

export const CUSTOM_D3_FORMAT_OPTIONS: [string, string][] = [
  ['SMART_NUMBER', 'Adaptive formatting (Smart Number)'],
  [',d', '1,234 (Integer)'],
  ['.2f', '1234.56 (2 decimals)'],
  [',.2f', '1,234.56 (2 decimals)'],
  [',.1f', '1,234.6 (1 decimal)'],
  ['.2%', '12.34% (Percentage)'],
  ['.1%', '12.3% (Percentage)'],
  ['~s', '1.2k (SI prefix)'],
];

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Data'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'hierarchyType',
            config: {
              type: 'SelectControl',
              label: t('Hierarchy Mode'),
              default: 'multi_dimension',
              choices: [
                ['multi_dimension', t('Multi-Dimension Grouping (Level-based)')],
                ['parent_child', t('Parent-Child Adjacency (ID / Parent ID)')],
              ],
              renderTrigger: false,
              description: t(
                'Choose whether hierarchy is derived from ordered categorical dimensions or parent-child relations.',
              ),
            },
          },
        ],
        [
          {
            name: 'groupby',
            config: {
              ...sharedControls.groupby,
              label: t('Hierarchy Dimensions / Rows (in order)'),
              description: t('Select dimensions from highest to lowest level of hierarchy for rows (e.g. FARE LIV1 > FARE LIV2 > Prestazione).'),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension',
            },
          },
        ],
        [
          {
            name: 'columns',
            config: {
              ...sharedControls.groupby,
              label: t('Pivot Columns (Horizontal Matrix)'),
              description: t('Optional: group metrics horizontally by one or more dimensions (e.g. RegimeErogazione).'),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension',
            },
          },
        ],
        [
          {
            name: 'combineMetric',
            config: {
              type: 'CheckboxControl',
              label: t('Combine Metrics by Column (Affianca Metriche per Colonna Pivot)'),
              renderTrigger: true,
              default: true,
              description: t(
                'Display all metrics side-by-side under each pivot column value (e.g., [Ott 2026 > Totale | Delta]) instead of separating metrics into distinct column groups.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0),
            },
          },
          {
            name: 'pivotSortOrder',
            config: {
              type: 'SelectControl',
              label: t('Pivot Columns Order (Ordinamento Colonne Pivot)'),
              default: 'desc',
              renderTrigger: true,
              choices: [
                ['desc', t('Descending / Più recente prima (e.g. Ott 2026 -> Gen 2026)')],
                ['asc', t('Ascending / Cronologico (e.g. Gen 2026 -> Ott 2026)')],
                ['none', t('Appearance / Query Order')],
              ],
              description: t('Order in which pivot columns appear across the table.'),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0),
            },
          },
        ],
        [
          {
            name: 'pivotRowTotalsPosition',
            config: {
              type: 'SelectControl',
              label: t('Pivot Row Totals (Totali Orizzontali di Riga)'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('None (Nessun totale orizzontale)')],
                ['left', t('Sinistra / Inizio (Stile Qlik Sense - Prima delle colonne pivot)')],
                ['right', t('Destra / Fine (Stile Classico / Excel - In fondo alla tabella)')],
              ],
              description: t(
                'Posiziona la macro-colonna dei totali orizzontali di riga a sinistra (stile Qlik Sense) o a destra.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0),
            },
          },
          {
            name: 'pivotRowTotalsLabel',
            config: {
              type: 'TextControl',
              label: t('Pivot Row Totals Label (Etichetta Intestazione Totali)'),
              default: 'Totals',
              renderTrigger: true,
              description: t(
                'Testo visualizzato nell intestazione della colonna dei totali orizzontali (es. Totals, Totale Complessivo, Consuntivo).',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0) &&
                controls?.pivotRowTotalsPosition?.value &&
                controls?.pivotRowTotalsPosition?.value !== 'none',
            },
          },
        ],
        [
          {
            name: 'showPivotColumnSubtotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show Pivot Column Subtotals (Subtotale Colonne Pivot)'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mostra la colonna subtotale per ciascun gruppo pivot di primo livello (e nel blocco Totals) affiancata ai singoli valori della seconda dimensione pivot.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0),
            },
          },
          {
            name: 'pivotColumnSubtotalLabel',
            config: {
              type: 'TextControl',
              label: t('Pivot Column Subtotal Label (Etichetta Subtotale Colonne)'),
              default: 'Totale',
              renderTrigger: true,
              description: t(
                'Testo per la colonna del subtotale di colonna (es. Totale, Subtotale, Somma).',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0) &&
                controls?.showPivotColumnSubtotals?.value !== false,
            },
          },
        ],
        [
          {
            name: 'pivotTimeDeltaMode',
            config: {
              type: 'SelectControl',
              label: t('Automatic Pivot Delta Mode (Calcolo Delta Nativato Colonne Pivot)'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('None (Nessun delta automatico)')],
                ['absolute', t('Delta Assoluto (Δ = Valore - Periodo Prec.)')],
                ['percentage', t('Delta Percentuale (Δ% = (Valore - Periodo Prec.) / Periodo Prec.)')],
                ['both', t('Entrambi (Δ Assoluto + Δ% Percentuale)')],
              ],
              description: t(
                'Calcola automaticamente il delta temporale rispetto al periodo precedente lungo le colonne pivot senza window functions SQL.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0),
            },
          },
          {
            name: 'pivotTimeDeltaLag',
            config: {
              type: 'SelectControl',
              label: t('Delta Comparison Lag / Offset (Passo Temporale di Confronto)'),
              default: 1,
              renderTrigger: true,
              choices: [
                [1, t('1 Periodo (Es. Mese precedente / MoM, Anno precedente / YoY)')],
                [2, t('2 Periodi')],
                [3, t('3 Periodi (Es. Trimestre precedente / QoQ)')],
                [12, t('12 Periodi (Es. Stesso mese anno precedente / MoM-YoY)')],
              ],
              description: t('Numero di periodi indietro da usare come confronto per il delta.'),
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension' &&
                Boolean(controls?.columns?.value && controls.columns.value.length > 0) &&
                controls?.pivotTimeDeltaMode?.value !== 'none',
            },
          },
        ],
        [
          {
            name: 'idColumn',
            config: {
              ...sharedControls.entity,
              label: t('Node ID Column'),
              description: t('Column containing the unique identifier of the node.'),
              validators: [],
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'parent_child',
            },
          },
        ],
        [
          {
            name: 'parentIdColumn',
            config: {
              ...sharedControls.entity,
              label: t('Parent ID Column'),
              description: t('Column containing the identifier of the parent node.'),
              validators: [],
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'parent_child',
            },
          },
        ],
        [
          {
            name: 'labelColumn',
            config: {
              ...sharedControls.entity,
              label: t('Node Label Column (Optional)'),
              description: t('Column containing the display name for the node.'),
              validators: [],
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'parent_child',
            },
          },
        ],
        [
          {
            name: 'metrics',
            config: {
              ...sharedControls.metrics,
              label: t('Metrics'),
              description: t('Metrics to calculate and display for each hierarchy level.'),
            },
          },
        ],
        ['adhoc_filters'],
      ],
    },
    {
      label: t('Customize'),
      expanded: true,
      controlSetRows: [
        [subsectionHeader(t('Hierarchy & Tree Display Options'))],
        [
          {
            name: 'initialExpandDepth',
            config: {
              type: 'SelectControl',
              label: t('Initial Expand Depth'),
              default: 1,
              renderTrigger: true,
              choices: [
                [-1, t('Expand All')],
                [0, t('Collapse All (Roots only)')],
                [1, t('Level 1')],
                [2, t('Level 2')],
                [3, t('Level 3')],
                [4, t('Level 4')],
              ],
              description: t('Initial depth of tree nodes expanded upon loading.'),
            },
          },
        ],
        [
          {
            name: 'valueDisplayMode',
            config: {
              type: 'SelectControl',
              label: t('Value Display Mode'),
              default: 'all',
              renderTrigger: true,
              choices: [
                ['all', t('All Levels (Default)')],
                ['leaves_only', t('Leaves Only (Solo foglie)')],
                ['parents_only', t('Parents Only (Solo padri / subtotali)')],
              ],
              description: t(
                'Choose whether to display metric values on all levels, leaf nodes only, or parent totals only.',
              ),
            },
          },
        ],
        [
          {
            name: 'showSubtotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show Subtotals / Rollup Rows'),
              renderTrigger: true,
              default: true,
              description: t('Display aggregated metric values on parent nodes.'),
            },
          },
          {
            name: 'showGrandTotal',
            config: {
              type: 'CheckboxControl',
              label: t('Show Grand Total Row'),
              renderTrigger: true,
              default: true,
              description: t('Display a summary grand total row at the top or bottom.'),
            },
          },
        ],
        [
          {
            name: 'stickyHeader',
            config: {
              type: 'CheckboxControl',
              label: t('Sticky Table Header'),
              renderTrigger: true,
              default: true,
              description: t('Keep column headers fixed while scrolling.'),
            },
          },
        ],
        [
          {
            name: 'enableSearch',
            config: {
              type: 'CheckboxControl',
              label: t('Enable In-Tree Search'),
              renderTrigger: true,
              default: true,
              description: t('Show search bar to filter hierarchy nodes dynamically.'),
            },
          },
          {
            name: 'compactMode',
            config: {
              type: 'CheckboxControl',
              label: t('Compact Row Padding'),
              renderTrigger: true,
              default: false,
              description: t('Use denser row height for high data density.'),
            },
          },
        ],
        [
          {
            name: 'enableHierarchicalSort',
            config: {
              type: 'CheckboxControl',
              label: t('Enable Hierarchical In-Tree Sorting'),
              renderTrigger: true,
              default: true,
              description: t(
                'Allow sorting tree nodes within their respective parent branch by clicking metric column headers.',
              ),
            },
          },
          {
            name: 'enableExport',
            config: {
              type: 'CheckboxControl',
              label: t('Enable CSV / Excel Hierarchy Export'),
              renderTrigger: true,
              default: true,
              description: t(
                'Show export button to download hierarchy with preserved levels and subtotals.',
              ),
            },
          },
        ],
        [subsectionDivider()],
        [subsectionHeader(t('Sorting & Conditional Formatting'))],
        [
          {
            name: 'defaultSortColumn',
            config: {
              type: 'SelectControl',
              label: t('Default Sort Column'),
              default: '__hierarchy_tree__',
              renderTrigger: true,
              freeForm: true,
              choices: [
                ['__hierarchy_tree__', t('Hierarchy Category (Name)')],
              ],
              mapStateToProps: (explore: any) => {
                const rawMetrics = explore?.controls?.metrics?.value || explore?.controls?.metric?.value || [];
                const metrics = Array.isArray(rawMetrics) ? rawMetrics : rawMetrics ? [rawMetrics] : [];
                const metricChoices = metrics.map((m: any) => {
                  const val = typeof m === 'string' ? m : m?.label || m?.metric_name || String(m);
                  return [val, val];
                });
                return {
                  choices: [
                    ['__hierarchy_tree__', t('Hierarchy Category (Name)')],
                    ...metricChoices,
                  ],
                };
              },
              description: t(
                'Select Hierarchy Category or any configured metric for default sorting.',
              ),
            },
          },
          {
            name: 'defaultSortOrder',
            config: {
              type: 'SelectControl',
              label: t('Default Sort Order'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('Query Order (None)')],
                ['asc', t('Ascending / A-Z')],
                ['desc', t('Descending / Z-A')],
              ],
              description: t('Initial sort direction on chart load.'),
            },
          },
        ],
        [
          {
            name: 'minMaxDisplayMode',
            config: {
              type: 'SelectControl',
              label: t('Min/Max Display Mode'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('Disabled')],
                ['badges', t('Min/Max Pill Badges')],
                ['heatmap', t('Cell Heatmap Gradient')],
                ['data_bars', t('In-Cell Data Bars')],
              ],
              description: t(
                'Visual formatting style for highlighting minimum and maximum values across columns.',
              ),
            },
          },
          {
            name: 'minMaxScope',
            config: {
              type: 'SelectControl',
              label: t('Min/Max Calculation Scope'),
              default: 'leaves_only',
              renderTrigger: true,
              choices: [
                ['leaves_only', t('Leaf Nodes Only (Recommended)')],
                ['level_aware', t('By Hierarchy Level')],
                ['all_nodes', t('All Nodes Excl. Grand Total')],
              ],
              description: t(
                'Scope used to calculate min and max values. Leaf nodes only prevents parent aggregations from distorting scale.',
              ),
            },
          },
        ],
        [
          {
            name: 'conditionalFormatting',
            config: {
              type: ArrayControl,
              label: t('Conditional Formatting Rules'),
              default: [],
              renderTrigger: true,
              description: t(
                'JSON rules, e.g. [{"metric": "revenue", "operator": ">", "targetValue": 100, "priority": 1, "scope": "cell"}]. ' +
                  'Operators < <= == >= > between (targetValue2) regex; scope cell, row, column (pivot value). ' +
                  'Priority 1 wins (green, 2 amber, 3+ red).',
              ),
            },
          },
        ],
        [subsectionDivider()],
        [subsectionHeader(t('Formatting & Aesthetics'))],
        [
          {
            name: 'numberFormat',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Number Format'),
              renderTrigger: true,
              default: 'SMART_NUMBER',
              choices: CUSTOM_D3_FORMAT_OPTIONS || D3_FORMAT_OPTIONS,
              description: t('D3 format string for numerical metric values.'),
            },
          },
        ],
        [
          {
            name: 'currencySymbol',
            config: {
              type: 'TextControl',
              label: t('Currency Symbol Prefix'),
              renderTrigger: true,
              default: '',
              description: t('Optional prefix (e.g. €, $, £) for metrics.'),
            },
          },
        ],
        [
          {
            name: 'stripedRows',
            config: {
              type: 'CheckboxControl',
              label: t('Striped Alternating Rows'),
              renderTrigger: true,
              default: true,
              description: t('Alternating background color for easier reading.'),
            },
          },
        ],
      ],
    },
    {
      label: t('Comparison & Analysis'),
      expanded: false,
      controlSetRows: [
        [subsectionHeader(t('Time Comparison & Period-over-Period Variance'))],
        [
          {
            name: 'showVarianceDelta',
            config: {
              type: 'CheckboxControl',
              label: t('Enable Period Delta Badges (Δ %)'),
              renderTrigger: true,
              default: false,
              description: t(
                'Display period-over-period growth or variance delta badges next to numeric metric values.',
              ),
            },
          },
          {
            name: 'timeGrain',
            config: {
              type: 'SelectControl',
              label: t('Time Comparison Granularity'),
              default: 'year',
              renderTrigger: true,
              choices: [
                ['day', t('📅 Day (DoD - Day-over-Day)')],
                ['week', t('📆 Week (WoW - Week-over-Week)')],
                ['month', t('🗓️ Month (MoM - Month-over-Month)')],
                ['quarter', t('📊 Quarter (QoQ - Quarter-over-Quarter)')],
                ['year', t('📈 Year (YoY - Year-over-Year)')],
              ],
              description: t(
                'Period length for the deltas. Periods come from the pivot column values (YYYY, YYYY-Qn, YYYY-MM, YYYY-MM-DD, timestamps).',
              ),
              visibility: isSinglePivot,
            },
          },
        ],
        [
          {
            name: 'referencePeriod',
            config: {
              type: 'SelectControl',
              label: t('Reference Period (Periodo di Riferimento)'),
              default: 'current',
              renderTrigger: true,
              choices: [
                ['current', t('Current Active Period (Periodo Corrente)')],
                ['previous', t('Previous Completed Period (Periodo Precedente)')],
                ['ytd', t('Year-to-Date (YTD)')],
              ],
              description: t(
                'Baseline of the latest period: itself (no delta), the previous period, or the year-to-date average.',
              ),
              visibility: (state: { controls: any }) =>
                isSinglePivot(state) &&
                (state.controls?.comparisonType?.value ?? 'prev_period') === 'prev_period',
            },
          },
          {
            name: 'comparisonType',
            config: {
              type: 'SelectControl',
              label: t('Comparison Baseline (Periodo di Confronto)'),
              default: 'prev_period',
              renderTrigger: true,
              choices: [
                ['prev_period', t('Immediately Preceding Period (DoD / WoW / MoM / YoY)')],
                ['prev_year_same_period', t('Same Period in Prior Year (Stesso Periodo Anno Scorso)')],
                ['budget_target', t('Budget / Target Baseline (Target Pianificato)')],
              ],
              description: t(
                'Baseline for the latest period delta. Budget / Target uses the matching Metric Goals target.',
              ),
              visibility: isSinglePivot,
            },
          },
        ],
        [subsectionDivider()],
        [subsectionHeader(t('Goals (optional)'))],
        [
          {
            name: 'goals',
            config: {
              type: 'TextAreaControl',
              language: 'json',
              label: t('Metric Goals'),
              default: '',
              renderTrigger: true,
              description: t(
                'JSON list of per-metric targets, e.g. [{"metricKey": "revenue", "target": 1000, "direction": "higher_is_better"}]. ' +
                  'direction is "higher_is_better" (default) or "lower_is_better". Each matching metric cell shows its ' +
                  'deviation from the target and a status: achieved (>= 100% attainment), on track (>= 90%), at risk (>= 75%) or missed.',
              ),
            },
          },
        ],
        [subsectionDivider()],
        [subsectionHeader(t('Advanced Rollup Calculations'))],
        [
          {
            name: 'aggregationMode',
            config: {
              type: 'SelectControl',
              label: t('Rollup Aggregation Function'),
              default: 'sum',
              renderTrigger: false,
              choices: [
                ['sum', t('SUM (Add Subtotals)')],
                ['avg', t('AVG (Mean of Children)')],
                ['min', t('MIN (Minimum Value)')],
                ['max', t('MAX (Maximum Value)')],
                ['weighted_avg', t('Weighted Average / Ratio')],
              ],
              description: t('Default aggregation algorithm for calculating intermediate parent node subtotals.'),
            },
          },
        ],
        [
          {
            name: 'weightColumn',
            config: {
              type: 'TextControl',
              label: t('Weight Metric'),
              default: '',
              renderTrigger: true,
              description: t(
                'Metric label used as weight (it must be one of the query metrics). Overrides the automatic volume weights; zero total weight falls back to the plain average.',
              ),
              visibility: ({ controls }: { controls: any }) => {
                const aggregationMode = controls?.aggregationMode?.value;
                return aggregationMode === 'weighted_avg';
              },
            },
          },
        ],
        [
          {
            name: 'emit_filter',
            config: {
              type: 'CheckboxControl',
              label: t('Emit Dashboard Cross-Filters'),
              renderTrigger: true,
              default: true,
              description: t(
                'Broadcast interactive cross-filters to other charts in the dashboard when clicking on tree nodes or dimension values.',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Performance & Limits'),
      expanded: false,
      controlSetRows: [['row_limit']],
    },
  ],
};

export default config;
