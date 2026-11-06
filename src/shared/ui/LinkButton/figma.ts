import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for LinkButton ("Link Button" 40000157:7205). */
export const figma = {
  setId: '40000157:7205',
  name: 'Link Button',
  props: { Label: 'children' },
  figmaGaps: { ...scaleGaps('font/weight-regular') },
  notes: 'Created 2026-09-23. Used by Occurrences ("Select all") and IgnoreBanner ("Restore").',
} as const
