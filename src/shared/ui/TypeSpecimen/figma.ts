/** Figma ↔ code contract for TypeSpecimen ("Type Specimen" 40000285:8230). */
export const figma = {
  setId: '40000285:8230',
  name: 'Type Specimen',
  props: {
    Level: 'level (Title / Label / Body / Caption)',
    'Specimen (text layer)': 'children',
    'Spec (text layer)': 'spec',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the UX AI Type Artifact. Level=Title binds size/family/weight but no line height (Auto in Figma; there is no uxai/font/line-title), so code uses `line-height: normal`. The set frames are FIXED 536 × 24; inside Type Artifact the instances are FILL.',
} as const
