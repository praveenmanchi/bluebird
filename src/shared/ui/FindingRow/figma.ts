import { scaleGaps } from '../../brand/scaleGaps'
const chip = 'Bound on the nested "Fix" Context Chip instance; the composed <ContextChip> consumes it in ContextChip.css.'
const badge = 'Bound on the nested "Severity" Meta Badge instance; the composed <MetaBadge> consumes it in MetaBadge.css (per tone).'

/** Figma ↔ code contract for FindingRow ("Finding Row" 40000296:8483). */
export const figma = {
  setId: '40000296:8483',
  name: 'Finding Row',
  props: {
    Title: 'title',
    Meta: 'meta',
    Severity: 'severity (Critical → Meta Badge Danger "CRITICAL" / Serious → Warning "SERIOUS" / Moderate → Accent "MODERATE" / Minor → Neutral "MINOR")',
    'Fix (Context Chip instance, Type=Citation)': 'fix',
    'Actions (Locate / Ignore / Apply fix Link Buttons)': 'onAction',
  },
  figmaGaps: {
    ...scaleGaps('dimension/space/2', 'uxai/border-width'),
    'feedback/danger': badge,
    'feedback/warning': badge,
    'border/accent': badge,
    'border/subtle': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
    'uxai/chip/bg': chip,
    'uxai/chip/border': chip,
    'uxai/radius/chip': chip,
    'uxai/space/tight': chip,
    'uxai/space/inline': chip,
    'uxai/space/hair': chip,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the AI Agents tab (Results screen). Composes MetaBadge, ContextChip and three LinkButtons. The root is FIXED 640 × 60 in Figma but Text alone is 60 high plus agents/space/row-y padding, so the Fix chip overflows the frame on the canvas; code uses 60 as min-height. Not Figma layers: `onSelect` makes the Title a button (opens the finding), `onAction` reports which link was pressed.',
} as const
