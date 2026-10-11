/** Figma ↔ code contract for PromptChip ("Prompt Chip" 40000284:8202). */
export const figma = {
  setId: '40000284:8202',
  name: 'Prompt Chip',
  props: {
    Label: 'children',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the UX AI tab. A real <button> (onClick); the leading Tab Icons instance is "colors" by default and `icon` swaps it the way an instance swap does (Figma exposes no property for it). The glyph keeps the Tab Icons colour (icon/glyph/default). Hover and focus are not drawn in Figma: hover borrows uxai/text/meta for the stroke, focus uses the shared border/focus ring.',
} as const
