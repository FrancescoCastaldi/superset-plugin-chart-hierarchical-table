import { computeWhatIfDelta } from '../src/utils/whatIfEngine';
import { MetricPolarity } from '../src/types';

describe('What-If in-place rendering & delta badge logic', () => {
  function getBadgeStatus(deltaPct: number, polarity?: MetricPolarity): 'whatif-delta-good' | 'whatif-delta-bad' {
    const isPositive = deltaPct > 0;
    const isGood = polarity === 'lower_is_better' ? !isPositive : isPositive;
    return isGood ? 'whatif-delta-good' : 'whatif-delta-bad';
  }

  describe('Delta badge direction and value', () => {
    it('computes positive delta when simulated exceeds baseline', () => {
      const delta = computeWhatIfDelta(120, 100);
      expect(delta.absolute).toBe(20);
      expect(delta.pct).toBe(20);
      expect(getBadgeStatus(delta.pct!)).toBe('whatif-delta-good');
    });

    it('computes negative delta when simulated is below baseline', () => {
      const delta = computeWhatIfDelta(85, 100);
      expect(delta.absolute).toBe(-15);
      expect(delta.pct).toBe(-15);
      expect(getBadgeStatus(delta.pct!)).toBe('whatif-delta-bad');
    });

    it('inverts badge color when polarity is lower_is_better', () => {
      // E.g. Cost reduction: -15% is good
      const costReduction = computeWhatIfDelta(85, 100);
      expect(getBadgeStatus(costReduction.pct!, 'lower_is_better')).toBe('whatif-delta-good');

      // Cost increase: +20% is bad
      const costIncrease = computeWhatIfDelta(120, 100);
      expect(getBadgeStatus(costIncrease.pct!, 'lower_is_better')).toBe('whatif-delta-bad');
    });

    it('identifies unchanged cells where delta is negligible', () => {
      const delta = computeWhatIfDelta(100, 100);
      expect(delta.absolute).toBe(0);
      expect(delta.pct).toBe(0);
    });
  });
});
