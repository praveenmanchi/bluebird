import { SCREEN, composedBy, instanceBox } from '../../../shared/brand/screenGaps'

// Figma ↔ code contract for the Variable search tab's "Variable search · 3 Results" screen: a frame, not a component set.
// The tab renders it from state (Tab.tsx) and it is checked against variable-search.css.
export const figma = {
  setId: '40002433:6889',
  name: 'Variable search',
  props: {},
  figmaGaps: {
    ...composedBy('default, filters, search bar', ['input/border-width']),
    ...composedBy('default', ['card-variable/border/default', 'card-variable/radius']),
    ...composedBy('filters', ['chip-filter/border/default', 'chip-filter/gap', 'chip-filter/radius', 'space/inset-sm']),
    ...composedBy('search bar', ['search-bar/bg/default', 'search-bar/border/default', 'search-bar/fg/value', 'search-bar/radius']),
    ...composedBy('variable button', ['button/primary/radius']),
  },
  derivedGaps: {
    '--bb-derived-varsearch-results-root-width': SCREEN.root,
    '--bb-derived-varsearch-results-root-height': SCREEN.root,
    ...instanceBox('Section Title', ['--bb-derived-varsearch-results-section-title-height', '--bb-derived-varsearch-results-section-title-width']),
    ...instanceBox('default', ['--bb-derived-varsearch-results-default-height', '--bb-derived-varsearch-results-default-width']),
    ...instanceBox('filters', ['--bb-derived-varsearch-results-filters-height', '--bb-derived-varsearch-results-filters-width']),
    ...instanceBox('pages', ['--bb-derived-varsearch-results-pages-height', '--bb-derived-varsearch-results-pages-width']),
    ...instanceBox('search bar', ['--bb-derived-varsearch-results-search-bar-height', '--bb-derived-varsearch-results-search-bar-width']),
    ...instanceBox('variable button', ['--bb-derived-varsearch-results-variable-button-height', '--bb-derived-varsearch-results-variable-button-width']),
  },
  notes: 'Body of \'Variable search · 3 Results\' on the Variable Search page. Top-level layers: Toolbar, Content.',
} as const
