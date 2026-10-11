/** Figma ↔ code contract for Step ("Step" 40000275:8141). */
export const figma = {
  setId: '40000275:8141',
  name: 'Step',
  props: {
    Number: 'number',
    Label: 'label',
    State: 'state (Done / Current / Upcoming)',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the MCP tab (Select → Check → Generate → Ship). Since 2026-10-11 the Done variant draws a check Vector (checkbox/mark/color, raw 10.7 × 8) in the Index instead of the Number, so Done ignores `number`; code renders the shared check Mark and exposes the Index as role="img" "Done". Current sets aria-current="step".',
} as const
