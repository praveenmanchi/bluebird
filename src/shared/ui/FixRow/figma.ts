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
    'Button › Show leading icon + Leading icon (91:1958)': 'leadingIcon="variables" (fixed; Fix Row exposes no property for it)',
    'Button › width FIXED (button/primary/width-md)': 'width="fixed" (Apply is 120 wide in Figma, not hugging its label)',
  },
  figmaGaps: {
    'icon/glyph/default': 'consumed by the composed Icon (the icons "Fix" instance in Figma)',
    'button/primary/bg/default': composed,
    'button/primary/border/default': composed,
    'button/primary/gap': composed,
    'button/primary/height': composed,
    'button/primary/padding-x': composed,
    'button/primary/radius': composed,
    'button/primary/width-md': 'Bound on the nested Button ("Apply") instance, which Figma sizes FIXED; FixRow passes width="fixed", so Button.css reads it under [data-width="fixed"].',
    'surface/accent-strong': sample,
    'text/on-accent': sample,
  },
  notes: 'Created 2026-09-23. Reuses the existing Button set (Type=Primary, Size=Medium) rather than drawing a new button. The root frame carries a fill (surface/accent-subtle) and a stroke (border/accent) that are both hidden, and pads only top and bottom (Icon and Apply sit flush with its edges), so the row draws no box; checked against the live file at version 2403078664214847267.',
} as const
