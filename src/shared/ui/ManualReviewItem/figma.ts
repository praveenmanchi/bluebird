const composed = 'Bound on the nested Checkbox instance(s); rendered by the composed <Checkbox>, whose Checkbox.css consumes it. Nothing to read at ManualReviewItem level.'

/** Figma ↔ code contract for ManualReviewItem ("Manual Review Item" 40000162:7275). */
export const figma = {
  setId: '40000162:7275',
  name: 'Manual Review Item',
  props: {
    Done: 'done (Yes / No)',
    'Checkbox → Label': 'label — the nested Checkbox is an exposed instance in Figma, so its Label surfaces on this set',
    'Disability Indicator': 'kind',
  },
  figmaGaps: {
    'checkbox/gap': composed,
    'disability-indicator/border/default': 'Bound on the nested Disability Indicator instance; rendered by the composed <DisabilityIndicator>, whose DisabilityIndicator.css consumes it.',
    'icon/glyph/default': 'Bound on the nested Disability Indicator tile fill. The composed <DisabilityIndicator> deliberately paints it with disability-indicator/bg/default instead — the same Figma-side mis-binding recorded in DisabilityIndicator/figma.ts. Closes when that tile fill is rebound in Figma.',
  },
  notes: 'Created 2026-09-23. The nested Checkbox has isExposedInstance = true so each row carries its own label.',
} as const
