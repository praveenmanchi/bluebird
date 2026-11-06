// Design-system drift rules. Pure maths and string logic: no Figma, no DOM.

/** Auto-layout numbers worth checking against the spacing scale. */
export type SpacingProperty = 'gap' | 'padding-top' | 'padding-right' | 'padding-bottom' | 'padding-left'

export const SPACING_PROPERTIES: readonly SpacingProperty[] = [
  'gap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
]

export const SPACING_LABELS: Readonly<Record<SpacingProperty, string>> = {
  gap: 'Item spacing',
  'padding-top': 'Padding top',
  'padding-right': 'Padding right',
  'padding-bottom': 'Padding bottom',
  'padding-left': 'Padding left',
}

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

/** The nearest value on the scale, for the "did you mean" hint. Null when the scale is empty: better no suggestion than a made-up one. */
export function nearestOnScale(value: number, scale: ReadonlySet<number>): number | null {
  let best: number | null = null
  let bestGap = Infinity
  for (const allowed of scale) {
    const gap = Math.abs(allowed - value)
    if (gap < bestGap) { bestGap = gap; best = allowed }
  }
  return best
}
