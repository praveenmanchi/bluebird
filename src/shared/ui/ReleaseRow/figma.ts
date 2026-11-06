import { scaleGaps } from '../../brand/scaleGaps'
const badge = 'Bound on the nested Meta Badge instance; MetaBadge reads it for its tone.'

/** Figma ↔ code contract for ReleaseRow ("Release Row" 40000345:8635). */
export const figma = {
  setId: '40000345:8635',
  name: 'Release Row',
  props: {
    Version: 'version',
    Summary: 'summary',
    Meta: 'meta',
    Status: 'status (Live / Building / Failed)',
    'Status (Meta Badge instance)': 'status → MetaBadge Tone=Success "Live" / Accent "Building" / Danger "Failed"',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default'),
    'feedback/success': badge,
    'border/accent': badge,
    'feedback/danger': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {
    '--bb-derived-release-row-root-width': 'FIXED 356 in Figma (the panel content width); in code the row fills its parent and the Text frame (FILL) absorbs the width.',
  },
  notes: 'Created 2026-10-11 for the Publish tab. Status swaps the nested Meta Badge (Show meta off): Live → Tone=Success, Building → Tone=Accent, Failed → Tone=Danger, with the status word as the visible label, so status is conveyed in text. Building also sets aria-busy. Stack rows in a list (<li>) where they form a release history.',
} as const
