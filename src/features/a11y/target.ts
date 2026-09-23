// WCAG 2.5.8 Target Size (Minimum, AA) and 2.5.5 Target Size (Enhanced, AAA).
// Pure rules: no Figma, no DOM.

/** 2.5.8, AA: 24×24 CSS pixels. */
export const TARGET_MIN_AA = 24
/** 2.5.5, AAA: 44×44 CSS pixels. */
export const TARGET_MIN_AAA = 44

/**
 * Component names that mean "a person taps this". Used only as a fallback:
 * a node carrying a real prototype interaction is known to be a target, and
 * that evidence is preferred wherever Figma gives it to us.
 */
const CONTROL = /(^|[^a-z])(button|btn|checkbox|radio|switch|toggle|link|chip|tab|stepper|slider|icon[- ]?button|close|dismiss|menu[- ]?item)([^a-z]|$)/i

export function isControlName(name: string): boolean {
  return CONTROL.test(name)
}

export type TargetLevel = 'fail' | 'aa' | 'aaa'

/**
 * Rate a target against both thresholds. The smaller side decides: a 200×12
 * row is as hard to hit as a 12×12 one.
 */
export function rateTarget(width: number, height: number): TargetLevel {
  const smallest = Math.min(width, height)
  if (smallest >= TARGET_MIN_AAA) return 'aaa'
  if (smallest >= TARGET_MIN_AA) return 'aa'
  return 'fail'
}

/** The threshold a given rating is measured against, for the card's "Required" row. */
export function requiredTarget(level: TargetLevel): number {
  return level === 'fail' ? TARGET_MIN_AA : TARGET_MIN_AAA
}

export interface Box { x: number; y: number; width: number; height: number }

/**
 * The 2.5.8 spacing exception: an undersized target still passes when a
 * 24px-diameter circle centred on it does not intersect any other target.
 * A lone 16px icon with room around it is fine; the same icon in a packed
 * toolbar is not. Without this, every small icon button is a finding, and
 * most of those findings are wrong.
 */
export function hasSpacingException(target: Box, others: readonly Box[]): boolean {
  const cx = target.x + target.width / 2
  const cy = target.y + target.height / 2
  const r = TARGET_MIN_AA / 2
  for (const o of others) {
    // Closest point on the other box to the circle centre.
    const nx = Math.max(o.x, Math.min(cx, o.x + o.width))
    const ny = Math.max(o.y, Math.min(cy, o.y + o.height))
    const dx = cx - nx
    const dy = cy - ny
    if (dx * dx + dy * dy < r * r) return false
  }
  return true
}
