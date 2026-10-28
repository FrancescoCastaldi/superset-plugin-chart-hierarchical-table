import { CSSProperties, ComponentType, useEffect, useState } from 'react';
import {
  EDITOR_TEXTS,
  FieldSpec,
  Row,
  RuleListSpec,
  dimensionNamesFrom,
  isFilled,
  isVisible,
  kindOf,
  labelOf,
  metricNamesFrom,
  parseList,
  serializeList,
  setField,
  validateRow,
} from './ruleList';
import { useUid } from './useUid';

// Edits a list of rules as rows instead of a JSON text box. The value it reads and writes has the
// same shape as before (JSON text or an array, see the spec), and a JSON view stays available for
// anyone who prefers it. Plain HTML only: the host Superset themes it.

export interface RuleListEditorProps {
  spec: RuleListSpec;
  value?: unknown;
  onChange?: (value: unknown) => void;
  label?: string;
  description?: string;
  metricOptions?: string[];
  dimensionOptions?: string[];
}

const muted: CSSProperties = { fontSize: 12, opacity: 0.75, margin: '2px 0' };
const card: CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.4)',
  borderRadius: 4,
  padding: 8,
  margin: '8px 0',
};
const fieldBox: CSSProperties = { display: 'flex', flexDirection: 'column', margin: '4px 0' };
const fieldLabel: CSSProperties = { fontSize: 12, marginBottom: 2 };
const errorStyle: CSSProperties = { color: '#C0392B', fontSize: 12, margin: '4px 0', paddingLeft: 16 };
const buttonRow: CSSProperties = { display: 'flex', gap: 6, marginTop: 6 };

const toNumber = (text: string): number | undefined => {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Keeps what is being typed (such as "1." or "-") while only a finished number reaches the value.
export function NumberInput({
  id,
  value,
  onCommit,
  disabled = false,
}: {
  id: string;
  value: unknown;
  onCommit: (value: number | undefined) => void;
  disabled?: boolean;
}) {
  const stored = isFilled(value) ? String(value) : '';
  const [draft, setDraft] = useState(stored);
  const [invalid, setInvalid] = useState(false);

  // Follow changes made elsewhere (JSON view, reordering) unless they match what is typed.
  useEffect(() => {
    if (toNumber(draft) !== toNumber(stored)) {
      setDraft(stored);
      setInvalid(false);
    }
  }, [stored]);

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={event => {
          const text = event.target.value;
          const number = toNumber(text);
          setDraft(text);
          setInvalid(text.trim() !== '' && number === undefined);
          onCommit(number);
        }}
      />
      {invalid && <span style={errorStyle}>{EDITOR_TEXTS.notANumber}</span>}
    </>
  );
}

function FieldInput({
  id,
  field,
  row,
  listIds,
  onSet,
}: {
  id: string;
  field: FieldSpec;
  row: Row;
  listIds: { metric: string; dimension: string };
  onSet: (value: string | number | undefined) => void;
}) {
  const kind = kindOf(field, row);
  const current = row[field.key];

  if (kind === 'select') {
    const shown = isFilled(current) ? String(current) : field.default ?? '';
    const offered = (field.options ?? []).map(([value]) => value);
    return (
      <select id={id} value={shown} onChange={event => onSet(event.target.value)}>
        {!offered.includes('') && shown === '' && <option value="">{EDITOR_TEXTS.choose}</option>}
        {shown !== '' && !offered.includes(shown) && <option value={shown}>{shown}</option>}
        {(field.options ?? []).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    );
  }

  if (kind === 'number' || kind === 'integer') {
    return <NumberInput id={id} value={current} onCommit={onSet} />;
  }

  const list = kind === 'metric' ? listIds.metric : kind === 'dimension' ? listIds.dimension : undefined;
  return (
    <input
      id={id}
      type="text"
      list={list}
      placeholder={field.placeholder}
      value={isFilled(current) ? String(current) : ''}
      onChange={event => onSet(event.target.value)}
    />
  );
}

export function RuleListEditor({
  spec,
  value,
  onChange,
  label,
  description,
  metricOptions = [],
  dimensionOptions = [],
}: RuleListEditorProps) {
  const uid = useUid('rule');
  const parsed = parseList(value);
  const [jsonView, setJsonView] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const listIds = { metric: `${uid}-metrics`, dimension: `${uid}-dimensions` };

  const commit = (rows: Row[]) => onChange?.(serializeList(rows, spec.storage));
  const showJson = jsonView || parsed.error !== null;
  const rawText =
    parsed.error === null
      ? JSON.stringify(parsed.rows, null, 2)
      : typeof value === 'string'
        ? value
        : JSON.stringify(value, null, 2);

  const toggleView = () => {
    setDraft(null);
    setJsonError(null);
    setJsonView(!jsonView);
  };

  const header = (
    <div>
      {label && <strong>{label}</strong>}
      {description && <p style={muted}>{description}</p>}
    </div>
  );

  if (showJson) {
    const error = jsonError ?? parsed.error;
    return (
      <div>
        {header}
        <label style={fieldLabel} htmlFor={`${uid}-json`}>
          {EDITOR_TEXTS.jsonLabel}
        </label>
        <textarea
          id={`${uid}-json`}
          rows={10}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          value={draft ?? rawText}
          onChange={event => {
            const text = event.target.value;
            setDraft(text);
            const result = parseList(text);
            setJsonError(result.error);
            if (result.error === null) commit(result.rows);
          }}
        />
        {error && (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        )}
        {parsed.error === null && (
          <div style={buttonRow}>
            <button type="button" onClick={toggleView}>
              {EDITOR_TEXTS.showEditor}
            </button>
          </div>
        )}
      </div>
    );
  }

  const { rows } = parsed;
  const update = (index: number, next: Row) => commit(rows.map((row, i) => (i === index ? next : row)));
  const move = (from: number, to: number) => {
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  return (
    <div>
      {header}
      <datalist id={listIds.metric}>
        {metricOptions.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id={listIds.dimension}>
        {dimensionOptions.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {rows.length === 0 && <p style={muted}>{spec.emptyText}</p>}

      {rows.map((row, index) => {
        const messages = validateRow(spec, row, rows, index);
        const preview = spec.preview(row);
        return (
          <fieldset key={index} style={card}>
            <legend style={fieldLabel}>{EDITOR_TEXTS.item(index + 1)}</legend>
            {spec.fields.filter(field => isVisible(field, row)).map(field => {
              const id = `${uid}-${index}-${field.key}`;
              return (
                <div key={field.key} style={fieldBox}>
                  <label htmlFor={id} style={fieldLabel}>
                    {labelOf(field, row)}
                  </label>
                  <FieldInput
                    id={id}
                    field={field}
                    row={row}
                    listIds={listIds}
                    onSet={fieldValue => update(index, setField(spec, row, field.key, fieldValue))}
                  />
                </div>
              );
            })}
            {preview && <p style={muted}>{preview}</p>}
            {messages.length > 0 && (
              <div role="alert" style={errorStyle}>
                {messages.map(message => (
                  <div key={message}>{message}</div>
                ))}
              </div>
            )}
            <div style={buttonRow}>
              <button type="button" disabled={index === 0} onClick={() => move(index, index - 1)}>
                {EDITOR_TEXTS.moveUp}
              </button>
              <button type="button" disabled={index === rows.length - 1} onClick={() => move(index, index + 1)}>
                {EDITOR_TEXTS.moveDown}
              </button>
              <button type="button" onClick={() => commit(rows.filter((_, i) => i !== index))}>
                {EDITOR_TEXTS.remove}
              </button>
            </div>
          </fieldset>
        );
      })}

      <div style={buttonRow}>
        <button type="button" onClick={() => commit([...rows, spec.newRow(rows)])}>
          {spec.addLabel}
        </button>
        <button type="button" onClick={toggleView}>
          {EDITOR_TEXTS.showJson}
        </button>
      </div>
    </div>
  );
}

// Explore passes the control state as props and takes a component as the control type. Each spec
// gets its own named component so that a control keeps a stable identity.
export function makeRuleListControl(spec: RuleListSpec): ComponentType<Omit<RuleListEditorProps, 'spec'>> {
  const Control = (props: Omit<RuleListEditorProps, 'spec'>) => <RuleListEditor spec={spec} {...props} />;
  Object.defineProperty(Control, 'name', { value: `RuleList_${spec.id}` });
  return Control;
}

// The names the dropdowns offer follow the metrics and dimensions chosen in the chart.
export const editorOptionsFromState = (state: { controls?: any }) => ({
  metricOptions: metricNamesFrom(state?.controls),
  dimensionOptions: dimensionNamesFrom(state?.controls),
});
