/** Figma ↔ code contract for Dropdown. */
export const figma = {
  setId: '40000047:5292',
  name: 'Dropdown',
  props: { Type: 'mode', State: 'open | disabled | state', Value: 'value' },
  figmaGaps: {
    'icon/glyph/default': 'The chevron vector is bound to the generic glyph colour; code uses dropdown/chevron/color, which exists in the Brand collection for this purpose.',
  },
} as const
