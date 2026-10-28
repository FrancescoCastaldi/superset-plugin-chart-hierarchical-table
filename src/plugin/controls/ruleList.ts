// Pure helpers behind the rule list editors: read and write the stored value, edit one field of a
// row, validate rows and read the names the dropdowns offer. No React here, so it is easy to test.
//
// The stored value keeps the exact shape each control had before the editors: JSON text for goals,
// metric definitions, table calculations and dimension limits, a real array for conditional rules.
// Keys the editor does not know are kept untouched, so a row never loses data it does not show.

export type Row = Record<string, unknown>;
export type Storage = 'text' | 'array';
export type FieldKind = 'metric' | 'dimension' | 'select' | 'number' | 'integer' | 'text';

export interface FieldSpec {
  key: string;
  label: string | ((row: Row) => string);
  kind: FieldKind | ((row: Row) => FieldKind);
  /** Pairs of stored value and label, for `select`. An empty value means "not set". */
  options?: readonly (readonly [string, string])[];
  /** What the transform assumes while the key is missing; shown by `select`, never written. */
  default?: string;
  required?: boolean | ((row: Row) => boolean);
  /** The field is shown, checked and kept only while this holds for the row. */
  visibleWhen?: (row: Row) => boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface RuleListSpec {
  id: string;
  storage: Storage;
  addLabel: string;
  emptyText: string;
  fields: FieldSpec[];
  /** Keys that older examples suggested but that have no effect; dropped whenever a row is edited. */
  legacyKeys?: string[];
  newRow: (rows: Row[]) => Row;
  /** Extra checks across fields or across rows. */
  check?: (row: Row, rows: Row[], index: number) => string[];
  /** The rule in one plain sentence, or an empty text while the row is incomplete. */
  preview: (row: Row) => string;
}

export interface ParsedList {
  rows: Row[];
  error: string | null;
}

// Texts of the editor chrome, kept here so they can be checked for language like the specs.
export const EDITOR_TEXTS = {
  item: (position: number) => `Voce ${position}`,
  remove: 'Rimuovi',
  moveUp: 'Sposta su',
  moveDown: 'Sposta giù',
  showJson: 'Modifica come JSON',
  showEditor: 'Torna all’editor',
  jsonLabel: 'JSON',
  notANumber: 'Non è un numero.',
  choose: 'Scegli',
  pickerAdd: 'Aggiungi',
  pickerRemove: (name: string) => `Rimuovi ${name}`,
  pickerPlaceholder: 'Scrivi o scegli una metrica',
};

export const PARSE_ERRORS = {
  invalidJson: 'Il contenuto non è un JSON valido: correggilo nella vista JSON.',
  notAList: 'Il contenuto deve essere un elenco, per esempio [ { ... } ].',
  notObjects: 'Ogni voce dell’elenco deve essere un oggetto.',
};

const isRow = (item: unknown): item is Row =>
  Boolean(item) && typeof item === 'object' && !Array.isArray(item);

export function parseList(value: unknown): ParsedList {
  let data: unknown = value;
  if (typeof value === 'string') {
    if (value.trim() === '') return { rows: [], error: null };
    try {
      data = JSON.parse(value);
    } catch {
      return { rows: [], error: PARSE_ERRORS.invalidJson };
    }
  }
  if (data === undefined || data === null) return { rows: [], error: null };
  if (!Array.isArray(data)) return { rows: [], error: PARSE_ERRORS.notAList };
  if (!data.every(isRow)) return { rows: [], error: PARSE_ERRORS.notObjects };
  return { rows: data, error: null };
}

export function serializeList(rows: Row[], storage: Storage): string | Row[] {
  if (storage === 'array') return rows;
  return rows.length === 0 ? '' : JSON.stringify(rows, null, 2);
}

export const kindOf = (field: FieldSpec, row: Row): FieldKind =>
  typeof field.kind === 'function' ? field.kind(row) : field.kind;

export const labelOf = (field: FieldSpec, row: Row): string =>
  typeof field.label === 'function' ? field.label(row) : field.label;

export const isVisible = (field: FieldSpec, row: Row): boolean =>
  field.visibleWhen ? field.visibleWhen(row) : true;

/** A value the user has filled in: not missing, null or blank text. */
export const isFilled = (value: unknown): boolean =>
  value !== undefined && value !== null && String(value).trim() !== '';

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Removes the fields hidden for the row and the legacy keys; every other key stays. */
export function pruneRow(spec: RuleListSpec, row: Row): Row {
  const pruned: Row = { ...row };
  spec.legacyKeys?.forEach(key => delete pruned[key]);
  spec.fields.filter(field => !isVisible(field, pruned)).forEach(field => delete pruned[field.key]);
  return pruned;
}

/** A copy of the row with one field set; an empty value removes the key. */
export function setField(
  spec: RuleListSpec,
  row: Row,
  key: string,
  value: string | number | undefined,
): Row {
  const next: Row = { ...row };
  if (value === undefined || value === '') delete next[key];
  else next[key] = value;
  return pruneRow(spec, next);
}

export function validateRow(spec: RuleListSpec, row: Row, rows: Row[], index: number): string[] {
  const messages: string[] = [];
  spec.fields.filter(field => isVisible(field, row)).forEach(field => {
    const label = labelOf(field, row);
    const value = row[field.key];
    const required = typeof field.required === 'function' ? field.required(row) : field.required;
    if (!isFilled(value)) {
      if (required) messages.push(`Compila «${label}».`);
      return;
    }
    const kind = kindOf(field, row);
    if (kind !== 'number' && kind !== 'integer') return;
    const number = asNumber(value);
    if (number === null) messages.push(`«${label}» deve essere un numero.`);
    else if (kind === 'integer' && !Number.isInteger(number)) {
      messages.push(`«${label}» deve essere un numero intero.`);
    } else if (field.min !== undefined && number < field.min) {
      messages.push(`«${label}» deve essere almeno ${field.min}.`);
    } else if (field.max !== undefined && number > field.max) {
      messages.push(`«${label}» deve essere al massimo ${field.max}.`);
    }
  });
  return [...messages, ...(spec.check ? spec.check(row, rows, index) : [])];
}

type Controls = Record<string, { value?: unknown } | undefined> | undefined;

const toArray = (value: unknown): unknown[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

/** Names the user can pick for a metric: the metrics selected in the chart. */
export function metricNamesFrom(controls: Controls): string[] {
  return toArray(controls?.metrics?.value).map((m: any) =>
    typeof m === 'string' ? m : m?.label || m?.metric_name || String(m),
  );
}

/** Names of the hierarchy dimensions; pivot-less modes have none. */
export function dimensionNamesFrom(controls: Controls): string[] {
  if (controls?.hierarchyType?.value !== 'multi_dimension') return [];
  return toArray(controls?.groupby?.value).map((d: any) =>
    typeof d === 'string' ? d : d?.column_name || d?.label || d?.sqlExpression || String(d),
  );
}

/** Metric lists are stored as "a, b": split into names, without blanks or repeats. */
export function splitList(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  const names = text.split(',').map(name => name.trim()).filter(Boolean);
  return names.filter((name, index) => names.indexOf(name) === index);
}

export const joinList = (names: string[]): string => names.join(', ');
