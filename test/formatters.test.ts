jest.mock('@superset-ui/core', () => ({
  getNumberFormatter: (fmt: string) => {
    if (fmt === 'DURATION_COL') {
      return (val: number) => {
        const totalSec = Math.floor(val / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
      };
    }
    return (val: any) => `fmt[${fmt}](${val})`;
  },
}));

import { formatMetricValue } from '../src/utils/formatters';

describe('formatMetricValue', () => {
  describe('distinct entity counts (Sportelli Attivi, Sedi Attive)', () => {
    it('formats Sportelli Attivi as integer even when DURATION_COL is requested', () => {
      expect(formatMetricValue(1, 'DURATION_COL', '', 'Sportelli Attivi')).toBe('1');
      expect(formatMetricValue(47, 'DURATION_COL', '', 'Sportelli Attivi')).toBe('47');
      expect(formatMetricValue(0, 'DURATION_COL', '', 'Sportelli Attivi')).toBe('0');
    });

    it('formats Sedi Attive and distinct entity metrics as integer', () => {
      expect(formatMetricValue(18, 'DURATION_COL', '', 'Sedi Attive')).toBe('18');
      expect(formatMetricValue(5, 'SMART_NUMBER', '', 'distinct_stanze')).toBe('5');
    });
  });

  describe('durations with DURATION_COL', () => {
    it('formats Tempo Gestione Sportello with DURATION_COL', () => {
      expect(formatMetricValue(136000, 'DURATION_COL', '', 'Tempo Gestione Sportello')).toBe('2:16');
      expect(formatMetricValue(191000, 'DURATION_COL', '', 'Tempo Gestione Sportello')).toBe('3:11');
    });

    it('formats Attesa Media with DURATION_COL and does not fall back to days (gg)', () => {
      expect(formatMetricValue(534000, 'DURATION_COL', '', 'Attesa Media')).toBe('8:54');
      expect(formatMetricValue(136000, 'DURATION_COL', '', 'Attesa Media')).toBe('2:16');
    });

    it('formats Attesa Media Sportello and Attesa Media Preno Sportello with DURATION_COL', () => {
      expect(formatMetricValue(493000, 'DURATION_COL', '', 'Attesa Media Sportello')).toBe('8:13');
      expect(formatMetricValue(0, 'DURATION_COL', '', 'Attesa Media Preno Sportello')).toBe('0:00');
    });
  });

  describe('lead time in days (gg)', () => {
    it('formats metrics explicitly referring to days or lt_off with gg', () => {
      expect(formatMetricValue(12.5, 'SMART_NUMBER', '', 'avg_giorni_attesa')).toBe('12.5 gg');
      expect(formatMetricValue(4.2, 'SMART_NUMBER', '', 'lt_off')).toBe('4.2 gg');
      expect(formatMetricValue(3.0, 'SMART_NUMBER', '', 'tempo_attesa_gg')).toBe('3.0 gg');
    });
  });

  describe('edge cases', () => {
    it('handles null, undefined and strings gracefully', () => {
      expect(formatMetricValue(null, 'DURATION_COL', '', 'Attesa Media')).toBe('-');
      expect(formatMetricValue(undefined, 'DURATION_COL', '', 'Sportelli Attivi')).toBe('-');
      expect(formatMetricValue('N/A', 'DURATION_COL', '', 'Sportelli Attivi')).toBe('N/A');
    });
  });
});
