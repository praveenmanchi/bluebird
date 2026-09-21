/** Figma ↔ code contract for Button. Read by scripts/check-tokens.ts and the stories. */
export const figma = {
  setId: '40000040:5139',
  name: 'Button',
  /** Figma prop → code prop. */
  props: { Type: 'variant', State: 'state | disabled', Label: 'children', 'Leading icon': 'leadingIcon', 'Trailing icon': 'trailingIcon' },
  /** Tokens the Figma set binds that the code deliberately does not read, with the reason. */
  figmaGaps: {
    'icon/glyph/default': 'The icon instance inside the set is bound to the generic glyph colour; code uses button/<type>/icon/color (+ -disabled), which exist in the Brand collection for this purpose. Rebind the icon vector in Figma to close the gap.',
  },
} as const
