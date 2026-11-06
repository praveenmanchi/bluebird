import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for Tab (91:1989). "Tab" 419:39986 (TabLegacy) is an older 18px-icon alias of this set. */
export const figma = {
  setId: '91:1989',
  name: 'Tab',
  props: { 'Property 1': 'variant', Label: 'children', Icon: 'icon', 'Show Header Icons': 'showIcon', 'Variant 3 text': 'showVariant3Text' },
  figmaGaps: { ...scaleGaps('font/weight-medium'), 'font/family-display': 'Tab labels moved to Noto Sans in Figma on 2026-11-07; figma/components.json still holds the old binding until the next pull.' },
  notes: 'The Active variant keeps tab/fg/default bound on its text in Figma; code lifts it to tab/fg/active (+ tab/icon/active), which exist in the Brand collection for this purpose. The label font is Noto Sans (font/family-ui), falling back to tab/font/family.',
} as const
