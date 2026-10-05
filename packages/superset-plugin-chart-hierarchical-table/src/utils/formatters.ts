import { getNumberFormatter } from '@superset-ui/core';
import { MinMaxBound } from '../types';

export function formatMetricValue(
  value: number | string | null | undefined,
  formatterString?: string,
  currencySymbol?: string,
  metricName?: string,
): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && isNaN(value)) {
    return '-';
  }

  const mName = (metricName || '').toLowerCase();

  // 1. Delta Acceptance in percentage points (p.p.)
  if (
    (mName.includes('delta') || mName.includes('variazione') || mName.includes('diff')) &&
    (mName.includes('accettazione') || mName.includes('p.p.') || /\bacc\b/.test(mName) || mName.includes('acc_')) &&
    !mName.includes('accesso')
  ) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} p.p.`;
  }

  // 2. Acceptance rate (percentage)
  if (mName.includes('acc_corr') || mName.includes('acc_conf') || mName.includes('accettazione')) {
    return `${value.toFixed(1)}%`;
  }

  // 3. Delta Lead Time in days (gg)
  if (
    (mName.includes('delta') || mName.includes('variazione') || mName.includes('diff')) &&
    (mName.includes('attesa') || mName.includes('lt_off') || mName.includes('lead') || (mName.includes('giorni') && !mName.includes('settimana')) || /\blt\b/.test(mName))
  ) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} gg`;
  }

  // 4. Lead Time in days (gg)
  if (mName.includes('lt_off') || mName.includes('attesa') || (mName.includes('giorni') && !mName.includes('settimana'))) {
    return `${value.toFixed(1)} gg`;
  }

  // 5. Percentage Variation / Delta with sign (+/- X.X%)
  if (
    mName.includes('___delta') ||
    mName.includes('δ') ||
    (metricName || '').includes('Δ') ||
    mName.includes('delta %') ||
    ((mName.includes('delta') || mName.includes('variazione') || mName.includes('diff')) &&
      (mName.includes('%') || mName.includes('pct') || mName.includes('percent')))
  ) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  // 6. General percentage metrics (rate, ratio, share)
  if (mName.includes('%') || mName.includes('pct') || mName.includes('percent') || mName.includes('tasso')) {
    return `${value.toFixed(1)}%`;
  }

  // 7. General delta with sign
  if (mName.startsWith('delta') || mName.includes('delta_') || mName.includes('variazione') || mName.includes('diff')) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(value)}`;
  }

  let formatted = '';
  try {
    if (formatterString && formatterString !== 'SMART_NUMBER') {
      const formatter = getNumberFormatter(formatterString);
      formatted = formatter(value);
    } else {
      // Italian localized thousands separator (e.g. 1.250)
      formatted = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    }
  } catch (e) {
    formatted = String(value);
  }

  if (currencySymbol) {
    return `${currencySymbol} ${formatted}`;
  }

  return formatted;
}

/**
 * Calculates normalized value between 0 and 1 given a value and min/max bounds.
 * Returns 0 if zero range (min === max), null/undefined, or non-numeric.
 */
export function getNormalizedMetricValue(val: any, bound?: MinMaxBound): number {
  if (val === null || val === undefined || !bound) return 0;
  const num =
    typeof val === 'number'
      ? val
      : typeof val === 'string' && val.trim() !== ''
      ? Number(val)
      : NaN;
  if (!Number.isFinite(num)) return 0;
  const range = bound.max - bound.min;
  if (!Number.isFinite(range) || range <= 0) return 0;
  const normalized = (num - bound.min) / range;
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Generates an RGBA background color for heatmap gradient based on normalized value and color theme.
 */
export function getHeatmapBgColor(
  normalized: number,
  theme: string = 'stratum',
): string {
  if (normalized <= 0) return 'transparent';
  const alpha = (0.06 + Math.min(1, Math.max(0, normalized)) * 0.36).toFixed(3);
  switch (theme) {
    case 'emerald':
      return `rgba(16, 185, 129, ${alpha})`;
    case 'ocean':
      return `rgba(37, 99, 235, ${alpha})`;
    case 'sunset':
      return `rgba(239, 68, 68, ${alpha})`;
    case 'stratum':
    default:
      return `rgba(13, 148, 136, ${alpha})`;
  }
}

