import { describe, it, expect } from 'vitest'
import { nearestPassingToken, perceptualDistance, verdictsAcrossModes, type PaletteEntry } from '../tokens'

const rgb = (r: number, g: number, b: number) => ({ r, g, b })
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)

describe('perceptualDistance', () => {
  it('is zero for identical colours', () => {
    expect(perceptualDistance(WHITE, WHITE)).toBe(0)
  })
  it('grows with the size of the change', () => {
    const near = perceptualDistance(rgb(0.5, 0.5, 0.5), rgb(0.55, 0.5, 0.5))
    const far = perceptualDistance(rgb(0.5, 0.5, 0.5), rgb(0.9, 0.5, 0.5))
    expect(near).toBeLessThan(far)
  })
  it('weights green more heavily than blue, as the eye does', () => {
    const green = perceptualDistance(rgb(0.5, 0.5, 0.5), rgb(0.5, 0.8, 0.5))
    const blue = perceptualDistance(rgb(0.5, 0.5, 0.5), rgb(0.5, 0.5, 0.8))
    expect(green).toBeGreaterThan(blue)
  })
})

describe('nearestPassingToken', () => {
  const palette: PaletteEntry[] = [
    { id: 'v1', name: 'Brand/Text/Muted', rgb: rgb(0.6, 0.6, 0.6), scopes: [] },
    { id: 'v2', name: 'Brand/Text/Secondary', rgb: rgb(0.4, 0.4, 0.4), scopes: [] },
    { id: 'v3', name: 'Brand/Text/Primary', rgb: rgb(0.1, 0.1, 0.1), scopes: [] },
  ]

  it('returns null when nothing in the palette passes', () => {
    expect(nearestPassingToken(rgb(0.9, 0.9, 0.9), WHITE, 21, palette)).toBeNull()
  })

  it('picks the smallest change that still reaches the threshold', () => {
    const fix = nearestPassingToken(rgb(0.7, 0.7, 0.7), WHITE, 4.5, palette)
    // Muted fails against white; Secondary is the nearest that passes.
    expect(fix?.name).toBe('Brand/Text/Secondary')
    expect(fix?.ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('reaches further into the palette when the bar is higher', () => {
    const fix = nearestPassingToken(rgb(0.7, 0.7, 0.7), WHITE, 7, palette)
    expect(fix?.name).toBe('Brand/Text/Primary')
  })

  it('measures against the given background, not an assumed white', () => {
    const onBlack: PaletteEntry[] = [{ id: 'w', name: 'Brand/Text/OnAccent', rgb: WHITE, scopes: [] }]
    const fix = nearestPassingToken(rgb(0.2, 0.2, 0.2), BLACK, 4.5, onBlack)
    expect(fix?.name).toBe('Brand/Text/OnAccent')
  })

  it('judges a token at the opacity the text is drawn at', () => {
    // Secondary reaches 4.5:1 at full strength, but not on a layer at 60% opacity; only Primary does.
    expect(nearestPassingToken(rgb(0.7, 0.7, 0.7), WHITE, 4.5, palette, 0.6)?.name).toBe('Brand/Text/Primary')
    const fix = nearestPassingToken(rgb(0.7, 0.7, 0.7), WHITE, 4.5, palette, 0.6)!
    expect(fix.ratio).toBeLessThan(nearestPassingToken(rgb(0.7, 0.7, 0.7), WHITE, 7, palette)!.ratio)
  })

  it('returns the variable id so the fix can be bound rather than pasted', () => {
    expect(nearestPassingToken(rgb(0.7, 0.7, 0.7), WHITE, 4.5, palette)?.id).toBe('v2')
  })
})

describe('verdictsAcrossModes', () => {
  it('judges every mode where both sides resolve', () => {
    const verdicts = verdictsAcrossModes(
      { Bridge: rgb(0.6, 0.6, 0.6), Ikea: BLACK },
      { Bridge: WHITE, Ikea: WHITE },
      4.5,
    )
    expect(verdicts.map((v) => [v.brand, v.pass])).toEqual([['Bridge', false], ['Ikea', true]])
  })

  it('skips a mode where a side has no value — a token gap is not a failure', () => {
    const verdicts = verdictsAcrossModes(
      { Bridge: BLACK, Disney: null },
      { Bridge: WHITE, Disney: WHITE },
      4.5,
    )
    expect(verdicts.map((v) => v.brand)).toEqual(['Bridge'])
  })

  it('rounds the ratio to two places, matching the card', () => {
    const verdicts = verdictsAcrossModes({ Bridge: rgb(0.5, 0.5, 0.5) }, { Bridge: WHITE }, 4.5)
    expect(verdicts[0]?.ratio).toBe(Math.round(verdicts[0]!.ratio * 100) / 100)
    expect(String(verdicts[0]?.ratio).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  })
})
