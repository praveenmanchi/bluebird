const composed = 'Bound on the nested Button ("Apply") instance; rendered by the composed <Button>, whose Button.css consumes it. Nothing to read at FixRow level.'
const sample = 'The Sample swatch is data-driven: FixRow paints it with the colour pair under review (`on` / `hex` props). Figma binds placeholder colours for the mock-up.'

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
  figmaGaps: {
    'icon/glyph/default': 'consumed by the composed Icon (the icons "Fix" instance in Figma)',
    'button/primary/bg/default': composed,
    'button/primary/border/default': composed,
    'button/primary/gap': composed,
    'button/primary/height': composed,
    'button/primary/padding-x': composed,
    'button/primary/radius': composed,
    'button/primary/width-md': composed,
    'surface/accent-strong': sample,
    'text/on-accent': sample,
  },
  notes: 'Created 2026-09-23. Reuses the existing Button set (Type=Primary, Size=Medium) rather than drawing a new button.',
} as const
