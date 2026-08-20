import {
  ControlPanelConfig,
  sharedControls,
  D3_FORMAT_OPTIONS,
} from '@superset-ui/chart-controls';

const t = (str: string) => str;

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
      label: t('Query Configuration'),
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
              label: t('Hierarchy Dimensions (in order)'),
              description: t('Select dimensions from highest to lowest level of hierarchy (e.g. Region > Country > City).'),
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
        ['row_limit'],
      ],
    },
    {
      label: t('Hierarchy & Tree Display Options'),
      expanded: true,
      controlSetRows: [
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
            name: 'indentSize',
            config: {
              type: 'SliderControl',
              label: t('Tree Indentation Size (px)'),
              renderTrigger: true,
              min: 8,
              max: 48,
              step: 4,
              default: 20,
              description: t('Pixel indentation per hierarchy depth level.'),
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
          {
            name: 'stickyFirstColumn',
            config: {
              type: 'CheckboxControl',
              label: t('Sticky Hierarchy Column'),
              renderTrigger: true,
              default: true,
              description: t('Keep the tree hierarchy column fixed horizontally.'),
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
      label: t('Formatting & Aesthetics'),
      expanded: false,
      controlSetRows: [
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
  ],
};

export default config;
