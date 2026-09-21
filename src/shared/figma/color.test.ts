import { describe, it, expect } from 'vitest'
import { rgbaToHex, hexToRgb, contrastRatio, relativeLuminance, blendOver } from './color'

describe('color math', () => {
  it('converts between hex and 0..1 rgb', () => {
    expect(rgbaToHex({ r: 0, g: 0.4, b: 1 })).toBe('#0066ff')
    expect(rgbaToHex({ r: 1, g: 1, b: 1, a: 0.5 })).toBe('#ffffff80')
    expect(hexToRgb('#0066ff')).toEqual({ r: 0, g: 0.4, b: 1 })
    expect(hexToRgb('nope')).toBeNull()
  })

  it('computes WCAG luminance and contrast', () => {
    const white = { r: 1, g: 1, b: 1 }
    const black = { r: 0, g: 0, b: 0 }
    expect(relativeLuminance(white)).toBeCloseTo(1)
    expect(contrastRatio(white, black)).toBeCloseTo(21)
    expect(contrastRatio(black, white)).toBeCloseTo(21)
    // #777 on white is the classic 4.48 borderline case
    expect(contrastRatio(hexToRgb('#777777')!, white)).toBeCloseTo(4.48, 2)
  })

  it('composites translucent colors over a background', () => {
    const mid = blendOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 1, g: 1, b: 1 })
    expect(mid.r).toBeCloseTo(0.5)
  })
})
