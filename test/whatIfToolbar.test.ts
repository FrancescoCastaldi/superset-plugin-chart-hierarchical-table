import {
  factorToPercentage,
  percentageToFactor,
  getSimulatableMetrics,
} from '../src/utils/whatIfEngine';
import { MetricDefinition } from '../src/types';

describe('WhatIfToolbar logic and conversion helpers', () => {
  describe('factorToPercentage & percentageToFactor', () => {
    it('converts factor 1.0 to 0%', () => {
      expect(factorToPercentage(1.0)).toBe(0);
      expect(percentageToFactor(0)).toBe(1.0);
    });

    it('converts positive factors accurately', () => {
      expect(factorToPercentage(1.15)).toBe(15);
      expect(percentageToFactor(15)).toBe(1.15);

      expect(factorToPercentage(1.5)).toBe(50);
      expect(percentageToFactor(50)).toBe(1.5);
    });

    it('converts negative percentages accurately', () => {
      expect(factorToPercentage(0.85)).toBe(-15);
      expect(percentageToFactor(-15)).toBe(0.85);

      expect(factorToPercentage(0.5)).toBe(-50);
      expect(percentageToFactor(-50)).toBe(0.5);
    });
  });

  describe('getSimulatableMetrics', () => {
    it('returns empty array when metrics is empty or null', () => {
      expect(getSimulatableMetrics([])).toEqual([]);
      expect(getSimulatableMetrics(null as any)).toEqual([]);
    });

    it('filters out derived, ratio, delta_pct, and type:none metrics', () => {
      const allMetrics = [
        'ricoveri',
        'costi',
        'degenza_media',
        'delta_ricoveri_pct',
        'codice_ente',
      ];

      const metricDefs: MetricDefinition[] = [
        { metric: 'ricoveri', type: 'sum' },
        { metric: 'costi', type: 'sum' },
        { metric: 'degenza_media', type: 'ratio', numerator: 'degenze', denominator: 'ricoveri' },
        { metric: 'codice_ente', type: 'none' },
      ];

      const simulatable = getSimulatableMetrics(allMetrics, metricDefs);
      expect(simulatable).toEqual(['ricoveri', 'costi']);
    });
  });
});
