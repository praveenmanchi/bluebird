/** Figma ↔ code contract for ScoreRow ("Score Row" 40000447:8676). */
export const figma = {
  setId: '40000447:8676',
  name: 'Score Row',
  props: { 'Score Value (exposed)': 'value / scoreLabel', 'Readiness Meter (exposed)': 'meterLabel / meterScore / caption' },
  figmaGaps: {
    'mcp/space/tight': 'Bound inside the nested Readiness Meter; rendered by the composed <ReadinessMeter>.',
  },
  derivedGaps: {
    '--bb-derived-score-row-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
  },
  notes: 'Created 2026-10-11. Before a scan the meter keeps the Warning tone with an empty bar, as the Figma Empty variants do.',
} as const
