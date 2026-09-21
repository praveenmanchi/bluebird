/** Figma ↔ code contract for Input. */
export const figma = {
  setId: '204:9667',
  name: 'Input Box',
  props: {
    'Title ': 'label',
    'Title icon': 'icon (IconName; undefined hides it)',
    'Eye ': 'password',
    'Input Text': 'value / placeholder',
    'Buttom Text ': 'helperText',
    'Buttom Text': 'helperText !== undefined',
  },
  figmaGaps: {},
  notes: [
    'input/label/font-weight resolves to "500px" in the generated CSS (a length, not a weight) — the browser ignores it. Fix the Figma variable type.',
    'The field padding (12) and value font (Inter 400) are raw in Figma; code reads input/padding-x and input/font/* instead, which is where they should be bound.',
    'The eye instance is 24px in Figma; code sizes it with icon/size/lg.',
    'The helper text layer is unnamed, so its derived tokens carry the full default text. Name the layer "Helper" in Figma and re-pull.',
  ],
} as const
