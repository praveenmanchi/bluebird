import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for SummaryHeader ("Summary Header" 40000447:8665). */
export const figma = {
  setId: '40000447:8665',
  name: 'Summary Header',
  props: { Title: 'title', Stats: 'stats', 'Status (Meta Badge)': 'status', 'Disclosure Toggle': 'expanded / onToggle' },
  figmaGaps: {
    ...scaleGaps('border-width/default'),
    'feedback/danger': 'Bound on the nested Status Meta Badge; rendered by the composed <MetaBadge>.',
    'radius/pill': 'Bound on the nested Status Meta Badge; rendered by the composed <MetaBadge>.',
    'space/inline-xs': 'Bound on the nested Status Meta Badge; rendered by the composed <MetaBadge>.',
    'space/inline-sm': 'Bound on the nested Status Meta Badge; rendered by the composed <MetaBadge>.',
    'space/inset-xs': 'Bound on the nested Status Meta Badge; rendered by the composed <MetaBadge>.',
    'a11y/surface/sunken': 'Bound inside the nested Disclosure Toggle; rendered by the composed <DisclosureToggle>.',
    'a11y/radius/control': 'Bound inside the nested Disclosure Toggle; rendered by the composed <DisclosureToggle>.',
    'a11y/space/tight': 'Bound inside the nested Disclosure Toggle; rendered by the composed <DisclosureToggle>.',
    'a11y/space/hair': 'Bound inside the nested Disclosure Toggle; rendered by the composed <DisclosureToggle>.',
  },
  derivedGaps: {
    '--bb-derived-summary-header-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
    '--bb-derived-summary-header-spacer-width': 'A Spacer frame in Figma; code pushes the trailing item with flex (margin-left: auto / flex: 1).',
    '--bb-derived-summary-header-spacer-height': 'A Spacer frame in Figma; code pushes the trailing item with flex (margin-left: auto / flex: 1).',
  },
  notes: 'Created 2026-10-11. A Spacer pushes stats + toggle right in Figma; code uses margin-left: auto and lets the row wrap at narrow plugin sizes.',
} as const
