import { TableColumn } from '../types';
import { formatPeriodLabel } from './periodLabels';

/**
 * Labels of the reference and comparison periods that the query really used.
 *
 * The periods come from the dataset itself: it exposes four constant columns (year and month of the
 * reference and of the comparison period), filled from the dashboard filters or, when no filter is
 * applied, from the defaults of the dataset. Asking the query for them means the labels always say
 * what the numbers are, without reading the filters twice. Year and month go together as a pair, so
 * several selected years and months are never combined.
 */
export const PERIOD_COLUMN_DEFAULTS = {
  referenceYear: 'ANNO_CORRENTE',
  referenceMonth: 'MESE_CORRENTE',
  comparisonYear: 'ANNO_CONFRONTO',
  comparisonMonth: 'MESE_CONFRONTO',
} as const;

export type PeriodColumns = Record<keyof typeof PERIOD_COLUMN_DEFAULTS, string>;

export const PERIOD_ALIAS_PREFIX = 'zz_periodo_';

/** Name the query gives to the constant column of each period part, apart from the dimensions and metrics. */
export const periodAlias = (part: keyof typeof PERIOD_COLUMN_DEFAULTS): string => `${PERIOD_ALIAS_PREFIX}${part}`;

export function resolvePeriodColumns(formData: Record<string, any> | undefined): PeriodColumns {
  const read = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return {
    referenceYear: read(formData?.periodReferenceYearColumn, PERIOD_COLUMN_DEFAULTS.referenceYear),
    referenceMonth: read(formData?.periodReferenceMonthColumn, PERIOD_COLUMN_DEFAULTS.referenceMonth),
    comparisonYear: read(formData?.periodComparisonYearColumn, PERIOD_COLUMN_DEFAULTS.comparisonYear),
    comparisonMonth: read(formData?.periodComparisonMonthColumn, PERIOD_COLUMN_DEFAULTS.comparisonMonth),
  };
}

/** Extra metrics that fetch the period columns with the data (`MAX` of a constant column). */
export function buildPeriodMetrics(columns: PeriodColumns): Array<Record<string, unknown>> {
  return (Object.keys(columns) as Array<keyof PeriodColumns>).map(part => ({
    expressionType: 'SQL',
    sqlExpression: `MAX(${columns[part]})`,
    label: periodAlias(part),
    hasCustomLabel: true,
  }));
}

export interface ChartPeriods {
  reference: string;
  comparison: string;
}

const toInt = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) ? n : null;
};

const monthKey = (year: number | null, month: number | null): string | null =>
  year !== null && month !== null && month >= 1 && month <= 12
    ? `${year}-${String(month).padStart(2, '0')}`
    : null;

/** The two periods the first fetched row reports, as `YYYY-MM` labels; null when it reports none. */
export function readChartPeriods(records: Array<Record<string, any>> | undefined): ChartPeriods | null {
  const row = records?.[0];
  if (!row) return null;
  const reference = monthKey(toInt(row[periodAlias('referenceYear')]), toInt(row[periodAlias('referenceMonth')]));
  const comparison = monthKey(toInt(row[periodAlias('comparisonYear')]), toInt(row[periodAlias('comparisonMonth')]));
  if (!reference && !comparison) return null;
  return {
    reference: reference ? formatPeriodLabel(reference, 'month') ?? reference : '',
    comparison: comparison ? formatPeriodLabel(comparison, 'month') ?? comparison : '',
  };
}

/** The same records without the period columns, which are not data of the table. */
export function stripPeriodColumns<T extends Record<string, any>>(records: T[]): T[] {
  if (!records.length || !Object.keys(records[0]).some(key => key.startsWith(PERIOD_ALIAS_PREFIX))) return records;
  return records.map(record => {
    const copy: Record<string, any> = { ...record };
    for (const key of Object.keys(copy)) if (key.startsWith(PERIOD_ALIAS_PREFIX)) delete copy[key];
    return copy as T;
  });
}

export type PeriodRole = 'delta' | 'comparison' | 'reference';

/** Which period a column speaks of, from its name: variation, comparison, or current/reference value. */
export function classifyPeriodColumn(column: Pick<TableColumn, 'key' | 'title'>): PeriodRole | null {
  const text = `${column.key} ${typeof column.title === 'string' ? column.title : ''}`.toLowerCase();
  if (/variazione|delta|[Δδ]/.test(text)) return 'delta';
  if (/confronto|\bconf\b/.test(text)) return 'comparison';
  if (/corrente|riferimento|\brif\b/.test(text)) return 'reference';
  return null;
}

/**
 * Adds to the title of each metric column the period it covers: the reference one on the current
 * values, the comparison one on the comparison values, both on the variations.
 */
export function applyDynamicPeriodTitles(columns: TableColumn[], periods: ChartPeriods | null): TableColumn[] {
  if (!periods) return columns;
  return columns.map(column => {
    if (!column.isMetric || typeof column.title !== 'string') return column;
    const role = classifyPeriodColumn(column);
    let suffix: string | null = null;
    if (role === 'reference') suffix = periods.reference || null;
    else if (role === 'comparison') suffix = periods.comparison || null;
    else if (role === 'delta' && periods.reference && periods.comparison) {
      suffix = `${periods.reference} vs ${periods.comparison}`;
    }
    if (!suffix || column.title.includes(suffix)) return column;
    return { ...column, title: `${column.title} · ${suffix}` };
  });
}
