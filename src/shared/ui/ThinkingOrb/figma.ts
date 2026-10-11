/** Figma ↔ code contract for ThinkingOrb ("Thinking Orb" 40000283:8191). */
export const figma = {
  setId: '40000283:8191',
  name: 'Thinking Orb',
  props: {
    State: 'state (Searching / Composing / Breathing)',
    Size: "size ('20' inline / '40' avatar)",
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the UX AI tab. Figma holds static frames ("Animate in code"); the code animates them with CSS keyframes (Searching swirls, Composing churns, Breathing swells) and stops under prefers-reduced-motion. Every variant clips its ellipses to the sunken pill. Ellipse sizes come from --bb-derived-thinking-orb-*; their x/y offsets are raw in Figma and are written as a share of the orb (e.g. -4/40 → -10%), identical for both sizes. The layer blurs are raw effect values the generator does not export (measured: blobs 7.2 / 3.6, highlight 4 / 2 at Size 40 / 20 — 18% and 10% of the orb), so CSS writes them as blur(orb size × 0.09 / 0.05) against the bound uxai/size/orb-* tokens. The ellipse layers are all named "Ellipse", so the derived names are positional (ellipse--1, --2 …) and renumber if Figma reorders them.',
} as const
