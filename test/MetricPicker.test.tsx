/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MetricPicker } from '../src/plugin/controls/MetricPicker';
import { EDITOR_TEXTS } from '../src/plugin/controls/ruleList';

afterEach(cleanup);

const lastValue = (onChange: jest.Mock) => onChange.mock.calls[onChange.mock.calls.length - 1][0];

const setupMulti = (value = 'casi, ricoveri') => {
  const onChange = jest.fn();
  render(
    <MetricPicker
      multi
      label="Metriche da proteggere"
      description="Separate da virgola."
      metricOptions={['casi', 'ricoveri', 'decessi']}
      value={value}
      onChange={onChange}
    />,
  );
  return onChange;
};

const input = () => screen.getByPlaceholderText(EDITOR_TEXTS.pickerPlaceholder) as HTMLInputElement;

describe('MetricPicker with several metrics', () => {
  it('shows the label, the description and one chip per metric', () => {
    setupMulti();
    expect(screen.getByText('Metriche da proteggere')).toBeTruthy();
    expect(screen.getByText('Separate da virgola.')).toBeTruthy();
    expect(screen.getByText('casi')).toBeTruthy();
    expect(screen.getByText('ricoveri')).toBeTruthy();
  });

  it('adds a metric with the button and writes the comma separated text', () => {
    const onChange = setupMulti();
    fireEvent.change(input(), { target: { value: 'decessi' } });
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.pickerAdd }));
    expect(lastValue(onChange)).toBe('casi, ricoveri, decessi');
    expect(input().value).toBe('');
  });

  it('adds a metric with Enter', () => {
    const onChange = setupMulti('');
    fireEvent.change(input(), { target: { value: 'casi' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(lastValue(onChange)).toBe('casi');
  });

  it('ignores an empty or repeated name', () => {
    const onChange = setupMulti();
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.pickerAdd }));
    fireEvent.change(input(), { target: { value: 'casi' } });
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.pickerAdd }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a metric, and writes the empty text after the last one', () => {
    const onChange = setupMulti('casi, ricoveri');
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.pickerRemove('casi') }));
    expect(lastValue(onChange)).toBe('ricoveri');
    cleanup();
    const second = setupMulti('casi');
    fireEvent.click(screen.getByRole('button', { name: EDITOR_TEXTS.pickerRemove('casi') }));
    expect(lastValue(second)).toBe('');
  });

  it('suggests the chart metrics', () => {
    setupMulti();
    const list = document.getElementById(input().getAttribute('list')!)!;
    expect(Array.from(list.querySelectorAll('option')).map(o => o.getAttribute('value'))).toEqual([
      'casi',
      'ricoveri',
      'decessi',
    ]);
  });
});

describe('MetricPicker with a single metric', () => {
  const setupSingle = (value = '') => {
    const onChange = jest.fn();
    render(
      <MetricPicker
        label="Metrica peso"
        metricOptions={['casi', 'ricoveri']}
        value={value}
        onChange={onChange}
      />,
    );
    return onChange;
  };

  it('writes the typed or chosen name straight away', () => {
    const onChange = setupSingle('casi');
    const field = screen.getByLabelText('Metrica peso') as HTMLInputElement;
    expect(field.value).toBe('casi');
    fireEvent.change(field, { target: { value: 'ricoveri' } });
    expect(lastValue(onChange)).toBe('ricoveri');
    fireEvent.change(field, { target: { value: '' } });
    expect(lastValue(onChange)).toBe('');
  });

  it('suggests the chart metrics and has no chips or add button', () => {
    setupSingle();
    const field = screen.getByLabelText('Metrica peso');
    const list = document.getElementById(field.getAttribute('list')!)!;
    expect(Array.from(list.querySelectorAll('option')).map(o => o.getAttribute('value'))).toEqual([
      'casi',
      'ricoveri',
    ]);
    expect(screen.queryByRole('button', { name: EDITOR_TEXTS.pickerAdd })).toBeNull();
  });
});
