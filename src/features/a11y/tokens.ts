// Token-aware remediation. Pure maths and data shaping: no Figma, no DOM.
//
// This is the part of the plugin no competitor can copy, because it needs the
// brand-mode structure Bluebird already has. Two questions:
//   1. Does this colour pair pass in every brand mode, not just the active one?
//   2. Which existing token is the nearest one that would pass?
import { contrastRatio, type RGB } from '@shared/figma/color'

/** One candidate colour from the brand palette. */
export interface PaletteEntry {
  /** Figma variable id, so the fix can be bound rather than pasted. */
  id: string
  /** Variable path as Figma spells it, e.g. "Brand/Text/OnAccent". */
  name: string
  rgb: RGB
  /** Figma variable scopes, e.g. TEXT_FILL — what the token is allowed to paint. */
  scopes: readonly string[]
}

/** A suggested rebind: the token, the colour it resolves to, and what it achieves. */
export interface TokenFix extends PaletteEntry {
  ratio: number
}

/** Pass/fail for one brand mode. */
export interface ModeVerdict {
  brand: string
  pass: boolean
  ratio: number
}

/**
 * Perceptual distance between two colours (low-cost "redmean" approximation).
 * Plain Euclidean RGB distance rates a green shift as cheaply as a red one,
 * which picks fixes a designer would reject; redmean weights the channels by
 * where the colour sits on the red axis and is close enough for ranking.
 */
export function perceptualDistance(a: RGB, b: RGB): number {
  const rMean = ((a.r + b.r) / 2) * 255
  const dr = (a.r - b.r) * 255
  const dg = (a.g - b.g) * 255
  const db = (a.b - b.b) * 255
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db)
}

/**
 * The closest token to `current` that reaches `needed` against `background`.
 *
 * Ties break toward the smaller change, so a card that fails by a hair gets a
 * neighbouring shade rather than a jump to black. Returns null when the palette
 * has nothing that passes — better to say so than to suggest a colour that is
 * not in the design system.
 */
export function nearestPassingToken(
  current: RGB,
  background: RGB,
  needed: number,
  palette: readonly PaletteEntry[],
): TokenFix | null {
  let best: TokenFix | null = null
  let bestDistance = Infinity
  for (const entry of palette) {
    const ratio = contrastRatio(entry.rgb, background)
    if (ratio < needed) continue
    const distance = perceptualDistance(current, entry.rgb)
    if (distance < bestDistance) {
      bestDistance = distance
      best = { ...entry, ratio }
    }
  }
  return best
}

/**
 * Judge one pair across every brand mode. A mode is only reported when both
 * sides resolve there — a variable that has no value in a mode is a gap in the
 * design system, not a contrast failure, and claiming otherwise would be noise.
 */
export function verdictsAcrossModes(
  foregroundByMode: Readonly<Record<string, RGB | null>>,
  backgroundByMode: Readonly<Record<string, RGB | null>>,
  needed: number,
): ModeVerdict[] {
  const verdicts: ModeVerdict[] = []
  for (const brand of Object.keys(foregroundByMode)) {
    const fg = foregroundByMode[brand]
    const bg = backgroundByMode[brand]
    if (!fg || !bg) continue
    const ratio = contrastRatio(fg, bg)
    verdicts.push({ brand, pass: ratio >= needed, ratio: Math.round(ratio * 100) / 100 })
  }
  return verdicts
}
