/** Figma ↔ code contract for PageFilter. */
export const figma = {
  setId: '7:44524',
  name: 'pages',
  props: { 'All Pages (text)': 'label', 'Tab Icons (instance)': 'icon', 'SVG/Vector (chevron)': 'always rendered as chevron-tiny; `open` flips it' },
  figmaGaps: {},
  notes: 'Hover is not a Figma variant of this set; it reuses chip-filter/border/hover. The Tab Icon instance has no colour bound; code colours it through chip-filter/fg/default like the chevron vector.',
} as const
