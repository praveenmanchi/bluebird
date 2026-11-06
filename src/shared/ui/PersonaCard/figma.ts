import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for PersonaCard. */
export const figma = {
  setId: '264:10472',
  name: 'Frame 1430102664',
  props: {
    'Team Name': 'name',
    'Team Description': 'description (10px line) | footnote (11px line next to the button)',
    'Delivery boy (Userpic 05 instance)': 'image | media (code-only: a live replacement for the picture)',
    'Tab (Variant3 instances)': 'tabs',
    'variable button → Button Label': 'actionLabel',
    'variable button (click)': 'onOpen',
  },
  figmaGaps: {
    ...scaleGaps('font/size-body', 'type/line/17_6'),
    'tab/bar/bg': 'consumed by the composed Tab',
    'tab/bar/border': 'consumed by the composed Tab',
    'tab/gap': 'consumed by the composed Tab',
    'tab/padding-x': 'consumed by the composed Tab',
    'tab/padding-y': 'consumed by the composed Tab',
  },
  notes: [
    'Unnamed in Figma ("Frame 1430102664"); rename the component before binding.',
    'Both description text layers share the Team Description text in Figma; code exposes them as `description` and `footnote` so they can differ.',
    'The illustration has no size token: figma/assets/persona-userpic-05.png is rendered at 100×106 when passed as `image`. The plugin passes `media` (the live bird) instead, so the PNG is only in stories.',
    'The 10px description has a 12 line-height with no variable in Figma; dimension/space/12 is used until a type token exists.',
  ],
} as const
