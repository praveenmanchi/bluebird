/** Figma ↔ code contract for FilterDropdown ("filters" 7:44569). */
export const figma = {
  setId: '7:44569',
  name: 'filters',
  props: { Icon: 'icon', 'Dropdown Name': 'children', 'Property 1': 'state (Default | Focus → default | focus)' },
  figmaGaps: {},
  notes: 'Open state reuses chip-filter/*/selected, hover chip-filter/border/hover; neither is a Figma variant of this set. Focus is: border/focus at the raw 2 stroke weight, drawn inside the frame.',
} as const
