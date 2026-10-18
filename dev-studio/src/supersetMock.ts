export function ensureIsArray<T>(val: T | T[] | null | undefined): T[] {
  if (val === null || val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

export function getNumberFormatter(formatterString?: string) {
  return (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    if (formatterString === 'DURATION_COL' || formatterString === 'DURATION') {
      const totalSec = Math.floor(num / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (formatterString === ',.1f') return num.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (formatterString === ',.2f') return num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (formatterString === ',.0f') return num.toLocaleString('it-IT', { maximumFractionDigits: 0 });
    if (formatterString === '.1%') return `${(num * 100).toFixed(1)}%`;
    if (formatterString === '.2%') return `${(num * 100).toFixed(2)}%`;
    if (formatterString === '$,.2f') return `€ ${num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return num.toLocaleString('it-IT');
  };
}

export class ChartMetadata {
  constructor(public config: any = {}) {}
}

export class ChartPlugin {
  constructor(public config: any = {}) {}
}

export const Behavior = {
  INTERACTIVE_CHART: 'INTERACTIVE_CHART',
  DRILL_TO_DETAIL: 'DRILL_TO_DETAIL',
  DRILL_BY: 'DRILL_BY',
};

export type DataRecord = Record<string, any>;
export type QueryContext = any;
export function buildQueryContext() {
  return {};
}
