/** Figma ↔ code contract for BreakdownCard ("Breakdown Card" 40000447:8687). */
export const figma = {
  setId: '40000447:8687',
  name: 'Breakdown Card',
  props: { Title: 'title', 'Breakdown Row instances': 'rows' },
  figmaGaps: {
    'a11y/space/inline': 'Bound on the nested Breakdown Rows; rendered by the composed <BreakdownRow>.',
  },
  derivedGaps: {
    '--bb-derived-breakdown-card-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
  },
  notes: 'Created 2026-10-11. Figma seeds four rows (the principles); code renders one per entry.',
} as const
