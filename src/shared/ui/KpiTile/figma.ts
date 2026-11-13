import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for KpiTile ("KPI Tile" 40000447:8612). */
export const figma = {
  setId: '40000447:8612',
  name: 'KPI Tile',
  props: { Tone: 'tone', Label: 'label', Value: 'value', Caption: 'caption', Icon: 'icon', 'Show icon': 'showIcon' },
  derivedGaps: {
    '--bb-derived-kpi-tile-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
  },
  figmaGaps: { ...scaleGaps('icon/size/lg') },
  notes: 'Created 2026-10-11. Re-laid out 2026-10-28: Icon box (no fill) beside a left-aligned Text stack (value + label baseline, caption), tile stroked with a11y/surface/panel-border so it reads on light brands. Summary icons: component, status-good, status-error, layers.',
} as const
