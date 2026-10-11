const ellipse = 'Track and Arc are 16×16 ellipses filling the root; code draws both as circles in the root\'s own box, sized by login/spinner/size.'

/** Figma ↔ code contract for Spinner ("Spinner" 40000321:8410). */
export const figma = {
  setId: '40000321:8410',
  name: 'Spinner',
  props: { Tone: 'tone (on-accent | accent)' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-spinner-arc-width': ellipse,
    '--bb-derived-spinner-arc-height': ellipse,
    '--bb-derived-spinner-track-width': ellipse,
    '--bb-derived-spinner-track-height': ellipse,
  },
  codeOnly: { size: 'sm | lg — lg reads login/spinner/size-lg (the 40px ring on the SSO redirect screen).', label: 'accessible name' },
  notes: 'Ring geometry comes from the ellipses\' arcData (innerRadius 0.75, arc -90°→+30°). The Accent track is bound to login/mark/bg in Figma, not a spinner token. Rotation speed is not tokenised.',
} as const
