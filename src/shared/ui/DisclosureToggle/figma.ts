import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for DisclosureToggle ("Disclosure Toggle" 40000446:8631). */
export const figma = {
  figmaGaps: { ...scaleGaps('dimension/stroke/1_5') },
  setId: '40000446:8631',
  name: 'Disclosure Toggle',
  props: { Expanded: 'expanded (onToggle flips it)', Label: 'showLabel / hideLabel' },
  derivedGaps: {
    '--bb-derived-disclosure-toggle-icon-width': 'The chevron is the chevron-small glyph sized by a11y/size/chevron; Figma draws an 8 × 4 vector stroke inside that box.',
    '--bb-derived-disclosure-toggle-icon-height': 'as icon-width.',
  },
  notes: 'Created 2026-10-11. Figma draws the chevron as a 10px vector stroke; code uses the chevron-small glyph at a11y/size/chevron and rotates it when expanded.',
} as const
