/** Figma ↔ code contract for ThemeChip. */
export const figma = {
  setId: '419:45605',
  name: 'Theme',
  props: { 'Theme type': 'theme', 'String Translations (instance)': 'label', 'Icon (instance)': 'derived from theme' },
  figmaGaps: {
    'icon/glyph/default': 'Figma binds the generic glyph colour as the chip *background* (a near-white fill under theme-card/label/fg, which is white in Bridge). Code uses theme-card/bg/default, the token that pairs with theme-card/label/fg and theme-card/icon/color in every brand. Rebind the root fill in Figma to close the gap.',
  },
} as const
