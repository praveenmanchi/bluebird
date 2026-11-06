import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for Rating. */
export const figma = {
  setId: '419:40175',
  name: 'Rating',
  props: { Rating: 'rating' },
  figmaGaps: { ...scaleGaps('font/weight-strong') },
  notes: 'rating/font/size and rating/font/weight exist in the Brand collection with the raw 10px/600 values but are not bound in Figma yet; code reads them so a rebind is a no-op.',
} as const
