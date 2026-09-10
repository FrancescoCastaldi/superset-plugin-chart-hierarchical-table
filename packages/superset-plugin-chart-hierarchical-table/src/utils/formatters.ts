import { getNumberFormatter } from '@superset-ui/core';

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
