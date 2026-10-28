import { isValidElement } from 'react';
import controlPanel from '../src/plugin/controlPanel';

type Row = unknown[];
type Section = { label: string; expanded?: boolean; controlSetRows: Row[] };

const sections = controlPanel.controlPanelSections as Section[];

// Every control name declared by controlPanel.tsx at baseline commit 8489246.
const BASELINE_CONTROL_NAMES = [
  'hierarchyType',
  'groupby',
  'columns',
  'combineMetric',
  'pivotSortOrder',
  'pivotRowTotalsPosition',
  'pivotRowTotalsLabel',
  'showPivotColumnSubtotals',
  'pivotColumnSubtotalLabel',
  'pivotTimeDeltaMode',
  'pivotTimeDeltaLag',
  'idColumn',
  'parentIdColumn',
  'labelColumn',
  'metrics',
  'adhoc_filters',
  'row_limit',
  'initialExpandDepth',
  'valueDisplayMode',
  'showSubtotals',
  'showGrandTotal',
  'stickyHeader',
  'enableSearch',
  'compactMode',
  'enableHierarchicalSort',
  'enableExport',
  'defaultSortColumn',
  'defaultSortOrder',
  'minMaxDisplayMode',
  'minMaxScope',
  'showVarianceDelta',
  'timeGrain',
  'referencePeriod',
  'comparisonType',
  'aggregationMode',
  'emit_filter',
  'numberFormat',
  'currencySymbol',
  'stripedRows',
];

// The control panel is grouped by topic: one section per subject, in the order the user meets them.
const EXPECTED_LAYOUT: { label: string; expanded: boolean; controls: string[] }[] = [
  {
    label: 'Struttura della gerarchia',
    expanded: true,
    controls: ['hierarchyType', 'groupby', 'columns', 'idColumn', 'parentIdColumn', 'labelColumn'],
  },
  {
    label: 'Metriche',
    expanded: true,
    controls: ['metrics', 'aggregationMode', 'weightColumn'],
  },
  {
    label: 'Opzioni delle colonne pivot',
    expanded: false,
    controls: [
      'combineMetric',
      'pivotSortOrder',
      'pivotRowTotalsPosition',
      'pivotRowTotalsLabel',
      'showPivotColumnSubtotals',
      'pivotColumnSubtotalLabel',
    ],
  },
  {
    label: 'Filtri e limiti',
    expanded: false,
    controls: ['adhoc_filters', 'row_limit', 'dimensionLimits'],
  },
  {
    label: 'Albero e navigazione',
    expanded: true,
    controls: [
      'initialExpandDepth',
      'valueDisplayMode',
      'showSubtotals',
      'showGrandTotal',
      'stickyHeader',
      'enableSearch',
      'enableHierarchicalSort',
      'enableExport',
    ],
  },
  {
    label: 'Ordinamento',
    expanded: false,
    controls: ['defaultSortColumn', 'defaultSortOrder', 'nullHandling'],
  },
  {
    label: 'Evidenziazione dei valori',
    expanded: false,
    controls: [
      'minMaxDisplayMode',
      'minMaxScope',
      'heatmapPalette',
      'divergingMidpoint',
      'conditionalFormatting',
    ],
  },
  {
    label: 'Formato e tema',
    expanded: false,
    controls: [
      'numberFormat',
      'currencySymbol',
      'stripedRows',
      'compactMode',
      'themeProfile',
      'customPositiveHex',
      'customNegativeHex',
      'customNeutralHex',
    ],
  },
  {
    label: 'Confronto nel tempo',
    expanded: false,
    controls: [
      'showVarianceDelta',
      'timeGrain',
      'referencePeriod',
      'comparisonType',
      'pivotTimeDeltaMode',
      'pivotTimeDeltaLag',
    ],
  },
  {
    label: 'Obiettivi, definizioni e calcoli',
    expanded: false,
    controls: ['goals', 'metricDefinitions', 'tableCalculations'],
  },
  {
    label: 'Privacy sui piccoli numeri',
    expanded: false,
    controls: [
      'suppressionThreshold',
      'suppressionMetrics',
      'complementarySuppression',
      'suppressionLabel',
    ],
  },
  {
    label: 'Trend e interazioni',
    expanded: false,
    controls: ['showSparklines', 'sparklineMetrics', 'emit_filter', 'enableContextMenu'],
  },
  {
    label: 'Prestazioni',
    expanded: false,
    controls: ['pageSize', 'virtualizationThreshold'],
  },
];

const controlName = (item: unknown): string | null => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && !isValidElement(item) && 'name' in item) {
    return String((item as { name: unknown }).name);
  }
  return null;
};

const namesIn = (section: Section): string[] =>
  section.controlSetRows.flat().map(controlName).filter((n): n is string => n !== null);

const allNames = (): string[] => sections.flatMap(namesIn);

describe('controlPanel layout', () => {
  it('exposes the thirteen topic sections in canonical order', () => {
    expect(sections.map(s => s.label)).toEqual(EXPECTED_LAYOUT.map(s => s.label));
  });

  it('places every control in its topic section, in order', () => {
    expect(sections.map(namesIn)).toEqual(EXPECTED_LAYOUT.map(s => s.controls));
  });

  it('opens only the essential sections by default', () => {
    expect(sections.map(s => Boolean(s.expanded))).toEqual(EXPECTED_LAYOUT.map(s => s.expanded));
  });

  it('keeps sections as a flat array without nested section data', () => {
    sections.forEach(section => {
      expect(Array.isArray(section.controlSetRows)).toBe(true);
      expect(section).not.toHaveProperty('controlPanelSections');
      section.controlSetRows.flat().forEach(item => {
        if (item && typeof item === 'object' && !isValidElement(item)) {
          expect(item).not.toHaveProperty('controlSetRows');
        }
      });
    });
  });

  it('uses section titles instead of sub-section headings inside a section', () => {
    sections.forEach(section => {
      expect(section.controlSetRows.flat().filter(item => isValidElement(item))).toEqual([]);
    });
  });

  it('preserves every baseline control name exactly once', () => {
    const names = allNames();
    BASELINE_CONTROL_NAMES.forEach(name => {
      expect(names.filter(n => n === name)).toHaveLength(1);
    });
  });

  it('declares every control name only once across all sections', () => {
    const names = allNames();
    expect(new Set(names).size).toBe(names.length);
  });
});

type ControlItem = { name?: string; config?: Record<string, unknown> } | string;

const controlItems = (): ControlItem[] =>
  sections
    .flatMap(s => s.controlSetRows.flat())
    .filter((item): item is ControlItem => controlName(item) !== null);

const describeType = (type: unknown): string => {
  if (typeof type === 'function') return `component:${type.name}`;
  return String(type ?? 'inherited');
};

describe('controlPanel characterization before the UX refactor', () => {
  // Order and grouping change on purpose in the regrouping phase: update this snapshot there.
  it('keeps the current section and control order', () => {
    const order = sections.map(section => ({
      section: section.label,
      controls: namesIn(section),
    }));
    expect(order).toMatchSnapshot();
  });

  // Location independent: whatever section a control moves to, its contract must not change.
  it('keeps the type, default and renderTrigger of every control', () => {
    const contract = controlItems()
      .map(item => {
        if (typeof item === 'string') return { name: item };
        const config = item.config ?? {};
        return {
          name: item.name,
          type: describeType(config.type),
          default: config.default === undefined ? 'inherited' : config.default,
          renderTrigger: config.renderTrigger ?? 'inherited',
          hasVisibility: typeof config.visibility === 'function',
        };
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    expect(contract).toMatchSnapshot();
  });
});
