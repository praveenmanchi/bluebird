// Pure color math. No Figma API calls: safe to unit test and to reuse in the UI.

export interface RGB { r: number; g: number; b: number }
export interface RGBA extends RGB { a: number }

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const hex2 = (n: number) => Math.round(clamp01(n) * 255).toString(16).padStart(2, '0')

/** Figma colors are 0..1 floats. Alpha is dropped when fully opaque. */
export function rgbaToHex(color: RGB | RGBA): string {
  const base = `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}`
  const alpha = 'a' in color ? color.a : 1
  return alpha >= 1 ? base : `${base}${hex2(alpha)}`
}

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

function channel(c: number): number {
  const v = clamp01(c)
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(color: RGB): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
}

/** WCAG contrast ratio, 1..21. Order of arguments does not matter. */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la >= lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** Composite a translucent foreground over an opaque background. */
export function blendOver(fg: RGBA, bg: RGB): RGB {
  const a = clamp01(fg.a)
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  }
}
