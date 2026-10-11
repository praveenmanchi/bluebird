// Shared reasons for the Agents screens' figmaGaps / derivedGaps. Each screen's
// <Code>.figma.ts lists its own keys; these helpers only spell out the reason
// once, so the same composed-instance excuse reads the same everywhere.

/** Figma variables bound on a composed component instance whose own CSS reads them. */
export function composed(component: string, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, `Bound on the composed ${component} instance; ${component}.css consumes it.`]))
}

export const BUTTON_PRIMARY = ['button/primary/bg/default', 'button/primary/border/default', 'button/primary/radius', 'button/primary/gap', 'button/primary/padding-x', 'button/primary/height'] as const
export const BUTTON_SECONDARY = ['button/secondary/bg/default', 'button/secondary/border/default', 'button/secondary/radius', 'button/secondary/gap', 'button/secondary/padding-x', 'button/secondary/height'] as const
export const META_BADGE = ['radius/pill', 'space/inline-xs', 'space/inline-sm', 'space/inset-xs'] as const
export const PROGRESS_BAR = ['mcp/meter/track', 'mcp/radius/pill', 'mcp/size/meter'] as const
/** The Voice Bar instance's padding-box tokens (the screen only sizes the bar). */
export const VOICE_BAR = ['agents/surface/field', 'agents/radius/control', 'agents/space/row-y'] as const

const d = (screen: string, layer: string, prop: string) => `--bb-derived-agents-${screen}-${layer}-${prop}`

/**
 * Loose "Tab selecters" instances: their box (height, padding, radius) and the Selected
 * fill/stroke are raw in Figma and identical to the set's own --bb-derived-segment-tab-root-*,
 * which the composed SegmentTab reads. Widths are the HUG width of each label.
 */
export function segmentTabs(screen: string, layers: readonly string[], selected: readonly string[], widths: readonly string[] = layers): Record<string, string> {
  const out: Record<string, string> = {}
  for (const layer of layers) {
    for (const prop of ['height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'radius']) {
      out[d(screen, layer, prop)] = `Same value as --bb-derived-segment-tab-root-${prop}, which the composed SegmentTab reads.`
    }
  }
  for (const layer of selected) {
    out[d(screen, layer, 'fill')] = 'Selected "Tab selecters" fill; the composed SegmentTab reads the same --bb-derived-segment-tab-root-fill.'
    out[d(screen, layer, 'stroke')] = 'Selected "Tab selecters" stroke; the composed SegmentTab reads the same --bb-derived-segment-tab-root-stroke.'
    out[d(screen, layer, 'stroke-width')] = 'Selected "Tab selecters" stroke width; the composed SegmentTab reads --bb-derived-segment-tab-root-stroke-width.'
  }
  for (const w of widths) out[`--bb-derived-agents-${screen}-${w}-width`] = 'HUG width of the segment label — measured text, not a design value.'
  return out
}

/** HUG / measured sizes of composed instances (labels, badges, text rows). */
export function measured(names: readonly string[], what: string): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, `${what} — a HUG size Figma measured from its content, not a design value.`]))
}

/** Values a composed component already reads from its own derived tokens. */
export function ownedBy(component: string, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, `Same value ${component}.css reads from its own --bb-derived-* token on every instance.`]))
}

export const ROOT_HEIGHT = 'The body is a 724-tall desktop mock; in the plugin it fills the tab area (360–760 window) and scrolls.'
