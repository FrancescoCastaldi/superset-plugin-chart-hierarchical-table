import { isValidElement, ReactElement } from 'react';
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

const elementText = (el: ReactElement): string => {
  const { children } = el.props as { children?: unknown };
  return Array.isArray(children) ? children.join('') : String(children ?? '');
};

// Sub-group headings are plain React elements placed as single-item rows.
const subsectionHeadings = (section: Section): string[] =>
  section.controlSetRows
    .flat()
    .filter((item): item is ReactElement => isValidElement(item) && item.type !== 'hr')
    .map(elementText);

const sectionByLabel = (label: string): Section => {
  const found = sections.find(s => s.label === label);
  if (!found) throw new Error(`Missing section ${label}`);
  return found;
};

describe('controlPanel layout', () => {
  it('exposes exactly the four macro-sections in canonical order', () => {
    expect(sections.map(s => s.label)).toEqual([
      'Data',
      'Customize',
      'Comparison & Analysis',
      'Performance & Limits',
    ]);
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

  it('groups the former Customize sections under sub-section headings in order', () => {
    expect(subsectionHeadings(sectionByLabel('Customize'))).toEqual([
      'Hierarchy & Tree Display Options',
      'Sorting & Conditional Formatting',
      'Formatting & Aesthetics',
    ]);
  });

  it('groups time comparison and rollup controls under Comparison & Analysis', () => {
    expect(subsectionHeadings(sectionByLabel('Comparison & Analysis'))).toEqual([
      'Time Comparison & Period-over-Period Variance',
      'Advanced Rollup Calculations',
    ]);
  });

  it('places each former section control set in its new macro-section', () => {
    const data = namesIn(sectionByLabel('Data'));
    expect(data).toEqual(
      expect.arrayContaining(['hierarchyType', 'groupby', 'columns', 'metrics', 'adhoc_filters']),
    );
    expect(data).not.toContain('row_limit');

    const customize = namesIn(sectionByLabel('Customize'));
    expect(customize).toEqual(
      expect.arrayContaining([
        'initialExpandDepth',
        'enableExport',
        'defaultSortColumn',
        'minMaxScope',
        'numberFormat',
        'stripedRows',
      ]),
    );

    const comparison = namesIn(sectionByLabel('Comparison & Analysis'));
    expect(comparison).toEqual(
      expect.arrayContaining([
        'showVarianceDelta',
        'timeGrain',
        'referencePeriod',
        'comparisonType',
        'aggregationMode',
        'emit_filter',
      ]),
    );

    expect(namesIn(sectionByLabel('Performance & Limits'))).toContain('row_limit');
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
