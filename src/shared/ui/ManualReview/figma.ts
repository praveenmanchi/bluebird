/** Figma ↔ code contract for ManualReview ("Manual Review" 40000162:7276). */
export const figma = {
  setId: '40000162:7276',
  name: 'Manual Review',
  props: { Label: 'label', Count: 'count — code derives "1/3" from the checks when it is omitted', 'Manual Review Item instances': 'checks' },
  figmaGaps: {},
  notes: 'Created 2026-09-23. Roughly 70% of WCAG is not machine-detectable; this panel is where the card admits that instead of implying full coverage.',
} as const
