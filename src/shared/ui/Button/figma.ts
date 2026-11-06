/** Figma ↔ code contract for Button. Read by scripts/check-tokens.ts and the stories. */
export const figma = {
  setId: '40000040:5139',
  name: 'Button',
  /** Figma prop → code prop. */
  props: { Type: 'variant (primary | secondary | danger)', State: 'state | disabled', Size: 'size (md | lg)', 'width-md / width-lg': 'width="fixed"', Label: 'children', 'Leading icon': 'leadingIcon', 'Show leading icon': 'leadingIcon (presence)', 'Trailing icon': 'trailingIcon', 'Show trailing icon': 'trailingIcon (presence)' },
  /** Tokens the Figma set binds that the code deliberately does not read, with the reason. */
  figmaGaps: {
    'icon/glyph/default': 'The icon instance inside the set is bound to the generic glyph colour; code uses button/<type>/icon/color (+ -disabled), which exist in the Brand collection for this purpose. Rebind the icon vector in Figma to close the gap.',
    'dimension/opacity/55': 'Disabled no longer dims in Figma (2026-11-07); figma/components.json still holds the old binding until the next pull.',
  },
  notes: 'Figma fixes the set frames to width-md (120) / width-lg (160) while every instance in the screens hugs its label; code hugs by default and `width="fixed"` reproduces the frame width (the variant stories use it). The Large variants do not expose the Label / icon component properties (not wired in Figma yet); code treats both sizes identically.',
} as const
