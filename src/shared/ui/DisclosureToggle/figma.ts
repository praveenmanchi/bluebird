/** Figma ↔ code contract for DisclosureToggle ("Disclosure Toggle" 40000446:8631). */
export const figma = {
  setId: '40000446:8631',
  name: 'Disclosure Toggle',
  props: {
    Expanded: 'expanded (onToggle flips it)',
    State: 'state (Default / Focus → default / focus; Focus is also :focus-visible)',
    Label: 'showLabel / hideLabel',
  },
  notes: 'Created 2026-10-11; redesigned 2026-11-13: no fill, a border/default stroke, label in a11y/text/title, horizontal padding a11y/space/tight, and the chevron is the UI Icons / Other down-arrow-small glyph at icon/size/md. Figma draws the same down arrow in Expanded=Yes; code rotates it 180° when expanded. State=Focus is a border/focus stroke at the focus weight; code draws it as an inset outline over the border so the control keeps its size (the Figma Focus variants are 2px smaller than Default).',
} as const
