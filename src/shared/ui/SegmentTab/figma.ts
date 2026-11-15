/** Figma ↔ code contract for SegmentTab ("Tab selecters" 308:51054). */
const COUNT = 'the Number value chip, read by the composed StoryPoints'

export const figma = {
  setId: '308:51054',
  name: 'Tab selecters',
  props: { State: 'selected | state="hover" | state="focus" | disabled', Label: 'children', 'Show icon': 'icon (presence)', Icon: 'icon', 'Number value': 'count (presence)' },
  figmaGaps: {
    'jira/points/bg': COUNT,
    'jira/points/border': COUNT,
    'jira/border-width': COUNT,
    'jira/radius/pill': COUNT,
    'jira/space/inline': COUNT,
    'jira/space/hair': COUNT,
  },
  notes: 'All five states share one row: the Icon instance (24, chip-filter/icon/size) then the Label and, with Number value on, a Story Points instance holding the count, space/6 apart, with space/4 · space/8 insets and radius/4. The glyph keeps the UI Icons colour (icon/glyph/default) in every state; Disabled dims it with a raw 0.4 layer opacity (--bb-derived-segment-tab-icon-opacity). With Show icon off the label has no glyph beside it, so code evens the inset to space/8 on both sides — in Figma the compact Accessibility S filters override paddingLeft to space/8 the same way.',
} as const
