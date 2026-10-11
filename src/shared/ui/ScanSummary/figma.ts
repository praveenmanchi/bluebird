/** Figma ↔ code contract for ScanSummary ("Scan Summary" 40000444:20376). */
export const figma = {
  setId: '40000444:20376',
  name: 'Scan Summary',
  props: {
    State: 'state ("results" | "empty")',
    Expanded: 'expanded / defaultExpanded / onToggle',
    'Summary Header': 'title / stats / status',
    'Score Row': 'score / meterScore / caption',
    KPIs: 'kpis',
    'By component level': 'levels',
    Breakdown: 'principles / severity',
    'By brand mode': 'brands',
  },
  figmaGaps: {
    'a11y/space/panel': 'Bound inside a nested Scan Summary molecule (Score Row, KPI Tile, Level Row, Brand Count, Breakdown Card, Disclosure Toggle); rendered by that composed component.',
    'a11y/surface/sunken': 'Bound inside a nested Scan Summary molecule (Score Row, KPI Tile, Level Row, Brand Count, Breakdown Card, Disclosure Toggle); rendered by that composed component.',
    'a11y/radius/control': 'Bound inside a nested Scan Summary molecule (Score Row, KPI Tile, Level Row, Brand Count, Breakdown Card, Disclosure Toggle); rendered by that composed component.',
    'a11y/space/tight': 'Bound inside a nested Scan Summary molecule (Score Row, KPI Tile, Level Row, Brand Count, Breakdown Card, Disclosure Toggle); rendered by that composed component.',
    'a11y/space/row-x': 'Bound inside a nested Scan Summary molecule (Score Row, KPI Tile, Level Row, Brand Count, Breakdown Card, Disclosure Toggle); rendered by that composed component.',
    'a11y/space/hair': 'Bound inside a nested Scan Summary molecule (Score Row, KPI Tile, Level Row, Brand Count, Breakdown Card, Disclosure Toggle); rendered by that composed component.',
  },
  derivedGaps: {
    '--bb-derived-scan-summary-root-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
    '--bb-derived-scan-summary-breakdown-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
    '--bb-derived-scan-summary-by-brand-mode-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
    '--bb-derived-scan-summary-by-component-level-width': 'Fills its row or grid column in code instead of pinning the Figma frame width; tiles reflow at the M and S plugin sizes.',
    '--bb-derived-scan-summary-root-stroke-width': 'The border reads a11y/border-width (1px), the same value; Figma leaves the root stroke weight raw.',
    '--bb-derived-scan-summary-kpis-width': 'The KPI row is a hidden FIXED 542 frame in the collapsed variants; code shows it only when expanded and lets it fill the summary width.',
    '--bb-derived-scan-summary-spacer-width': 'A Spacer frame in Figma; code pushes the trailing item with flex (margin-left: auto / flex: 1).',
    '--bb-derived-scan-summary-spacer-height': 'A Spacer frame in Figma; code pushes the trailing item with flex (margin-left: auto / flex: 1).',
  },
  notes: 'Created 2026-10-11. Collapsed (Expanded=No) shows header + Score Row only; the KPI tiles sit behind Show details with the breakdowns (user, 2026-10-11). Clicking the header toggles Expanded in the Figma prototype; code wires it to the Disclosure Toggle with aria-expanded / aria-controls. The Figma Empty variants have no component-level block (the user removed it); code omits it when levels is not passed.',
} as const
