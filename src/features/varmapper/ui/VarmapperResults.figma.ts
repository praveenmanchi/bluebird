import { SCREEN, composedBy, instanceBox } from '../../../shared/brand/screenGaps'

// Figma ↔ code contract for the Variable mapper tab's "Variable mapper · 2 Results" screen: a frame, not a component set.
// The tab renders it from state (Tab.tsx) and it is checked against variable-mapper.css.
export const figma = {
  setId: '40002505:6704',
  name: 'Variable mapper',
  props: {},
  figmaGaps: {
    ...composedBy('KPI Tile', ['a11y/border-width', 'a11y/radius/control', 'a11y/space/inline', 'a11y/space/tight', 'a11y/surface/panel-border', 'a11y/surface/sunken']),
    ...composedBy('Mapper Row, filters, search bar', ['input/border-width']),
    ...composedBy('Tab sub menu', ['dimension/radius/8', 'dimension/space/4', 'dropdown/border/default', 'dropdown/menu/bg']),
    ...composedBy('filters', ['chip-filter/border/default', 'chip-filter/gap', 'chip-filter/radius', 'space/inset-sm']),
    ...composedBy('search bar', ['search-bar/bg/default', 'search-bar/border/default', 'search-bar/radius']),
    ...composedBy('variable button', ['button/primary/radius']),
  },
  derivedGaps: {
    '--bb-derived-varmapper-results-root-width': SCREEN.root,
    '--bb-derived-varmapper-results-root-height': SCREEN.root,
    ...instanceBox('KPI Tile', ['--bb-derived-varmapper-results-check-height', '--bb-derived-varmapper-results-check-width', '--bb-derived-varmapper-results-exact-height', '--bb-derived-varmapper-results-exact-width', '--bb-derived-varmapper-results-near-height', '--bb-derived-varmapper-results-near-width', '--bb-derived-varmapper-results-no-match-height', '--bb-derived-varmapper-results-no-match-width']),
    ...instanceBox('Mapper Row', ['--bb-derived-varmapper-results-gap-32-px-height', '--bb-derived-varmapper-results-gap-32-px-width', '--bb-derived-varmapper-results-padding-16-px-height', '--bb-derived-varmapper-results-padding-16-px-width', '--bb-derived-varmapper-results-preview-1-fill', '--bb-derived-varmapper-results-preview-2-fill', '--bb-derived-varmapper-results-text-fill-60a5fa-height', '--bb-derived-varmapper-results-text-fill-60a5fa-width', '--bb-derived-varmapper-results-text-fill-fafafa-height', '--bb-derived-varmapper-results-text-fill-fafafa-width']),
    ...instanceBox('Select exact matches', ['--bb-derived-varmapper-results-select-exact-matches-height', '--bb-derived-varmapper-results-select-exact-matches-width']),
    ...instanceBox('Tab sub menu', ['--bb-derived-varmapper-results-category-filter-height', '--bb-derived-varmapper-results-category-filter-width']),
    ...instanceBox('filters', ['--bb-derived-varmapper-results-filters-height', '--bb-derived-varmapper-results-filters-width']),
    ...instanceBox('search bar', ['--bb-derived-varmapper-results-search-bar-height', '--bb-derived-varmapper-results-search-bar-width']),
    ...instanceBox('variable button', ['--bb-derived-varmapper-results-variable-button-height', '--bb-derived-varmapper-results-variable-button-width']),
  },
  notes: 'Body of \'Variable mapper · 2 Results\' on the Variable Mapper page. Top-level layers: Toolbar, Content.',
} as const
