import {
  FieldSpec,
  RuleListSpec,
  Row,
  dimensionNamesFrom,
  joinList,
  metricNamesFrom,
  parseList,
  pruneRow,
  serializeList,
  setField,
  splitList,
  validateRow,
} from '../src/plugin/controls/ruleList';

const spec = (overrides: Partial<RuleListSpec> = {}): RuleListSpec => ({
  id: 'demo',
  storage: 'text',
  addLabel: 'Aggiungi',
  emptyText: 'Nessuna voce',
  fields: [
    { key: 'metric', label: 'Metrica', kind: 'metric', required: true },
    { key: 'kind', label: 'Tipo', kind: 'select', options: [['a', 'A'], ['b', 'B']] },
    { key: 'extra', label: 'Extra', kind: 'number', visibleWhen: row => row.kind === 'b' },
    { key: 'count', label: 'Quanti', kind: 'integer', min: 1, max: 9 },
  ],
  legacyKeys: ['old'],
  newRow: () => ({ metric: '' }),
  preview: row => String(row.metric ?? ''),
  ...overrides,
});

describe('parseList', () => {
  it('reads an empty control as an empty list', () => {
    expect(parseList('')).toEqual({ rows: [], error: null });
    expect(parseList('   ')).toEqual({ rows: [], error: null });
    expect(parseList(undefined)).toEqual({ rows: [], error: null });
    expect(parseList(null)).toEqual({ rows: [], error: null });
  });

  it('reads both stored shapes: JSON text and a real array', () => {
    expect(parseList('[{"metric":"x"}]').rows).toEqual([{ metric: 'x' }]);
    expect(parseList([{ metric: 'x' }]).rows).toEqual([{ metric: 'x' }]);
  });

  it('reports invalid JSON instead of hiding it', () => {
    expect(parseList('[{"metric":').error).toMatch(/JSON valido/);
  });

  it('reports content that is not a list of objects', () => {
    expect(parseList('{"metric":"x"}').error).toMatch(/elenco/);
    expect(parseList('["x"]').error).toMatch(/oggetto/);
    expect(parseList([1, 2]).error).toMatch(/oggetto/);
  });
});

describe('serializeList', () => {
  it('writes the empty default of each storage kind', () => {
    expect(serializeList([], 'text')).toBe('');
    expect(serializeList([], 'array')).toEqual([]);
  });

  it('writes JSON text or the array itself', () => {
    const rows = [{ metric: 'x', target: 1 }];
    expect(JSON.parse(serializeList(rows, 'text') as string)).toEqual(rows);
    expect(serializeList(rows, 'array')).toEqual(rows);
  });
});

describe('setField', () => {
  it('removes a key when the select goes back to empty', () => {
    expect(setField(spec(), { metric: 'x', kind: 'a' }, 'kind', '')).toEqual({ metric: 'x' });
  });

  it('removes a numeric key when the value is missing and keeps numbers as numbers', () => {
    expect(setField(spec(), { count: 3 }, 'count', undefined)).toEqual({});
    expect(setField(spec(), {}, 'count', 4)).toEqual({ count: 4 });
  });

  it('keeps keys the editor does not know', () => {
    expect(setField(spec(), { metric: 'x', icon: 'dot' }, 'metric', 'y')).toEqual({ metric: 'y', icon: 'dot' });
  });

  it('does not change the original row', () => {
    const row: Row = { metric: 'x' };
    setField(spec(), row, 'metric', 'y');
    expect(row).toEqual({ metric: 'x' });
  });
});

describe('pruneRow', () => {
  it('drops the fields hidden for the row and the legacy keys', () => {
    expect(pruneRow(spec(), { metric: 'x', kind: 'a', extra: 5, old: 1 })).toEqual({ metric: 'x', kind: 'a' });
    expect(pruneRow(spec(), { metric: 'x', kind: 'b', extra: 5 })).toEqual({ metric: 'x', kind: 'b', extra: 5 });
  });

  it('keeps unknown keys', () => {
    expect(pruneRow(spec(), { metric: 'x', icon: 'dot' })).toEqual({ metric: 'x', icon: 'dot' });
  });
});

describe('validateRow', () => {
  it('asks for the required fields', () => {
    expect(validateRow(spec(), { metric: '' }, [{ metric: '' }], 0)).toEqual(['Compila «Metrica».']);
    expect(validateRow(spec(), { metric: 'x' }, [{ metric: 'x' }], 0)).toEqual([]);
  });

  it('applies required rules that depend on the row', () => {
    const conditional = spec({
      fields: [{ key: 'a', label: 'A', kind: 'text', required: row => row.on === true }],
    });
    expect(validateRow(conditional, { on: true }, [], 0)).toEqual(['Compila «A».']);
    expect(validateRow(conditional, { on: false }, [], 0)).toEqual([]);
  });

  it('checks numbers, integers and bounds, and accepts numeric text from saved charts', () => {
    expect(validateRow(spec(), { metric: 'x', count: 1.5 }, [], 0)).toEqual(['«Quanti» deve essere un numero intero.']);
    expect(validateRow(spec(), { metric: 'x', count: 0 }, [], 0)).toEqual(['«Quanti» deve essere almeno 1.']);
    expect(validateRow(spec(), { metric: 'x', count: 10 }, [], 0)).toEqual(['«Quanti» deve essere al massimo 9.']);
    expect(validateRow(spec(), { metric: 'x', count: '3' }, [], 0)).toEqual([]);
    expect(validateRow(spec(), { metric: 'x', count: 'abc' }, [], 0)).toEqual(['«Quanti» deve essere un numero.']);
  });

  it('does not check hidden fields', () => {
    const hidden = spec({
      fields: [{ key: 'x', label: 'X', kind: 'text', required: true, visibleWhen: () => false } as FieldSpec],
    });
    expect(validateRow(hidden, {}, [], 0)).toEqual([]);
  });

  it('adds the messages of the spec check, given the other rows', () => {
    const withCheck = spec({
      check: (row, rows, index) =>
        rows.findIndex(r => r.metric === row.metric) < index ? ['Duplicata.'] : [],
    });
    const rows = [{ metric: 'x' }, { metric: 'x' }];
    expect(validateRow(withCheck, rows[0], rows, 0)).toEqual([]);
    expect(validateRow(withCheck, rows[1], rows, 1)).toEqual(['Duplicata.']);
  });
});

describe('metric and dimension names', () => {
  it('reads saved metrics and adhoc metrics', () => {
    const controls = {
      metrics: { value: ['a', { label: 'B (corrente)' }, { metric_name: 'c' }] },
    };
    expect(metricNamesFrom(controls)).toEqual(['a', 'B (corrente)', 'c']);
  });

  it('handles a missing or single metric', () => {
    expect(metricNamesFrom({})).toEqual([]);
    expect(metricNamesFrom(undefined)).toEqual([]);
    expect(metricNamesFrom({ metrics: { value: 'solo' } })).toEqual(['solo']);
  });

  it('reads the hierarchy dimensions only in multi-dimension mode', () => {
    const controls = {
      hierarchyType: { value: 'multi_dimension' },
      groupby: { value: ['area', { column_name: 'reparto' }] },
    };
    expect(dimensionNamesFrom(controls)).toEqual(['area', 'reparto']);
    expect(dimensionNamesFrom({ ...controls, hierarchyType: { value: 'parent_child' } })).toEqual([]);
  });
});

describe('metric lists stored as comma separated text', () => {
  it('splits, trims and drops empty and repeated names', () => {
    expect(splitList('casi, ricoveri ,, casi')).toEqual(['casi', 'ricoveri']);
    expect(splitList('')).toEqual([]);
    expect(splitList(undefined)).toEqual([]);
  });

  it('joins names the way the transform reads them', () => {
    expect(joinList(['casi', 'ricoveri'])).toBe('casi, ricoveri');
    expect(joinList([])).toBe('');
  });
});
