import { t, ControlPanelConfig, sections, D3_FORMAT_OPTIONS } from '@superset-ui/core';

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
              type: 'SelectControl',
              label: t('Hierarchy Dimensions (in order)'),
              multi: true,
              freeForm: true,
              canSelectAll: false,
              visibility: ({ controls }) => controls?.hierarchyType?.value === 'multi_dimension',
              description: t('Select dimensions from highest to lowest level of hierarchy.'),
            },
          },
        ],
        [
          {
            name: 'idColumn',
            config: {
              type: 'SelectControl',
              label: t('Node ID Column'),
              visibility: ({ controls }) => controls?.hierarchyType?.value === 'parent_child',
              description: t('Column containing the unique identifier of the node.'),
            },
          },
        ],
        [
          {
            name: 'parentIdColumn',
            config: {
              type: 'SelectControl',
              label: t('Parent ID Column'),
              visibility: ({ controls }) => controls?.hierarchyType?.value === 'parent_child',
              description: t('Column containing the identifier of the parent node.'),
            },
          },
        ],
        [
          {
            name: 'labelColumn',
            config: {
              type: 'SelectControl',
              label: t('Node Label Column (Optional)'),
              visibility: ({ controls }) => controls?.hierarchyType?.value === 'parent_child',
              description: t('Column containing the display name for the node.'),
            },
          },
        ],
        [
          {
            name: 'metrics',
            config: {
              type: 'MetricsControl',
              label: t('Metrics'),
              description: t('Metrics to calculate and display for each hierarchy level.'),
              multi: true,
              validators: [],
            },
          },
        ],
        [
          {
            name: 'adhoc_filters',
            config: {
              type: 'AdhocFilterControl',
              label: t('Filters'),
              default: [],
              description: t('Apply filters to dataset before hierarchy aggregation.'),
            },
          },
        ],
        [
          {
            name: 'row_limit',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Row limit'),
              default: 10000,
              choices: [
                [100, '100'],
                [1000, '1,000'],
                [5000, '5,000'],
                [10000, '10,000'],
                [50000, '50,000'],
              ],
            },
          },
        ],
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
              choices: D3_FORMAT_OPTIONS,
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
