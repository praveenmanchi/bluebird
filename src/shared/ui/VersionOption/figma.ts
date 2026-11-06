import { scaleGaps } from '../../brand/scaleGaps'
const badge = 'Bound on the nested "Suggested" Meta Badge instance (Tone=Accent); the composed <MetaBadge> (MetaBadge.css) consumes it.'

/** Figma ↔ code contract for VersionOption ("Version Option" 40000341:8566). */
export const figma = {
  setId: '40000341:8566',
  name: 'Version Option',
  props: {
    Version: 'version',
    Hint: 'hint',
    'Show suggested': 'suggested',
    Bump: 'bump (Patch → patch / Minor → minor / Major → major)',
    Selected: 'selected (No → false / Yes → true) + onSelect',
    'Suggested (Meta Badge instance, Tone=Accent, Label "Suggested")': 'suggested → <MetaBadge tone="accent">',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default'),
    'border/accent': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {
    '--bb-derived-version-option-root-width': 'Figma fixes the card at 200 because the Publish screen lays three of them in a row; code fills its flex cell (flex: 1 1 0) so the row fits any panel width.',
  },
  notes: 'Created 2026-10-11 for the Publish tab. The card is a <label> around a visually hidden native <input type="radio"> (value = bump, shared `name`), so a parent role="radiogroup" gets arrow-key navigation and Space selection for free; onSelect fires from the input change. The radio is named by the Bump title + Version and described by the Suggested badge + Hint. Focus is drawn on the card with :has(:focus-visible), outlined in publish/version/selected-border. The 1 root stroke is raw in Figma and read through --bb-derived-version-option-root-stroke-width.',
} as const
