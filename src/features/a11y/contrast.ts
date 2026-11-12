// Pure WCAG 2.x rules. No Figma, no DOM: fully unit tested.
import type { ContrastLevel } from './messages'

export const WCAG = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
  /** Large text: ≥ 24px, or ≥ 18.66px when bold (WCAG 18pt / 14pt bold at 96dpi). */
  LARGE_PX: 24,
  LARGE_BOLD_PX: 18.66,
} as const

export function isLargeText(fontSize: number, isBold: boolean): boolean {
  return fontSize >= WCAG.LARGE_PX || (isBold && fontSize >= WCAG.LARGE_BOLD_PX)
}

/** Classify a ratio for the given text size. 'aa-large' means it only passes because the text is large. */
export function rateContrast(ratio: number, fontSize: number, isBold: boolean): ContrastLevel {
  const large = isLargeText(fontSize, isBold)
  if (ratio >= WCAG.AAA_NORMAL || (large && ratio >= WCAG.AAA_LARGE)) return 'aaa'
  if (ratio >= WCAG.AA_NORMAL) return 'aa'
  if (large && ratio >= WCAG.AA_LARGE) return 'aa-large'
  return 'fail'
}

/**
 * WCAG's large-text exception says "bold", and the accompanying note pins that
 * to font-weight 700. Semibold (600) does not qualify: treating it as bold
 * lowers the bar to 3:1 for text that never earned it. A style name counts
 * only when it says Bold/Black/Heavy outright — "Semi Bold" is excluded.
 */
export const BOLD_WEIGHT = 700

export function isBoldStyle(style: string, weight?: number): boolean {
  if (typeof weight === 'number') return weight >= BOLD_WEIGHT
  if (/semi\s*-?bold|demi/i.test(style)) return false
  return /bold|black|heavy/i.test(style)
}

export function roundRatio(ratio: number): number {
  return Math.round(ratio * 100) / 100
}

/**
 * The ratio a finding has to reach to stop being a finding.
 *
 * A pair that fails outright is measured against AA (1.4.3); a pair that
 * already clears AA but not AAA is measured against AAA (1.4.6). That mirrors
 * the criterion the card reports, so the suggested fix always clears the bar
 * the card is complaining about.
 */
export function requiredRatio(level: ContrastLevel, fontSize: number, isBold: boolean): number {
  const large = isLargeText(fontSize, isBold)
  if (level === 'fail') return large ? WCAG.AA_LARGE : WCAG.AA_NORMAL
  return large ? WCAG.AAA_LARGE : WCAG.AAA_NORMAL
}
