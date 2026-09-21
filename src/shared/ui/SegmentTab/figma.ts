/** Figma ↔ code contract for SegmentTab ("Tab selecters" 308:51054). */
export const figma = {
  setId: '308:51054',
  name: 'Tab selecters',
  props: { 'Property 1': 'selected', 'Select Text': 'children', 'Tab Icons (fixed instance)': 'icon' },
  figmaGaps: {},
  notes: 'Default text (#b3b3b3) and the Selected fill (#1a5ee5) / stroke (#323232) are raw in Figma and read through --bb-derived-segment-tab-*; bind them to input/fg/helper, surface/accent-strong and button/primary/border/disabled in Figma to close the gap.',
} as const
