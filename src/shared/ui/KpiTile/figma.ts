/** Figma ↔ code contract for KpiTile ("KPI Tile" 40000447:8612). */
export const figma = {
  setId: '40000447:8612',
  name: 'KPI Tile',
  props: { Tone: 'tone', Label: 'label', Value: 'value', Caption: 'caption', Icon: 'icon', 'Show icon': 'showIcon' },
  derivedGaps: {
    '--bb-derived-kpi-tile-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
  },
  notes: 'Created 2026-10-11; layout follows the user\'s Neutral edit (icon left, value + label on one baseline right-aligned, caption below). Summary icons: component, status-good, status-error, layers.',
} as const
