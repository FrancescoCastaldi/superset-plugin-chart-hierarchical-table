/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MetricSettingsCards } from '../src/plugin/controls/MetricSettingsCards';
import { METRIC_SETTINGS_TEXTS as T, MetricSettingsInput } from '../src/plugin/controls/metricSettings';
import { EDITOR_TEXTS } from '../src/plugin/controls/ruleList';

afterEach(cleanup);

const baseInputs = (overrides: Partial<MetricSettingsInput> = {}): MetricSettingsInput => ({
  metrics: ['casi', 'ricoveri'],
  goals: '',
  metricDefinitions: '',
  sparklineMetrics: '',
  suppressionMetrics: '',
  weightColumn: '',
  showSparklines: false,
  suppressionThreshold: 0,
  aggregationMode: 'sum',
  ...overrides,
});

const setup = (overrides: Partial<MetricSettingsInput> = {}) => {
  const setControlValue = jest.fn();
  render(
    <MetricSettingsCards
      label="Impostazioni per metrica"
      description="Una scheda per ogni metrica."
      inputs={baseInputs(overrides)}
      actions={{ setControlValue }}
    />,
  );
  return setControlValue;
};

// The card of one metric, found by its summary.
const card = (metric: string): HTMLElement =>
  screen.getByText(metric, { selector: 'summary span.metric-name' }).closest('details') as HTMLElement;

describe('MetricSettingsCards', () => {
  it('shows the label, the description and a message when the chart has no metric', () => {
    setup({ metrics: [] });
    expect(screen.getByText('Impostazioni per metrica')).toBeTruthy();
    expect(screen.getByText('Una scheda per ogni metrica.')).toBeTruthy();
    expect(screen.getByText(T.empty)).toBeTruthy();
  });

  it('has one card per metric with a short summary of what is set', () => {
    setup({
      goals: JSON.stringify([{ metricKey: 'casi', target: 40 }]),
      showSparklines: true,
      suppressionThreshold: 5,
      suppressionMetrics: 'casi',
    });
    expect(within(card('casi')).getByText('obiettivo 40, sparkline, protetta')).toBeTruthy();
    expect(within(card('ricoveri')).getByText('sparkline')).toBeTruthy();
  });

  it('says so when a metric has nothing set', () => {
    setup();
    expect(within(card('casi')).getByText(T.summaryNothing)).toBeTruthy();
  });
});

describe('goal of a metric', () => {
  it('writes a new goal with the usual direction', () => {
    const setControlValue = setup();
    fireEvent.change(within(card('casi')).getByLabelText(T.goalTarget), { target: { value: '40' } });
    expect(setControlValue).toHaveBeenCalledTimes(1);
    const [name, value] = setControlValue.mock.calls[0];
    expect(name).toBe('goals');
    expect(JSON.parse(value)).toEqual([{ metricKey: 'casi', target: 40, direction: 'higher_is_better' }]);
  });

  it('keeps the direction disabled until there is a target, then writes it', () => {
    const first = setup();
    expect((within(card('casi')).getByLabelText(T.goalDirection) as HTMLSelectElement).disabled).toBe(true);
    expect(first).not.toHaveBeenCalled();
    cleanup();

    const setControlValue = setup({ goals: JSON.stringify([{ metricKey: 'casi', target: 40 }]) });
    const select = within(card('casi')).getByLabelText(T.goalDirection) as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    fireEvent.change(select, { target: { value: 'lower_is_better' } });
    expect(JSON.parse(setControlValue.mock.calls[0][1])).toEqual([
      { metricKey: 'casi', target: 40, direction: 'lower_is_better' },
    ]);
  });

  it('removes the goal when the target is cleared', () => {
    const setControlValue = setup({ goals: JSON.stringify([{ metricKey: 'casi', target: 40 }]) });
    fireEvent.change(within(card('casi')).getByLabelText(T.goalTarget), { target: { value: '' } });
    expect(setControlValue).toHaveBeenCalledWith('goals', '');
  });

  it('leaves goals it cannot read alone and says why', () => {
    const setControlValue = setup({ goals: '{oops' });
    expect(within(card('casi')).getByText(T.goalsInvalid)).toBeTruthy();
    const input = within(card('casi')).getByLabelText(T.goalTarget) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    fireEvent.change(input, { target: { value: '5' } });
    expect(setControlValue).not.toHaveBeenCalled();
  });
});

describe('switches of a metric', () => {
  it('shows the sparkline switch only while sparklines are on, and writes the other metrics when one is turned off', () => {
    setup();
    expect(within(card('casi')).queryByLabelText(T.sparkline)).toBeNull();
    cleanup();

    const setControlValue = setup({ showSparklines: true });
    const box = within(card('casi')).getByLabelText(T.sparkline) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(setControlValue).toHaveBeenCalledWith('sparklineMetrics', 'ricoveri');
  });

  it('locks the last metric with a sparkline and explains it', () => {
    const setControlValue = setup({ showSparklines: true, sparklineMetrics: 'casi' });
    const box = within(card('casi')).getByLabelText(T.sparkline) as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(within(card('casi')).getByText(T.sparklineLocked)).toBeTruthy();
    fireEvent.click(box);
    expect(setControlValue).not.toHaveBeenCalled();
  });

  it('shows the protection switch only with a threshold, and writes the comma separated names', () => {
    setup();
    expect(within(card('casi')).queryByLabelText(T.suppression)).toBeNull();
    cleanup();

    const setControlValue = setup({ suppressionThreshold: 5, suppressionMetrics: 'ricoveri' });
    fireEvent.click(within(card('casi')).getByLabelText(T.suppression));
    expect(setControlValue).toHaveBeenCalledWith('suppressionMetrics', 'ricoveri, casi');
  });

  it('shows the weight switch only for the weighted average and moves the weight between metrics', () => {
    setup();
    expect(within(card('casi')).queryByLabelText(T.weight)).toBeNull();
    cleanup();

    const setControlValue = setup({ aggregationMode: 'weighted_avg', weightColumn: 'casi' });
    expect((within(card('casi')).getByLabelText(T.weight) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(card('ricoveri')).getByLabelText(T.weight));
    expect(setControlValue).toHaveBeenCalledWith('weightColumn', 'ricoveri');
    fireEvent.click(within(card('casi')).getByLabelText(T.weight));
    expect(setControlValue).toHaveBeenLastCalledWith('weightColumn', '');
  });
});

describe('definition fields of a metric', () => {
  const definitions = JSON.stringify([{ metric: 'casi', type: 'ratio', numerator: 'a', denominator: 'b', format: 'percent', decimals: 1 }]);

  it('shows format, decimals and polarity for a metric that has a definition', () => {
    setup({ metricDefinitions: definitions });
    const casi = card('casi');
    expect((within(casi).getByLabelText(T.format) as HTMLSelectElement).value).toBe('percent');
    expect((within(casi).getByLabelText(T.decimals) as HTMLInputElement).value).toBe('1');
    expect(within(casi).getByLabelText(T.polarity)).toBeTruthy();
    expect(within(casi).queryByText(T.noDefinition)).toBeNull();
  });

  it('explains how to get them for a metric without a definition, and never creates one', () => {
    const setControlValue = setup({ metricDefinitions: definitions });
    const ricoveri = card('ricoveri');
    expect(within(ricoveri).getByText(T.noDefinition)).toBeTruthy();
    expect(within(ricoveri).queryByLabelText(T.format)).toBeNull();
    expect(setControlValue).not.toHaveBeenCalled();
  });

  it('writes a changed field and keeps the type and the operands', () => {
    const setControlValue = setup({ metricDefinitions: definitions });
    fireEvent.change(within(card('casi')).getByLabelText(T.format), { target: { value: 'integer' } });
    const [name, value] = setControlValue.mock.calls[0];
    expect(name).toBe('metricDefinitions');
    expect(JSON.parse(value)).toEqual([
      { metric: 'casi', type: 'ratio', numerator: 'a', denominator: 'b', format: 'integer', decimals: 1 },
    ]);
  });

  it('flags decimals outside the range the transform accepts', () => {
    setup({ metricDefinitions: JSON.stringify([{ metric: 'casi', type: 'sum', decimals: 9 }]) });
    expect(within(card('casi')).getByText('«Decimali» deve essere al massimo 6.')).toBeTruthy();
  });

  it('leaves definitions it cannot read alone and says why', () => {
    setup({ metricDefinitions: '[1]' });
    expect(within(card('casi')).getByText(T.definitionsInvalid)).toBeTruthy();
    expect(within(card('casi')).queryByLabelText(T.format)).toBeNull();
  });
});

describe('texts shared with the rule editors', () => {
  it('uses the same choices as the rule editors', () => {
    setup({ goals: JSON.stringify([{ metricKey: 'casi', target: 1 }]) });
    const options = Array.from(
      (within(card('casi')).getByLabelText(T.goalDirection) as HTMLSelectElement).options,
    ).map(o => o.text);
    expect(options).toEqual(['Più alto è meglio', 'Più basso è meglio']);
    expect(EDITOR_TEXTS.notANumber).toBeTruthy();
  });
});
