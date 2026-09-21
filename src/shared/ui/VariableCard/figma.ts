/** Figma ↔ code contract for VariableCard. */
export const figma = {
  setId: '83:940',
  name: 'Variable search card',
  props: {
    'Property 1': 'kind (variable | text-style)',
    'Color/Border/Black (text)': 'name',
    'Universal Toolkit… (text)': 'meta',
    '12 Days ago (text)': 'updated',
    'Frame 1430102562 (change status instance)': 'changeCount | changeStatus',
    'Tab Icons=Research': 'onInspect',
    'Tab Icons=Dropdown- down': 'expanded | onToggle',
  },
  figmaGaps: {},
  notes: [
    'Figma has no fill on the root; the card is transparent over the canvas.',
    'The chip "Frame 1430102562" is an instance of "change status" → composed ChangeStatus (change-status/* tokens live in ChangeStatus.css).',
    'When `expanded` is true the chevron swaps to dropdown-up; the expanded body is VariableCardExpanded, which composes this row as its header.',
  ],
} as const
