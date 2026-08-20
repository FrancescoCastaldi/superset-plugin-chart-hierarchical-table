import { getNumberFormatter, NumberFormatter } from '@superset-ui/core';

export function formatMetricValue(
  value: number | null | undefined,
  formatterString?: string,
  currencySymbol?: string,
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  let formatted = '';
  try {
    if (formatterString) {
      const formatter = getNumberFormatter(formatterString);
      formatted = formatter(value);
    } else {
      // Default formatting: 2 decimal places with localized thousands separator
      formatted = new Intl.NumberFormat('en-US', {
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
