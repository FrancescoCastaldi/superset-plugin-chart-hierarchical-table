import { MAX_REGEX_PATTERN_LENGTH, isSafeRegexPattern } from '../../utils/conditionalFormatting';
import { Row, RuleListSpec, isFilled } from './ruleList';

// One spec per control that used to be a JSON text box. The keys, values and shapes written here
// are the ones the transform already reads (see the normalize functions in src/utils).

const text = (row: Row, key: string): string => (isFilled(row[key]) ? String(row[key]).trim() : '');

const select = (...pairs: [string, string][]) => pairs;

// ---------------------------------------------------------------------------------------------
// Goals

const GOAL_DIRECTIONS: Record<string, string> = {
  higher_is_better: 'più alto è meglio',
  lower_is_better: 'più basso è meglio',
};

export const GOALS_SPEC: RuleListSpec = {
  id: 'goals',
  storage: 'text',
  addLabel: 'Aggiungi obiettivo',
  emptyText: 'Nessun obiettivo. Aggiungine uno per confrontare una metrica con il suo valore atteso.',
  fields: [
    { key: 'metricKey', label: 'Metrica', kind: 'metric', required: true },
    { key: 'target', label: 'Obiettivo', kind: 'number', required: true },
    {
      key: 'direction',
      label: 'Direzione',
      kind: 'select',
      default: 'higher_is_better',
      options: select(
        ['higher_is_better', 'Più alto è meglio'],
        ['lower_is_better', 'Più basso è meglio'],
      ),
    },
  ],
  newRow: () => ({ metricKey: '', direction: 'higher_is_better' }),
  check: (row, rows, index) =>
    isFilled(row.metricKey) && rows.findIndex(r => r.metricKey === row.metricKey) < index
      ? ['Questa metrica ha già un obiettivo sopra: conta solo il primo.']
      : [],
  preview: row =>
    isFilled(row.metricKey) && isFilled(row.target)
      ? `${text(row, 'metricKey')}: obiettivo ${text(row, 'target')}, ${GOAL_DIRECTIONS[String(row.direction)] ?? GOAL_DIRECTIONS.higher_is_better}.`
      : '',
};

// ---------------------------------------------------------------------------------------------
// Conditional formatting

const OPERATOR_PHRASES: Record<string, string> = {
  '>': 'è maggiore di',
  '>=': 'è maggiore o uguale a',
  '<': 'è minore di',
  '<=': 'è minore o uguale a',
  '==': 'è uguale a',
};
const SCOPE_PHRASES: Record<string, string> = { cell: 'la cella', row: 'la riga', column: 'la colonna' };

// Priority 1 wins and is green, 2 is amber, 3 and beyond are red.
const priorityColor = (priority: number): string =>
  priority <= 1 ? 'verde' : priority === 2 ? 'ambra' : 'rosso';

const isRegexRule = (row: Row): boolean => row.operator === 'regex';

const isUsablePattern = (pattern: string): boolean => {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH || !isSafeRegexPattern(pattern)) return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

export const CONDITIONAL_FORMATTING_SPEC: RuleListSpec = {
  id: 'conditionalFormatting',
  storage: 'array',
  addLabel: 'Aggiungi regola',
  emptyText: 'Nessuna regola. Aggiungine una per colorare i valori che soddisfano una condizione.',
  fields: [
    { key: 'metric', label: 'Metrica', kind: 'metric', required: true },
    {
      key: 'operator',
      label: 'Condizione',
      kind: 'select',
      required: true,
      options: select(
        ['>', 'Maggiore di'],
        ['>=', 'Maggiore o uguale a'],
        ['<', 'Minore di'],
        ['<=', 'Minore o uguale a'],
        ['==', 'Uguale a'],
        ['between', 'Compreso tra'],
        ['regex', 'Corrisponde all’espressione'],
      ),
    },
    {
      key: 'targetValue',
      label: row => (isRegexRule(row) ? 'Espressione regolare' : 'Valore'),
      kind: row => (isRegexRule(row) ? 'text' : 'number'),
      required: true,
    },
    {
      key: 'targetValue2',
      label: 'Fino a',
      kind: 'number',
      required: true,
      visibleWhen: row => row.operator === 'between',
    },
    {
      key: 'scope',
      label: 'Evidenzia',
      kind: 'select',
      default: 'cell',
      options: select(['cell', 'La cella'], ['row', 'La riga'], ['column', 'La colonna']),
    },
    { key: 'priority', label: 'Priorità', kind: 'integer', min: 1 },
    {
      key: 'icon',
      label: 'Icona',
      kind: 'select',
      options: select(
        ['', 'Nessuna'],
        ['arrow_up', 'Freccia su'],
        ['arrow_down', 'Freccia giù'],
        ['dot', 'Punto'],
        ['flag', 'Bandiera'],
        ['check', 'Spunta'],
        ['warning', 'Avviso'],
      ),
    },
  ],
  newRow: rows => ({ metric: '', operator: '>', scope: 'cell', priority: rows.length + 1 }),
  check: row =>
    isRegexRule(row) && isFilled(row.targetValue) && !isUsablePattern(String(row.targetValue))
      ? ['L’espressione non è valida o è troppo complessa: la regola non verrà applicata.']
      : [],
  preview: row => {
    if (!isFilled(row.metric) || !isFilled(row.targetValue)) return '';
    const metric = text(row, 'metric');
    let condition: string;
    if (row.operator === 'between') {
      if (!isFilled(row.targetValue2)) return '';
      condition = `è compreso tra ${text(row, 'targetValue')} e ${text(row, 'targetValue2')}`;
    } else if (isRegexRule(row)) {
      condition = `corrisponde all’espressione «${text(row, 'targetValue')}»`;
    } else if (row.operator && OPERATOR_PHRASES[String(row.operator)]) {
      condition = `${OPERATOR_PHRASES[String(row.operator)]} ${text(row, 'targetValue')}`;
    } else {
      return '';
    }
    const scope = SCOPE_PHRASES[String(row.scope)] ?? SCOPE_PHRASES.cell;
    const priority = Number(row.priority);
    const color = Number.isFinite(priority) && isFilled(row.priority)
      ? ` in ${priorityColor(priority)} (priorità ${priority})`
      : '';
    return `Se ${metric} ${condition}: evidenzia ${scope}${color}.`;
  },
};

// ---------------------------------------------------------------------------------------------
// Metric definitions

const isType = (...types: string[]) => (row: Row) => types.includes(String(row.type));

const COMPARED_TYPES = isType('delta_pct', 'diff');

export const METRIC_DEFINITIONS_SPEC: RuleListSpec = {
  id: 'metricDefinitions',
  storage: 'text',
  addLabel: 'Aggiungi definizione',
  emptyText: 'Nessuna definizione. Aggiungine una per dire cosa significa una metrica e come si calcola sui nodi padre.',
  fields: [
    { key: 'metric', label: 'Metrica', kind: 'metric', required: true },
    {
      key: 'type',
      label: 'Tipo',
      kind: 'select',
      required: true,
      options: select(
        ['sum', 'Somma'],
        ['mean', 'Media'],
        ['distinct_count', 'Conteggio distinto'],
        ['ratio', 'Rapporto'],
        ['delta_pct', 'Variazione percentuale'],
        ['diff', 'Differenza'],
        ['none', 'Vuota sui nodi padre'],
      ),
    },
    { key: 'weight', label: 'Metrica peso (facoltativa)', kind: 'metric', visibleWhen: isType('mean') },
    { key: 'entityDimension', label: 'Dimensione dell’entità', kind: 'dimension', visibleWhen: isType('distinct_count') },
    { key: 'numerator', label: 'Numeratore', kind: 'metric', required: true, visibleWhen: isType('ratio') },
    { key: 'denominator', label: 'Denominatore', kind: 'metric', required: true, visibleWhen: isType('ratio') },
    { key: 'scale', label: 'Scala (per esempio 100)', kind: 'number', visibleWhen: isType('ratio') },
    { key: 'current', label: 'Valore corrente', kind: 'metric', required: true, visibleWhen: COMPARED_TYPES },
    { key: 'baseline', label: 'Valore di confronto', kind: 'metric', required: true, visibleWhen: COMPARED_TYPES },
    {
      key: 'format',
      label: 'Formato',
      kind: 'select',
      options: select(
        ['', 'Automatico'],
        ['integer', 'Intero'],
        ['decimal', 'Decimale'],
        ['percent', 'Percentuale'],
        ['duration', 'Durata (secondi)'],
        ['days', 'Giorni'],
        ['currency', 'Valuta'],
      ),
    },
    { key: 'decimals', label: 'Decimali', kind: 'integer', min: 0, max: 6 },
    {
      key: 'polarity',
      label: 'Polarità',
      kind: 'select',
      options: select(
        ['', 'Non indicata'],
        ['higher_is_better', 'Più alto è meglio'],
        ['lower_is_better', 'Più basso è meglio'],
      ),
    },
  ],
  newRow: () => ({ metric: '', type: 'sum' }),
  check: (row, rows, index) =>
    isFilled(row.metric) && rows.findIndex(r => r.metric === row.metric) < index
      ? ['Questa metrica è già definita sopra: conta solo la prima.']
      : [],
  preview: row => {
    const metric = text(row, 'metric');
    if (!metric) return '';
    switch (row.type) {
      case 'sum':
        return `${metric}: somma. I nodi padre sommano i figli.`;
      case 'mean':
        return isFilled(row.weight)
          ? `${metric}: media ponderata su ${text(row, 'weight')}.`
          : `${metric}: media semplice.`;
      case 'distinct_count':
        return isFilled(row.entityDimension)
          ? `${metric}: conteggio distinto di ${text(row, 'entityDimension')}.`
          : `${metric}: conteggio distinto.`;
      case 'ratio': {
        if (!isFilled(row.numerator) || !isFilled(row.denominator)) return '';
        const scale = Number(row.scale);
        const times = isFilled(row.scale) && Number.isFinite(scale) && scale !== 1 ? ` × ${scale}` : '';
        return `${metric} = ${text(row, 'numerator')} / ${text(row, 'denominator')}${times}. Padri e totali sono un rapporto di somme.`;
      }
      case 'delta_pct':
        return isFilled(row.current) && isFilled(row.baseline)
          ? `${metric} = (${text(row, 'current')} meno ${text(row, 'baseline')}) / ${text(row, 'baseline')} × 100.`
          : '';
      case 'diff':
        return isFilled(row.current) && isFilled(row.baseline)
          ? `${metric} = ${text(row, 'current')} meno ${text(row, 'baseline')}, calcolata anche su padri e totali.`
          : '';
      case 'none':
        return `${metric}: vuota sulle righe dei nodi padre.`;
      default:
        return '';
    }
  },
};

// ---------------------------------------------------------------------------------------------
// Table calculations

const CALCULATION_PREVIEW: Record<string, string> = {
  pct_of_total: '% sul totale',
  pct_of_parent: '% sul nodo padre',
  running_total: 'Totale cumulato',
  diff_from_previous: 'Differenza dal precedente',
  diff_from_previous_pct: 'Differenza % dal precedente',
  rank: 'Posizione',
};

const hasScope = isType('running_total', 'diff_from_previous', 'diff_from_previous_pct');

const DISPLAY_FIELD_LABEL = 'Modo di visualizzazione';

export const TABLE_CALCULATIONS_SPEC: RuleListSpec = {
  id: 'tableCalculations',
  storage: 'text',
  addLabel: 'Aggiungi calcolo',
  emptyText: 'Nessun calcolo. Aggiungine uno per mostrare percentuali, totali cumulati, differenze o posizioni.',
  fields: [
    { key: 'metric', label: 'Metrica', kind: 'metric', required: true },
    {
      key: 'type',
      label: 'Calcolo',
      kind: 'select',
      required: true,
      options: select(
        ['pct_of_total', '% sul totale'],
        ['pct_of_parent', '% sul nodo padre'],
        ['running_total', 'Totale cumulato'],
        ['diff_from_previous', 'Differenza dal precedente'],
        ['diff_from_previous_pct', 'Differenza % dal precedente'],
        ['rank', 'Posizione (rank)'],
      ),
    },
    {
      key: 'displayMode',
      label: DISPLAY_FIELD_LABEL,
      kind: 'select',
      default: 'companion_column',
      options: select(
        ['companion_column', 'In una colonna affiancata'],
        ['replace', 'Al posto della metrica'],
      ),
    },
    {
      key: 'scope',
      label: 'Calcolo tra',
      kind: 'select',
      default: 'hierarchy',
      options: select(['hierarchy', 'Nodi fratelli'], ['periods', 'Periodi (colonne pivot)']),
      visibleWhen: hasScope,
    },
    {
      key: 'rankMethod',
      label: 'Metodo di classifica',
      kind: 'select',
      default: 'competition',
      options: select(['competition', 'Con pari merito (1, 2, 2, 4)'], ['dense', 'Senza salti (1, 2, 2, 3)']),
      visibleWhen: isType('rank'),
    },
    {
      key: 'rankOrder',
      label: 'Ordine della classifica',
      kind: 'select',
      default: 'desc',
      options: select(['desc', 'Dal più alto'], ['asc', 'Dal più basso']),
      visibleWhen: isType('rank'),
    },
    { key: 'customTitle', label: 'Titolo personalizzato', kind: 'text' },
  ],
  // Older examples used a "display" key, which the transform never read.
  legacyKeys: ['display'],
  newRow: () => ({ metric: '', type: 'pct_of_total', displayMode: 'companion_column' }),
  check: (row, rows, index) => {
    const messages: string[] = [];
    if ('display' in row) {
      messages.push(
        `La chiave «display» non ha effetto: il campo giusto è «${DISPLAY_FIELD_LABEL}» (displayMode).`,
      );
    }
    const repeated =
      isFilled(row.metric) &&
      rows.findIndex(r => r.metric === row.metric && r.type === row.type) < index;
    if (repeated) {
      messages.push('Questo calcolo è già presente per la stessa metrica: conta solo il primo.');
    }
    return messages;
  },
  preview: row => {
    const label = CALCULATION_PREVIEW[String(row.type)];
    if (!isFilled(row.metric) || !label) return '';
    const display = row.displayMode === 'replace' ? 'al posto della metrica' : 'in una colonna affiancata';
    return `${label} di ${text(row, 'metric')}, ${display}.`;
  },
};

// ---------------------------------------------------------------------------------------------
// Dimension limits

export const DIMENSION_LIMITS_SPEC: RuleListSpec = {
  id: 'dimensionLimits',
  storage: 'text',
  addLabel: 'Aggiungi limite',
  emptyText: 'Nessun limite. Aggiungine uno per mostrare solo i primi (o gli ultimi) rami di un livello.',
  fields: [
    { key: 'level', label: 'Livello della gerarchia', kind: 'integer', min: 0 },
    { key: 'dimension', label: 'Nome della dimensione', kind: 'dimension' },
    { key: 'limit', label: 'Quanti rami mostrare', kind: 'integer', required: true, min: 1 },
    { key: 'metric', label: 'Metrica per la classifica (facoltativa)', kind: 'metric' },
    {
      key: 'mode',
      label: 'Quali rami',
      kind: 'select',
      default: 'top',
      options: select(['top', 'I primi'], ['bottom', 'Gli ultimi']),
    },
    {
      key: 'othersLabel',
      label: 'Etichetta della riga «Altri»',
      kind: 'text',
      placeholder: 'Altri ({k})',
    },
  ],
  newRow: () => ({ level: 1, limit: 5, mode: 'top' }),
  check: row =>
    isFilled(row.level) || isFilled(row.dimension)
      ? []
      : ['Indica il livello della gerarchia oppure il nome della dimensione.'],
  preview: row => {
    if (!isFilled(row.limit) || !(isFilled(row.level) || isFilled(row.dimension))) return '';
    const where = isFilled(row.level) ? `Livello ${text(row, 'level')}` : `Dimensione ${text(row, 'dimension')}`;
    const which = row.mode === 'bottom' ? 'gli ultimi' : 'i primi';
    const by = isFilled(row.metric) ? ` per ${text(row, 'metric')}` : '';
    const others = isFilled(row.othersLabel) ? text(row, 'othersLabel') : 'Altri';
    return `${where}: mostra ${which} ${text(row, 'limit')}${by} e raccoglie il resto in «${others}».`;
  },
};

export const RULE_LIST_SPECS: Record<string, RuleListSpec> = {
  goals: GOALS_SPEC,
  conditionalFormatting: CONDITIONAL_FORMATTING_SPEC,
  metricDefinitions: METRIC_DEFINITIONS_SPEC,
  tableCalculations: TABLE_CALCULATIONS_SPEC,
  dimensionLimits: DIMENSION_LIMITS_SPEC,
};
