/** Figma ↔ code contract for SegmentedControl ("Group Tab selecters" 308:51205). */
export const figma = {
  setId: '308:51205',
  name: 'Group Tab selecters',
  props: { 'Property 1': 'options.length (4 level = 4 options, 2 level = 2 options)', 'Tab selecters › Select Text': 'options[]', 'Tab selecters › Property 1=Selected': 'value' },
  figmaGaps: {},
  notes: 'Track fill (#383838) and stroke (#ffffff33) are raw in Figma → derived tokens; bind to color/neutral/400 and a new border variable to close the gap. Segment visuals come from SegmentTab.',
} as const
