// Messages shown next to a setting when it cannot do what its name promises. Each rule mirrors what
// the transform actually does with the form data, so a message appears only when it is true.

export type Hint = { tone: 'info' | 'warning'; text: string };

// Hint controls carry no chart value: they only show a message, so tests and tooling skip them.
export const HINT_PREFIX = 'hint_';

type Controls = Record<string, { value?: unknown } | undefined> | undefined;

export const HINT_TEXTS = {
  sparklines: (pivotColumns: number) =>
    `Le sparkline richiedono esattamente una colonna pivot con i periodi: ora ne hai ${pivotColumns}.`,
  suppression: 'Nessuna metrica indicata: finché non ne scegli almeno una, nessun conteggio viene nascosto.',
  weight: 'Senza metrica peso la media ponderata usa i pesi automatici sul volume.',
};

// Pivot columns only exist in multi-dimension mode; stored values are ignored in parent-child mode.
export function pivotColumnCount(controls: Controls): number {
  if (controls?.hierarchyType?.value !== 'multi_dimension') return 0;
  const columns = controls?.columns?.value;
  return Array.isArray(columns) ? columns.length : 0;
}

export function sparklineHint(controls: Controls): Hint | null {
  const count = pivotColumnCount(controls);
  if (!controls?.showSparklines?.value || count === 1) return null;
  return { tone: 'warning', text: HINT_TEXTS.sparklines(count) };
}

export function suppressionHint(controls: Controls): Hint | null {
  if (!(Number(controls?.suppressionThreshold?.value) > 0)) return null;
  if (String(controls?.suppressionMetrics?.value ?? '').trim() !== '') return null;
  return { tone: 'warning', text: HINT_TEXTS.suppression };
}

export function weightHint(controls: Controls): Hint | null {
  if (controls?.aggregationMode?.value !== 'weighted_avg') return null;
  if (String(controls?.weightColumn?.value ?? '').trim() !== '') return null;
  return { tone: 'info', text: HINT_TEXTS.weight };
}
