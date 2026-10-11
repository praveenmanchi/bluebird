const count = 'Bound on the nested "Count" Meta Badge instance; the composed <MetaBadge> (MetaBadge.css) consumes it.'

/** Figma ↔ code contract for SectionTitle ("Section Title" 40000267:8062). */
export const figma = {
  setId: '40000267:8062',
  name: 'Section Title',
  props: {
    Title: 'title',
    'Show count': 'showCount',
    'Show action': 'showAction',
    'Count (Meta Badge instance) › Label': 'count',
    'Action (Link Button instance) › Label': 'actionLabel (+ onAction)',
  },
  figmaGaps: {
    'border/subtle': count,
    'radius/pill': count,
    'space/inline-xs': count,
    'space/inline-sm': count,
    'space/inset-xs': count,
  },
  derivedGaps: {
    '--bb-derived-section-title-count-stroke-width': 'Stroke of the nested Count Meta Badge; MetaBadge.css draws it with --bb-border-width-default (same 1).',
  },
  notes: 'Created 2026-10-09 for the Jira ticket detail. The title renders as an <h3>. The Title text uses jira/font/line-label (16.8) with jira/font/size-heading (13), so the Left frame hugs to 17 inside the fixed 20-high bar.',
} as const
