const line = 'Line start / Line end are 105×1 rectangles that fill the remaining width; code flexes them and draws the 1px height with input/border-width.'

/** Figma ↔ code contract for DividerLabel ("Divider Label" 40000321:8424). */
export const figma = {
  setId: '40000321:8424',
  name: 'Divider Label',
  props: { Label: 'children' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-divider-label-line-start-width': line,
    '--bb-derived-divider-label-line-start-height': line,
    '--bb-derived-divider-label-line-end-width': line,
    '--bb-derived-divider-label-line-end-height': line,
    '--bb-derived-divider-label-root-width': 'The component is fixed at 344; instances fill their card, so code fills its container.',
  },
  notes: 'role="separator" with the caption as its content. Used as "Other ways to sign in" and "Can’t use SSO?".',
} as const
