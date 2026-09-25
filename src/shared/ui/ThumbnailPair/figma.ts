const composed = 'Bound on the nested Thumbnail instance(s); rendered by the composed <Thumbnail>, whose Thumbnail.css consumes it. Nothing to read at ThumbnailPair level.'

/** Figma ↔ code contract for ThumbnailPair ("Thumbnail Pair" 40000159:7067). */
export const figma = {
  setId: '40000159:7067',
  name: 'Thumbnail Pair',
  props: { 'Thumbnail Before': 'before', 'Thumbnail After': 'after' },
  figmaGaps: {
    'space/inset-xs': composed,
  },
  notes: 'Created 2026-09-23. Renders nothing when neither shot is supplied; a single shot spans the full width.',
} as const
