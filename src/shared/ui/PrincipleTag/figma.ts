/** Figma ↔ code contract for PrincipleTag. */
export const figma = {
  setId: '419:40149',
  name: 'Principle',
  props: { Principle: 'principle', Text: 'label' },
  figmaGaps: {},
  notes: 'principle/font/weight (500) and principle/line-height (14px) exist in the Brand collection but Figma draws the caption at 600 / 10px, so the derived tokens are read for those two until the design is rebound.',
} as const
