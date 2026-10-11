/** Figma ↔ code contract for BrandDiffRow ("Brand Diff Row" 40000345:8584). */
const badge = "Bound on the composed Meta Badge instance; MetaBadge's own CSS consumes it."

export const figma = {
  setId: '40000345:8584',
  name: 'Brand Diff Row',
  props: {
    Brand: 'brand',
    State: 'state (Changed / Unchanged)',
    'Value Diff (instance, State=Changed)': 'kind + old + new (+ oldColor / newColor)',
    'Value (text, State=Unchanged)': 'value → "<value> · unchanged"',
    'Badge (Meta Badge instance)': 'state → Accent "Changed" / Neutral "Same"',
  },
  figmaGaps: {
    'border/accent': badge,
    'border/subtle': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {
    '--bb-derived-brand-diff-row-root-width': 'FIXED 600 on the Components page; every instance (Change Item › Brand values) is FILL, so the row is width: 100% of its list.',
    '--bb-derived-brand-diff-row-badge-stroke-width': "Raw stroke on the Meta Badge instance; MetaBadge reads the same 1 through --bb-border-width-default.",
  },
  notes: 'Created 2026-10-11 for the Publish tab. State=Changed nests a Value Diff (Kind / Old / New pass straight through) and an Accent "Changed" Meta Badge; State=Unchanged shows "<value> · unchanged" in publish/text/meta with a Neutral "Same" badge. The badge follows the value directly, as in Figma (no spacer pushes it right).',
} as const
