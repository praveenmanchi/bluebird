const swatch = 'Bound on the Kind=Color Preview, a Color Swatch (Size=Small) instance; the composed <ColorSwatch> consumes it. The fill is a placeholder — the row paints the real colour through the `color` prop.'
const swap = 'Bound on the nested Swap Dropdown instance; the composed <Dropdown> consumes it in Dropdown.css.'

/** Figma ↔ code contract for VariableRow ("Variable Row" 40000287:8277). */
export const figma = {
  setId: '40000287:8277',
  name: 'Variable Row',
  props: {
    Token: 'token',
    Where: 'where',
    Kind: 'kind (Color / Number)',
    State: 'state (Default / Changed)',
    'Preview (Kind=Color: Color Swatch instance; Kind=Number: value tile "12")': 'color | amount',
    'Swap (Dropdown instance, Value override; State=Open when Changed)': 'value + options + onChange',
  },
  figmaGaps: {
    'uxai/beam/5': swatch,
    'uxai/swatch/border': swatch,
    'dropdown/bg/default': swap,
    'dropdown/border/default': swap,
    'dropdown/radius': swap,
    'dropdown/gap': swap,
    'dropdown/padding-x': swap,
    'dropdown/height': swap,
  },
  derivedGaps: {
    '--bb-derived-variable-row-swap-stroke-width': 'Stroke weight of the nested Swap Dropdown instance; Dropdown.css draws it from border/width/default (same 1px).',
  },
  notes: 'Created 2026-10-09 for the UX AI variable-swap flow. Swap is a real Dropdown instance (Type=Single): FIXED at 220, the Dropdown set\'s own frame width, so the row reads --bb-derived-dropdown-root-width. In State=Changed Figma swaps the instance to Dropdown State=Open purely to get the focus border; code keeps the menu closed (aria-expanded=false) and applies dropdown/border/focus from VariableRow.css instead. Clicking the Swap opens a DropdownMenu of `options` (MenuItem rows); picking one fires onChange(variable). The Kind=Number Preview is a plain frame (sunken fill, chip border) with the value text, not an instance, so it is drawn here. The root pads uxai/space/hair vertically inside a FIXED 40 height.',
} as const
