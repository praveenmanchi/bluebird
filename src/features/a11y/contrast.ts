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

/** Font weight ≥ 600 or a style name containing Bold/Black/Heavy counts as bold. */
export function isBoldStyle(style: string, weight?: number): boolean {
  if (typeof weight === 'number') return weight >= 600
  return /bold|black|heavy|extra/i.test(style)
}

export function roundRatio(ratio: number): number {
  return Math.round(ratio * 100) / 100
}
