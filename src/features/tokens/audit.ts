// Design-system drift rules. Pure maths and string logic: no Figma, no DOM.
//
// The accessibility tab answers "is this usable?". This one answers the
// question the design-system persona is actually paid to ask: "is this built
// from the system at all?" Both run off the same variable collections.

/** Auto-layout numbers worth checking against the spacing scale. */
export type SpacingProperty = 'gap' | 'padding-top' | 'padding-right' | 'padding-bottom' | 'padding-left'

export const SPACING_PROPERTIES: readonly SpacingProperty[] = [
  'gap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
]

/**
 * Is this number one the scale offers?
 *
 * Compared with a small tolerance because Figma stores lengths as floats and a
 * dragged value lands on 11.999999 often enough to matter. Zero is always on
 * scale: "no gap" is a deliberate choice, not drift.
 */
export function isOnScale(value: number, scale: ReadonlySet<number>, tolerance = 0.01): boolean {
  if (value === 0) return true
  for (const allowed of scale) {
    if (Math.abs(allowed - value) <= tolerance) return true
  }
  return false
}

/**
 * The nearest value on the scale, for the "did you mean" hint. Returns null
 * when the scale is empty — better no suggestion than a made-up one.
 */
export function nearestOnScale(value: number, scale: ReadonlySet<number>): number | null {
  let best: number | null = null
  let bestGap = Infinity
  for (const allowed of scale) {
    const gap = Math.abs(allowed - value)
    if (gap < bestGap) { bestGap = gap; best = allowed }
  }
  return best
}

/**
 * Share of paints that read a variable, 0..1.
 *
 * A file with nothing to bind scores 1: no paints means no drift, and showing
 * 0% for an empty page reads as a failure that is not there.
 */
export function tokenCoverage(bound: number, unbound: number): number {
  const total = bound + unbound
  if (total === 0) return 1
  return Math.round((bound / total) * 1000) / 1000
}
