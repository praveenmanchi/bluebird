import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for MetricCell ("Metric Cell" 40000157:7207). */
export const figma = {
  setId: '40000157:7207',
  name: 'Metric Cell',
  props: { Label: 'label', Value: 'children' },
  figmaGaps: { ...scaleGaps('font/weight-regular', 'font/weight-medium') },
  notes: 'Created 2026-09-23. Six of these make a MetricsPanel.',
} as const
