/** Figma ↔ code contract for PersonaCard. */
export const figma = {
  setId: '264:10472',
  name: 'Frame 1430102664',
  props: {
    'Team Name': 'name',
    'Team Description': 'description (10px line) | footnote (11px line next to the button)',
    'Delivery boy (Userpic 05 instance)': 'image',
    'Tab (Variant3 instances)': 'tabs',
    'variable button → Button Label': 'actionLabel',
    'variable button (click)': 'onOpen',
  },
  figmaGaps: {
    'tab/bar/bg': 'consumed by the composed Tab',
    'tab/bar/border': 'consumed by the composed Tab',
    'tab/gap': 'consumed by the composed Tab',
    'tab/padding-x': 'consumed by the composed Tab',
    'tab/padding-y': 'consumed by the composed Tab',
  },
  notes: [
    'Unnamed in Figma ("Frame 1430102664"); rename the component before binding.',
    'Both description text layers share the Team Description text in Figma; code exposes them as `description` and `footnote` so they can differ.',
    'The illustration has no size token: figma/assets/persona-userpic-05.png is rendered at its intrinsic 100×106.',
    'The 10px description has a 12 line-height with no variable in Figma; dimension/space/12 is used until a type token exists.',
  ],
} as const
