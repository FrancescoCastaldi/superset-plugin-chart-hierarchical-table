import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import controlPanel from '../src/plugin/controlPanel';
import { InlineHint } from '../src/plugin/controls/InlineHint';
import {
  HINT_PREFIX,
  HINT_TEXTS,
  pivotColumnCount,
  sparklineHint,
  suppressionHint,
  weightHint,
} from '../src/plugin/controls/hints';

type Controls = Record<string, { value?: unknown }>;

const controls = (values: Record<string, unknown>): Controls =>
  Object.fromEntries(Object.entries(values).map(([name, value]) => [name, { value }]));

describe('pivotColumnCount', () => {
  it('counts the pivot columns in multi-dimension mode', () => {
    expect(pivotColumnCount(controls({ hierarchyType: 'multi_dimension', columns: ['a', 'b'] }))).toBe(2);
    expect(pivotColumnCount(controls({ hierarchyType: 'multi_dimension', columns: [] }))).toBe(0);
  });

  it('ignores stored pivot columns in parent-child mode', () => {
    expect(pivotColumnCount(controls({ hierarchyType: 'parent_child', columns: ['a'] }))).toBe(0);
  });
});

describe('sparklineHint', () => {
  const base = { hierarchyType: 'multi_dimension' };

  it('warns when sparklines are on without exactly one pivot column', () => {
    expect(sparklineHint(controls({ ...base, showSparklines: true, columns: [] }))).toEqual({
      tone: 'warning',
      text: HINT_TEXTS.sparklines(0),
    });
    expect(sparklineHint(controls({ ...base, showSparklines: true, columns: ['a', 'b'] }))?.tone).toBe('warning');
  });

  it('says how many pivot columns are set', () => {
    expect(HINT_TEXTS.sparklines(0)).toContain('0');
    expect(HINT_TEXTS.sparklines(3)).toContain('3');
  });

  it('stays quiet with one pivot column or with sparklines off', () => {
    expect(sparklineHint(controls({ ...base, showSparklines: true, columns: ['anno'] }))).toBeNull();
    expect(sparklineHint(controls({ ...base, showSparklines: false, columns: [] }))).toBeNull();
  });
});

describe('suppressionHint', () => {
  it('warns when a threshold is set but no metric is listed', () => {
    expect(suppressionHint(controls({ suppressionThreshold: 5, suppressionMetrics: '' }))?.tone).toBe('warning');
    expect(suppressionHint(controls({ suppressionThreshold: '5', suppressionMetrics: '  ' }))?.tone).toBe('warning');
  });

  it('stays quiet when metrics are listed or the threshold is off', () => {
    expect(suppressionHint(controls({ suppressionThreshold: 5, suppressionMetrics: 'casi' }))).toBeNull();
    expect(suppressionHint(controls({ suppressionThreshold: 0, suppressionMetrics: '' }))).toBeNull();
    expect(suppressionHint(controls({}))).toBeNull();
  });
});

describe('weightHint', () => {
  it('informs that the automatic volume weights apply without a weight metric', () => {
    expect(weightHint(controls({ aggregationMode: 'weighted_avg', weightColumn: '' }))?.tone).toBe('info');
  });

  it('stays quiet with a weight metric or another aggregation', () => {
    expect(weightHint(controls({ aggregationMode: 'weighted_avg', weightColumn: 'volume' }))).toBeNull();
    expect(weightHint(controls({ aggregationMode: 'sum', weightColumn: '' }))).toBeNull();
  });
});

describe('InlineHint', () => {
  it('renders the message as a note', () => {
    const html = renderToStaticMarkup(createElement(InlineHint, { hint: { tone: 'warning', text: 'Attenzione' } }));
    expect(html).toContain('Attenzione');
    expect(html).toContain('role="note"');
  });

  it('renders nothing without a hint', () => {
    expect(renderToStaticMarkup(createElement(InlineHint, { hint: null }))).toBe('');
    expect(renderToStaticMarkup(createElement(InlineHint, {}))).toBe('');
  });
});

describe('hint controls in the control panel', () => {
  type Item = { name: string; config: Record<string, any> };
  type Section = { label: string; controlSetRows: unknown[][] };
  const sections = controlPanel.controlPanelSections as Section[];
  const hintIn = (label: string, name: string): Item => {
    const section = sections.find(s => s.label === label);
    const found = section?.controlSetRows
      .flat()
      .find(i => i && typeof i === 'object' && (i as Item).name === name) as Item | undefined;
    if (!found) throw new Error(`Missing ${name} in ${label}`);
    return found;
  };

  it('places each hint next to the setting it explains', () => {
    expect(hintIn('Trend e interazioni', `${HINT_PREFIX}sparklines`)).toBeDefined();
    expect(hintIn('Privacy sui piccoli numeri', `${HINT_PREFIX}suppression`)).toBeDefined();
    expect(hintIn('Metriche', `${HINT_PREFIX}weight`)).toBeDefined();
  });

  it('keeps renderTrigger on so a hint never moves its section to the Data tab', () => {
    ['sparklines', 'suppression', 'weight'].forEach(key => {
      const section = { sparklines: 'Trend e interazioni', suppression: 'Privacy sui piccoli numeri', weight: 'Metriche' }[key]!;
      expect(hintIn(section, `${HINT_PREFIX}${key}`).config.renderTrigger).toBe(true);
    });
  });

  it('asks Explore to recompute the message on every render', () => {
    expect(hintIn('Metriche', `${HINT_PREFIX}weight`).config.shouldMapStateToProps()).toBe(true);
  });

  it('is visible only while there is a message, and passes it to the component', () => {
    const hint = hintIn('Trend e interazioni', `${HINT_PREFIX}sparklines`);
    const on = controls({ hierarchyType: 'multi_dimension', showSparklines: true, columns: [] });
    const off = controls({ hierarchyType: 'multi_dimension', showSparklines: false, columns: [] });
    expect(hint.config.visibility({ controls: on })).toBe(true);
    expect(hint.config.visibility({ controls: off })).toBe(false);
    expect(hint.config.mapStateToProps({ controls: on }).hint.tone).toBe('warning');
    expect(hint.config.mapStateToProps({ controls: off }).hint).toBeNull();
  });
});
