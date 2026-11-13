import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for IgnoreBanner ("Ignore Banner" 40000160:7255). */
export const figma = {
  setId: '40000160:7255',
  name: 'Ignore Banner',
  props: { Reason: 'reason', Scope: 'scope', Author: 'author', Expires: 'expires', 'Link Button (instance)': 'onUndo + undoLabel' },
  figmaGaps: { ...scaleGaps('dimension/space/2', 'font/weight-regular'), 'icon/glyph/default': 'consumed by the composed Icon (the eye/close instance in Figma)' },
  notes: 'Created 2026-09-23. An ignore without provenance is how a baseline rots, so every field is spelled out on the card.',
} as const
