import type { Hint } from './hints';

const TONES = {
  info: { bar: '#2B7BB9', background: 'rgba(43, 123, 185, 0.12)' },
  warning: { bar: '#C77700', background: 'rgba(232, 163, 61, 0.16)' },
};

// Explore accepts a component as control type and passes it the props returned by mapStateToProps.
// Colors are translucent and the text inherits the theme, so the note reads in light and dark mode.
export function InlineHint({ hint }: { hint?: Hint | null }) {
  if (!hint) return null;
  const tone = TONES[hint.tone];
  return (
    <div
      role="note"
      style={{
        borderLeft: `3px solid ${tone.bar}`,
        background: tone.background,
        padding: '6px 10px',
        margin: '4px 0',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {hint.text}
    </div>
  );
}

// A control row that shows `compute(controls)` and disappears when there is nothing to say.
// renderTrigger stays on: a control without it would move its whole section to the Data tab.
export const hintControl = (name: string, compute: (controls: any) => Hint | null) => ({
  name,
  config: {
    type: InlineHint,
    label: '',
    default: null,
    renderTrigger: true,
    // Explore recomputes mapStateToProps on every render only when the control asks for it.
    shouldMapStateToProps: () => true,
    mapStateToProps: (state: { controls?: any }) => ({ hint: compute(state?.controls) }),
    visibility: ({ controls }: { controls: any }) => compute(controls) !== null,
  },
});
