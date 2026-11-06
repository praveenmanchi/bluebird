import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for Menu item. */
export const figma = {
  setId: '40000046:5311',
  name: 'Menu item',
  props: { Mode: 'mode', State: 'selected | disabled | state', Label: 'label', Count: 'count', 'Show count': 'count !== undefined' },
  figmaGaps: {
    ...scaleGaps('font/weight-regular', 'dimension/opacity/60'),
    'checkbox/gap': 'Belongs to the embedded Checkbox instance (its own component reads it).',
  },
} as const
