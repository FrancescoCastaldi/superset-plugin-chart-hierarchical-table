import controlPanel, { CUSTOM_D3_FORMAT_OPTIONS } from '../src/plugin/controlPanel';
import { HINT_PREFIX, HINT_TEXTS } from '../src/plugin/controls/hints';
import { EDITOR_TEXTS, PARSE_ERRORS } from '../src/plugin/controls/ruleList';
import { METRIC_SETTINGS_TEXTS } from '../src/plugin/controls/metricSettings';
import { RULE_LIST_SPECS } from '../src/plugin/controls/ruleSpecs';

type Choice = [unknown, string];
type Config = {
  label?: string;
  description?: string;
  choices?: Choice[];
  mapStateToProps?: (explore: unknown) => { choices?: Choice[] };
};
type Control = { name: string; config: Config };

const controls = (): Control[] =>
  (controlPanel.controlPanelSections as { controlSetRows: unknown[][] }[])
    .flatMap(section => section.controlSetRows.flat())
    .filter(
      (item): item is Control =>
        Boolean(item) && typeof item === 'object' && 'config' in (item as object),
    )
    .filter(({ name }) => !name.startsWith(HINT_PREFIX));

// Every text the user reads in the panel, with the control it belongs to.
const visibleTexts = (): { where: string; text: string }[] => {
  const texts: { where: string; text: string }[] = [];
  const add = (where: string, text: unknown) => {
    if (typeof text === 'string') texts.push({ where, text });
  };
  (controlPanel.controlPanelSections as { label: string }[]).forEach(section =>
    add(`section ${section.label}`, section.label),
  );
  controls().forEach(({ name, config }) => {
    add(`${name}.label`, config.label);
    add(`${name}.description`, config.description);
    (config.choices ?? []).forEach(([value, label]) => add(`${name}.choice[${value}]`, label));
    const dynamic = config.mapStateToProps?.({ controls: { metrics: { value: [] } } });
    (dynamic?.choices ?? []).forEach(([value, label]) =>
      add(`${name}.dynamicChoice[${value}]`, label),
    );
  });
  CUSTOM_D3_FORMAT_OPTIONS.forEach(([value, label]) => add(`numberFormat.format[${value}]`, label));
  Object.entries(HINT_TEXTS).forEach(([key, text]) =>
    add(`hint.${key}`, typeof text === 'function' ? text(2) : text),
  );
  Object.entries(EDITOR_TEXTS).forEach(([key, text]) =>
    add(`editor.${key}`, typeof text === 'function' ? text(2 as never) : text),
  );
  Object.entries(PARSE_ERRORS).forEach(([key, text]) => add(`parse.${key}`, text));
  Object.entries(METRIC_SETTINGS_TEXTS).forEach(([key, text]) =>
    add(`metricSettings.${key}`, typeof text === 'function' ? text(40) : text),
  );
  Object.entries(RULE_LIST_SPECS).forEach(([name, spec]) => {
    add(`${name}.addLabel`, spec.addLabel);
    add(`${name}.emptyText`, spec.emptyText);
    spec.fields.forEach(field => {
      // A label can depend on the row: read it for the cases the editor shows.
      [{}, { operator: 'regex' }].forEach(row =>
        add(`${name}.${field.key}.label`, typeof field.label === 'function' ? field.label(row) : field.label),
      );
      add(`${name}.${field.key}.placeholder`, field.placeholder);
      (field.options ?? []).forEach(([value, label]) => add(`${name}.${field.key}[${value}]`, label));
    });
  });
  return texts;
};

// Whole English words that never appear in Italian text or in the JSON examples of the panel.
const ENGLISH_WORDS =
  /\b(the|of|and|or|with|from|when|for|is|are|to|Show|Enable|Display|Default|Choose|Select|Sort|Mode|Value|Values|Metric|Metrics|Table|Totals?|Subtotals?|Period|Reference|Baseline|Comparison|Hierarchy|Parent|Node|Nodes|Level|Page|Size|Limits?|Format|Column|Columns|Row|Rows|Order|Label|Scope)\b/;

describe('controlPanel language', () => {
  it('gives every control a label and a description', () => {
    const missing = controls()
      .filter(({ config }) => !config.label || !config.description)
      .map(({ name }) => name);
    expect(missing).toEqual([]);
  });

  it('keeps labels short enough to fit the panel', () => {
    const tooLong = controls()
      .filter(({ config }) => (config.label ?? '').length > 60)
      .map(({ name }) => name);
    expect(tooLong).toEqual([]);
  });

  it('uses no emoji', () => {
    const offenders = visibleTexts().filter(({ text }) => /\p{Extended_Pictographic}/u.test(text));
    expect(offenders).toEqual([]);
  });

  it('uses no em dash, en dash or double hyphen', () => {
    const offenders = visibleTexts().filter(({ text }) => /[–—]|--/.test(text));
    expect(offenders).toEqual([]);
  });

  it('uses Italian only, with no English prose left in labels, descriptions and choices', () => {
    const offenders = visibleTexts().filter(({ text }) => ENGLISH_WORDS.test(text));
    expect(offenders).toEqual([]);
  });
});
