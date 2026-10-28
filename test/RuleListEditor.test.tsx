/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RuleListEditor } from '../src/plugin/controls/RuleListEditor';
import { EDITOR_TEXTS, PARSE_ERRORS } from '../src/plugin/controls/ruleList';
import {
  CONDITIONAL_FORMATTING_SPEC,
  GOALS_SPEC,
  METRIC_DEFINITIONS_SPEC,
} from '../src/plugin/controls/ruleSpecs';

afterEach(cleanup);

const goalsText = (rows: object[]) => JSON.stringify(rows);

const setup = (props: Partial<React.ComponentProps<typeof RuleListEditor>> = {}) => {
  const onChange = jest.fn();
  const utils = render(
    <RuleListEditor
      spec={GOALS_SPEC}
      label="Obiettivi per metrica"
      description="Un obiettivo per metrica."
      metricOptions={['fatturato', 'ricoveri']}
      value=""
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, ...utils };
};

const lastValue = (onChange: jest.Mock) => onChange.mock.calls[onChange.mock.calls.length - 1][0];

describe('RuleListEditor rows', () => {
  it('shows the label, the description and an empty message with no rows', () => {
    setup();
    expect(screen.getByText('Obiettivi per metrica')).toBeTruthy();
    expect(screen.getByText('Un obiettivo per metrica.')).toBeTruthy();
    expect(screen.getByText(GOALS_SPEC.emptyText)).toBeTruthy();
  });

  it('adds a row built by the spec and writes it in the stored shape', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: GOALS_SPEC.addLabel }));
    expect(JSON.parse(lastValue(onChange))).toEqual([{ metricKey: '', direction: 'higher_is_better' }]);
  });

  it('writes a real array for the controls that store an array', () => {
    const { onChange } = setup({ spec: CONDITIONAL_FORMATTING_SPEC, value: [] });
    fireEvent.click(screen.getByRole('button', { name: CONDITIONAL_FORMATTING_SPEC.addLabel }));
    expect(Array.isArray(lastValue(onChange))).toBe(true);
    expect(lastValue(onChange)[0]).toMatchObject({ operator: '>', priority: 1 });
  });

  it('reads rows from JSON text and from an array', () => {
    const rows = [{ metricKey: 'fatturato', target: 1000, direction: 'higher_is_better' }];
    const { unmount } = setup({ value: goalsText(rows) });
    expect((screen.getByLabelText('Metrica') as HTMLInputElement).value).toBe('fatturato');
    expect((screen.getByLabelText('Obiettivo') as HTMLInputElement).value).toBe('1000');
    unmount();
    setup({ value: rows });
    expect((screen.getByLabelText('Metrica') as HTMLInputElement).value).toBe('fatturato');
  });

  it('edits a text field and keeps the keys it does not show', () => {
    const rows = [{ metricKey: 'fatturato', target: 1000, direction: 'higher_is_better', nota: 'x' }];
    const { onChange } = setup({ value: goalsText(rows) });
    fireEvent.change(screen.getByLabelText('Metrica'), { target: { value: 'ricoveri' } });
    expect(JSON.parse(lastValue(onChange))).toEqual([{ ...rows[0], metricKey: 'ricoveri' }]);
  });

  it('writes numbers as numbers and flags text that is not a number', () => {
    const { onChange } = setup({ value: goalsText([{ metricKey: 'fatturato', direction: 'higher_is_better' }]) });
    const input = screen.getByLabelText('Obiettivo');
    fireEvent.change(input, { target: { value: '2500.5' } });
    expect(JSON.parse(lastValue(onChange))[0].target).toBe(2500.5);
    fireEvent.change(input, { target: { value: '12a' } });
    expect(JSON.parse(lastValue(onChange))[0]).not.toHaveProperty('target');
    expect(screen.getByText(EDITOR_TEXTS.notANumber)).toBeTruthy();
  });

  it('changes a choice and clears the fields that no longer apply', () => {
    const ratio = {
      metric: 'pct',
      type: 'ratio',
      numerator: 'a',
      denominator: 'b',
      scale: 100,
      format: 'percent',
    };
    const { onChange } = setup({ spec: METRIC_DEFINITIONS_SPEC, value: JSON.stringify([ratio]) });
    expect(screen.getByLabelText('Numeratore')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'sum' } });
    expect(JSON.parse(lastValue(onChange))).toEqual([{ metric: 'pct', type: 'sum', format: 'percent' }]);
  });

  it('shows the effective default of a choice without writing it', () => {
    setup({ spec: CONDITIONAL_FORMATTING_SPEC, value: [{ metric: 'a', operator: '>', targetValue: 1 }] });
    expect((screen.getByLabelText('Evidenzia') as HTMLSelectElement).value).toBe('cell');
  });

  it('keeps a stored choice that the list does not offer', () => {
    setup({ value: goalsText([{ metricKey: 'a', target: 1, direction: 'sideways' }]) });
    expect((screen.getByLabelText('Direzione') as HTMLSelectElement).value).toBe('sideways');
  });

  it('removes a row', () => {
    const rows = [
      { metricKey: 'a', target: 1 },
      { metricKey: 'b', target: 2 },
    ];
    const { onChange } = setup({ value: goalsText(rows) });
    fireEvent.click(screen.getAllByRole('button', { name: EDITOR_TEXTS.remove })[0]);
    expect(JSON.parse(lastValue(onChange))).toEqual([rows[1]]);
  });

  it('removing the last row writes the empty default', () => {
    const { onChange } = setup({ value: goalsText([{ metricKey: 'a', target: 1 }]) });
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.remove }));
    expect(lastValue(onChange)).toBe('');
  });

  it('moves a row up and down, and disables the buttons at the ends', () => {
    const rows = [
      { metricKey: 'a', target: 1 },
      { metricKey: 'b', target: 2 },
    ];
    const { onChange } = setup({ value: goalsText(rows) });
    const up = screen.getAllByRole('button', { name: EDITOR_TEXTS.moveUp });
    const down = screen.getAllByRole('button', { name: EDITOR_TEXTS.moveDown });
    expect((up[0] as HTMLButtonElement).disabled).toBe(true);
    expect((down[1] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(up[1]);
    expect(JSON.parse(lastValue(onChange)).map((r: any) => r.metricKey)).toEqual(['b', 'a']);
  });

  it('offers the chart metrics as suggestions', () => {
    setup({ value: goalsText([{ metricKey: '', target: 1 }]) });
    const input = screen.getByLabelText('Metrica');
    const list = document.getElementById(input.getAttribute('list')!)!;
    expect(Array.from(list.querySelectorAll('option')).map(o => o.getAttribute('value'))).toEqual([
      'fatturato',
      'ricoveri',
    ]);
  });

  it('shows the validation messages and the one-line preview of each row', () => {
    setup({ value: goalsText([{ metricKey: 'fatturato', target: 1000, direction: 'higher_is_better' }, { metricKey: '' }]) });
    expect(screen.getByText('fatturato: obiettivo 1000, più alto è meglio.')).toBeTruthy();
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(within(alerts[0]).getByText('Compila «Metrica».')).toBeTruthy();
    expect(within(alerts[0]).getByText('Compila «Obiettivo».')).toBeTruthy();
  });
});

describe('RuleListEditor JSON view', () => {
  const rows = [{ metricKey: 'fatturato', target: 1000, direction: 'higher_is_better' }];

  it('switches to a JSON text of the rows and back', () => {
    setup({ value: goalsText(rows) });
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.showJson }));
    const area = screen.getByLabelText(EDITOR_TEXTS.jsonLabel) as HTMLTextAreaElement;
    expect(JSON.parse(area.value)).toEqual(rows);
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.showEditor }));
    expect(screen.getByLabelText('Metrica')).toBeTruthy();
  });

  it('saves valid JSON in the stored shape', () => {
    const { onChange } = setup({ value: goalsText(rows) });
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.showJson }));
    const edited = [{ ...rows[0], target: 5 }];
    fireEvent.change(screen.getByLabelText(EDITOR_TEXTS.jsonLabel), { target: { value: JSON.stringify(edited) } });
    expect(JSON.parse(lastValue(onChange))).toEqual(edited);
  });

  it('shows an error for invalid JSON and keeps the saved value', () => {
    const { onChange } = setup({ value: goalsText(rows) });
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.showJson }));
    fireEvent.change(screen.getByLabelText(EDITOR_TEXTS.jsonLabel), { target: { value: '[{"metricKey":' } });
    expect(screen.getByText(PARSE_ERRORS.invalidJson)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens on the JSON view when the stored value is not a valid list, without touching it', () => {
    const { onChange } = setup({ value: '{"broken": ' });
    expect(screen.getByText(PARSE_ERRORS.invalidJson)).toBeTruthy();
    expect((screen.getByLabelText(EDITOR_TEXTS.jsonLabel) as HTMLTextAreaElement).value).toBe('{"broken": ');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: GOALS_SPEC.addLabel })).toBeNull();
  });
});
