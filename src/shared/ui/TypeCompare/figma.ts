const sample = 'The sample renders at the scanned / suggested metrics passed in as props (style={{ fontSize, lineHeight }}); Figma pins its 13/16 and 16/24 example values.'

/** Figma ↔ code contract for TypeCompare ("Type Compare" 40000463:9116). */
export const figma = {
  setId: '40000463:9116',
  name: 'Type Compare',
  props: {
    'Current spec': 'current.spec (generated from current.size / current.lineHeight when omitted)',
    'Suggested spec': 'suggested.spec (generated from suggested.size / suggested.lineHeight when omitted)',
    Sample: 'sample',
    'Status (Meta Badge instances)': 'currentLabel / suggestedLabel',
  },
  figmaGaps: {
    'feedback/danger': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'feedback/success': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'radius/pill': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inline-xs': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inline-sm': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inset-xs': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
  },
  derivedGaps: {
    '--bb-derived-type-compare-sample--1-font-size': sample,
    '--bb-derived-type-compare-sample--1-line-height': sample,
    '--bb-derived-type-compare-sample-type-compare-font-size': sample,
    '--bb-derived-type-compare-sample-type-compare-line-height': sample,
    '--bb-derived-type-compare-sample-font-family': 'The sample shares the card font (wcag-card/font/family) with the chrome; Figma leaves the sample text unbound because it is data.',
    '--bb-derived-type-compare-status-stroke-width': 'Bound on the nested MetaBadge instances; rendered by the composed <MetaBadge>.',
  },
  notes: 'Created 2026-10-11 for the WCAG card typography (Mode=Text) preview. Two equal columns; each is a sunken panel with a Meta Badge (Danger "Current" / Success "Suggested"), the spec line and the sample.',
} as const
