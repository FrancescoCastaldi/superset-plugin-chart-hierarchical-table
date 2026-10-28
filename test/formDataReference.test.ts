jest.mock('@superset-ui/core', () => ({
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import controlPanel from '../src/plugin/controlPanel';
import { resolveTransformOptions } from '../src/plugin/formDataOptions';
import { HINT_PREFIX } from '../src/plugin/controls/hints';
import reference from './fixtures/formdata-reference.json';

type Section = { controlSetRows: unknown[][] };

const panelControlNames = (): string[] =>
  (controlPanel.controlPanelSections as Section[])
    .flatMap(s => s.controlSetRows.flat())
    .map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'name' in item) {
        return String((item as { name: unknown }).name);
      }
      return null;
    })
    .filter((n): n is string => n !== null && !n.startsWith(HINT_PREFIX));

// Synthetic form data that sets every control to a non-default value. The resolved options must
// stay identical through the control panel UX refactor: saved charts keep their keys and formats.
describe('form data reference fixture', () => {
  it('sets a value for every control declared by the control panel', () => {
    const missing = panelControlNames().filter(name => !(name in reference));
    expect(missing).toEqual([]);
  });

  it('keeps the JSON text controls as text and the conditional rules as an array', () => {
    ['goals', 'metricDefinitions', 'tableCalculations', 'dimensionLimits'].forEach(key => {
      expect(typeof (reference as Record<string, unknown>)[key]).toBe('string');
    });
    expect(Array.isArray(reference.conditionalFormatting)).toBe(true);
  });

  it('resolves to the same transform options', () => {
    expect(resolveTransformOptions(reference)).toMatchSnapshot();
  });
});
