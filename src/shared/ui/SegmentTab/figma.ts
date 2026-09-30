/** Figma ↔ code contract for SegmentTab ("Tab selecters" 308:51054). */
export const figma = {
  setId: '308:51054',
  name: 'Tab selecters',
  props: { 'Property 1': 'selected', 'Select Text': 'children', 'Tab Icons (fixed instance)': 'icon' },
  figmaGaps: {},
  notes: 'Default text (#b3b3b3) and the Selected fill (#1a5ee5) / stroke (#323232) are raw in Figma and read through --bb-derived-segment-tab-*; bind them to input/fg/helper, surface/accent-strong and button/primary/border/disabled in Figma to close the gap. The glyph reads tab/icon/default in both variants, independent of the label colour; only the code-only disabled state dims it with the label. Default nests the Tab Icons instance in Container (24x24, chip-filter/gap, 2 inset; code sizes it with chip-filter/icon-size); Selected sets it beside Container at an unbound 18x18 with no spacing or inset, so a selected segment is narrower than a default one. The generator emits no derived size for instances inside a component, so code sizes the Selected glyph with Semantics size/icon/md (18) until Figma binds an icon size there.',
} as const
