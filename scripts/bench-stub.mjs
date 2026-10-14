export const ensureIsArray = v => (v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]);
export const getNumberFormatter = () => v => String(v);
export const t = s => s;
