import { isValidElement } from 'react';
import controlPanel from '../src/plugin/controlPanel';
import { HINT_PREFIX } from '../src/plugin/controls/hints';

type Row = unknown[];
type Section = {
  label: string;
  expanded?: boolean;
  tabOverride?: string;
  visibility?: (props: { controls: Record<string, { value: unknown }> }) => boolean;
  controlSetRows: Row[];
};

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
const EXPECTED_LAYOUT: {
  label: string;
  tab: 'data' | 'customize';
  expanded: boolean;
  controls: string[];
}[] = [
  {
    label: 'Struttura della gerarchia',
    tab: 'data',
    expanded: true,
    controls: [
      'settingsLevel',
      'hierarchyType',
      'groupby',
      'columns',
      'idColumn',
      'parentIdColumn',
      'labelColumn',
    ],
  },
  {
    label: 'Metriche',
    tab: 'data',
    expanded: true,
    controls: ['metrics', 'aggregationMode', 'weightColumn', 'metricSettings'],
  },
  {
    label: 'Opzioni delle colonne pivot',
    tab: 'data',
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
    tab: 'data',
    expanded: false,
    controls: ['adhoc_filters', 'row_limit', 'dimensionLimits'],
  },
  {
    label: 'Albero e navigazione',
    tab: 'customize',
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
    tab: 'customize',
    expanded: false,
    controls: ['defaultSortColumn', 'defaultSortOrder', 'nullHandling'],
  },
  {
    label: 'Evidenziazione dei valori',
    tab: 'customize',
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
    tab: 'customize',
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
    tab: 'customize',
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
    tab: 'customize',
    expanded: false,
    controls: ['goals', 'metricDefinitions', 'tableCalculations'],
  },
  {
    label: 'Privacy sui piccoli numeri',
    tab: 'customize',
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
    tab: 'customize',
    expanded: false,
    controls: ['showSparklines', 'sparklineMetrics', 'emit_filter', 'enableContextMenu'],
  },
  {
    label: 'Prestazioni',
    tab: 'customize',
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

// Hint controls only show a message; they are not settings and carry no chart value.
const namesIn = (section: Section): string[] =>
  section.controlSetRows
    .flat()
    .map(controlName)
    .filter((n): n is string => n !== null && !n.startsWith(HINT_PREFIX));

const allNames = (): string[] => sections.flatMap(namesIn);

// Same rule as Superset 6.1.0 (ControlPanelsContainer): a section goes to the Data tab when it is
// forced there or holds an object control that is not renderTrigger. String controls such as
// 'row_limit' and 'adhoc_filters' do not count. Every other section goes to the Customize tab.
const tabOf = (section: Section): 'data' | 'customize' => {
  if (section.tabOverride === 'data') return 'data';
  const forcesData = section.controlSetRows.flat().some(item => {
    if (!item || typeof item !== 'object' || isValidElement(item) || !('config' in item)) {
      return false;
    }
    const config = (item as { config?: Record<string, unknown> }).config;
    return Boolean(config) && (!config?.renderTrigger || config?.tabOverride === 'data');
  });
  return forcesData ? 'data' : 'customize';
};

describe('controlPanel layout', () => {
  it('exposes the thirteen topic sections in canonical order', () => {
    expect(sections.map(s => s.label)).toEqual(EXPECTED_LAYOUT.map(s => s.label));
  });

  it('places every control in its topic section, in order', () => {
    expect(sections.map(namesIn)).toEqual(EXPECTED_LAYOUT.map(s => s.controls));
  });

  it('shows the query sections in the Data tab and the display sections in Customize', () => {
    expect(sections.map(tabOf)).toEqual(EXPECTED_LAYOUT.map(s => s.tab));
  });

  // The pivot options mean nothing without pivot columns: Superset hides the whole section then.
  describe('pivot options section visibility', () => {
    const pivotSection = (): Section => {
      const found = sections.find(s => s.label === 'Opzioni delle colonne pivot');
      if (!found?.visibility) throw new Error('Pivot options section has no visibility rule');
      return found;
    };
    const visibleWith = (hierarchyType: string, columns: unknown[]): boolean =>
      pivotSection().visibility!({
        controls: { hierarchyType: { value: hierarchyType }, columns: { value: columns } },
      });

    it('shows the section when pivot columns are chosen in multi-dimension mode', () => {
      expect(visibleWith('multi_dimension', ['anno'])).toBe(true);
    });

    it('hides the section when no pivot column is chosen', () => {
      expect(visibleWith('multi_dimension', [])).toBe(false);
    });

    it('hides the section in parent-child mode even if pivot columns are stored', () => {
      expect(visibleWith('parent_child', ['anno'])).toBe(false);
    });
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

const ADDED_IN_PHASE_2 = ['settingsLevel', 'metricSettings'];

const controlItems = (): ControlItem[] =>
  sections
    .flatMap(s => s.controlSetRows.flat())
    .filter((item): item is ControlItem => {
      const name = controlName(item);
      return name !== null && !name.startsWith(HINT_PREFIX) && !ADDED_IN_PHASE_2.includes(name);
    });

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
  it('keeps the type, default and renderTrigger of every pre-existing control', () => {
    const contract = controlItems()
      .map(item => {
        if (typeof item === 'string') return { name: item };
        const config = item.config ?? {};
        return {
          name: item.name,
          type: describeType(config.type),
          default: config.default === undefined ? 'inherited' : config.default,
          renderTrigger: config.renderTrigger ?? 'inherited',
        };
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    expect(contract).toMatchSnapshot();
  });
});
