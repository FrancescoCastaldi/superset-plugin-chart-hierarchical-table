jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
  ensureIsArray: (val: any) =>
    val === null || val === undefined ? [] : Array.isArray(val) ? val : [val],
}));

import {
  CONDITIONAL_FORMATTING_SPEC,
  DIMENSION_LIMITS_SPEC,
  GOALS_SPEC,
  METRIC_DEFINITIONS_SPEC,
  RULE_LIST_SPECS,
  TABLE_CALCULATIONS_SPEC,
} from '../src/plugin/controls/ruleSpecs';
import {
  Row,
  RuleListSpec,
  isVisible,
  serializeList,
  setField,
  validateRow,
} from '../src/plugin/controls/ruleList';
import { normalizeConditionalFormatting } from '../src/utils/conditionalFormatting';
import { normalizeDimensionLimits } from '../src/utils/dimensionLimits';
import { normalizeGoals } from '../src/utils/goalBenchmark';
import { normalizeMetricDefinitions } from '../src/utils/metricSemantics';
import { normalizeTableCalculations } from '../src/utils/tableCalculations';

const stored = (spec: RuleListSpec, rows: Row[]) => serializeList(rows, spec.storage);
const errorsOf = (spec: RuleListSpec, row: Row, rows: Row[] = [row], index = 0) =>
  validateRow(spec, row, rows, index);
const visibleKeys = (spec: RuleListSpec, row: Row) =>
  spec.fields.filter(field => isVisible(field, row)).map(field => field.key);

describe('the five editors cover the five controls', () => {
  it('maps each control name to its spec and storage kind', () => {
    expect(Object.keys(RULE_LIST_SPECS).sort()).toEqual([
      'conditionalFormatting',
      'dimensionLimits',
      'goals',
      'metricDefinitions',
      'tableCalculations',
    ]);
    expect(RULE_LIST_SPECS.conditionalFormatting.storage).toBe('array');
    ['goals', 'metricDefinitions', 'tableCalculations', 'dimensionLimits'].forEach(name => {
      expect(RULE_LIST_SPECS[name].storage).toBe('text');
    });
  });
});

describe('goals editor', () => {
  const row = { metricKey: 'revenue', target: 1000, direction: 'higher_is_better' };

  it('writes what normalizeGoals reads', () => {
    expect(normalizeGoals(stored(GOALS_SPEC, [row]))).toEqual([row]);
  });

  it('starts with the usual direction and asks for metric and target', () => {
    const fresh = GOALS_SPEC.newRow([]);
    expect(fresh.direction).toBe('higher_is_better');
    expect(errorsOf(GOALS_SPEC, fresh)).toEqual(['Compila «Metrica».', 'Compila «Obiettivo».']);
  });

  it('warns that only the first goal of a metric counts', () => {
    const rows = [row, { ...row, target: 5 }];
    expect(errorsOf(GOALS_SPEC, rows[0], rows, 0)).toEqual([]);
    expect(errorsOf(GOALS_SPEC, rows[1], rows, 1)).toEqual([
      'Questa metrica ha già un obiettivo sopra: conta solo il primo.',
    ]);
  });

  it('describes the goal', () => {
    expect(GOALS_SPEC.preview(row)).toBe('revenue: obiettivo 1000, più alto è meglio.');
    expect(GOALS_SPEC.preview({ ...row, direction: 'lower_is_better' })).toBe(
      'revenue: obiettivo 1000, più basso è meglio.',
    );
    expect(GOALS_SPEC.preview({ metricKey: 'revenue' })).toBe('');
  });
});

describe('conditional formatting editor', () => {
  const rule = { metric: 'revenue', operator: '>', targetValue: 100, scope: 'cell', priority: 1 };

  it('writes what normalizeConditionalFormatting reads', () => {
    const [normalized] = normalizeConditionalFormatting(stored(CONDITIONAL_FORMATTING_SPEC, [rule]));
    expect(normalized).toMatchObject(rule);
  });

  it('numbers the new rule after the existing ones', () => {
    expect(CONDITIONAL_FORMATTING_SPEC.newRow([rule]).priority).toBe(2);
    expect(CONDITIONAL_FORMATTING_SPEC.newRow([]).priority).toBe(1);
  });

  it('shows the upper bound only for between and turns the threshold into a pattern for regex', () => {
    expect(visibleKeys(CONDITIONAL_FORMATTING_SPEC, rule)).not.toContain('targetValue2');
    expect(visibleKeys(CONDITIONAL_FORMATTING_SPEC, { ...rule, operator: 'between' })).toContain('targetValue2');
    const field = CONDITIONAL_FORMATTING_SPEC.fields.find(f => f.key === 'targetValue')!;
    expect((field.kind as (r: Row) => string)(rule)).toBe('number');
    expect((field.kind as (r: Row) => string)({ ...rule, operator: 'regex' })).toBe('text');
  });

  it('drops the upper bound when the operator is no longer between', () => {
    const between = { ...rule, operator: 'between', targetValue2: 50 };
    expect(setField(CONDITIONAL_FORMATTING_SPEC, between, 'operator', '<')).not.toHaveProperty('targetValue2');
  });

  it('keeps the keys it does not edit, such as the icon and the highlight flag', () => {
    const rich = { ...rule, icon: 'dot', highlightRow: true };
    expect(setField(CONDITIONAL_FORMATTING_SPEC, rich, 'metric', 'costi')).toMatchObject({
      icon: 'dot',
      highlightRow: true,
    });
  });

  it('checks the threshold, the upper bound and the pattern', () => {
    expect(errorsOf(CONDITIONAL_FORMATTING_SPEC, { ...rule, targetValue: undefined })).toEqual([
      'Compila «Valore».',
    ]);
    expect(errorsOf(CONDITIONAL_FORMATTING_SPEC, { ...rule, operator: 'between' })).toEqual([
      'Compila «Fino a».',
    ]);
    expect(errorsOf(CONDITIONAL_FORMATTING_SPEC, { ...rule, operator: 'regex', targetValue: '^Nord$' })).toEqual([]);
    expect(
      errorsOf(CONDITIONAL_FORMATTING_SPEC, { ...rule, operator: 'regex', targetValue: '(a+)+$' }),
    ).toEqual(['L’espressione non è valida o è troppo complessa: la regola non verrà applicata.']);
    expect(
      errorsOf(CONDITIONAL_FORMATTING_SPEC, { ...rule, operator: 'regex', targetValue: '(' }),
    ).toEqual(['L’espressione non è valida o è troppo complessa: la regola non verrà applicata.']);
  });

  it('describes the rule with its color', () => {
    const preview = CONDITIONAL_FORMATTING_SPEC.preview;
    expect(preview(rule)).toBe('Se revenue è maggiore di 100: evidenzia la cella in verde (priorità 1).');
    expect(preview({ ...rule, operator: 'between', targetValue: 10, targetValue2: 50, scope: 'row', priority: 2 })).toBe(
      'Se revenue è compreso tra 10 e 50: evidenzia la riga in ambra (priorità 2).',
    );
    expect(preview({ ...rule, operator: 'regex', targetValue: '^Nord', scope: 'column', priority: 3 })).toBe(
      'Se revenue corrisponde all’espressione «^Nord»: evidenzia la colonna in rosso (priorità 3).',
    );
    expect(preview({ metric: 'revenue', operator: '>' })).toBe('');
  });
});

describe('metric definitions editor', () => {
  const ratio = {
    metric: 'pct_in_soglia',
    type: 'ratio',
    numerator: 'entro_soglia',
    denominator: 'prenotazioni',
    scale: 100,
    format: 'percent',
  };

  it('writes what normalizeMetricDefinitions reads', () => {
    expect(normalizeMetricDefinitions(stored(METRIC_DEFINITIONS_SPEC, [ratio]))).toEqual([ratio]);
  });

  it('shows only the operands of the chosen type', () => {
    const keys = (type: string) => visibleKeys(METRIC_DEFINITIONS_SPEC, { metric: 'm', type });
    expect(keys('ratio')).toEqual(expect.arrayContaining(['numerator', 'denominator', 'scale']));
    expect(keys('ratio')).not.toContain('current');
    expect(keys('diff')).toEqual(expect.arrayContaining(['current', 'baseline']));
    expect(keys('delta_pct')).toEqual(expect.arrayContaining(['current', 'baseline']));
    expect(keys('mean')).toContain('weight');
    expect(keys('distinct_count')).toContain('entityDimension');
    expect(keys('sum')).not.toContain('weight');
  });

  it('clears the operands of the previous type when the type changes', () => {
    const changed = setField(METRIC_DEFINITIONS_SPEC, ratio, 'type', 'sum');
    expect(changed).toEqual({ metric: 'pct_in_soglia', type: 'sum', format: 'percent' });
  });

  it('asks for the operands the type needs', () => {
    expect(errorsOf(METRIC_DEFINITIONS_SPEC, { metric: 'm', type: 'ratio', numerator: 'a' })).toEqual([
      'Compila «Denominatore».',
    ]);
    expect(errorsOf(METRIC_DEFINITIONS_SPEC, { metric: 'm', type: 'diff', current: 'a' })).toEqual([
      'Compila «Valore di confronto».',
    ]);
    expect(errorsOf(METRIC_DEFINITIONS_SPEC, { metric: 'm', type: 'sum' })).toEqual([]);
  });

  it('limits decimals to the range the transform accepts', () => {
    expect(errorsOf(METRIC_DEFINITIONS_SPEC, { metric: 'm', type: 'sum', decimals: 7 })).toEqual([
      '«Decimali» deve essere al massimo 6.',
    ]);
  });

  it('warns that only the first definition of a metric counts', () => {
    const rows = [{ metric: 'm', type: 'sum' }, { metric: 'm', type: 'mean' }];
    expect(errorsOf(METRIC_DEFINITIONS_SPEC, rows[1], rows, 1)).toEqual([
      'Questa metrica è già definita sopra: conta solo la prima.',
    ]);
  });

  it('describes each type', () => {
    const preview = METRIC_DEFINITIONS_SPEC.preview;
    expect(preview(ratio)).toBe(
      'pct_in_soglia = entro_soglia / prenotazioni × 100. Padri e totali sono un rapporto di somme.',
    );
    expect(preview({ metric: 'm', type: 'sum' })).toBe('m: somma. I nodi padre sommano i figli.');
    expect(preview({ metric: 'm', type: 'mean', weight: 'peso' })).toBe('m: media ponderata su peso.');
    expect(preview({ metric: 'm', type: 'mean' })).toBe('m: media semplice.');
    expect(preview({ metric: 'm', type: 'distinct_count', entityDimension: 'asl' })).toBe(
      'm: conteggio distinto di asl.',
    );
    expect(preview({ metric: 'm', type: 'delta_pct', current: 'a', baseline: 'b' })).toBe(
      'm = (a meno b) / b × 100.',
    );
    expect(preview({ metric: 'm', type: 'diff', current: 'a', baseline: 'b' })).toBe(
      'm = a meno b, calcolata anche su padri e totali.',
    );
    expect(preview({ metric: 'm', type: 'none' })).toBe('m: vuota sulle righe dei nodi padre.');
    expect(preview({ metric: 'm', type: 'ratio', numerator: 'a' })).toBe('');
  });
});

describe('table calculations editor', () => {
  const calc = { metric: 'sales', type: 'pct_of_parent', displayMode: 'replace' };

  it('writes what normalizeTableCalculations reads', () => {
    const [normalized] = normalizeTableCalculations(stored(TABLE_CALCULATIONS_SPEC, [calc]));
    expect(normalized).toMatchObject({ metric: 'sales', type: 'pct_of_parent', displayMode: 'replace' });
  });

  it('shows the scope only where it matters and the rank options only for rank', () => {
    const keys = (type: string) => visibleKeys(TABLE_CALCULATIONS_SPEC, { metric: 'm', type });
    ['running_total', 'diff_from_previous', 'diff_from_previous_pct'].forEach(type => {
      expect(keys(type)).toContain('scope');
    });
    ['pct_of_total', 'pct_of_parent', 'rank'].forEach(type => {
      expect(keys(type)).not.toContain('scope');
    });
    expect(keys('rank')).toEqual(expect.arrayContaining(['rankMethod', 'rankOrder']));
    expect(keys('pct_of_total')).not.toContain('rankMethod');
  });

  it('flags the old display key, which has no effect, and drops it on the next edit', () => {
    const legacy = { metric: 'sales', type: 'pct_of_parent', display: 'companion_column' };
    expect(errorsOf(TABLE_CALCULATIONS_SPEC, legacy)).toEqual([
      'La chiave «display» non ha effetto: il campo giusto è «Modo di visualizzazione» (displayMode).',
    ]);
    expect(setField(TABLE_CALCULATIONS_SPEC, legacy, 'displayMode', 'replace')).toEqual({
      metric: 'sales',
      type: 'pct_of_parent',
      displayMode: 'replace',
    });
  });

  it('warns about a repeated metric and type, which the transform ignores', () => {
    const rows = [calc, { ...calc }];
    expect(errorsOf(TABLE_CALCULATIONS_SPEC, rows[1], rows, 1)).toEqual([
      'Questo calcolo è già presente per la stessa metrica: conta solo il primo.',
    ]);
  });

  it('describes the calculation', () => {
    expect(TABLE_CALCULATIONS_SPEC.preview(calc)).toBe('% sul nodo padre di sales, al posto della metrica.');
    expect(TABLE_CALCULATIONS_SPEC.preview({ metric: 'sales', type: 'rank' })).toBe(
      'Posizione di sales, in una colonna affiancata.',
    );
    expect(TABLE_CALCULATIONS_SPEC.preview({ metric: 'sales' })).toBe('');
  });
});

describe('dimension limits editor', () => {
  const limit = { level: 1, limit: 5, metric: 'volume', mode: 'top', othersLabel: 'Altri ({k})' };

  it('writes what normalizeDimensionLimits reads', () => {
    const [normalized] = normalizeDimensionLimits(stored(DIMENSION_LIMITS_SPEC, [limit]));
    expect(normalized).toMatchObject(limit);
  });

  it('needs a level or a dimension, and a positive count', () => {
    expect(errorsOf(DIMENSION_LIMITS_SPEC, { limit: 5 })).toEqual([
      'Indica il livello della gerarchia oppure il nome della dimensione.',
    ]);
    expect(errorsOf(DIMENSION_LIMITS_SPEC, { dimension: 'area', limit: 5 })).toEqual([]);
    expect(errorsOf(DIMENSION_LIMITS_SPEC, { level: 1 })).toEqual(['Compila «Quanti rami mostrare».']);
    expect(errorsOf(DIMENSION_LIMITS_SPEC, { level: 1, limit: 0 })).toEqual([
      '«Quanti rami mostrare» deve essere almeno 1.',
    ]);
  });

  it('describes the limit', () => {
    expect(DIMENSION_LIMITS_SPEC.preview(limit)).toBe(
      'Livello 1: mostra i primi 5 per volume e raccoglie il resto in «Altri ({k})».',
    );
    expect(DIMENSION_LIMITS_SPEC.preview({ dimension: 'area', limit: 3, mode: 'bottom' })).toBe(
      'Dimensione area: mostra gli ultimi 3 e raccoglie il resto in «Altri».',
    );
    expect(DIMENSION_LIMITS_SPEC.preview({ level: 1 })).toBe('');
  });
});
