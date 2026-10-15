// WCAG 2.5.8 Target Size (Minimum, AA) and 2.5.5 Target Size (Enhanced, AAA), and the
// platform minimums designers ship against: Apple's 44×44 pt and Material's 48×48 dp.
// Pure rules: no Figma, no DOM. One Figma unit is read as one px / pt / dp (a 1× design).
import { DEFAULT_STANDARD, includes, type StandardId } from './standards'

/** 2.5.8, AA: 24×24 CSS pixels. */
export const TARGET_MIN_AA = 24
/** 2.5.5, AAA: 44×44 CSS pixels. */
export const TARGET_MIN_AAA = 44

export type Platform = 'web' | 'ios' | 'android'

export interface PlatformTargets {
  label: string
  /** How the platform names a design unit. */
  unit: 'px' | 'pt' | 'dp'
  /** Below this a target fails. */
  min: number
  /** At or above this it passes every bar the platform has (web: 2.5.5). */
  enhanced: number
  /** WCAG 2.5.8's spacing exception; native guidelines ask for the hit area itself. */
  spacingException: boolean
  /** Where the minimum comes from, as the card cites it. */
  source: string
}

export const PLATFORM_TARGETS: Readonly<Record<Platform, PlatformTargets>> = {
  web: { label: 'Web', unit: 'px', min: TARGET_MIN_AA, enhanced: TARGET_MIN_AAA, spacingException: true, source: 'WCAG 2.2' },
  ios: { label: 'iOS', unit: 'pt', min: 44, enhanced: 44, spacingException: false, source: 'Apple HIG' },
  android: { label: 'Android', unit: 'dp', min: 48, enhanced: 48, spacingException: false, source: 'Material Design' },
}

export const PLATFORMS = Object.keys(PLATFORM_TARGETS) as Platform[]

/** 2.5.8 Target Size (Minimum) arrived in WCAG 2.2; 2.5.5 (Enhanced) in 2.1. 2.0 has no target-size criterion. */
export const TARGET_MINIMUM_SINCE: StandardId = 'wcag22'
export const TARGET_ENHANCED_SINCE: StandardId = 'wcag21'

/** Whether a standard checks targets at all on a platform: 2.0 only does so where the platform has its own bar. */
export function checksTargets(platform: Platform, standard: StandardId = DEFAULT_STANDARD): boolean {
  return platform !== 'web' || includes(standard, TARGET_ENHANCED_SINCE)
}

/**
 * The bars a target is measured against. On the web under WCAG 2.1 there is only 2.5.5's
 * 44 px, so anything under it fails outright; 2.2 adds the 24 px minimum beneath it.
 * iOS and Android bring their own single bar whatever the standard.
 */
export function targetThresholds(platform: Platform = 'web', standard: StandardId = DEFAULT_STANDARD): { min: number; enhanced: number } {
  const { min, enhanced } = PLATFORM_TARGETS[platform]
  return platform === 'web' && !includes(standard, TARGET_MINIMUM_SINCE) ? { min: enhanced, enhanced } : { min, enhanced }
}

/** 2.5.8's spacing exception only exists where 2.5.8 does. */
export function spacingExceptionApplies(platform: Platform, standard: StandardId = DEFAULT_STANDARD): boolean {
  return PLATFORM_TARGETS[platform].spacingException && includes(standard, TARGET_MINIMUM_SINCE)
}

/**
 * The WCAG criterion a target finding fails: under 24 it fails the AA minimum (2.5.8) on any
 * platform; at 24 or more it only misses a larger bar (2.5.5 on the web, the platform minimum
 * on iOS / Android). Before 2.2 there is no minimum, so everything files under 2.5.5.
 */
export function targetCriterion(size: { width: number; height: number; standard?: StandardId }): '2.5.8' | '2.5.5' {
  if (!includes(size.standard, TARGET_MINIMUM_SINCE)) return '2.5.5'
  return Math.min(size.width, size.height) < TARGET_MIN_AA ? '2.5.8' : '2.5.5'
}

/** "44 × 44 pt (Apple HIG)", "24 × 24 px": a finding's minimum in its platform's units. */
export function requiredLabel(issue: { required: number; platform?: Platform }): string {
  const p = PLATFORM_TARGETS[issue.platform ?? 'web']
  return `${issue.required} × ${issue.required} ${p.unit}${issue.platform && issue.platform !== 'web' ? ` (${p.source})` : ''}`
}

/** The unit a finding's sizes are named in (px on the web, pt on iOS, dp on Android). */
export const unitOf = (issue: { platform?: Platform }): PlatformTargets['unit'] => PLATFORM_TARGETS[issue.platform ?? 'web'].unit

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
export function rateTarget(width: number, height: number, platform: Platform = 'web', standard: StandardId = DEFAULT_STANDARD): TargetLevel {
  const { min, enhanced } = targetThresholds(platform, standard)
  const smallest = Math.min(width, height)
  if (smallest >= enhanced) return 'aaa'
  if (smallest >= min) return 'aa'
  return 'fail'
}

/** The threshold a given rating is measured against, for the card's "Required" row. */
export function requiredTarget(level: TargetLevel, platform: Platform = 'web', standard: StandardId = DEFAULT_STANDARD): number {
  const { min, enhanced } = targetThresholds(platform, standard)
  return level === 'fail' ? min : enhanced
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
