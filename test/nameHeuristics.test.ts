import { isDerivedMetric, isRateMetric } from '../src/utils/aggregations';
import { hasDiffToken } from '../src/utils/nameHeuristics';
import { formatMetricValue } from '../src/utils/formatters';
import { isDeltaColumn } from '../src/utils/tableColumns';

jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => (val: any) => `fmt[${fmt}](${val})`,
}));

describe('name heuristics fallbacks', () => {
  it('reads diff as a token, not inside the Italian words differibile and differita', () => {
    expect(hasDiffToken('diff')).toBe(true);
    expect(hasDiffToken('delta_diff_pct')).toBe(true);
    expect(hasDiffToken('differenza attesa')).toBe(true);
    expect(hasDiffToken('differibile')).toBe(false);
    expect(hasDiffToken('prestazioni differite')).toBe(false);
  });

  it('does not treat priority class D (Differibile) as a derived metric', () => {
    expect(isDerivedMetric('Differibile')).toBe(false);
    expect(isDerivedMetric('Prestazioni differite___2024')).toBe(false);
    expect(isDerivedMetric('diff_attesa')).toBe(true);
    expect(isDerivedMetric('Differenza giorni')).toBe(true);
  });

  it('keeps Differibile additive in display: no sign, no delta colouring', () => {
    expect(formatMetricValue(42, undefined, undefined, 'Differibile')).toBe('42');
    expect(isDeltaColumn({ key: 'Differibile', title: 'Differibile' })).toBe(false);
    expect(isDeltaColumn({ key: 'diff_x', title: 'diff x' })).toBe(true);
  });

  it('averages waiting times but not counts of people or bookings waiting', () => {
    expect(isRateMetric('Attesa Media')).toBe(true);
    expect(isRateMetric('tempo_attesa_gg')).toBe(true);
    expect(isRateMetric('Prenotazioni in attesa')).toBe(false);
    expect(isRateMetric('Pazienti in attesa')).toBe(false);
    expect(isRateMetric('Numero attesa')).toBe(false);
  });
});
