/** Figma ↔ code contract for TextArea ("Text Area" 40000408:8646). */
export const figma = {
  setId: '40000408:8646',
  name: 'Text Area',
  props: {
    Label: 'label',
    'Show label': 'label !== undefined',
    Value: 'value / placeholder (empty value shows the placeholder, as State=Default does)',
    Helper: 'helperText',
    'Show helper': 'helperText !== undefined',
    State: 'Default = empty value, Filled = value, Focused = :focus-within (state="focused" forces it), Disabled = disabled',
  },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-text-area-root-width': 'The set frame is fixed at 466; instances fill their container, so code is width: 100%.',
    '--bb-derived-text-area-field-stroke-width': 'Field stroke weight reads as raw 1 over REST; code draws it with input/border-width (1), which the Field is bound to.',
  },
  notes: 'Field height (input/textarea/height, 80) is a minimum in code: the native textarea can be dragged taller (resize: vertical).',
} as const
