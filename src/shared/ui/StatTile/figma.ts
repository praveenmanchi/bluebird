/** Figma ↔ code contract for StatTile. */
export const figma = {
  setId: '135:3290',
  name: 'Dashboard',
  props: { '68 (text)': 'value', 'Variables (text)': 'label', 'Tab Icons (instance)': 'icon' },
  figmaGaps: {},
  notes: 'The set binds no variables. The 30px Tab Icon instance has no derived token; the CSS composes icon/size/lg + space/inline-sm. The glyph colour is not set in Figma (instance default); code uses the same white as the texts. The texts moved from Gap Inc Sans to Museo Sans 300 (2026-10-11 pull); the family is read first with type/family/brand as the fallback, since Museo Sans is not a web font.',
} as const
