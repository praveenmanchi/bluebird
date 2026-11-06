import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for Notice ("Notice" 40000321:8423). */
export const figma = {
  setId: '40000321:8423',
  name: 'Notice',
  props: { Tone: 'tone (info | error)', 'Copy › Title': 'title', 'Copy › Body': 'children' },
  figmaGaps: { ...scaleGaps('border-width/default') },
  derivedGaps: {
    '--bb-derived-notice-root-width': 'The set frame is fixed at 344; every instance fills its card, so code fills its container.',
  },
  codeOnly: { bare: 'The Login Page instance removes the fills/stroke, hides Icon and centres both texts (instance overrides, not a variant).' },
  notes: 'Info uses the "access" (lock) glyph, Error the "Status error icons / error" glyph — the same components the Figma instances point at. Error renders role="alert".',
} as const
