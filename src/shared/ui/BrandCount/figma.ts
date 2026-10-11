/** Figma ↔ code contract for BrandCount ("Brand Count" 40000447:8631). */
export const figma = {
  setId: '40000447:8631',
  name: 'Brand Count',
  props: { Tone: 'tone (brandCountTone(count) when omitted)', Brand: 'brand', Value: 'value (defaults to count)' },
  derivedGaps: {
    '--bb-derived-brand-count-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
  },
  notes: 'Created 2026-10-11. Thresholds from the Figma description: ≥8 Danger, ≥5 Warning, else Success.',
} as const
