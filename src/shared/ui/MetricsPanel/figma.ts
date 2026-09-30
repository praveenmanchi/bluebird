const composed = 'Bound on the nested MetricCell instance(s); rendered by the composed <MetricCell>, whose MetricCell.css consumes it. Nothing to read at MetricsPanel level.'

/** Figma ↔ code contract for MetricsPanel ("Metrics Panel" 40000159:7048). */
export const figma = {
  setId: '40000159:7048',
  name: 'Metrics Panel',
  props: { 'Metric Cell instances': 'metrics' },
  figmaGaps: {
    'space/inset-xs': composed,
  },
  notes: 'Created 2026-09-23. Figma lays the cells out as a wrapping auto-layout at a fixed 120px cell width; code uses an auto-fit grid on the same minimum. The column gap is the raw, unbound itemSpacing 28 (--bb-derived-metrics-panel-root-gap). The extract carries no counterAxisSpacing; the 6px row gap comes from the frame geometry (78 = 9 + 27 + 6 + 27 + 9) and reads space/inline-sm. Only paddingTop/paddingBottom are bound (space/inset-md), so there is no horizontal padding. The root has no fill or stroke, so radius/lg is read but invisible, as in Figma.',
} as const
