/** Figma ↔ code contract for SizeExpander. */
export const figma = {
  setId: '133:1628',
  name: 'size expander',
  /** The set has no Figma properties; the three SizeStep instances become `value` (active step = SizeStep Variant2). */
  props: { 'Frame 1430102613 (×3)': 'value: "S" | "M" | "L"' },
  figmaGaps: {},
  notes: 'Figma binds status-pill/fg/default as the root *fill*; code reads it as the step text colour (a white pill behind white glyphs is unreadable). The `size-expander` glyph in the icon set is only the "L" letterform, so the steps are real text.',
} as const
