import { HINT_PREFIX } from './controls/hints';

// The panel has two levels. Basic shows the essential settings; Advanced shows everything. The
// level is only a display choice: it never changes how the chart renders.
export const SETTINGS_LEVEL = 'settingsLevel';

export const BASIC_CONTROL_NAMES = [
  'hierarchyType',
  'groupby',
  'columns',
  'metrics',
  'adhoc_filters',
  'row_limit',
  'initialExpandDepth',
  'valueDisplayMode',
  'showSubtotals',
  'showGrandTotal',
  'enableSearch',
  'enableExport',
  'numberFormat',
  'minMaxDisplayMode',
  'showVarianceDelta',
  // Kept in basic mode on purpose: anyone publishing health data has to find the small-number rule.
  'suppressionThreshold',
];

// A setting that only matters once another one is on stays visible in basic mode while that other
// setting holds a non-default value, so switching a feature on reveals its options.
export const FOLLOWS: Record<string, string> = {
  weightColumn: 'aggregationMode',
  suppressionMetrics: 'suppressionThreshold',
  complementarySuppression: 'suppressionThreshold',
  suppressionLabel: 'suppressionThreshold',
  sparklineMetrics: 'showSparklines',
  pivotTimeDeltaLag: 'pivotTimeDeltaMode',
  minMaxScope: 'minMaxDisplayMode',
  heatmapPalette: 'minMaxDisplayMode',
  divergingMidpoint: 'minMaxDisplayMode',
  customPositiveHex: 'themeProfile',
  customNegativeHex: 'themeProfile',
  customNeutralHex: 'themeProfile',
  timeGrain: 'showVarianceDelta',
  referencePeriod: 'showVarianceDelta',
  comparisonType: 'showVarianceDelta',
};

type Controls = Record<string, { value?: unknown } | undefined> | undefined;

const comparable = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

// Missing, null and empty values all mean "not set"; 0 and '0' are the same number.
export const isDefaultValue = (value: unknown, defaultValue: unknown): boolean =>
  comparable(value) === comparable(defaultValue);

export function isAdvancedVisible(
  controls: Controls,
  name: string,
  defaults: Record<string, unknown>,
): boolean {
  if (controls?.[SETTINGS_LEVEL]?.value === 'advanced') return true;
  const changed = (control: string) =>
    !isDefaultValue(controls?.[control]?.value, defaults[control]);
  return changed(name) || (name in FOLLOWS && changed(FOLLOWS[name]));
}

type Item = { name: string; config: Record<string, any> };
type Section = { visibility?: (...args: any[]) => boolean; controlSetRows: unknown[][] };

const isControl = (item: unknown): item is Item =>
  Boolean(item) &&
  typeof item === 'object' &&
  'config' in (item as object) &&
  typeof (item as Item).name === 'string';

// Wraps, in place, the visibility of every advanced control and of every section so that basic
// mode hides what is advanced. Existing visibility rules keep applying on top of the level rule.
export function withSettingsLevel(sections: Section[]): void {
  const controls = sections.flatMap(s => s.controlSetRows.flat()).filter(isControl);
  const defaults = Object.fromEntries(controls.map(({ name, config }) => [name, config.default]));

  controls
    .filter(
      ({ name }) =>
        name !== SETTINGS_LEVEL && !name.startsWith(HINT_PREFIX) && !BASIC_CONTROL_NAMES.includes(name),
    )
    .forEach(({ name, config }) => {
      const own = config.visibility as ((...args: any[]) => boolean) | undefined;
      config.visibility = (props: { controls?: Controls }, controlData?: Controls) =>
        (own ? own(props, controlData) !== false : true) &&
        isAdvancedVisible(props?.controls ?? controlData, name, defaults);
    });

  // A section with nothing visible would show an empty header: hide it as a whole.
  sections.forEach(section => {
    const own = section.visibility;
    section.visibility = (props: { controls?: Controls }, controlData?: Controls) => {
      if (own && own(props, controlData) === false) return false;
      return section.controlSetRows
        .flat()
        .some(
          item =>
            !isControl(item) ||
            !item.config.visibility ||
            item.config.visibility(props, controlData) !== false,
        );
    };
  });
}
