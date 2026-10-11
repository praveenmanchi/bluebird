/** Figma ↔ code contract for LevelRow ("Level Row" 40000447:8664). */
export const figma = {
  setId: '40000447:8664',
  name: 'Level Row',
  props: { Tone: 'tone (scoreTone of passing / total when omitted)', Name: 'name', Hint: 'hint', Count: 'passing / total', Percent: 'passing / total', 'Bar (Progress Bar)': 'passing / total' },
  figmaGaps: {
    'mcp/meter/track': 'Bound inside the nested Progress Bar; rendered by the composed <ProgressBar>.',
    'mcp/radius/pill': 'Bound inside the nested Progress Bar; rendered by the composed <ProgressBar>.',
    'mcp/size/meter': 'Bound inside the nested Progress Bar; rendered by the composed <ProgressBar>.',
  },
  derivedGaps: {
    '--bb-derived-level-row-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
  },
  notes: 'Created 2026-10-11. The bar is the MCP Progress Bar; Figma resizes its Fill per instance, code passes value.',
} as const
