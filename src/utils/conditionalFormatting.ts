import { ConditionalFormattingRule, ConditionalFormattingScope } from '../types';
import { toFiniteNumber } from './goalBenchmark';

/** Longest regex pattern that is compiled: longer regex rules never format. */
export const MAX_REGEX_PATTERN_LENGTH = 256;
/** Longest value text a regex is tested against: longer values are never formatted. */
export const MAX_REGEX_INPUT_LENGTH = 1000;

const SCOPES: readonly ConditionalFormattingScope[] = ['cell', 'row', 'column'];

export interface ConditionalFormatMatch {
  rule: ConditionalFormattingRule;
  scope: ConditionalFormattingScope;
  /** ht-cond-1 (success), ht-cond-2 (warning) or ht-cond-3 (danger, priority 3 and beyond). */
  className: string;
  style: { backgroundColor?: string; color?: string };
}

const rank = ({ priority }: { priority?: number }): number =>
  Number.isFinite(priority) ? (priority as number) : Infinity;

/**
 * Static guard against catastrophic backtracking, applied before compiling: rejects a group
 * repeated by `*`, `+` or `{n,}` when the group contains a quantifier or an alternation, e.g.
 * `(a+)+b`, `(a|a)*`, `(a*)*`. It is conservative (it also rejects harmless forms such as
 * `(a|b)*`). A JS RegExp cannot be interrupted once running, so this check and the length
 * caps are the whole protection: there is no execution timeout.
 */
export function isSafeRegexPattern(pattern: string): boolean {
  // One flag per open group: whether it contains a quantifier or an alternation.
  const groups: boolean[] = [];
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '\\') {
      i += 1;
    } else if (c === '[') {
      while (++i < pattern.length && pattern[i] !== ']') if (pattern[i] === '\\') i += 1;
    } else if (c === '(') {
      groups.push(false);
      // Skip the ? of (?:, (?= and named groups so it is not read as a quantifier.
      if (pattern[i + 1] === '?') i += 1;
    } else if (c === ')') {
      const risky = groups.pop();
      if (risky && /[*+{]/.test(pattern.charAt(i + 1))) return false;
      if (risky && groups.length > 0) groups[groups.length - 1] = true;
    } else if ('*+?{|'.includes(c) && groups.length > 0) {
      groups[groups.length - 1] = true;
    }
  }
  return true;
}

const regexCache = new Map<string, RegExp | null>();

function compileRegex(pattern: string): RegExp | null {
  let regex = regexCache.get(pattern);
  if (regex === undefined) {
    regex = null;
    if (pattern && pattern.length <= MAX_REGEX_PATTERN_LENGTH && isSafeRegexPattern(pattern)) {
      try {
        regex = new RegExp(pattern);
      } catch {
        // Invalid pattern: the rule stays neutral.
      }
    }
    regexCache.set(pattern, regex);
  }
  return regex;
}

function ruleMatches(rule: ConditionalFormattingRule, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (rule.operator === 'regex') {
    const text = String(value);
    const regex =
      text.length <= MAX_REGEX_INPUT_LENGTH ? compileRegex(String(rule.targetValue)) : null;
    return regex !== null && regex.test(text);
  }
  const v = toFiniteNumber(value);
  const target = toFiniteNumber(rule.targetValue);
  const bound = rule.operator === 'between' ? toFiniteNumber(rule.targetValue2) : target;
  if (v === null || target === null || bound === null) return false;
  const results: Record<string, boolean> = {
    '>': v > target,
    '>=': v >= target,
    '<': v < target,
    '<=': v <= target,
    '==': v === target,
    between: v >= Math.min(target, bound) && v <= Math.max(target, bound),
  };
  return results[rule.operator] === true;
}

/**
 * Formatting of `value` for the rules of `metricKey`: rules are taken by ascending priority
 * (declaration order between equal priorities) and the first one that matches wins. Null when
 * no rule matches; regex rules that are over the length caps, unsafe or invalid never match.
 */
export function applyConditionalFormatting(
  value: unknown,
  metricKey: string,
  rules: ConditionalFormattingRule[],
): ConditionalFormatMatch | null {
  let best: ConditionalFormattingRule | undefined;
  for (const rule of rules) {
    const outranks = !best || rank(rule) < rank(best);
    if (rule.metric === metricKey && outranks && ruleMatches(rule, value)) best = rule;
  }
  return best
    ? {
        rule: best,
        scope: best.scope ?? (best.highlightRow ? 'row' : 'cell'),
        className: `ht-cond-${Math.min(3, Math.max(1, Math.floor(rank(best))))}`,
        // Unset colours stay undefined, which React leaves out of the inline style.
        style: { backgroundColor: best.backgroundColor, color: best.textColor },
      }
    : null;
}

/** Match of the highest precedence (lowest priority, earliest on ties) among several. */
export function firstByPriority(
  matches: (ConditionalFormatMatch | null | undefined)[],
): ConditionalFormatMatch | null {
  let best: ConditionalFormatMatch | null = null;
  for (const match of matches) {
    if (match && (!best || rank(match.rule) < rank(best.rule))) best = match;
  }
  return best;
}

/**
 * Rules of the `conditionalFormatting` control value that name a metric. A missing priority
 * becomes the 1-based position in the list, a missing or unknown scope becomes 'row' with
 * highlightRow and 'cell' otherwise. Unknown operators and non-numeric thresholds are kept
 * but never match.
 */
export function normalizeConditionalFormatting(raw: unknown): ConditionalFormattingRule[] {
  const rules: ConditionalFormattingRule[] = [];
  (Array.isArray(raw) ? raw : []).forEach((entry, index) => {
    if (typeof entry?.metric !== 'string' || entry.metric.trim() === '') return;
    rules.push({
      ...entry,
      priority: toFiniteNumber(entry.priority) ?? index + 1,
      scope: SCOPES.includes(entry.scope) ? entry.scope : entry.highlightRow ? 'row' : 'cell',
    });
  });
  return rules;
}
