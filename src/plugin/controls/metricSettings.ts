import { Row, joinList, metricNamesFrom, parseList, serializeList, splitList } from './ruleList';

// Model of the per-metric settings card. It reads the same stored values the other controls hold
// (goals, metric definitions, sparkline metrics, protected metrics, weight) and works out which new
// values a change on one metric means. Nothing here has a value of its own: the card is a second
// view over those controls, so a chart keeps the shape it had before.

export interface MetricSettingsInput {
  metrics: string[];
  goals: unknown;
  metricDefinitions: unknown;
  sparklineMetrics: unknown;
  suppressionMetrics: unknown;
  weightColumn: unknown;
  showSparklines: boolean;
  suppressionThreshold: number;
  aggregationMode: string;
}

export interface MetricSettings {
  metric: string;
  goal: { target: unknown; direction: string } | null;
  /** The stored goals cannot be read as a list: the card leaves them alone. */
  goalsInvalid: boolean;
  /** Only a metric that already has a definition has fields to edit. */
  definition: { format?: unknown; decimals?: unknown; polarity?: unknown } | null;
  definitionsInvalid: boolean;
  sparkline: boolean;
  sparklineAvailable: boolean;
  /** The last metric with a sparkline: an empty list would mean "every metric". */
  sparklineLocked: boolean;
  suppression: boolean;
  suppressionAvailable: boolean;
  weight: boolean;
  weightAvailable: boolean;
}

export type StoredValues = Pick<
  MetricSettingsInput,
  'goals' | 'metricDefinitions' | 'sparklineMetrics' | 'suppressionMetrics' | 'weightColumn'
>;

/** New stored value for each control that has to change; empty when nothing does. */
export type Patch = Partial<Record<keyof StoredValues, string>>;

export type Change =
  | { kind: 'goalTarget'; value: number | undefined }
  | { kind: 'goalDirection'; value: string }
  | { kind: 'sparkline'; on: boolean }
  | { kind: 'suppression'; on: boolean }
  | { kind: 'weight'; on: boolean }
  | { kind: 'definition'; key: 'format' | 'decimals' | 'polarity'; value: string | number | undefined };

export const DEFAULT_GOAL_DIRECTION = 'higher_is_better';

export const METRIC_SETTINGS_TEXTS = {
  goalTarget: 'Obiettivo',
  goalDirection: 'Direzione dell’obiettivo',
  sparkline: 'Mostra la sparkline',
  suppression: 'Proteggi dai piccoli numeri',
  weight: 'Usa come peso',
  format: 'Formato',
  decimals: 'Decimali',
  polarity: 'Polarità',
  noDefinition:
    'Nessuna definizione per questa metrica: formato e polarità sono automatici. Per fissarli aggiungi una definizione in «Obiettivi, definizioni e calcoli».',
  goalsInvalid: 'Il contenuto di «Obiettivi per metrica» non è valido: correggilo nella sua vista JSON.',
  definitionsInvalid: 'Il contenuto di «Definizioni delle metriche» non è valido: correggilo nella sua vista JSON.',
  sparklineLocked:
    'Almeno una metrica deve avere la sparkline: per toglierle tutte spegni «Mostra le sparkline di tendenza».',
  empty: 'Scegli almeno una metrica nella sezione Metriche per impostarla qui.',
  summaryGoal: (target: unknown) => `obiettivo ${String(target)}`,
  summarySparkline: 'sparkline',
  summarySuppression: 'protetta',
  summaryWeight: 'peso',
  summaryNothing: 'nessuna impostazione',
};

const firstIndex = (rows: Row[], key: string, metric: string): number =>
  rows.findIndex(row => row[key] === metric);

const sameRows = (a: Row[], b: Row[]): boolean => JSON.stringify(a) === JSON.stringify(b);

export function buildMetricSettings(input: MetricSettingsInput): MetricSettings[] {
  const goals = parseList(input.goals);
  const definitions = parseList(input.metricDefinitions);
  const sparklineNames = splitList(input.sparklineMetrics);
  const suppressed = splitList(input.suppressionMetrics);
  const weight = String(input.weightColumn ?? '').trim();
  const sparklineCount = sparklineNames.length === 0 ? input.metrics.length : sparklineNames.length;

  return input.metrics.map(metric => {
    const goalRow = goals.rows[firstIndex(goals.rows, 'metricKey', metric)];
    const definitionRow = definitions.rows[firstIndex(definitions.rows, 'metric', metric)];
    const sparkline = sparklineNames.length === 0 || sparklineNames.includes(metric);
    return {
      metric,
      goal: goalRow
        ? { target: goalRow.target, direction: String(goalRow.direction ?? DEFAULT_GOAL_DIRECTION) }
        : null,
      goalsInvalid: goals.error !== null,
      definition: definitionRow
        ? { format: definitionRow.format, decimals: definitionRow.decimals, polarity: definitionRow.polarity }
        : null,
      definitionsInvalid: definitions.error !== null,
      sparkline,
      sparklineAvailable: input.showSparklines,
      sparklineLocked: sparkline && sparklineCount === 1,
      suppression: suppressed.includes(metric),
      suppressionAvailable: input.suppressionThreshold > 0,
      weight: weight === metric,
      weightAvailable: input.aggregationMode === 'weighted_avg',
    };
  });
}

// Writes the rows back as the control stores them, or nothing when they did not change.
function rowsPatch(
  key: 'goals' | 'metricDefinitions',
  before: Row[],
  after: Row[],
): Patch {
  return sameRows(before, after) ? {} : { [key]: serializeList(after, 'text') as string };
}

function goalPatch(input: MetricSettingsInput, metric: string, change: Change): Patch {
  const { rows, error } = parseList(input.goals);
  if (error !== null) return {};
  const index = firstIndex(rows, 'metricKey', metric);
  const next = rows.map(row => ({ ...row }));

  if (change.kind === 'goalTarget') {
    if (change.value === undefined) {
      if (index >= 0) next.splice(index, 1);
    } else if (index < 0) {
      next.push({ metricKey: metric, target: change.value, direction: DEFAULT_GOAL_DIRECTION });
    } else {
      next[index].target = change.value;
    }
  } else if (change.kind === 'goalDirection' && index >= 0) {
    next[index].direction = change.value;
  }
  return rowsPatch('goals', rows, next);
}

function definitionPatch(
  input: MetricSettingsInput,
  metric: string,
  change: Extract<Change, { kind: 'definition' }>,
): Patch {
  const { rows, error } = parseList(input.metricDefinitions);
  const index = firstIndex(rows, 'metric', metric);
  // A definition needs a type, and the type decides how parents are aggregated: never invent one.
  if (error !== null || index < 0) return {};
  const next = rows.map(row => ({ ...row }));
  if (change.value === undefined || change.value === '') delete next[index][change.key];
  else next[index][change.key] = change.value;
  return rowsPatch('metricDefinitions', rows, next);
}

function sparklinePatch(input: MetricSettingsInput, metric: string, on: boolean): Patch {
  const listed = splitList(input.sparklineMetrics);
  // An empty list means every metric, so start from the full list to change just one of them.
  const current = listed.length === 0 ? [...input.metrics] : listed;
  const next = on ? (current.includes(metric) ? current : [...current, metric]) : current.filter(n => n !== metric);
  if (next.length === 0) return {};
  const coversEveryMetric = input.metrics.every(n => next.includes(n)) && next.every(n => input.metrics.includes(n));
  const value = coversEveryMetric ? '' : joinList(next);
  return value === String(input.sparklineMetrics ?? '').trim() ? {} : { sparklineMetrics: value };
}

function suppressionPatch(input: MetricSettingsInput, metric: string, on: boolean): Patch {
  const current = splitList(input.suppressionMetrics);
  if (current.includes(metric) === on) return {};
  const next = on ? [...current, metric] : current.filter(n => n !== metric);
  return { suppressionMetrics: joinList(next) };
}

function weightPatch(input: MetricSettingsInput, metric: string, on: boolean): Patch {
  const current = String(input.weightColumn ?? '').trim();
  if (on) return current === metric ? {} : { weightColumn: metric };
  return current === metric ? { weightColumn: '' } : {};
}

export function applyChange(input: MetricSettingsInput, metric: string, change: Change): Patch {
  switch (change.kind) {
    case 'goalTarget':
    case 'goalDirection':
      return goalPatch(input, metric, change);
    case 'definition':
      return definitionPatch(input, metric, change);
    case 'sparkline':
      return sparklinePatch(input, metric, change.on);
    case 'suppression':
      return suppressionPatch(input, metric, change.on);
    case 'weight':
      return weightPatch(input, metric, change.on);
    default:
      return {};
  }
}

type Controls = Record<string, { value?: unknown } | undefined> | undefined;

// What the card reads from the chart: the metrics and the values of the controls it edits.
export function metricSettingsInputFromState(state: { controls?: Controls }): MetricSettingsInput {
  const controls = state?.controls;
  return {
    metrics: metricNamesFrom(controls),
    goals: controls?.goals?.value,
    metricDefinitions: controls?.metricDefinitions?.value,
    sparklineMetrics: controls?.sparklineMetrics?.value,
    suppressionMetrics: controls?.suppressionMetrics?.value,
    weightColumn: controls?.weightColumn?.value,
    showSparklines: Boolean(controls?.showSparklines?.value),
    suppressionThreshold: Number(controls?.suppressionThreshold?.value) || 0,
    aggregationMode: String(controls?.aggregationMode?.value ?? 'sum'),
  };
}
