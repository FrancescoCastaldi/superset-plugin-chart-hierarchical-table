import { BipolarDataBarOptions, DivergingColorOptions, HeatmapDivergingPalette } from '../types';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses a 3-character or 6-character hex color code into R, G, B components.
 */
export function parseHexColor(hex: string): RgbColor {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map(c => c + c)
      .join('');
  }
  const intVal = parseInt(clean, 16);
  if (isNaN(intVal) || clean.length !== 6) {
    return { r: 128, g: 128, b: 128 };
  }
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

function componentToHex(c: number): string {
  const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

/**
 * Linearly interpolates between two hex colors based on t in [0, 1].
 */
export function interpolateRgb(c1: string, c2: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const rgb1 = parseHexColor(c1);
  const rgb2 = parseHexColor(c2);

  const r = rgb1.r + (rgb2.r - rgb1.r) * clampedT;
  const g = rgb1.g + (rgb2.g - rgb1.g) * clampedT;
  const b = rgb1.b + (rgb2.b - rgb1.b) * clampedT;

  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

/**
 * Calculates WCAG relative luminance from an sRGB hex color.
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Determines whether text on a given background color should be white or dark grey
 * to satisfy WCAG AA contrast criteria.
 */
export function getReadableTextColor(bgColorHex: string): '#ffffff' | '#212529' {
  const luminance = getRelativeLuminance(bgColorHex);
  return luminance < 0.45 ? '#ffffff' : '#212529';
}

const DEFAULT_PALETTES: Record<
  HeatmapDivergingPalette,
  { negative: string; neutral: string; positive: string }
> = {
  red_white_green: {
    negative: '#d32f2f',
    neutral: '#ffffff',
    positive: '#2e7d32',
  },
  red_yellow_green: {
    negative: '#d32f2f',
    neutral: '#ffeb3b',
    positive: '#2e7d32',
  },
  blue_white_red: {
    negative: '#1976d2',
    neutral: '#ffffff',
    positive: '#d32f2f',
  },
  custom: {
    negative: '#d32f2f',
    neutral: '#ffffff',
    positive: '#2e7d32',
  },
};

/**
 * Computes a continuous 3-stop diverging background and high-contrast text color
 * adhering to metric polarity semantics.
 */
export function computeDivergingColor(
  value: number,
  min: number,
  max: number,
  options: DivergingColorOptions = {},
): { bgColor: string; textColor: string } {
  const paletteDef = DEFAULT_PALETTES[options.palette || 'red_white_green'] || DEFAULT_PALETTES.red_white_green;

  let posColor = options.positiveColor || paletteDef.positive;
  let negColor = options.negativeColor || paletteDef.negative;
  const neuColor = options.neutralColor || paletteDef.neutral;

  // Invert color mapping when lower is better
  if (options.polarity === 'lower_is_better') {
    const tmp = posColor;
    posColor = negColor;
    negColor = tmp;
  }

  const mid =
    options.midpoint !== undefined
      ? options.midpoint
      : min < 0 && max > 0
      ? 0
      : (min + max) / 2;

  let bgColor = neuColor;
  if (value > mid) {
    const t = max > mid ? (value - mid) / (max - mid) : 1;
    bgColor = interpolateRgb(neuColor, posColor, t);
  } else if (value < mid) {
    const t = mid > min ? (mid - value) / (mid - min) : 1;
    bgColor = interpolateRgb(neuColor, negColor, t);
  }

  return {
    bgColor,
    textColor: getReadableTextColor(bgColor),
  };
}

/**
 * Computes zero-centered / bipolar data bar geometry and color.
 */
export function computeBipolarDataBar(
  value: number,
  min: number,
  max: number,
  options: BipolarDataBarOptions = {},
): { leftPct: number; widthPct: number; color: string } {
  let posColor = options.positiveColor || '#2e7d32';
  let negColor = options.negativeColor || '#d32f2f';

  if (options.polarity === 'lower_is_better') {
    const tmp = posColor;
    posColor = negColor;
    negColor = tmp;
  }

  let leftPct = 0;
  let widthPct = 0;
  let isPositive = value >= 0;

  if (min < 0 && max > 0) {
    const totalRange = Math.abs(min) + max;
    const zeroPct = (Math.abs(min) / totalRange) * 100;

    if (value >= 0) {
      leftPct = zeroPct;
      widthPct = Math.min(100 - zeroPct, (value / totalRange) * 100);
      isPositive = true;
    } else {
      widthPct = Math.min(zeroPct, (Math.abs(value) / totalRange) * 100);
      leftPct = zeroPct - widthPct;
      isPositive = false;
    }
  } else if (min >= 0) {
    leftPct = 0;
    widthPct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    isPositive = true;
  } else {
    // All values are <= 0
    const absMin = Math.abs(min);
    widthPct = absMin > 0 ? Math.min(100, (Math.abs(value) / absMin) * 100) : 0;
    leftPct = 100 - widthPct;
    isPositive = false;
  }

  return {
    leftPct: Math.round(leftPct * 100) / 100,
    widthPct: Math.round(widthPct * 100) / 100,
    color: isPositive ? posColor : negColor,
  };
}
