import { GoalDelta, GoalDirection, GoalStatus, MetricGoal } from '../types';

/** Minimum attainment ratio (actual vs target, inverted for lower_is_better) of each band. */
export const DEFAULT_GOAL_THRESHOLDS = {
  achieved: 1,
  onTrack: 0.9,
  atRisk: 0.75,
} as const;

const GOAL_DIRECTIONS: readonly GoalDirection[] = ['higher_is_better', 'lower_is_better'];

function statusFromAttainment(attainment: number): GoalStatus {
  if (attainment >= DEFAULT_GOAL_THRESHOLDS.achieved) return 'achieved';
  if (attainment >= DEFAULT_GOAL_THRESHOLDS.onTrack) return 'on_track';
  if (attainment >= DEFAULT_GOAL_THRESHOLDS.atRisk) return 'at_risk';
  return 'missed';
}

/**
 * Compares a node value with its metric goal. Attainment is actual / target for
 * higher_is_better and target / actual for lower_is_better; zero operands never reach a
 * division, so the status is always one of the four bands.
 */
export function computeGoalDelta(nodeValue: number, goal: MetricGoal): GoalDelta {
  const { target, direction } = goal;
  const deltaAbsolute = nodeValue - target;
  const deltaPct = target === 0 ? null : (deltaAbsolute * 100) / Math.abs(target);
  const lowerIsBetter = direction === 'lower_is_better';

  const goalMet = lowerIsBetter ? nodeValue <= target : nodeValue >= target;
  if (goalMet || (lowerIsBetter && nodeValue === 0)) {
    return { deltaAbsolute, deltaPct, status: 'achieved' };
  }

  // With a non-positive target an unmet goal has no meaningful ratio (zero divisor or
  // inverted signs that would read as over-achievement).
  if (target <= 0) {
    return { deltaAbsolute, deltaPct, status: 'missed' };
  }

  const attainment = lowerIsBetter ? target / nodeValue : nodeValue / target;
  return { deltaAbsolute, deltaPct, status: statusFromAttainment(attainment) };
}

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  achieved: 'Achieved',
  on_track: 'On track',
  at_risk: 'At risk',
  missed: 'Missed',
};

/**
 * Short signed comparison shown next to the value: the percentage of the target, or the
 * absolute gap when the target is zero.
 */
export function formatGoalDelta(
  delta: GoalDelta,
  formatValue: (val: number) => string = String,
): string {
  if (delta.deltaPct !== null) {
    return `${delta.deltaPct > 0 ? '+' : ''}${delta.deltaPct.toFixed(1)}%`;
  }
  return `${delta.deltaAbsolute > 0 ? '+' : ''}${formatValue(delta.deltaAbsolute)}`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Accepts the `goals` control value (a JSON text or an already parsed array) and keeps only
 * well-formed entries. A missing direction defaults to higher_is_better; any other unknown
 * direction drops the entry.
 */
export function normalizeGoals(raw: unknown): MetricGoal[] {
  let entries: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.trim() === '') return [];
    try {
      entries = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(entries)) return [];

  const goals: MetricGoal[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const { metricKey, target, direction = 'higher_is_better' } = entry as Record<string, unknown>;
    const numericTarget = toFiniteNumber(target);
    if (typeof metricKey !== 'string' || metricKey.trim() === '' || numericTarget === null) continue;
    if (!GOAL_DIRECTIONS.includes(direction as GoalDirection)) continue;
    goals.push({ metricKey, target: numericTarget, direction: direction as GoalDirection });
  }
  return goals;
}

/**
 * Goal benchmarked by a column: plain metric columns match on their key, pivot cells on their
 * base metric. Delta and total columns carry a composite base metric and never match.
 */
export function findColumnGoal(
  column: { key: string; baseMetric?: string },
  goals: MetricGoal[],
): MetricGoal | undefined {
  if (goals.length === 0) return undefined;
  const metricKey = column.baseMetric ?? column.key;
  return goals.find(goal => goal.metricKey === metricKey);
}
