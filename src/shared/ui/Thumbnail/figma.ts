import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for Thumbnail ("Thumbnail" 40000158:7225). */
export const figma = {
  setId: '40000158:7225',
  name: 'Thumbnail',
  props: { Caption: 'caption', Image: 'src + alt' },
  figmaGaps: { ...scaleGaps('font/weight-regular') },
  notes: 'Created 2026-09-23. In Figma the Image is a placeholder rectangle the designer swaps for a screenshot; in code it is a real <img>.',
} as const
