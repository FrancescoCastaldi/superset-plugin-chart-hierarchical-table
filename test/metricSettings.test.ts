import {
  MetricSettingsInput,
  applyChange,
  buildMetricSettings,
  metricSettingsInputFromState,
} from '../src/plugin/controls/metricSettings';

const input = (overrides: Partial<MetricSettingsInput> = {}): MetricSettingsInput => ({
  metrics: ['casi', 'ricoveri', 'decessi'],
  goals: '',
  metricDefinitions: '',
  sparklineMetrics: '',
  suppressionMetrics: '',
  weightColumn: '',
  showSparklines: true,
  suppressionThreshold: 5,
  aggregationMode: 'weighted_avg',
  ...overrides,
});

const text = (rows: object[]) => JSON.stringify(rows);
const parse = (value: unknown) => JSON.parse(value as string);

describe('buildMetricSettings', () => {
  it('gives one entry per chart metric, in the chart order', () => {
    expect(buildMetricSettings(input()).map(s => s.metric)).toEqual(['casi', 'ricoveri', 'decessi']);
    expect(buildMetricSettings(input({ metrics: [] }))).toEqual([]);
  });

  it('reads the goal of each metric, with the usual direction when it is missing', () => {
    const goals = text([{ metricKey: 'ricoveri', target: 40 }, { metricKey: 'casi', target: 10, direction: 'lower_is_better' }]);
    const [casi, ricoveri, decessi] = buildMetricSettings(input({ goals }));
    expect(casi.goal).toEqual({ target: 10, direction: 'lower_is_better' });
    expect(ricoveri.goal).toEqual({ target: 40, direction: 'higher_is_better' });
    expect(decessi.goal).toBeNull();
  });

  it('uses the first goal when a metric has several', () => {
    const goals = text([{ metricKey: 'casi', target: 1 }, { metricKey: 'casi', target: 2 }]);
    expect(buildMetricSettings(input({ goals }))[0].goal?.target).toBe(1);
  });

  it('reads the definition fields only for metrics that already have a definition', () => {
    const metricDefinitions = text([{ metric: 'ricoveri', type: 'sum', format: 'percent', decimals: 2, polarity: 'lower_is_better' }]);
    const [casi, ricoveri] = buildMetricSettings(input({ metricDefinitions }));
    expect(casi.definition).toBeNull();
    expect(ricoveri.definition).toEqual({ format: 'percent', decimals: 2, polarity: 'lower_is_better' });
  });

  it('reads stored arrays as well as JSON text', () => {
    const settings = buildMetricSettings(input({ goals: [{ metricKey: 'casi', target: 3 }] as never }));
    expect(settings[0].goal?.target).toBe(3);
  });

  it('flags a goals or definitions value that is not a valid list', () => {
    const [first] = buildMetricSettings(input({ goals: '{oops', metricDefinitions: '[1]' }));
    expect(first.goalsInvalid).toBe(true);
    expect(first.definitionsInvalid).toBe(true);
    expect(buildMetricSettings(input())[0].goalsInvalid).toBe(false);
  });

  it('treats an empty sparkline list as every metric, and a list as just those', () => {
    expect(buildMetricSettings(input()).map(s => s.sparkline)).toEqual([true, true, true]);
    expect(buildMetricSettings(input({ sparklineMetrics: 'casi, decessi' })).map(s => s.sparkline)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('reads protection and weight', () => {
    const settings = buildMetricSettings(input({ suppressionMetrics: 'ricoveri', weightColumn: 'casi' }));
    expect(settings.map(s => s.suppression)).toEqual([false, true, false]);
    expect(settings.map(s => s.weight)).toEqual([true, false, false]);
  });

  it('shows each switch only when the matching feature is on', () => {
    const off = buildMetricSettings(
      input({ showSparklines: false, suppressionThreshold: 0, aggregationMode: 'sum' }),
    )[0];
    expect([off.sparklineAvailable, off.suppressionAvailable, off.weightAvailable]).toEqual([false, false, false]);
    const on = buildMetricSettings(input())[0];
    expect([on.sparklineAvailable, on.suppressionAvailable, on.weightAvailable]).toEqual([true, true, true]);
  });

  it('marks the only metric left with a sparkline, which cannot be switched off', () => {
    const settings = buildMetricSettings(input({ sparklineMetrics: 'casi' }));
    expect(settings.map(s => s.sparklineLocked)).toEqual([true, false, false]);
    expect(buildMetricSettings(input()).every(s => !s.sparklineLocked)).toBe(true);
    expect(buildMetricSettings(input({ metrics: ['casi'] }))[0].sparklineLocked).toBe(true);
  });
});

describe('applyChange: goals', () => {
  it('adds a goal with the usual direction', () => {
    const patch = applyChange(input(), 'casi', { kind: 'goalTarget', value: 10 });
    expect(Object.keys(patch)).toEqual(['goals']);
    expect(parse(patch.goals)).toEqual([{ metricKey: 'casi', target: 10, direction: 'higher_is_better' }]);
  });

  it('changes the target of the first goal and keeps its other keys and the other goals', () => {
    const goals = text([{ metricKey: 'ricoveri', target: 1 }, { metricKey: 'casi', target: 2, direction: 'lower_is_better', nota: 'x' }]);
    const patch = applyChange(input({ goals }), 'casi', { kind: 'goalTarget', value: 9 });
    expect(parse(patch.goals)).toEqual([
      { metricKey: 'ricoveri', target: 1 },
      { metricKey: 'casi', target: 9, direction: 'lower_is_better', nota: 'x' },
    ]);
  });

  it('removes the goal when the target is cleared, and writes the empty text for the last one', () => {
    const goals = text([{ metricKey: 'casi', target: 2 }, { metricKey: 'ricoveri', target: 5 }]);
    expect(parse(applyChange(input({ goals }), 'casi', { kind: 'goalTarget', value: undefined }).goals)).toEqual([
      { metricKey: 'ricoveri', target: 5 },
    ]);
    const single = text([{ metricKey: 'casi', target: 2 }]);
    expect(applyChange(input({ goals: single }), 'casi', { kind: 'goalTarget', value: undefined })).toEqual({ goals: '' });
  });

  it('writes nothing when clearing a goal that does not exist', () => {
    expect(applyChange(input(), 'casi', { kind: 'goalTarget', value: undefined })).toEqual({});
  });

  it('changes the direction of an existing goal only', () => {
    const goals = text([{ metricKey: 'casi', target: 2 }]);
    const patch = applyChange(input({ goals }), 'casi', { kind: 'goalDirection', value: 'lower_is_better' });
    expect(parse(patch.goals)).toEqual([{ metricKey: 'casi', target: 2, direction: 'lower_is_better' }]);
    expect(applyChange(input(), 'casi', { kind: 'goalDirection', value: 'lower_is_better' })).toEqual({});
  });

  it('does not overwrite a goals value it cannot read', () => {
    expect(applyChange(input({ goals: '{oops' }), 'casi', { kind: 'goalTarget', value: 1 })).toEqual({});
  });
});

describe('applyChange: sparkline', () => {
  it('turning one off from "every metric" lists the others', () => {
    expect(applyChange(input(), 'ricoveri', { kind: 'sparkline', on: false })).toEqual({
      sparklineMetrics: 'casi, decessi',
    });
  });

  it('turning it back on to cover every metric writes the empty text again', () => {
    const patch = applyChange(input({ sparklineMetrics: 'casi, decessi' }), 'ricoveri', { kind: 'sparkline', on: true });
    expect(patch).toEqual({ sparklineMetrics: '' });
  });

  it('adds to and removes from an explicit list', () => {
    const base = input({ sparklineMetrics: 'casi' });
    expect(applyChange(base, 'decessi', { kind: 'sparkline', on: true })).toEqual({ sparklineMetrics: 'casi, decessi' });
    expect(applyChange(input({ sparklineMetrics: 'casi, decessi' }), 'casi', { kind: 'sparkline', on: false })).toEqual({
      sparklineMetrics: 'decessi',
    });
  });

  it('never leaves the list empty, because empty would mean every metric', () => {
    expect(applyChange(input({ sparklineMetrics: 'casi' }), 'casi', { kind: 'sparkline', on: false })).toEqual({});
  });

  it('writes nothing when the state does not change', () => {
    expect(applyChange(input(), 'casi', { kind: 'sparkline', on: true })).toEqual({});
    expect(applyChange(input({ sparklineMetrics: 'casi' }), 'ricoveri', { kind: 'sparkline', on: false })).toEqual({});
  });
});

describe('applyChange: protection and weight', () => {
  it('adds and removes a protected metric', () => {
    expect(applyChange(input(), 'casi', { kind: 'suppression', on: true })).toEqual({ suppressionMetrics: 'casi' });
    expect(applyChange(input({ suppressionMetrics: 'casi, ricoveri' }), 'casi', { kind: 'suppression', on: false })).toEqual({
      suppressionMetrics: 'ricoveri',
    });
    expect(applyChange(input({ suppressionMetrics: 'casi' }), 'casi', { kind: 'suppression', on: false })).toEqual({
      suppressionMetrics: '',
    });
    expect(applyChange(input({ suppressionMetrics: 'casi' }), 'casi', { kind: 'suppression', on: true })).toEqual({});
  });

  it('makes one metric the weight, replacing the previous one', () => {
    expect(applyChange(input({ weightColumn: 'casi' }), 'ricoveri', { kind: 'weight', on: true })).toEqual({
      weightColumn: 'ricoveri',
    });
  });

  it('clears the weight only when it is that metric', () => {
    expect(applyChange(input({ weightColumn: 'casi' }), 'casi', { kind: 'weight', on: false })).toEqual({ weightColumn: '' });
    expect(applyChange(input({ weightColumn: 'casi' }), 'ricoveri', { kind: 'weight', on: false })).toEqual({});
  });
});

describe('applyChange: definition fields', () => {
  const defs = text([
    { metric: 'ricoveri', type: 'ratio', numerator: 'a', denominator: 'b', scale: 100 },
    { metric: 'casi', type: 'sum' },
  ]);

  it('sets a field and keeps the type, the operands and the other definitions', () => {
    const patch = applyChange(input({ metricDefinitions: defs }), 'ricoveri', { kind: 'definition', key: 'format', value: 'percent' });
    expect(parse(patch.metricDefinitions)).toEqual([
      { metric: 'ricoveri', type: 'ratio', numerator: 'a', denominator: 'b', scale: 100, format: 'percent' },
      { metric: 'casi', type: 'sum' },
    ]);
  });

  it('removes a field when it is cleared', () => {
    const withFormat = text([{ metric: 'casi', type: 'sum', format: 'percent', decimals: 1 }]);
    const patch = applyChange(input({ metricDefinitions: withFormat }), 'casi', { kind: 'definition', key: 'format', value: '' });
    expect(parse(patch.metricDefinitions)).toEqual([{ metric: 'casi', type: 'sum', decimals: 1 }]);
    const cleared = applyChange(input({ metricDefinitions: withFormat }), 'casi', { kind: 'definition', key: 'decimals', value: undefined });
    expect(parse(cleared.metricDefinitions)).toEqual([{ metric: 'casi', type: 'sum', format: 'percent' }]);
  });

  it('never creates a definition, which would need a type that changes the aggregation', () => {
    expect(applyChange(input({ metricDefinitions: defs }), 'decessi', { kind: 'definition', key: 'format', value: 'percent' })).toEqual({});
    expect(applyChange(input(), 'casi', { kind: 'definition', key: 'format', value: 'percent' })).toEqual({});
  });

  it('does not overwrite definitions it cannot read', () => {
    expect(applyChange(input({ metricDefinitions: '[1]' }), 'casi', { kind: 'definition', key: 'format', value: 'integer' })).toEqual({});
  });
});

describe('round trip', () => {
  it('building the settings and applying a change that sets the current state writes nothing', () => {
    const base = input({
      goals: text([{ metricKey: 'casi', target: 3, direction: 'higher_is_better' }]),
      sparklineMetrics: 'casi',
      suppressionMetrics: 'ricoveri',
      weightColumn: 'decessi',
    });
    const [casi, ricoveri, decessi] = buildMetricSettings(base);
    expect(applyChange(base, 'casi', { kind: 'goalTarget', value: Number(casi.goal?.target) })).toEqual({});
    expect(applyChange(base, 'casi', { kind: 'goalDirection', value: String(casi.goal?.direction) })).toEqual({});
    expect(applyChange(base, 'casi', { kind: 'sparkline', on: casi.sparkline })).toEqual({});
    expect(applyChange(base, 'ricoveri', { kind: 'suppression', on: ricoveri.suppression })).toEqual({});
    expect(applyChange(base, 'decessi', { kind: 'weight', on: decessi.weight })).toEqual({});
  });
});

describe('metricSettingsInputFromState', () => {
  it('collects what the card needs from the control state', () => {
    const controls = {
      metrics: { value: ['casi', { label: 'ricoveri' }] },
      goals: { value: '[]' },
      metricDefinitions: { value: '' },
      sparklineMetrics: { value: 'casi' },
      suppressionMetrics: { value: 'ricoveri' },
      weightColumn: { value: 'casi' },
      showSparklines: { value: true },
      suppressionThreshold: { value: '5' },
      aggregationMode: { value: 'weighted_avg' },
    };
    expect(metricSettingsInputFromState({ controls })).toEqual({
      metrics: ['casi', 'ricoveri'],
      goals: '[]',
      metricDefinitions: '',
      sparklineMetrics: 'casi',
      suppressionMetrics: 'ricoveri',
      weightColumn: 'casi',
      showSparklines: true,
      suppressionThreshold: 5,
      aggregationMode: 'weighted_avg',
    });
  });

  it('copes with a fresh chart that has no values yet', () => {
    expect(metricSettingsInputFromState({ controls: {} })).toEqual({
      metrics: [],
      goals: undefined,
      metricDefinitions: undefined,
      sparklineMetrics: undefined,
      suppressionMetrics: undefined,
      weightColumn: undefined,
      showSparklines: false,
      suppressionThreshold: 0,
      aggregationMode: 'sum',
    });
  });
});
