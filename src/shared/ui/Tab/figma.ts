import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for Tab (91:1989). "Tab" 419:39986 (TabLegacy) is an older 18px-icon alias of this set. */
export const figma = {
  setId: '91:1989',
  name: 'Tab',
  props: { 'Property 1': 'variant (default | active | variant3); Hover is :hover / state="hover"; Focus is state="focus"', Label: 'children', Icon: 'icon', 'Show Header Icons': 'showIcon', 'Variant 3 text': 'showVariant3Text' },
  figmaGaps: { ...scaleGaps('font/weight-medium', 'icon/size/lg') },
  derivedGaps: {
    '--bb-derived-tab-uxai-as-assister-font-family': 'A raw font name on the label ("Noto Sans", no variable bound); code reads the same family through --bb-font-family-ui.',
  },
  notes: 'The Active variant keeps tab/fg/default bound on its text in Figma; code lifts it to tab/fg/active (+ tab/icon/active), which exist in the Brand collection for this purpose. The label font is Noto Sans (font/family-ui), falling back to tab/font/family.',
} as const
