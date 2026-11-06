import { scaleGaps } from '../../brand/scaleGaps'

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
    ...scaleGaps('border-width/default', 'font/size-body-lg', 'font/family-ui', 'type/line/16', 'font/size-title', 'type/line/24'),
    'feedback/danger': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'feedback/success': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'radius/pill': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inline-xs': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inline-sm': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inset-xs': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
  },
  derivedGaps: {},
  notes: 'Created 2026-10-11 for the WCAG card typography (Mode=Text) preview. Two equal columns; each is a sunken panel with a Meta Badge (Danger "Current" / Success "Suggested"), the spec line and the sample.',
} as const
