/** Figma ↔ code contract for ChangeStatus. */
export const figma = {
  setId: '86:966',
  name: 'change status',
  props: { 'Property 1': 'status (Default = updated, Variant2 = added, Variant3 = removed)', '52': 'count', 'Updated / Added / Removed': 'label' },
  figmaGaps: {},
  notes: 'Figma varies the root gap per variant (8 / 19 / 4) to keep the caption + square at 79px; code mirrors those gaps via the derived tokens.',
} as const
