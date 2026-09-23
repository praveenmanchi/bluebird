/** Figma ↔ code contract for Occurrences ("Occurrences" 40000160:7250). */
export const figma = {
  setId: '40000160:7250',
  name: 'Occurrences',
  props: { Count: 'count (the × is drawn by the component)', Label: 'label', 'Link Button (instance)': 'onSelectAll + selectAllLabel' },
  figmaGaps: {},
  notes: 'Created 2026-09-23. Without onSelectAll the roll-up renders read-only, matching an instance with the Link Button hidden.',
} as const
