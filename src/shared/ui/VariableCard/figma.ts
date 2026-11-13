import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for VariableCard. */
export const figma = {
  setId: '83:940',
  name: 'Variable search card',
  props: {
    'Property 1': 'kind (variable | text-style)',
    'Color/Border/Black (text)': 'name',
    'Universal Toolkit… (text)': 'meta',
    '12 Days ago (text)': 'updated',
    'Frame 1430102562 (change status instance)': 'changeCount | changeStatus | changeLabel',
    'Tab Icons=Research': 'onInspect',
    'Tab Icons=Dropdown- down': 'expanded | onToggle',
  },
  figmaGaps: { ...scaleGaps('icon/size/lg') },
  notes: [
    'Figma has no fill on the root; the card is transparent over the canvas.',
    'The chip "Frame 1430102562" is an instance of "change status" → composed ChangeStatus (change-status/* tokens live in ChangeStatus.css).',
    'Both variants override the chip caption "Updated" → "Usage No." (I83:688;83:672, I287:46234;83:672), so changeLabel defaults to "Usage No."; its caption and count text are rebound to card-variable/title/fg (;83:672, ;83:676), and its count square (Frame 1430102560) is overridden to badge-count/* with a raw 1px stroke.',
    'Figma only draws the Default chip. For changeStatus added / removed, ChangeStatus\'s own [data-status] fill and border colour outrank the badge-count override, so only its radius and stroke width carry over.',
    '2026-10-28: the row reflows (lead and stack FILL, trail HUG, gap 16, centred) and its text is bound to card-variable/title/* and card-variable/meta/* + font/weight-regular instead of raw Museo Sans.',
    'When `expanded` is true the chevron swaps to dropdown-up; the expanded body is VariableCardExpanded, which composes this row as its header.',
  ],
} as const
