/**
 * 'diff' as a token of a metric name: 'diff', 'delta_diff', 'differenza', but not the Italian
 * words 'differibile' or 'differita' (priority class D, deferred services), which are volumes.
 */
const DIFF_TOKEN = /diff(?!er(?!enz))/;

export const hasDiffToken = (lowerName: string): boolean => DIFF_TOKEN.test(lowerName);
