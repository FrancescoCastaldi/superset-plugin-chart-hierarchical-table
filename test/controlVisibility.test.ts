import controlPanel from '../src/plugin/controlPanel';
import {
  BASIC_CONTROL_NAMES,
  FOLLOWS,
  SETTINGS_LEVEL,
  isAdvancedVisible,
  isDefaultValue,
} from '../src/plugin/controlVisibility';
import { HINT_PREFIX } from '../src/plugin/controls/hints';

type Controls = Record<string, { value?: unknown }>;
type Item = { name: string; config: Record<string, any> };
type Section = {
  label: string;
  visibility?: (props: { controls: Controls }, controls: Controls) => boolean;
  controlSetRows: unknown[][];
};

const sections = controlPanel.controlPanelSections as Section[];

const objectItems = (): Item[] =>
  sections
    .flatMap(s => s.controlSetRows.flat())
    .filter((i): i is Item => Boolean(i) && typeof i === 'object' && 'config' in (i as object));

const stringItems = (): string[] =>
  sections.flatMap(s => s.controlSetRows.flat()).filter((i): i is string => typeof i === 'string');

// A fresh chart: every control holds its default value.
const freshControls = (level: 'basic' | 'advanced' = 'basic', overrides: Controls = {}): Controls => {
  const controls: Controls = {};
  objectItems().forEach(({ name, config }) => {
    controls[name] = { value: config.default };
  });
  controls[SETTINGS_LEVEL] = { value: level };
  return { ...controls, ...overrides };
};

const itemVisible = (item: Item, controls: Controls): boolean =>
  item.config.visibility ? item.config.visibility({ controls }, controls) !== false : true;

const sectionVisible = (section: Section, controls: Controls): boolean =>
  section.visibility ? section.visibility({ controls }, controls) !== false : true;

// Visible settings of the panel, hint controls left out.
const visibleNames = (controls: Controls): string[] => {
  const names: string[] = [];
  sections.forEach(section => {
    if (!sectionVisible(section, controls)) return;
    section.controlSetRows.flat().forEach(item => {
      if (typeof item === 'string') names.push(item);
      else if (item && typeof item === 'object' && 'config' in (item as object)) {
        const control = item as Item;
        if (!control.name.startsWith(HINT_PREFIX) && itemVisible(control, controls)) {
          names.push(control.name);
        }
      }
    });
  });
  return names;
};

const visibleSections = (controls: Controls): string[] =>
  sections.filter(s => sectionVisible(s, controls)).map(s => s.label);

describe('isDefaultValue', () => {
  it('treats missing, null and empty values as the same empty default', () => {
    expect(isDefaultValue(undefined, '')).toBe(true);
    expect(isDefaultValue(null, '')).toBe(true);
    expect(isDefaultValue('', undefined)).toBe(true);
  });

  it('compares numbers, text and lists by content', () => {
    expect(isDefaultValue('0', 0)).toBe(true);
    expect(isDefaultValue(5, 0)).toBe(false);
    expect(isDefaultValue([], [])).toBe(true);
    expect(isDefaultValue(['a'], ['a'])).toBe(true);
    expect(isDefaultValue(['a'], [])).toBe(false);
    expect(isDefaultValue(true, false)).toBe(false);
  });
});

describe('isAdvancedVisible', () => {
  const defaults = { compactMode: false, aggregationMode: 'sum', weightColumn: '' };
  const level = (value: string, rest: Controls = {}): Controls => ({
    [SETTINGS_LEVEL]: { value },
    ...rest,
  });

  it('hides an untouched advanced control in basic mode', () => {
    expect(isAdvancedVisible(level('basic', { compactMode: { value: false } }), 'compactMode', defaults)).toBe(false);
  });

  it('keeps an advanced control visible once it holds a non-default value', () => {
    expect(isAdvancedVisible(level('basic', { compactMode: { value: true } }), 'compactMode', defaults)).toBe(true);
  });

  it('shows every advanced control in advanced mode', () => {
    expect(isAdvancedVisible(level('advanced', { compactMode: { value: false } }), 'compactMode', defaults)).toBe(true);
  });

  it('shows a dependent control while the control it follows is set', () => {
    const controls = level('basic', { aggregationMode: { value: 'weighted_avg' }, weightColumn: { value: '' } });
    expect(isAdvancedVisible(controls, 'weightColumn', defaults)).toBe(true);
    const untouched = level('basic', { aggregationMode: { value: 'sum' }, weightColumn: { value: '' } });
    expect(isAdvancedVisible(untouched, 'weightColumn', defaults)).toBe(false);
  });

  it('falls back to basic when the level is missing', () => {
    expect(isAdvancedVisible({ compactMode: { value: false } }, 'compactMode', defaults)).toBe(false);
  });
});

describe('settings level in the control panel', () => {
  it('defines the level selector first, defaulting to basic', () => {
    const first = sections[0].controlSetRows.flat()[0] as Item;
    expect(first.name).toBe(SETTINGS_LEVEL);
    expect(first.config.default).toBe('basic');
    expect(first.config.renderTrigger).toBe(true);
    expect(first.config.choices.map(([value]: [string]) => value)).toEqual(['basic', 'advanced']);
  });

  it('only classifies controls that exist in the panel', () => {
    const all = new Set([...objectItems().map(i => i.name), ...stringItems()]);
    [...BASIC_CONTROL_NAMES, ...Object.keys(FOLLOWS), ...Object.values(FOLLOWS)].forEach(name => {
      expect(all.has(name)).toBe(true);
    });
  });

  it('wraps the visibility of every advanced control', () => {
    const advanced = objectItems().filter(
      ({ name }) =>
        name !== SETTINGS_LEVEL &&
        !name.startsWith(HINT_PREFIX) &&
        !BASIC_CONTROL_NAMES.includes(name),
    );
    expect(advanced.length).toBeGreaterThan(30);
    expect(advanced.filter(i => typeof i.config.visibility !== 'function').map(i => i.name)).toEqual([]);
  });

  it('shows exactly the approved basic controls on a fresh chart', () => {
    expect([...visibleNames(freshControls())].sort()).toEqual(
      [SETTINGS_LEVEL, ...BASIC_CONTROL_NAMES].sort(),
    );
  });

  it('keeps the basic list at sixteen controls', () => {
    expect(BASIC_CONTROL_NAMES).toHaveLength(16);
  });

  it('shows the privacy threshold in basic mode, so health data publishers find it', () => {
    expect(BASIC_CONTROL_NAMES).toContain('suppressionThreshold');
    const names = visibleNames(freshControls());
    expect(names).toContain('suppressionThreshold');
    ['suppressionMetrics', 'complementarySuppression', 'suppressionLabel'].forEach(n => {
      expect(names).not.toContain(n);
    });
  });

  it('hides the sections made only of advanced controls in basic mode', () => {
    expect(visibleSections(freshControls())).toEqual([
      'Struttura della gerarchia',
      'Metriche',
      'Filtri e limiti',
      'Albero e navigazione',
      'Evidenziazione dei valori',
      'Formato e tema',
      'Confronto nel tempo',
      'Privacy sui piccoli numeri',
    ]);
  });

  it('shows the advanced controls and all sections in advanced mode', () => {
    const controls = freshControls('advanced', { columns: { value: ['anno'] } });
    const names = visibleNames(controls);
    ['compactMode', 'goals', 'pageSize', 'dimensionLimits', 'stickyHeader', 'nullHandling'].forEach(n => {
      expect(names).toContain(n);
    });
    expect(visibleSections(controls)).toHaveLength(sections.length);
  });

  it('keeps an advanced option visible when a saved chart already uses it', () => {
    const controls = freshControls('basic', { compactMode: { value: true } });
    expect(visibleNames(controls)).toContain('compactMode');
    expect(visibleSections(controls)).toContain('Formato e tema');
  });

  it('opens the dependent controls of a feature as soon as it is switched on', () => {
    const suppression = visibleNames(freshControls('basic', { suppressionThreshold: { value: 5 } }));
    ['suppressionThreshold', 'suppressionMetrics', 'complementarySuppression', 'suppressionLabel'].forEach(n => {
      expect(suppression).toContain(n);
    });
    expect(visibleNames(freshControls('basic', { aggregationMode: { value: 'weighted_avg' } }))).toEqual(
      expect.arrayContaining(['aggregationMode', 'weightColumn']),
    );
    expect(visibleNames(freshControls('basic', { showSparklines: { value: true } }))).toContain('sparklineMetrics');
    expect(visibleNames(freshControls('basic', { minMaxDisplayMode: { value: 'badges' } }))).toContain('minMaxScope');
    expect(
      visibleNames(freshControls('basic', { themeProfile: { value: 'custom' } })),
    ).toEqual(expect.arrayContaining(['customPositiveHex', 'customNegativeHex', 'customNeutralHex']));
    expect(visibleNames(freshControls('basic', { showVarianceDelta: { value: true } }))).toEqual(
      expect.arrayContaining(['timeGrain', 'referencePeriod', 'comparisonType']),
    );
  });

  it('keeps the existing visibility rules on top of the level rule', () => {
    // The pivot-only controls stay hidden in advanced mode until a pivot column is chosen.
    expect(visibleNames(freshControls('advanced'))).not.toContain('combineMetric');
    const withPivot = visibleNames(freshControls('advanced', { columns: { value: ['anno'] } }));
    expect(withPivot).toContain('combineMetric');
    // Parent-child columns only appear in parent-child mode.
    expect(visibleNames(freshControls('advanced'))).not.toContain('idColumn');
    expect(
      visibleNames(freshControls('advanced', { hierarchyType: { value: 'parent_child' } })),
    ).toContain('idColumn');
  });
});
