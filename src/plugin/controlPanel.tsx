import {
  ControlPanelConfig,
  sharedControls,
  D3_FORMAT_OPTIONS,
} from '@superset-ui/chart-controls';
import { isValidHex } from '../utils/themes';
import { SETTINGS_LEVEL, withSettingsLevel } from './controlVisibility';
import { hintControl } from './controls/InlineHint';
import { MetricSettingsCards, metricSettingsProps } from './controls/MetricSettingsCards';
import { makeMetricPicker } from './controls/MetricPicker';
import { editorOptionsFromState, makeRuleListControl } from './controls/RuleListEditor';
import {
  CONDITIONAL_FORMATTING_SPEC,
  DIMENSION_LIMITS_SPEC,
  GOALS_SPEC,
  METRIC_DEFINITIONS_SPEC,
  TABLE_CALCULATIONS_SPEC,
} from './controls/ruleSpecs';
import { sparklineHint, suppressionHint, weightHint } from './controls/hints';

const t = (str: string) => str;

// Explore accepts a component as control type. Lists of rules are edited as rows (see
// controls/RuleListEditor) and metric names are picked from the chart metrics (controls/MetricPicker).
const GoalsEditor = makeRuleListControl(GOALS_SPEC);
const ConditionalFormattingEditor = makeRuleListControl(CONDITIONAL_FORMATTING_SPEC);
const MetricDefinitionsEditor = makeRuleListControl(METRIC_DEFINITIONS_SPEC);
const TableCalculationsEditor = makeRuleListControl(TABLE_CALCULATIONS_SPEC);
const DimensionLimitsEditor = makeRuleListControl(DIMENSION_LIMITS_SPEC);
const MetricListPicker = makeMetricPicker(true);
const MetricSinglePicker = makeMetricPicker(false);

// The dropdowns of these controls follow the metrics and dimensions chosen in the chart.
const followsChartColumns = {
  mapStateToProps: editorOptionsFromState,
  shouldMapStateToProps: () => true,
};

const customHexControl = (name: string, label: string) => ({
  name,
  config: {
    type: 'TextControl',
    label,
    renderTrigger: true,
    default: '',
    description: t('#RRGGBB oppure vuoto per il colore standard; mantieni un contrasto di almeno 3:1 sul bianco.'),
    validators: [(v: string) => (!v || isValidHex(v) ? false : t('Usa il formato #RRGGBB'))],
    visibility: ({ controls }: { controls: any }) => controls?.themeProfile?.value === 'custom',
  },
});

// The pivot options only apply in multi-dimension mode once at least one pivot column is chosen.
const hasPivotColumns = ({ controls }: { controls: any }) =>
  controls?.hierarchyType?.value === 'multi_dimension' &&
  Boolean(controls?.columns?.value && controls.columns.value.length > 0);

// The time comparison reads its periods from the values of a single pivot column or general variance delta.
const isSinglePivot = ({ controls }: { controls: any }) =>
  controls?.hierarchyType?.value === 'multi_dimension' &&
  Array.isArray(controls?.columns?.value) &&
  controls.columns.value.length === 1;

const isComparisonVisible = ({ controls }: { controls: any }) =>
  Boolean(controls?.showVarianceDelta?.value) ||
  isSinglePivot({ controls });

export const CUSTOM_D3_FORMAT_OPTIONS: [string, string][] = [
  ['SMART_NUMBER', 'Adattivo (Smart Number)'],
  [',d', '1,234 (intero)'],
  ['.2f', '1234.56 (2 decimali)'],
  [',.2f', '1,234.56 (2 decimali)'],
  [',.1f', '1,234.6 (1 decimale)'],
  ['.2%', '12.34% (percentuale)'],
  ['.1%', '12.3% (percentuale)'],
  ['~s', '1.2k (prefisso SI)'],
];

const config: ControlPanelConfig = {
  // Superset 6.1.0 shows a section in the Data tab when it is pinned there or holds a control
  // without renderTrigger; only 'data' can be forced. The query sections are pinned so that
  // they stay together; the display sections must keep renderTrigger on every control to stay
  // in Customize (guarded by test/controlPanelLayout.test.ts).
  controlPanelSections: [
    {
      label: t('Struttura della gerarchia'),
      expanded: true,
      tabOverride: 'data',
      controlSetRows: [
        [
          {
            name: SETTINGS_LEVEL,
            config: {
              type: 'SelectControl',
              label: t('Livello impostazioni'),
              default: 'basic',
              renderTrigger: true,
              clearable: false,
              choices: [
                ['basic', t('Base (impostazioni essenziali)')],
                ['advanced', t('Avanzato (tutte le opzioni)')],
              ],
              description: t(
                'Base mostra le impostazioni essenziali, Avanzato tutte le opzioni. Le opzioni avanzate già impostate restano sempre visibili.',
              ),
            },
          },
        ],
        [
          {
            name: 'hierarchyType',
            config: {
              type: 'SelectControl',
              label: t('Modalità della gerarchia'),
              default: 'multi_dimension',
              choices: [
                ['multi_dimension', t('Per dimensioni (un livello per colonna)')],
                ['parent_child', t('Nodo e padre (colonna ID e colonna ID padre)')],
              ],
              renderTrigger: false,
              description: t(
                'Scegli se la gerarchia nasce da dimensioni ordinate per livello oppure da una relazione tra nodo e nodo padre.',
              ),
            },
          },
        ],
        [
          {
            name: 'groupby',
            config: {
              ...sharedControls.groupby,
              label: t('Dimensioni della gerarchia (in ordine)'),
              description: t(
                'Scegli le dimensioni dal livello più alto al più basso, per esempio FARE LIV1, FARE LIV2, Prestazione.',
              ),
              clearable: true,
              validators: [],
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
              label: t('Colonne pivot (matrice orizzontale)'),
              description: t(
                'Facoltativo. Raggruppa le metriche in orizzontale per una o più dimensioni, per esempio RegimeErogazione. Dopo averle scelte compare la sezione "Opzioni delle colonne pivot".',
              ),
              clearable: true,
              validators: [],
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'multi_dimension',
            },
          },
        ],
        [
          {
            name: 'idColumn',
            config: {
              ...sharedControls.entity,
              label: t('Colonna ID del nodo'),
              description: t(
                'Colonna con l\'identificativo univoco del nodo.',
              ),
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
              label: t('Colonna ID del nodo padre'),
              description: t(
                'Colonna con l\'identificativo del nodo padre.',
              ),
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
              label: t('Colonna etichetta del nodo (facoltativa)'),
              description: t(
                'Colonna con il nome da mostrare per il nodo.',
              ),
              validators: [],
              visibility: ({ controls }: { controls: any }) =>
                controls?.hierarchyType?.value === 'parent_child',
            },
          },
        ],
      ],
    },
    {
      label: t('Metriche'),
      expanded: true,
      tabOverride: 'data',
      controlSetRows: [
        [
          {
            name: 'metrics',
            config: {
              ...sharedControls.metrics,
              label: t('Metriche'),
              description: t(
                'Metriche da calcolare e mostrare per ogni livello della gerarchia.',
              ),
              clearable: true,
              validators: [],
            },
          },
        ],
        [
          {
            name: 'aggregationMode',
            config: {
              type: 'SelectControl',
              label: t('Funzione di aggregazione dei subtotali'),
              default: 'sum',
              renderTrigger: false,
              choices: [
                ['sum', t('SUM (somma dei figli)')],
                ['avg', t('AVG (media dei figli)')],
                ['min', t('MIN (valore minimo)')],
                ['max', t('MAX (valore massimo)')],
                ['weighted_avg', t('Media ponderata o rapporto')],
              ],
              description: t(
                'Come calcolare i subtotali dei nodi padre a partire dai figli.',
              ),
            },
          },
        ],
        [
          {
            name: 'weightColumn',
            config: {
              type: MetricSinglePicker,
              label: t('Metrica peso'),
              default: '',
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Nome della metrica usata come peso: deve essere una delle metriche della query. Sostituisce i pesi automatici sul volume; con peso totale zero si usa la media semplice.',
              ),
              visibility: ({ controls }: { controls: any }) => {
                const aggregationMode = controls?.aggregationMode?.value;
                return aggregationMode === 'weighted_avg';
              },
            },
          },
        ],
        [hintControl('hint_weight', weightHint)],
        [
          {
            name: 'metricSettings',
            config: {
              type: MetricSettingsCards,
              label: t('Impostazioni per metrica'),
              // The card holds no value: it edits the goals, definitions, sparkline, protection
              // and weight controls, so it only needs the state of the chart to stay up to date.
              default: null,
              renderTrigger: true,
              shouldMapStateToProps: () => true,
              mapStateToProps: metricSettingsProps,
              description: t(
                'Una scheda per ogni metrica con obiettivo, sparkline, protezione dai piccoli numeri e peso, più formato e polarità se la metrica ha una definizione. Scrive negli stessi campi delle altre sezioni.',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Opzioni delle colonne pivot'),
      expanded: false,
      tabOverride: 'data',
      visibility: hasPivotColumns,
      controlSetRows: [
        [
          {
            name: 'combineMetric',
            config: {
              type: 'CheckboxControl',
              label: t('Affianca le metriche sotto ogni colonna pivot'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mostra tutte le metriche una accanto all\'altra sotto ciascun valore della colonna pivot (per esempio Ott 2026: Totale e Delta), invece di separarle in gruppi di colonne distinti.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }),
            },
          },
          {
            name: 'pivotSortOrder',
            config: {
              type: 'SelectControl',
              label: t('Ordine delle colonne pivot'),
              default: 'desc',
              renderTrigger: true,
              choices: [
                ['desc', t('Dal più recente (per esempio da Ott 2026 a Gen 2026)')],
                ['asc', t('Cronologico (per esempio da Gen 2026 a Ott 2026)')],
                ['none', t('Ordine della query')],
              ],
              description: t(
                'Ordine in cui compaiono le colonne pivot nella tabella.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }),
            },
          },
        ],
        [
          {
            name: 'pivotRowTotalsPosition',
            config: {
              type: 'SelectControl',
              label: t('Totali orizzontali di riga'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('Nessuno')],
                ['left', t('A sinistra, prima delle colonne pivot (stile Qlik Sense)')],
                ['right', t('A destra, in fondo alla tabella (stile Excel)')],
              ],
              description: t(
                'Posizione della colonna dei totali di riga: a sinistra (stile Qlik Sense) oppure a destra.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }),
            },
          },
          {
            name: 'pivotRowTotalsLabel',
            config: {
              type: 'TextControl',
              label: t('Etichetta dei totali di riga'),
              default: 'Totals',
              renderTrigger: true,
              description: t(
                'Testo dell\'intestazione della colonna dei totali di riga, per esempio Totale complessivo o Consuntivo.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }) &&
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
              label: t('Mostra i subtotali delle colonne pivot'),
              renderTrigger: true,
              default: true,
              description: t(
                'Aggiunge una colonna subtotale per ogni gruppo pivot di primo livello (e nel blocco dei totali), accanto ai valori della seconda dimensione pivot.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }),
            },
          },
          {
            name: 'pivotColumnSubtotalLabel',
            config: {
              type: 'TextControl',
              label: t('Etichetta dei subtotali delle colonne'),
              default: 'Totale',
              renderTrigger: true,
              description: t(
                'Testo della colonna subtotale, per esempio Totale, Subtotale o Somma.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }) &&
                controls?.showPivotColumnSubtotals?.value !== false,
            },
          },
        ],
      ],
    },
    {
      label: t('Filtri e limiti'),
      expanded: false,
      tabOverride: 'data',
      controlSetRows: [
        ['adhoc_filters'],
        ['row_limit'],
        [
          {
            name: 'dimensionLimits',
            config: {
              type: DimensionLimitsEditor,
              label: t('Limiti per dimensione e Top N (facoltativo)'),
              default: '',
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Limita i rami visibili per livello della gerarchia o per dimensione: mostra solo i primi N (o gli ultimi N) e raccoglie il resto in una riga «Altri» con la somma esatta delle metriche.',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Albero e navigazione'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'initialExpandDepth',
            config: {
              type: 'SelectControl',
              label: t('Profondità iniziale dell\'albero'),
              default: 1,
              renderTrigger: true,
              choices: [
                [-1, t('Tutto aperto')],
                [0, t('Tutto chiuso (solo i nodi radice)')],
                [1, t('Livello 1')],
                [2, t('Livello 2')],
                [3, t('Livello 3')],
                [4, t('Livello 4')],
              ],
              description: t(
                'Quanti livelli dell\'albero sono aperti al caricamento.',
              ),
            },
          },
        ],
        [
          {
            name: 'valueDisplayMode',
            config: {
              type: 'SelectControl',
              label: t('Dove mostrare i valori'),
              default: 'all',
              renderTrigger: true,
              choices: [
                ['all', t('Su tutti i livelli')],
                ['leaves_only', t('Solo sulle foglie')],
                ['parents_only', t('Solo sui nodi padre (subtotali)')],
              ],
              description: t(
                'Scegli se mostrare i valori delle metriche su tutti i livelli, solo sulle foglie o solo sui totali dei nodi padre.',
              ),
            },
          },
        ],
        [
          {
            name: 'showSubtotals',
            config: {
              type: 'CheckboxControl',
              label: t('Mostra i subtotali dei nodi padre'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mostra i valori aggregati sui nodi padre.',
              ),
            },
          },
          {
            name: 'showGrandTotal',
            config: {
              type: 'CheckboxControl',
              label: t('Mostra la riga del totale generale'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mostra una riga con il totale generale, in alto o in basso.',
              ),
            },
          },
        ],
        [
          {
            name: 'stickyHeader',
            config: {
              type: 'CheckboxControl',
              label: t('Intestazione fissa'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mantiene visibili le intestazioni delle colonne durante lo scorrimento.',
              ),
            },
          },
        ],
        [
          {
            name: 'enableSearch',
            config: {
              type: 'CheckboxControl',
              label: t('Abilita la ricerca nell\'albero'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mostra una barra di ricerca per filtrare i nodi della gerarchia.',
              ),
            },
          },
        ],
        [
          {
            name: 'enableHierarchicalSort',
            config: {
              type: 'CheckboxControl',
              label: t('Abilita l\'ordinamento nei rami'),
              renderTrigger: true,
              default: true,
              description: t(
                'Consente di ordinare i nodi all\'interno del proprio ramo cliccando sull\'intestazione di una metrica.',
              ),
            },
          },
          {
            name: 'enableExport',
            config: {
              type: 'CheckboxControl',
              label: t('Abilita l\'esportazione CSV'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mostra il pulsante per scaricare la gerarchia in CSV, con livelli e subtotali.',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Ordinamento'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'defaultSortColumn',
            config: {
              type: 'SelectControl',
              label: t('Colonna di ordinamento predefinita'),
              default: '__hierarchy_tree__',
              renderTrigger: true,
              freeForm: true,
              choices: [
                ['__hierarchy_tree__', t('Nome nella gerarchia')],
              ],
              mapStateToProps: (explore: any) => {
                const rawMetrics = explore?.controls?.metrics?.value || explore?.controls?.metric?.value || [];
                const metrics = Array.isArray(rawMetrics) ? rawMetrics : rawMetrics ? [rawMetrics] : [];
                const names: string[] = metrics.map((m: any) =>
                  typeof m === 'string' ? m : m?.label || m?.metric_name || String(m),
                );
                // A current-period metric `x_corr` offers its derived `delta_x_pct` expression.
                const deltas = names
                  .map(n => n.match(/^(.+)_corr$/)?.[1])
                  .filter(Boolean)
                  .map(b => `delta_${b}_pct`);
                return {
                  choices: [
                    ['__hierarchy_tree__', t('Nome nella gerarchia')],
                    ['__tree_level__', t('Livello nell\'albero')],
                    ['__leaf_count__', t('Numero di foglie')],
                    ...[...names, ...deltas].map(v => [v, v]),
                  ],
                };
              },
              description: t(
                'Nome della gerarchia, struttura, metrica o variazione percentuale usata per l\'ordinamento iniziale.',
              ),
            },
          },
          {
            name: 'defaultSortOrder',
            config: {
              type: 'SelectControl',
              label: t('Direzione di ordinamento predefinita'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('Ordine della query')],
                ['asc', t('Crescente (A-Z)')],
                ['desc', t('Decrescente (Z-A)')],
              ],
              description: t(
                'Direzione dell\'ordinamento al caricamento del grafico.',
              ),
            },
          },
          {
            name: 'nullHandling',
            config: {
              type: 'SelectControl',
              label: t('Valori vuoti'),
              description: t(
                'Dove collocare nell\'ordinamento le righe con valore vuoto.',
              ),
              default: 'bottom',
              renderTrigger: true,
              choices: [
                ['bottom', t('In fondo')],
                ['top', t('In cima')],
                ['exclude', t('Escludi')],
              ],
            },
          },
        ],
      ],
    },
    {
      label: t('Evidenziazione dei valori'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'minMaxDisplayMode',
            config: {
              type: 'SelectControl',
              label: t('Evidenziazione di minimo e massimo'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('Disattivata')],
                ['badges', t('Etichette MIN e MAX')],
                ['heatmap', t('Heatmap a gradiente nelle celle')],
                ['diverging_heatmap', t('Heatmap divergente (3 colori continui)')],
                ['data_bars', t('Barre dati nelle celle')],
                ['bipolar_data_bars', t('Barre dati bipolari (centrate sullo zero)')],
              ],
              description: t(
                'Stile grafico per evidenziare i valori minimo e massimo di ogni colonna.',
              ),
            },
          },
          {
            name: 'minMaxScope',
            config: {
              type: 'SelectControl',
              label: t('Nodi considerati per minimo e massimo'),
              default: 'leaves_only',
              renderTrigger: true,
              choices: [
                ['leaves_only', t('Solo foglie (consigliato)')],
                ['level_aware', t('Per livello della gerarchia')],
                ['all_nodes', t('Tutti i nodi, escluso il totale generale')],
              ],
              description: t(
                'Insieme di nodi su cui calcolare minimo e massimo. Limitarsi alle foglie evita che i totali dei padri falsino la scala.',
              ),
            },
          },
        ],
        [
          {
            name: 'heatmapPalette',
            config: {
              type: 'SelectControl',
              label: t('Palette della heatmap divergente'),
              default: 'red_white_green',
              renderTrigger: true,
              choices: [
                ['red_white_green', t('Rosso, bianco, verde')],
                ['red_yellow_green', t('Rosso, giallo, verde')],
                ['blue_white_red', t('Blu, bianco, rosso (adatta ai daltonici)')],
                ['custom', t('Colori del tema personalizzato')],
              ],
              description: t(
                'Palette continua a 3 colori per la heatmap divergente.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.minMaxDisplayMode?.value === 'diverging_heatmap',
            },
          },
          {
            name: 'divergingMidpoint',
            config: {
              type: 'TextControl',
              label: t('Valore centrale della heatmap divergente (facoltativo)'),
              default: '',
              renderTrigger: true,
              description: t(
                'Valore numerico del colore neutro (per esempio 0 o 100). Se vuoto, è 0 quando l\'intervallo contiene valori negativi e positivi, altrimenti la media tra minimo e massimo.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                controls?.minMaxDisplayMode?.value === 'diverging_heatmap',
            },
          },
        ],
        [
          {
            name: 'conditionalFormatting',
            config: {
              type: ConditionalFormattingEditor,
              label: t('Regole di formattazione condizionale'),
              default: [],
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Colora i valori che soddisfano una condizione. Vince la regola con la priorità più bassa: la 1 è verde, la 2 ambra, dalla 3 in poi rossa. Le espressioni regolari troppo lunghe o complesse non vengono applicate.',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Formato e tema'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'numberFormat',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Formato dei numeri'),
              renderTrigger: true,
              default: 'SMART_NUMBER',
              choices: CUSTOM_D3_FORMAT_OPTIONS || D3_FORMAT_OPTIONS,
              description: t(
                'Stringa di formato D3 per i valori numerici delle metriche.',
              ),
            },
          },
        ],
        [
          {
            name: 'currencySymbol',
            config: {
              type: 'TextControl',
              label: t('Simbolo di valuta (prefisso)'),
              renderTrigger: true,
              default: '',
              description: t(
                'Prefisso facoltativo per le metriche, per esempio €, $ o £.',
              ),
            },
          },
        ],
        [
          {
            name: 'stripedRows',
            config: {
              type: 'CheckboxControl',
              label: t('Righe a strisce alternate'),
              renderTrigger: true,
              default: true,
              description: t(
                'Colore di sfondo alternato per leggere più facilmente.',
              ),
            },
          },
        ],
        [
          {
            name: 'compactMode',
            config: {
              type: 'CheckboxControl',
              label: t('Righe compatte'),
              renderTrigger: true,
              default: false,
              description: t(
                'Riduce l\'altezza delle righe per mostrare più dati.',
              ),
            },
          },
        ],
        [
          {
            name: 'themeProfile',
            config: {
              type: 'SelectControl',
              label: t('Palette dei colori'),
              renderTrigger: true,
              default: 'standard',
              choices: [
                ['standard', t('Standard (verde acqua)')],
                ['colorblind', t('Adatta ai daltonici (blu)')],
                ['stratum-warm', t('Stratum caldo (tramonto)')],
                ['stratum-cool', t('Stratum freddo (smeraldo)')],
                ['custom', t('Colori personalizzati')],
              ],
              description: t(
                'Colori di etichette MIN e MAX, heatmap e barre dati.',
              ),
            },
          },
        ],
        [customHexControl('customPositiveHex', t('Etichetta positiva o MAX'))],
        [customHexControl('customNegativeHex', t('Etichetta negativa o MIN'))],
        [customHexControl('customNeutralHex', t('Neutro e barre dati'))],
      ],
    },
    {
      label: t('Confronto nel tempo'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'showVarianceDelta',
            config: {
              type: 'CheckboxControl',
              label: t('Mostra le variazioni rispetto al periodo (Δ %)'),
              renderTrigger: true,
              default: false,
              description: t(
                'Mostra accanto ai valori numerici le etichette di variazione rispetto al periodo precedente.',
              ),
            },
          },
          {
            name: 'showVarianceBadges',
            config: {
              type: 'CheckboxControl',
              label: t('Mostra le etichette Δ % accanto ai valori'),
              renderTrigger: true,
              default: true,
              description: t(
                'Se disattivata, la variazione resta solo nelle colonne Δ % e i valori assoluti non portano il simbolo di percentuale.',
              ),
            },
          },
          {
            name: 'showPeriodInMetricLabel',
            config: {
              type: 'CheckboxControl',
              label: t("Mostra l'arco temporale accanto alle metriche"),
              renderTrigger: true,
              default: false,
              description: t(
                'Scrive accanto al nome di ogni metrica il periodo che copre, accanto alle colonne di confronto quello con cui sono misurate e sulle colonne delta entrambi.',
              ),
            },
          },
          {
            name: 'timeGrain',
            config: {
              type: 'SelectControl',
              label: t('Granularità del confronto'),
              default: 'year',
              renderTrigger: true,
              choices: [
                ['auto', t('Automatica (dedotta dai dati)')],
                ['day', t('Giorno (DoD, giorno su giorno)')],
                ['week', t('Settimana (WoW, settimana su settimana)')],
                ['month', t('Mese (MoM, mese su mese)')],
                ['quarter', t('Trimestre (QoQ, trimestre su trimestre)')],
                ['year', t('Anno (YoY, anno su anno)')],
              ],
              description: t(
                'Durata del periodo usato per le variazioni. I periodi derivano dai valori della colonna pivot (YYYY, YYYY-Qn, YYYY-MM, YYYY-MM-DD, timestamp).',
              ),
              visibility: isComparisonVisible,
            },
          },
        ],
        [
          {
            name: 'referencePeriod',
            config: {
              type: 'SelectControl',
              label: t('Periodo di riferimento'),
              default: 'current',
              renderTrigger: true,
              choices: [
                ['current', t('Periodo corrente')],
                ['previous', t('Periodo precedente concluso')],
                ['ytd', t('Da inizio anno (YTD)')],
              ],
              description: t(
                'Base dell\'ultimo periodo: il periodo stesso (nessuna variazione), il periodo precedente o la media da inizio anno.',
              ),
              visibility: (state: { controls: any }) =>
                isComparisonVisible(state) &&
                (state.controls?.comparisonType?.value ?? 'prev_period') === 'prev_period',
            },
          },
          {
            name: 'comparisonType',
            config: {
              type: 'SelectControl',
              label: t('Base di confronto'),
              default: 'prev_period',
              renderTrigger: true,
              choices: [
                ['prev_period', t('Periodo immediatamente precedente (DoD, WoW, MoM, YoY)')],
                ['prev_year_same_period', t('Stesso periodo dell\'anno scorso')],
                ['budget_target', t('Budget o obiettivo pianificato')],
              ],
              description: t(
                'Termine di paragone per la variazione dell\'ultimo periodo. "Budget o obiettivo" usa l\'obiettivo corrispondente definito in "Obiettivi, definizioni e calcoli".',
              ),
              visibility: isComparisonVisible,
            },
          },
        ],
        [
          {
            name: 'pivotTimeDeltaMode',
            config: {
              type: 'SelectControl',
              label: t('Delta automatico tra colonne pivot'),
              default: 'none',
              renderTrigger: true,
              choices: [
                ['none', t('Nessun delta automatico')],
                ['absolute', t('Delta assoluto (valore meno periodo precedente)')],
                ['percentage', t('Delta percentuale (differenza diviso periodo precedente)')],
                ['both', t('Entrambi (delta assoluto e percentuale)')],
              ],
              description: t(
                'Calcola il delta rispetto al periodo precedente lungo le colonne pivot, senza window function SQL.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }),
            },
          },
          {
            name: 'pivotTimeDeltaLag',
            config: {
              type: 'SelectControl',
              label: t('Distanza del periodo di confronto'),
              default: 1,
              renderTrigger: true,
              choices: [
                [1, t('1 periodo (mese precedente, anno precedente)')],
                [2, t('2 periodi')],
                [3, t('3 periodi (trimestre precedente)')],
                [12, t('12 periodi (stesso mese dell\'anno precedente)')],
              ],
              description: t(
                'Quanti periodi indietro usare come termine di confronto per il delta.',
              ),
              visibility: ({ controls }: { controls: any }) =>
                hasPivotColumns({ controls }) &&
                controls?.pivotTimeDeltaMode?.value !== 'none',
            },
          },
        ],
      ],
    },
    {
      label: t('Obiettivi, definizioni e calcoli'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'goals',
            config: {
              type: GoalsEditor,
              label: t('Obiettivi per metrica'),
              default: '',
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Un obiettivo per metrica. Ogni cella della metrica mostra lo scostamento dall\'obiettivo e uno stato: raggiunto (almeno 100%), in linea (almeno 90%), a rischio (almeno 75%) o mancato. Vale il primo obiettivo di ogni metrica.',
              ),
            },
          },
        ],
        [
          {
            name: 'metricDefinitions',
            config: {
              type: MetricDefinitionsEditor,
              label: t('Definizioni delle metriche'),
              default: '',
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Dichiara cosa significa ogni metrica, al posto delle deduzioni dal nome: somma, media, conteggio distinto, rapporto, variazione percentuale, differenza o vuota sui nodi padre. Per i rapporti, padri e totali sono un rapporto di somme. Vale la prima definizione di ogni metrica.',
              ),
            },
          },
        ],
        [
          {
            name: 'tableCalculations',
            config: {
              type: TableCalculationsEditor,
              label: t('Calcoli di tabella e modificatori di misura'),
              default: '',
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Aggiunge percentuali, totali cumulati, differenze dal precedente o posizioni, in una colonna affiancata o al posto della metrica. Il modo di visualizzazione si sceglie per ogni calcolo.',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Privacy sui piccoli numeri'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'suppressionThreshold',
            config: {
              type: 'TextControl',
              isInt: true,
              label: t('Nascondi i conteggi sotto la soglia'),
              default: 0,
              renderTrigger: true,
              description: t(
                'Nasconde i conteggi da 1 fino a questo valore meno 1 (0 disattiva la funzione; 5 o 10 sono valori usuali per i dati sanitari pubblicati). Rapporti e delta costruiti su un conteggio nascosto sono nascosti a loro volta, e il valore nascosto non arriva mai a ordinamento, colori ed esportazione CSV.',
              ),
            },
          },
        ],
        [
          {
            name: 'suppressionMetrics',
            config: {
              type: MetricListPicker,
              label: t('Metriche da proteggere'),
              default: '',
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Metriche di conteggio soggette alla soppressione, separate da virgola, per esempio casi, ricoveri.',
              ),
              visibility: ({ controls }: { controls: any }) => Number(controls?.suppressionThreshold?.value) > 0,
            },
          },
        ],
        [hintControl('hint_suppression', suppressionHint)],
        [
          {
            name: 'complementarySuppression',
            config: {
              type: 'CheckboxControl',
              label: t('Soppressione complementare'),
              default: true,
              renderTrigger: true,
              description: t(
                'Nasconde anche il più piccolo tra i valori visibili affiancati a una cella nascosta isolata, così il valore nascosto non si ricava per sottrazione dal totale del padre.',
              ),
              visibility: ({ controls }: { controls: any }) => Number(controls?.suppressionThreshold?.value) > 0,
            },
          },
          {
            name: 'suppressionLabel',
            config: {
              type: 'TextControl',
              label: t('Testo delle celle nascoste'),
              default: '<{k}',
              renderTrigger: true,
              description: t(
                'Testo mostrato al posto del valore nascosto; {k} viene sostituito dalla soglia.',
              ),
              visibility: ({ controls }: { controls: any }) => Number(controls?.suppressionThreshold?.value) > 0,
            },
          },
        ],
      ],
    },
    {
      label: t('Trend e interazioni'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'showSparklines',
            config: {
              type: 'CheckboxControl',
              label: t('Mostra le sparkline di tendenza'),
              default: false,
              renderTrigger: true,
              description: t(
                'Con esattamente una colonna pivot (i periodi), aggiunge per ogni metrica una colonna Tendenza con una linea sui periodi in ordine cronologico.',
              ),
            },
          },
          {
            name: 'sparklineMetrics',
            config: {
              type: MetricListPicker,
              label: t('Metriche con sparkline'),
              default: '',
              renderTrigger: true,
              ...followsChartColumns,
              description: t(
                'Metriche, separate da virgola, che ricevono la colonna di tendenza; se vuoto, tutte le metriche.',
              ),
              visibility: ({ controls }: { controls: any }) => Boolean(controls?.showSparklines?.value),
            },
          },
        ],
        [hintControl('hint_sparklines', sparklineHint)],
        [
          {
            name: 'emit_filter',
            config: {
              type: 'CheckboxControl',
              label: t('Invia filtri incrociati alla dashboard'),
              renderTrigger: true,
              default: true,
              description: t(
                'Invia filtri interattivi agli altri grafici della dashboard quando si clicca su un nodo dell\'albero o su un valore di dimensione.',
              ),
            },
          },
          {
            name: 'enableContextMenu',
            config: {
              type: 'CheckboxControl',
              label: t('Abilita il menu contestuale'),
              renderTrigger: true,
              default: true,
              description: t(
                'Mostra il menu con il tasto destro per approfondire il dettaglio, esplorare per dimensione e applicare filtri incrociati.',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Prestazioni'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'pageSize',
            config: {
              type: 'SliderControl',
              label: t('Righe per pagina'),
              description: t(
                'Numero di righe mostrate per pagina.',
              ),
              default: 100,
              min: 50,
              max: 2000,
              step: 50,
              renderTrigger: true,
            },
          },
          {
            name: 'virtualizationThreshold',
            config: {
              type: 'TextControl',
              isInt: true,
              label: t('Virtualizza oltre questo numero di righe'),
              description: t(
                'Oltre questo numero di righe la tabella carica solo quelle visibili, per restare fluida.',
              ),
              default: 500,
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

withSettingsLevel(config.controlPanelSections);

export default config;
