import { CSSProperties, ComponentType, useId, useState } from 'react';
import { EDITOR_TEXTS, joinList, splitList } from './ruleList';

// Picks metric names from the ones chosen in the chart, instead of typing them in a text box.
// The value stays what it was: one name, or names separated by commas ("casi, ricoveri").

export interface MetricPickerProps {
  value?: unknown;
  onChange?: (value: string) => void;
  /** Several metrics shown as chips, or a single metric in one field. */
  multi?: boolean;
  label?: string;
  description?: string;
  metricOptions?: string[];
}

const muted: CSSProperties = { fontSize: 12, opacity: 0.75, margin: '2px 0' };
const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  border: '1px solid rgba(128, 128, 128, 0.5)',
  borderRadius: 12,
  padding: '1px 4px 1px 10px',
  margin: '2px 4px 2px 0',
  fontSize: 12,
};

export function MetricPicker({
  value,
  onChange,
  multi = false,
  label,
  description,
  metricOptions = [],
}: MetricPickerProps) {
  const uid = useId();
  const [typed, setTyped] = useState('');
  const listId = `${uid}-metrics`;
  const names = splitList(value);

  const header = (
    <div>
      {label && <label htmlFor={`${uid}-input`}><strong>{label}</strong></label>}
      {description && <p style={muted}>{description}</p>}
    </div>
  );
  const suggestions = (
    <datalist id={listId}>
      {metricOptions.map(name => (
        <option key={name} value={name} />
      ))}
    </datalist>
  );

  if (!multi) {
    return (
      <div>
        {header}
        {suggestions}
        <input
          id={`${uid}-input`}
          type="text"
          list={listId}
          value={typeof value === 'string' ? value : ''}
          onChange={event => onChange?.(event.target.value)}
        />
      </div>
    );
  }

  const add = () => {
    const name = typed.trim();
    if (name === '' || names.includes(name)) return;
    onChange?.(joinList([...names, name]));
    setTyped('');
  };

  return (
    <div>
      {header}
      {suggestions}
      <div>
        {names.map(name => (
          <span key={name} style={chip}>
            {name}
            <button
              type="button"
              aria-label={EDITOR_TEXTS.pickerRemove(name)}
              onClick={() => onChange?.(joinList(names.filter(n => n !== name)))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          id={`${uid}-input`}
          type="text"
          list={listId}
          placeholder={EDITOR_TEXTS.pickerPlaceholder}
          value={typed}
          onChange={event => setTyped(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add}>
          {EDITOR_TEXTS.pickerAdd}
        </button>
      </div>
    </div>
  );
}

// Named components, so that a control keeps a stable identity in Explore.
export const makeMetricPicker = (multi: boolean): ComponentType<Omit<MetricPickerProps, 'multi'>> => {
  const Control = (props: Omit<MetricPickerProps, 'multi'>) => <MetricPicker multi={multi} {...props} />;
  Object.defineProperty(Control, 'name', { value: multi ? 'MetricListPicker' : 'MetricPicker' });
  return Control;
};
