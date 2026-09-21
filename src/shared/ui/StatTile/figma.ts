/** Figma ↔ code contract for StatTile. */
export const figma = {
  setId: '135:3290',
  name: 'Dashboard',
  props: { '68 (text)': 'value', 'Variables (text)': 'label', 'Tab Icons (instance)': 'icon' },
  figmaGaps: {},
  notes: 'The set binds no variables. The 30px Tab Icon instance has no derived token; the CSS composes icon/size/lg + space/inline-sm. The glyph colour is not set in Figma (instance default); code uses the same white as the texts.',
} as const
