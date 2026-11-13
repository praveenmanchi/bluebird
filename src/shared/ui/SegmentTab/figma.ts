/** Figma ↔ code contract for SegmentTab ("Tab selecters" 308:51054). */
export const figma = {
  setId: '308:51054',
  name: 'Tab selecters',
  props: { State: 'selected | state="hover" | state="focus" | disabled', Label: 'children', 'Show icon': 'icon (presence)', Icon: 'icon' },
  figmaGaps: {},
  notes: 'All five states share one row: the Icon instance (24, chip-filter/icon/size) then the Label, with space/4 · space/8 insets and radius/4. The glyph keeps the UI Icons colour (icon/glyph/default) in every state; Disabled dims it with a raw 0.4 layer opacity (--bb-derived-segment-tab-icon-opacity). With Show icon off the label has no glyph beside it, so code evens the inset to space/8 on both sides — in Figma the compact Accessibility S filters override paddingLeft to space/8 the same way.',
} as const
