import { SCREEN, composedBy, instanceBox } from '../../../shared/brand/screenGaps'

// Figma ↔ code contract for the Accessibility checker tab's "Accessibility L · Results" screen: a frame, not a component set.
// The tab renders it from state (Tab.tsx) and it is checked against a11y.css.
export const figma = {
  setId: '40000386:32445',
  name: 'Accessibility checker',
  props: {},
  figmaGaps: {
    ...composedBy('Button', ['button/primary/bg/default', 'button/primary/border-width', 'button/primary/border/default', 'button/primary/gap', 'button/primary/height', 'button/primary/padding-x', 'button/primary/radius', 'button/primary/width-md']),
    ...composedBy('Dropdown, Tab sub menu', ['dropdown/border/default']),
    ...composedBy('Dropdown', ['dropdown/bg/default', 'dropdown/gap', 'dropdown/height', 'dropdown/padding-x', 'dropdown/radius']),
    ...composedBy('Scan Summary', ['a11y/border-width', 'a11y/surface/panel-border']),
    ...composedBy('Tab sub menu', ['dimension/radius/8', 'dimension/space/2', 'dimension/space/4', 'dropdown/menu/bg', 'icon/glyph/on-accent']),
    ...composedBy('WCAG Card', ['disability-indicator/icon/color', 'input/border-width', 'rating/radius', 'space/stack-xs', 'wcag-card/bg/default', 'wcag-card/divider/color', 'wcag-card/radius']),
    'dimension/space/16': 'OPEN MISMATCH, not read: the Figma body stacks its sections 16 apart; the tab uses a full-bleed toolbar and space/stack-md in the results list. See notes.',
    'a11y/space/panel': 'OPEN MISMATCH, not read: the Figma body is padded on all sides; the tab pads the toolbar and the results list separately. See notes.',
  },
  derivedGaps: {
    '--bb-derived-a11y-results-root-width': SCREEN.root,
    '--bb-derived-a11y-results-root-height': SCREEN.root,
    '--bb-derived-a11y-results-toolbar-width': 'FIXED at the padded body width in Figma; the toolbar fills the tab in code.',
    '--bb-derived-a11y-results-toolbar-height': 'OPEN MISMATCH, not read: a fixed 32 toolbar in Figma; in code the toolbar hugs its dropdowns and Scan button plus its own padding. See notes.',
    '--bb-derived-a11y-results-criteria-filter-height': 'Fixed height of the criteria filter row; the composed SegmentedControl sizes itself.',
    ...instanceBox('Dropdown', ['--bb-derived-a11y-results-level-width', '--bb-derived-a11y-results-platform-width', '--bb-derived-a11y-results-standard-width']),
    ...instanceBox('Scan Summary', ['--bb-derived-a11y-results-scan-summary-height', '--bb-derived-a11y-results-scan-summary-width']),
    ...instanceBox('Tab sub menu', ['--bb-derived-a11y-results-tab-sub-menu-height', '--bb-derived-a11y-results-tab-sub-menu-width']),
    ...instanceBox('WCAG Card', ['--bb-derived-a11y-results-sample-fill', '--bb-derived-a11y-results-swatch-bg-fill', '--bb-derived-a11y-results-wcag-card-1-4-11-height', '--bb-derived-a11y-results-wcag-card-1-4-11-width', '--bb-derived-a11y-results-wcag-card-1-4-3-height', '--bb-derived-a11y-results-wcag-card-1-4-3-width', '--bb-derived-a11y-results-wcag-card-2-5-8-height', '--bb-derived-a11y-results-wcag-card-2-5-8-width']),
  },
  notes: 'Body of \'Accessibility L · Results\' on the Accessibility page. Top-level layers: Toolbar, Scan Summary, Findings. OPEN MISMATCH: this 600 frame pads the whole body (a11y/space/panel) and stacks toolbar, summary and findings 16 apart, while the tab draws a full-bleed bordered toolbar above a padded results list (the M section was rebuilt to the code on 2026-11-02). Decide which side is right, then either restyle a11y.css or point the manifest at the M Results frame.',
} as const
