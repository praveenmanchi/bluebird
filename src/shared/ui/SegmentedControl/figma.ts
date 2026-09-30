/** Figma ↔ code contract for SegmentedControl ("Group Tab selecters" 308:51205). */
export const figma = {
  setId: '308:51205',
  name: 'Group Tab selecters',
  props: { 'Property 1': 'options.length (4 level = 4 options, 2 level = 2 options)', 'Tab selecters › Select Text': 'options[]', 'Tab selecters › Property 1=Selected': 'value' },
  figmaGaps: {
    'tab/icon/default': 'read by the composed SegmentTab (.bb-segment-tab__icon); the Selected segment keeps it, only unselected glyphs are overridden here',
  },
  notes: 'Track fill (#383838), stroke (#ffffff33) and the 4 level item spacing (4) are raw in Figma → derived tokens; bind to color/neutral/400, a new border variable and a spacing variable to close the gap. The spacing applies to data-level="4" only: 2 level has no itemSpacing. Unselected segments’ glyphs read icon/glyph/muted, mirroring Figma’s instance override. Other segment visuals come from SegmentTab.',
} as const
