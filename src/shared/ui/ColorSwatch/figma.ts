/** Figma ↔ code contract for ColorSwatch ("Color Swatch" 40000283:8194). */
export const figma = {
  setId: '40000283:8194',
  name: 'Color Swatch',
  props: {
    Size: 'size (Small / Large)',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the UX AI artifacts (Brand Swatch, Variable Row). The fill binding (uxai/beam/5) is only the placeholder colour: the CSS paints it as the default and the `color` prop overrides it inline, because what a swatch shows is data. The stroke is a border inside border-box sizing, so the swatch stays exactly uxai/size/swatch(-lg).',
} as const
