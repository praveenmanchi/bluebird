const composed = 'Bound on the nested Progress Bar ("Bar") instance; rendered by the composed <ProgressBar>, whose ProgressBar.css consumes it. Nothing to read at Readiness Meter level.'

/** Figma ↔ code contract for ReadinessMeter ("Readiness Meter" 40000275:8183). */
export const figma = {
  setId: '40000275:8183',
  name: 'Readiness Meter',
  props: {
    Tone: 'tone (Success / Warning / Danger; also passed to the Progress Bar)',
    'Bar › Value (Progress Bar instance)': 'value (0–100; the bar and the default Score both follow it)',
    'Label / Score / Caption (text layers, no Figma property)': 'label + score + caption',
  },
  figmaGaps: {
    'mcp/meter/track': composed,
    'mcp/radius/pill': composed,
    'mcp/size/meter': composed,
  },
  notes: 'Created 2026-10-09 for the MCP tab. Label, Score and Caption are plain text layers in Figma (no TEXT properties), so they are optional props defaulting to each variant\'s copy. Figma\'s Warning variant reads "74%" but its bar is the Value=70 Progress Bar (there is no 74 variant); in code one `value` drives both, so the default Warning bar is 74%. The FIXED 40 height is shorter than its content (17 + 4 + 4 + 4 + 14 = 43), so it is applied as min-height.',
} as const
