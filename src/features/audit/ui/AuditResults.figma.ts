import { SCREEN, composedBy, instanceBox } from '../../../shared/brand/screenGaps'

// Figma ↔ code contract for the Audit tab's "Audit · 3 Results" screen: a frame, not a component set.
// The tab renders it from state (Tab.tsx) and it is checked against audit.css.
export const figma = {
  setId: '40002539:6775',
  name: 'Audit',
  props: {},
  figmaGaps: {
    ...composedBy('Audit Summary', ['a11y/radius/panel', 'a11y/space/section', 'a11y/surface/panel', 'a11y/surface/panel-border']),
    ...composedBy('Tab sub menu', ['dimension/radius/8', 'dimension/space/2', 'dimension/space/4', 'dropdown/border/default', 'dropdown/menu/bg']),
    ...composedBy('Variable search card, filters, search bar', ['input/border-width']),
    ...composedBy('Variable search card', ['dimension/space/16', 'icon/glyph/default']),
    ...composedBy('filters', ['chip-filter/border/default', 'chip-filter/gap', 'chip-filter/radius', 'space/inset-sm']),
    ...composedBy('search bar', ['search-bar/bg/default', 'search-bar/border/default', 'search-bar/radius']),
    ...composedBy('variable button', ['button/primary/radius']),
  },
  derivedGaps: {
    '--bb-derived-audit-results-root-width': SCREEN.root,
    '--bb-derived-audit-results-root-height': SCREEN.root,
    ...instanceBox('Audit Summary', ['--bb-derived-audit-results-audit-summary-height', '--bb-derived-audit-results-audit-summary-width']),
    ...instanceBox('Components', ['--bb-derived-audit-results-components-height', '--bb-derived-audit-results-components-width']),
    ...instanceBox('Tab sub menu', ['--bb-derived-audit-results-filter-height', '--bb-derived-audit-results-filter-width', '--bb-derived-audit-results-view-height', '--bb-derived-audit-results-view-width']),
    ...instanceBox('Variable search card', ['--bb-derived-audit-results-button-height', '--bb-derived-audit-results-button-width', '--bb-derived-audit-results-fafafa-height', '--bb-derived-audit-results-fafafa-width', '--bb-derived-audit-results-item-spacing-14-height', '--bb-derived-audit-results-item-spacing-14-width', '--bb-derived-audit-results-promo-banner-height', '--bb-derived-audit-results-promo-banner-width']),
    ...instanceBox('Variables', ['--bb-derived-audit-results-variables-height', '--bb-derived-audit-results-variables-width']),
    ...instanceBox('filters', ['--bb-derived-audit-results-filters-height', '--bb-derived-audit-results-filters-width']),
    ...instanceBox('pages', ['--bb-derived-audit-results-pages-height', '--bb-derived-audit-results-pages-width']),
    ...instanceBox('search bar', ['--bb-derived-audit-results-search-bar-height', '--bb-derived-audit-results-search-bar-width']),
    ...instanceBox('variable button', ['--bb-derived-audit-results-variable-button-height', '--bb-derived-audit-results-variable-button-width']),
  },
  notes: 'Body of \'Audit · 3 Results\' on the Audit page. Top-level layers: Toolbar, Content.',
} as const
