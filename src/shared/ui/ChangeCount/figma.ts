/** Figma ↔ code contract for ChangeCount ("Change count" 40002905:129272, Atoms). */
export const figma = {
  setId: '40002905:129272',
  name: 'Change count',
  props: {
    Type: 'type (Default / Added / Modified / Removed)',
    Display: 'display (Icon + label = icon-label / Icon = icon / Label = label)',
    Surface: 'surface (App = app / Report = report)',
    Count: 'count',
  },
  figmaGaps: {},
  notes:
    'Built 2026-11-15 from the user\'s draft. Icons per Type: Tab Icons/Variables, UI Icons/General add + remove, UI Icons/Toolbar pencil (all Size=Small, 16px). ' +
    'The label is per-variant text in Figma ("Changes" / "Added" / "Modified" / "Removed"), so code takes it as an optional `label` override. ' +
    'Icon-only keeps the label for screen readers (visually hidden) and as the tooltip. The lead has no right border (2026-11-15); the count stroke uses the fill colour with a hairline on the left.',
} as const
