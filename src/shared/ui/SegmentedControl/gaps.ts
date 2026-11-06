// Shared reasons for screens that place a "Tab sub menu" instance. Those screens render it through
// the composed SegmentedControl, so the instance's bindings and size land in the screen's snapshot
// while SegmentedControl.css and SegmentTab.css are what read them. Used by figma.ts contracts only.

const BOUND: Record<string, string> = {
  'dropdown/menu/bg': 'SegmentedControl',
  'dropdown/border/default': 'SegmentedControl',
  'dimension/radius/8': 'SegmentedControl',
  'dimension/space/2': 'SegmentedControl',
  'dimension/space/4': 'SegmentedControl',
  'icon/glyph/on-accent': 'SegmentTab',
}

/** Figma variables bound on the Tab sub menu instance, each with the component CSS that reads it. */
export function tabSubMenuGaps(): Record<string, string> {
  return Object.fromEntries(Object.entries(BOUND).map(([name, reader]) => [name, `Bound on the composed Tab sub menu instance; ${reader}.css consumes it.`]))
}

/** Raw size and stroke of the instance: SegmentedControl.css owns the box and its width hugs the labels. */
export function tabSubMenuDerived(prefix: string, suffixes: readonly string[] = ['height', 'stroke-width', 'width']): Record<string, string> {
  return Object.fromEntries(suffixes.map((s) => [`${prefix}-${s}`, 'Size or stroke of the composed Tab sub menu instance; SegmentedControl.css owns the box and its width hugs the labels.']))
}
