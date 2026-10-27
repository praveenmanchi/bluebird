/** Figma ↔ code contract for SegmentedControl ("Tab sub menu" 40002378:50041). */
export const figma = {
  setId: '40002378:50041',
  name: 'Tab sub menu',
  props: { Level: 'options.length (2–6)', 'Item n › Label / Icon / State=Selected': 'options[] ({ value, label, icon }) + value' },
  figmaGaps: {
    'surface/accent-strong': 'the Selected item fill, read by the composed SegmentTab',
    'dimension/radius/4': 'the item corner, read by the composed SegmentTab',
    'dimension/space/8': 'the item right inset, read by the composed SegmentTab',
    'chip-filter/icon/size': 'the item glyph size, read by the composed SegmentTab',
  },
  notes: 'Replaces the older "Group Tab selecters" (308:51205), which is no longer used on any page. Items are exposed nested instances, so each screen sets Label, Icon and which item is Selected from the instance; code takes the same as options. The selected item is not always the first.',
} as const
