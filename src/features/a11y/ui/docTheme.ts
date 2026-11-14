// The colours and logo the canvas documents are drawn with, read from the UI's own
// CSS: the a11y/report/* tokens (fixed light theme) and the active brand's banner.
// The sandbox cannot read CSS, and the user's file has none of Bluebird's variables.
import { LOGOS, type LogoName } from '@logos'
import type { BadgeTone, DocTheme } from '../doc/types'

/** The Figma values, used when a variable is missing (tests, or a stale build). */
export const FALLBACK: Readonly<Record<string, string>> = {
  'a11y-report-surface-page': '#ffffff', 'a11y-report-surface-subtle': '#f7f7f7', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-border-default': '#dedede', 'a11y-report-border-strong': '#c4c4c4', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-text-title': '#161616', 'a11y-report-text-body': '#4d4d4d', 'a11y-report-text-meta': '#757575', 'a11y-report-text-accent': '#0b57d0', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-severity-critical-fg': '#7d2420', 'a11y-report-severity-critical-bg': '#ffd6ce', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-severity-serious-fg': '#624000', 'a11y-report-severity-serious-bg': '#fde4bc', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-severity-moderate-fg': '#004789', 'a11y-report-severity-moderate-bg': '#cbebff', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-severity-minor-fg': '#4d4d4d', 'a11y-report-severity-minor-bg': '#eeeeee', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-status-pass-fg': '#035817', 'a11y-report-status-pass-bg': '#ccf5cd', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-annotation-focus': '#0b57d0', 'a11y-report-annotation-heading': '#5c1f8f', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'a11y-report-annotation-landmark': '#035817', 'a11y-report-annotation-on': '#ffffff', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  'banner-bg': '#0b57d0', 'banner-text': '#ffffff', // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
}

const HEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i
const RGB = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i

/** "#FFF", "#ffffff", "rgb(255 255 255)" → "#ffffff"; null for anything else. */
export function normalizeHex(value: string): string | null {
  const v = value.trim()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v)
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
  const full = HEX.exec(v)
  if (full) return `#${full[1]}`.toLowerCase()
  const rgb = RGB.exec(v)
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
  return null
}

/** The brand logo as a standalone SVG string, or '' when the brand has none. */
export function logoSvg(brand: string | undefined): string {
  const art = brand ? LOGOS[brand as LogoName] : undefined
  if (!art) return ''
  const [, , width, height] = art.viewBox.split(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.viewBox}" width="${width}" height="${height}" fill="none">${art.body}</svg>`
}

export function readDocTheme(root: HTMLElement = document.documentElement): DocTheme {
  const style = getComputedStyle(root)
  const read = (name: string): string => normalizeHex(style.getPropertyValue(`--bb-${name}`)) ?? FALLBACK[name] ?? '#000000' // allow-raw: fallback copy of the a11y/report/* values; __tests__/docTheme.test.ts holds it to the generated tokens
  const pair = (fg: string, bg: string) => ({ fg: read(fg), bg: read(bg) })
  const severity: Record<BadgeTone, { fg: string; bg: string }> = {
    critical: pair('a11y-report-severity-critical-fg', 'a11y-report-severity-critical-bg'),
    serious: pair('a11y-report-severity-serious-fg', 'a11y-report-severity-serious-bg'),
    moderate: pair('a11y-report-severity-moderate-fg', 'a11y-report-severity-moderate-bg'),
    minor: pair('a11y-report-severity-minor-fg', 'a11y-report-severity-minor-bg'),
    pass: pair('a11y-report-status-pass-fg', 'a11y-report-status-pass-bg'),
  }
  return {
    page: read('a11y-report-surface-page'),
    subtle: read('a11y-report-surface-subtle'),
    border: read('a11y-report-border-default'),
    borderStrong: read('a11y-report-border-strong'),
    title: read('a11y-report-text-title'),
    body: read('a11y-report-text-body'),
    meta: read('a11y-report-text-meta'),
    accent: read('a11y-report-text-accent'),
    severity,
    annotation: {
      focus: read('a11y-report-annotation-focus'),
      heading: read('a11y-report-annotation-heading'),
      landmark: read('a11y-report-annotation-landmark'),
      on: read('a11y-report-annotation-on'),
    },
    banner: { bg: read('banner-bg'), text: read('banner-text') },
    logoSvg: logoSvg(root.dataset.brand),
  }
}

/** "A11Y-R-20261110-1432": sortable, and unique enough per person per minute. */
export function documentId(prefix: 'R' | 'S', at: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `A11Y-${prefix}-${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}`
}

/** "10 Nov 2026, 14:32" — the "Created" line. */
export const createdLabel = (at: Date): string =>
  `${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
