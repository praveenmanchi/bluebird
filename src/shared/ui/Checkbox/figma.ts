/** Figma ↔ code contract for Checkbox. */
export const figma = {
  setId: '40000046:5237',
  name: 'Checkbox',
  props: { Selected: 'checked (false | true | "mixed")', State: 'state | disabled', Label: 'label', 'Show label': 'label !== undefined' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-checkbox-vector-width': 'Figma redrew the check as a filled 10.7×8 vector (pulled 2026-10-11). The REST pull does not re-export marks, so the Mark glyph (figma/icons.json marks.check) is still the earlier stroked 12×12 path, drawn at checkbox/mark/size with its own 2-unit stroke. Re-export the marks through the relay to follow the new shape.',
    '--bb-derived-checkbox-vector-height': 'Figma redrew the check as a filled 10.7×8 vector (pulled 2026-10-11). The REST pull does not re-export marks, so the Mark glyph (figma/icons.json marks.check) is still the earlier stroked 12×12 path, drawn at checkbox/mark/size with its own 2-unit stroke. Re-export the marks through the relay to follow the new shape.',
  },
} as const
