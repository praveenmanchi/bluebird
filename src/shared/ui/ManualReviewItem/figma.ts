/** Figma ↔ code contract for ManualReviewItem ("Manual Review Item" 40000162:7275). */
export const figma = {
  setId: '40000162:7275',
  name: 'Manual Review Item',
  props: {
    Done: 'done (Yes / No)',
    'Checkbox → Label': 'label — the nested Checkbox is an exposed instance in Figma, so its Label surfaces on this set',
    'Disability Indicator': 'kind',
  },
  figmaGaps: {},
  notes: 'Created 2026-09-23. The nested Checkbox has isExposedInstance = true so each row carries its own label.',
} as const
