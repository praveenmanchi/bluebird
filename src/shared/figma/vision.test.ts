import { describe, it, expect } from 'vitest'
import { hexToRgb } from './color'
import { simulateVision, deltaE76, staysDistinct, VISION_SIMULATIONS } from './vision'

const red = hexToRgb('#D93025')!
const green = hexToRgb('#1E8E3E')!
const white = { r: 1, g: 1, b: 1 }

describe('colour-vision simulation', () => {
  it('leaves colours alone for typical vision and low vision', () => {
    expect(simulateVision(red, 'normal')).toEqual(red)
    expect(simulateVision(red, 'low-vision')).toEqual(red)
  })

  it('keeps white white under every dichromacy (rows of each matrix sum to ~1)', () => {
    for (const kind of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const) {
      const out = simulateVision(white, kind)
      expect(out.r).toBeCloseTo(1, 2)
      expect(out.g).toBeCloseTo(1, 2)
      expect(out.b).toBeCloseTo(1, 2)
    }
  })

  it('turns every colour grey under achromatopsia', () => {
    const out = simulateVision(red, 'achromatopsia')
    expect(out.r).toBeCloseTo(out.g, 6)
    expect(out.g).toBeCloseTo(out.b, 6)
  })

  it('stays inside 0..1 even when a matrix overshoots', () => {
    const out = simulateVision({ r: 0, g: 0, b: 1 }, 'tritanopia')
    for (const c of [out.r, out.g, out.b]) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    }
  })
})

describe('deltaE76', () => {
  it('is zero for identical colours and symmetric', () => {
    expect(deltaE76(red, red)).toBe(0)
    expect(deltaE76(red, green)).toBeCloseTo(deltaE76(green, red), 6)
  })

  it('measures black to white as 100 (L* difference only)', () => {
    expect(deltaE76({ r: 0, g: 0, b: 0 }, white)).toBeCloseTo(100, 0)
  })
})

describe('staysDistinct — the red/green status-badge case from the Figma card', () => {
  it('flags the pair under red-green dichromacies and achromatopsia', () => {
    expect(staysDistinct(red, green, 'normal')).toBe(true)
    expect(staysDistinct(red, green, 'tritanopia')).toBe(true)
    expect(staysDistinct(red, green, 'protanopia')).toBe(false)
    expect(staysDistinct(red, green, 'deuteranopia')).toBe(false)
    expect(staysDistinct(red, green, 'achromatopsia')).toBe(false)
  })

  it('never vouches for low vision, which is a blur rather than a hue shift', () => {
    expect(staysDistinct(red, green, 'low-vision')).toBe(false)
  })

  it('lists the six simulations in the Figma order', () => {
    expect(VISION_SIMULATIONS).toEqual(['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'low-vision'])
  })
})
