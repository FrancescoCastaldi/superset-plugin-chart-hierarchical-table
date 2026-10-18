import {
  parseHexColor,
  interpolateRgb,
  getRelativeLuminance,
  getReadableTextColor,
  computeDivergingColor,
  computeBipolarDataBar,
} from '../src/utils/advancedCellVisuals';

describe('advancedCellVisuals: pure unit tests for diverging heatmap and bipolar data bars', () => {
  describe('parseHexColor & interpolateRgb', () => {
    it('correctly parses 3-character and 6-character hex colors', () => {
      expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseHexColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseHexColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('interpolates RGB values between two colors', () => {
      const red = '#ff0000';
      const blue = '#0000ff';
      expect(interpolateRgb(red, blue, 0)).toBe('#ff0000');
      expect(interpolateRgb(red, blue, 1)).toBe('#0000ff');
      // Midpoint: r = 128, g = 0, b = 128 -> #800080
      expect(interpolateRgb(red, blue, 0.5)).toBe('#800080');
    });
  });

  describe('WCAG luminance and readable text color', () => {
    it('computes correct relative luminance', () => {
      expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1, 2);
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 2);
    });

    it('returns white text for dark backgrounds and dark text for light backgrounds', () => {
      expect(getReadableTextColor('#000000')).toBe('#ffffff');
      expect(getReadableTextColor('#1a365d')).toBe('#ffffff'); // dark navy
      expect(getReadableTextColor('#ffffff')).toBe('#212529');
      expect(getReadableTextColor('#ffff00')).toBe('#212529'); // bright yellow
    });
  });

  describe('computeDivergingColor (3-stop heatmap)', () => {
    it('returns neutral color at midpoint', () => {
      const result = computeDivergingColor(0, -100, 100, {
        negativeColor: '#d32f2f',
        neutralColor: '#ffffff',
        positiveColor: '#2e7d32',
      });
      expect(result.bgColor).toBe('#ffffff');
      expect(result.textColor).toBe('#212529');
    });

    it('interpolates towards positive color for values above midpoint', () => {
      const result = computeDivergingColor(100, -100, 100, {
        negativeColor: '#d32f2f',
        neutralColor: '#ffffff',
        positiveColor: '#2e7d32',
      });
      expect(result.bgColor).toBe('#2e7d32');
      expect(result.textColor).toBe('#ffffff');
    });

    it('interpolates towards negative color for values below midpoint', () => {
      const result = computeDivergingColor(-100, -100, 100, {
        negativeColor: '#d32f2f',
        neutralColor: '#ffffff',
        positiveColor: '#2e7d32',
      });
      expect(result.bgColor).toBe('#d32f2f');
      expect(result.textColor).toBe('#ffffff');
    });

    it('inverts colors when polarity is lower_is_better', () => {
      // For waiting time or errors: -50 is better (should be green/positive), +50 is worse (red/negative)
      const positiveRes = computeDivergingColor(-100, -100, 100, {
        negativeColor: '#d32f2f',
        neutralColor: '#ffffff',
        positiveColor: '#2e7d32',
        polarity: 'lower_is_better',
      });
      expect(positiveRes.bgColor).toBe('#2e7d32'); // gets positive color

      const negativeRes = computeDivergingColor(100, -100, 100, {
        negativeColor: '#d32f2f',
        neutralColor: '#ffffff',
        positiveColor: '#2e7d32',
        polarity: 'lower_is_better',
      });
      expect(negativeRes.bgColor).toBe('#d32f2f'); // gets negative color
    });
  });

  describe('computeBipolarDataBar (zero-centered data bars)', () => {
    it('centers zero axis when range spans negative and positive', () => {
      // Range: -100 to +100 -> zero is at 50%
      const barPositive = computeBipolarDataBar(50, -100, 100, {
        positiveColor: '#2e7d32',
        negativeColor: '#d32f2f',
      });
      expect(barPositive.leftPct).toBe(50);
      expect(barPositive.widthPct).toBe(25);
      expect(barPositive.color).toBe('#2e7d32');

      const barNegative = computeBipolarDataBar(-50, -100, 100, {
        positiveColor: '#2e7d32',
        negativeColor: '#d32f2f',
      });
      // Starts at 25% and spans 25% up to the 50% center
      expect(barNegative.leftPct).toBe(25);
      expect(barNegative.widthPct).toBe(25);
      expect(barNegative.color).toBe('#d32f2f');
    });

    it('inverts bar color when polarity is lower_is_better', () => {
      const barNeg = computeBipolarDataBar(-50, -100, 100, {
        positiveColor: '#2e7d32',
        negativeColor: '#d32f2f',
        polarity: 'lower_is_better',
      });
      // Negative variance is good when lower is better -> positive color
      expect(barNeg.color).toBe('#2e7d32');
    });

    it('anchors at zero when all values are positive', () => {
      const bar = computeBipolarDataBar(40, 0, 100, {
        positiveColor: '#1976d2',
      });
      expect(bar.leftPct).toBe(0);
      expect(bar.widthPct).toBe(40);
    });
  });
});
