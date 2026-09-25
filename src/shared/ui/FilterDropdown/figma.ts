/** Figma ↔ code contract for FilterDropdown ("filters" 7:44569). */
export const figma = {
  setId: '7:44569',
  name: 'filters',
  props: { Icon: 'icon', 'Dropdown Name': 'children' },
  propGaps: {
    'Property 1': 'a variant property with a single "Default" option — it carries no design decision, so there is nothing for the code to expose.',
  },
  figmaGaps: {},
  notes: 'Open state reuses chip-filter/*/selected, hover chip-filter/border/hover; neither is a Figma variant of this set.',
} as const
