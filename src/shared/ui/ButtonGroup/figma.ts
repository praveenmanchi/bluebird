import { scaleGaps } from '../../brand/scaleGaps'
const composed = 'Bound on the nested Button instance; rendered by the composed <Button>, whose Button.css consumes it. Nothing to read at group level.'

/** Figma ↔ code contract for ButtonGroup. */
export const figma = {
  setId: '215:12537',
  name: 'Container',
  props: {
    'Save Configuration (Type=Primary, Label)': 'primaryLabel / onPrimary',
    'Test Connection (Type=Secondary, Label)': 'secondaryLabel / onSecondary',
    // Added in Figma 2026-09-23; "Seconndary butto" is Figma's typo, kept so the key matches.
    'Primary Button': 'showPrimary',
    'Seconndary butto': 'showSecondary',
  },
  figmaGaps: {
    ...scaleGaps('button/secondary/border-width', 'button/primary/border-width'),
    'button/primary/width-md': composed,
    'button/secondary/width-md': composed,
    'button/primary/bg/default': composed,
    'button/primary/border/default': composed,
    'button/primary/radius': composed,
    'button/primary/gap': composed,
    'button/primary/padding-x': composed,
    'button/primary/height': composed,
    'button/secondary/bg/default': composed,
    'button/secondary/border/default': composed,
    'button/secondary/radius': composed,
    'button/secondary/gap': composed,
    'button/secondary/height': composed,
  },
  notes: [
    'The group gap is bound to button/secondary/padding-x in Figma (no dedicated button-group/gap variable). Code follows that binding.',
    'The 970px frame width is raw; code fills the container up to it.',
  ],
} as const
