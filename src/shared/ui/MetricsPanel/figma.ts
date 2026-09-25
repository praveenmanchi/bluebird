const composed = 'Bound on the nested MetricCell instance(s); rendered by the composed <MetricCell>, whose MetricCell.css consumes it. Nothing to read at MetricsPanel level.'

/** Figma ↔ code contract for MetricsPanel ("Metrics Panel" 40000159:7048). */
export const figma = {
  setId: '40000159:7048',
  name: 'Metrics Panel',
  props: { 'Metric Cell instances': 'metrics' },
  figmaGaps: {
    'space/inset-xs': composed,
  },
  notes: 'Created 2026-09-23. Figma lays the cells out as a wrapping auto-layout at a fixed 120px cell width; code uses an auto-fit grid on the same minimum.',
} as const
