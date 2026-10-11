/** Figma ↔ code contract for BreakdownRow ("Breakdown Row" 40000447:8613). */
export const figma = {
  setId: '40000447:8613',
  name: 'Breakdown Row',
  props: { Label: 'label', Value: 'value', 'Legend Dot (exposed instance)': 'tone' },
  derivedGaps: {
    '--bb-derived-breakdown-row-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
    '--bb-derived-breakdown-row-spacer-width': 'A Spacer frame in Figma; code pushes the trailing item with flex (margin-left: auto / flex: 1).',
    '--bb-derived-breakdown-row-spacer-height': 'A Spacer frame in Figma; code pushes the trailing item with flex (margin-left: auto / flex: 1).',
  },
  notes: 'Created 2026-10-11. A Spacer frame pushes the value right in Figma; code uses flex: 1 on the label.',
} as const
