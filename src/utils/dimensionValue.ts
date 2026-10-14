export const EMPTY_DIMENSION_VALUE = '(Empty)';

const MIN_EPOCH_MS = 1e11;
const MAX_EPOCH_MS = 3e12;

/**
 * Display and key form of a dimension value, shared by the tree builder and the pivot column
 * collection so that `${metric}___${pivotKey}` cells always match their columns. Epoch
 * millisecond timestamps from temporal columns become ISO dates (YYYY-MM-DD).
 */
export function toDimensionValue(raw: unknown): string {
  if (raw === null || raw === undefined) return EMPTY_DIMENSION_VALUE;
  if (typeof raw === 'number' && raw > MIN_EPOCH_MS && raw < MAX_EPOCH_MS) {
    return new Date(raw).toISOString().slice(0, 10);
  }
  return String(raw);
}
