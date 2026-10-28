import { CSSProperties } from 'react';
import { NumberInput } from './RuleListEditor';
import { isFilled, validateRow } from './ruleList';
import { GOALS_SPEC, METRIC_DEFINITIONS_SPEC } from './ruleSpecs';
import { useUid } from './useUid';
import {
  Change,
  DEFAULT_GOAL_DIRECTION,
  METRIC_SETTINGS_TEXTS as T,
  MetricSettings,
  MetricSettingsInput,
  applyChange,
  buildMetricSettings,
  metricSettingsInputFromState,
} from './metricSettings';

// One card per chart metric, with the settings that belong to that metric gathered in one place.
// It holds no value of its own: it reads the goals, definitions, sparklines, protection and weight
// controls and writes back to them, so the other editors always show the same data.

export interface MetricSettingsCardsProps {
  inputs: MetricSettingsInput;
  /** The Explore actions passed to every control. */
  actions?: { setControlValue?: (name: string, value: unknown) => void };
  label?: string;
  description?: string;
}

const muted: CSSProperties = { fontSize: 12, opacity: 0.75, margin: '2px 0' };
const note: CSSProperties = { fontSize: 12, margin: '4px 0', opacity: 0.85 };
const card: CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.4)',
  borderRadius: 4,
  padding: '4px 8px',
  margin: '6px 0',
};
const fieldBox: CSSProperties = { display: 'flex', flexDirection: 'column', margin: '4px 0' };
const fieldLabel: CSSProperties = { fontSize: 12, marginBottom: 2 };
const errorStyle: CSSProperties = { color: '#C0392B', fontSize: 12, margin: '2px 0' };

const optionsOf = (spec: { fields: { key: string; options?: readonly (readonly [string, string])[] }[] }, key: string) =>
  spec.fields.find(field => field.key === key)?.options ?? [];

const DIRECTION_OPTIONS = optionsOf(GOALS_SPEC, 'direction');
const FORMAT_OPTIONS = optionsOf(METRIC_DEFINITIONS_SPEC, 'format');
const POLARITY_OPTIONS = optionsOf(METRIC_DEFINITIONS_SPEC, 'polarity');
const DECIMALS_FIELD = METRIC_DEFINITIONS_SPEC.fields.find(field => field.key === 'decimals')!;

const text = (value: unknown): string => (isFilled(value) ? String(value) : '');

// "obiettivo 40, sparkline, protetta": what is set for the metric, readable on the closed card.
function summarize(settings: MetricSettings): string {
  const parts: string[] = [];
  if (settings.goal && isFilled(settings.goal.target)) parts.push(T.summaryGoal(settings.goal.target));
  if (settings.sparklineAvailable && settings.sparkline) parts.push(T.summarySparkline);
  if (settings.suppressionAvailable && settings.suppression) parts.push(T.summarySuppression);
  if (settings.weightAvailable && settings.weight) parts.push(T.summaryWeight);
  return parts.length > 0 ? parts.join(', ') : T.summaryNothing;
}

function ChoiceSelect({
  id,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly (readonly [string, string])[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  // A stored value the list does not offer stays visible instead of being replaced.
  const offered = options.map(([stored]) => stored);
  return (
    <select id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      {value !== '' && !offered.includes(value) && <option value={value}>{value}</option>}
      {options.map(([stored, label]) => (
        <option key={stored} value={stored}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Switch({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div style={fieldBox}>
      <label htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={event => onChange(event.target.checked)}
        />{' '}
        {label}
      </label>
    </div>
  );
}

export function MetricSettingsCards({ inputs, actions, label, description }: MetricSettingsCardsProps) {
  const uid = useUid('metric');
  const settings = buildMetricSettings(inputs);

  const apply = (metric: string, change: Change) => {
    const patch = applyChange(inputs, metric, change);
    Object.entries(patch).forEach(([name, value]) => actions?.setControlValue?.(name, value));
  };

  return (
    <div>
      {label && <strong>{label}</strong>}
      {description && <p style={muted}>{description}</p>}
      {settings.length === 0 && <p style={muted}>{T.empty}</p>}

      {settings.map((item, index) => {
        const id = (field: string) => `${uid}-${index}-${field}`;
        const decimalsErrors = item.definition
          ? validateRow({ ...METRIC_DEFINITIONS_SPEC, fields: [DECIMALS_FIELD], check: undefined }, { decimals: item.definition.decimals }, [], 0)
          : [];
        return (
          <details key={item.metric} style={card} open={settings.length <= 3}>
            <summary>
              <span className="metric-name">{item.metric}</span>{' '}
              <span className="metric-summary" style={muted}>
                {summarize(item)}
              </span>
            </summary>

            <div style={fieldBox}>
              <label htmlFor={id('target')} style={fieldLabel}>
                {T.goalTarget}
              </label>
              <NumberInput
                id={id('target')}
                value={item.goal?.target}
                disabled={item.goalsInvalid}
                onCommit={value => apply(item.metric, { kind: 'goalTarget', value })}
              />
            </div>
            <div style={fieldBox}>
              <label htmlFor={id('direction')} style={fieldLabel}>
                {T.goalDirection}
              </label>
              <ChoiceSelect
                id={id('direction')}
                value={item.goal?.direction ?? DEFAULT_GOAL_DIRECTION}
                options={DIRECTION_OPTIONS}
                disabled={item.goalsInvalid || item.goal === null}
                onChange={value => apply(item.metric, { kind: 'goalDirection', value })}
              />
            </div>
            {item.goalsInvalid && <p style={errorStyle}>{T.goalsInvalid}</p>}

            {item.sparklineAvailable && (
              <>
                <Switch
                  id={id('sparkline')}
                  label={T.sparkline}
                  checked={item.sparkline}
                  disabled={item.sparklineLocked}
                  onChange={on => apply(item.metric, { kind: 'sparkline', on })}
                />
                {item.sparklineLocked && <p style={note}>{T.sparklineLocked}</p>}
              </>
            )}
            {item.suppressionAvailable && (
              <Switch
                id={id('suppression')}
                label={T.suppression}
                checked={item.suppression}
                onChange={on => apply(item.metric, { kind: 'suppression', on })}
              />
            )}
            {item.weightAvailable && (
              <Switch
                id={id('weight')}
                label={T.weight}
                checked={item.weight}
                onChange={on => apply(item.metric, { kind: 'weight', on })}
              />
            )}

            {item.definitionsInvalid && <p style={errorStyle}>{T.definitionsInvalid}</p>}
            {!item.definitionsInvalid && item.definition === null && <p style={note}>{T.noDefinition}</p>}
            {item.definition && (
              <>
                <div style={fieldBox}>
                  <label htmlFor={id('format')} style={fieldLabel}>
                    {T.format}
                  </label>
                  <ChoiceSelect
                    id={id('format')}
                    value={text(item.definition.format)}
                    options={FORMAT_OPTIONS}
                    onChange={value => apply(item.metric, { kind: 'definition', key: 'format', value })}
                  />
                </div>
                <div style={fieldBox}>
                  <label htmlFor={id('decimals')} style={fieldLabel}>
                    {T.decimals}
                  </label>
                  <NumberInput
                    id={id('decimals')}
                    value={item.definition.decimals}
                    onCommit={value => apply(item.metric, { kind: 'definition', key: 'decimals', value })}
                  />
                  {decimalsErrors.map(message => (
                    <span key={message} style={errorStyle}>
                      {message}
                    </span>
                  ))}
                </div>
                <div style={fieldBox}>
                  <label htmlFor={id('polarity')} style={fieldLabel}>
                    {T.polarity}
                  </label>
                  <ChoiceSelect
                    id={id('polarity')}
                    value={text(item.definition.polarity)}
                    options={POLARITY_OPTIONS}
                    onChange={value => apply(item.metric, { kind: 'definition', key: 'polarity', value })}
                  />
                </div>
              </>
            )}
          </details>
        );
      })}
    </div>
  );
}

// Explore passes the control state as props; the card reads the other controls through this.
export const metricSettingsProps = (state: { controls?: any }) => ({
  inputs: metricSettingsInputFromState(state),
});
