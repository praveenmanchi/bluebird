/** Figma ↔ code contract for FixRow ("Fix Row" 40000164:7288). */
export const figma = {
  setId: '40000164:7288',
  name: 'Fix Row',
  props: {
    Label: 'label',
    Hex: 'hex',
    Ratio: 'ratio',
    'Sample (frame)': 'sample + on',
    'Button (instance)': 'onApply + applyLabel',
  },
  figmaGaps: { 'icon/glyph/default': 'consumed by the composed Icon (the icons "Fix" instance in Figma)' },
  notes: 'Created 2026-09-23. Reuses the existing Button set (Type=Primary, Size=Medium) rather than drawing a new button.',
} as const
