// WCAG 2.2 contrast for the colour pages. Alpha is composited over the backdrop
// first, matching how the a11y tab measures translucent fills.
type Rgba = [number, number, number, number]

function parseHex(hex: string): Rgba | undefined {
  const raw = hex.replace('#', '')
  const full = raw.length <= 4 ? [...raw].map((c) => c + c).join('') : raw
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full)) return undefined
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16)
  return [channel(0), channel(2), channel(4), full.length === 8 ? channel(6) / 255 : 1]
}

function over([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1]
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Ratio of `fg` on `bg`, or undefined when either value is not a hex colour. */
export function contrastRatio(fg: string, bg: string): number | undefined {
  const back = parseHex(bg)
  const front = parseHex(fg)
  if (!back || !front) return undefined
  const solidBack = back[3] < 1 ? over(back, [0, 0, 0, 1]) : back
  const a = luminance(over(front, solidBack))
  const b = luminance(solidBack)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export type Grade = 'AAA' | 'AA' | 'AA large' | 'Fail'

/** Grade for normal-size text (4.5:1 AA, 7:1 AAA, 3:1 large text only). */
export function grade(ratio: number): Grade {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA large'
  return 'Fail'
}
