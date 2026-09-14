import { getNumberFormatter } from '@superset-ui/core';
import { MinMaxBound, MinMaxColorTheme } from '../types';

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

  // Percentage metrics
  if (mName.includes('pct') || mName.includes('percent') || mName.includes('tasso')) {
    if (mName.startsWith('delta') || mName.includes('delta_')) {
      const sign = value > 0 ? '+' : '';
      return `${sign}${value.toFixed(1)}%`;
    }
    return `${value.toFixed(1)}%`;
  }

  // Delta Lead Time in days
  if (
    (mName.startsWith('delta') || mName.includes('delta_')) &&
    (mName.includes('lt') || mName.includes('attesa') || mName.includes('giorni'))
  ) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} gg`;
  }

  // Lead Time in days
  if (mName.includes('lt_off') || mName.includes('attesa')) {
    return `${value.toFixed(1)} gg`;
  }

  // Delta Acceptance in percentage points
  if ((mName.startsWith('delta') || mName.includes('delta_')) && mName.includes('acc')) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} p.p.`;
  }

  // Acceptance rate
  if (mName.includes('acc_corr') || mName.includes('acc_conf') || mName.includes('accettazione')) {
    return `${value.toFixed(1)}%`;
  }

  // General delta with sign
  if (mName.startsWith('delta') || mName.includes('delta_')) {
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
  theme: MinMaxColorTheme = 'stratum',
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
