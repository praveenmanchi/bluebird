/** Figma ↔ code contract for ValueDiff ("Value Diff" 40000341:8469). */
const sample = 'Sample swatch fill in Figma (the Bridge primary the default diff shows). In code the swatch paints the scanned value itself — oldColor ?? old / newColor ?? new — so no design token is read.'

export const figma = {
  setId: '40000341:8469',
  name: 'Value Diff',
  props: {
    Old: 'old (+ oldColor for the swatch)',
    New: 'new (+ newColor for the swatch)',
    Kind: 'kind (Color / Number)',
  },
  figmaGaps: {
    'bridge/color/primary/400-brand': sample,
    'bridge/color/primary/600': sample,
  },
  notes: 'Created 2026-10-11 for the Publish tab. Kind=Color shows a 16 swatch before each value; Kind=Number shows values only. The old value is a <del> (struck through, publish/diff/old-text) and the new one an <ins> (publish/text/title, medium), so the change reads semantically without the arrow; the arrow is decorative and, as in Figma, uses publish/diff/old-text (publish/diff/arrow exists but the set does not bind it).',
} as const
