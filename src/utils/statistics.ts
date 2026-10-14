import { ConfidenceMethod } from '../types';

/** Two-sided standard normal quantiles of the supported confidence levels. */
const Z_BY_LEVEL: Record<string, number> = {
  '0.9': 1.6448536,
  '0.95': 1.959964,
  '0.99': 2.5758293,
  '0.998': 3.0902323,
};

export function zForLevel(level: number): number {
  return Z_BY_LEVEL[String(level)] ?? Z_BY_LEVEL['0.95'];
}

export interface Interval {
  lower: number;
  upper: number;
}

/**
 * Wilson score interval of a proportion (successes out of trials), as fractions in [0, 1].
 * Unlike the normal approximation it stays inside [0, 1] and behaves for small samples and
 * for proportions close to 0 or 1. Null without trials.
 */
export function wilsonInterval(successes: number, trials: number, level = 0.95): Interval | null {
  if (!(trials > 0) || successes < 0) return null;
  const x = Math.min(successes, trials);
  const z = zForLevel(level);
  const p = x / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denominator;
  return { lower: Math.max(0, center - half), upper: Math.min(1, center + half) };
}

/**
 * Byar approximation of the exact Poisson interval of an event count. Accurate to a fraction
 * of a percent for any count, including zero.
 */
export function poissonCountInterval(count: number, level = 0.95): Interval | null {
  if (!(count >= 0)) return null;
  const z = zForLevel(level);
  const lower = count === 0 ? 0 : count * Math.pow(1 - 1 / (9 * count) - z / (3 * Math.sqrt(count)), 3);
  const next = count + 1;
  const upper = next * Math.pow(1 - 1 / (9 * next) + z / (3 * Math.sqrt(next)), 3);
  return { lower: Math.max(0, lower), upper };
}

/**
 * Interval of numerator / denominator * scale. 'wilson' reads it as a proportion of the
 * denominator; 'poisson' reads the numerator as an event count over an exposure (population).
 */
export function ratioInterval(
  method: ConfidenceMethod,
  numerator: number,
  denominator: number,
  scale: number,
  level: number,
): Interval | null {
  if (method === 'none' || !(denominator > 0) || !(numerator >= 0)) return null;
  if (method === 'wilson') {
    const interval = wilsonInterval(numerator, denominator, level);
    return interval && { lower: interval.lower * scale, upper: interval.upper * scale };
  }
  const interval = poissonCountInterval(numerator, level);
  return (
    interval && {
      lower: (interval.lower / denominator) * scale,
      upper: (interval.upper / denominator) * scale,
    }
  );
}
