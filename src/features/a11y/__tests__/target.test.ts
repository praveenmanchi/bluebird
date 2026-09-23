import { describe, it, expect } from 'vitest'
import { TARGET_MIN_AA, TARGET_MIN_AAA, hasSpacingException, isControlName, rateTarget, requiredTarget } from '../target'

describe('target size (2.5.8 / 2.5.5)', () => {
  it('uses 24px for AA and 44px for AAA', () => {
    expect(TARGET_MIN_AA).toBe(24)
    expect(TARGET_MIN_AAA).toBe(44)
  })

  it('rates on the smaller side: a wide thin row is still hard to hit', () => {
    expect(rateTarget(200, 12)).toBe('fail')
    expect(rateTarget(12, 200)).toBe('fail')
  })

  it('passes AA at exactly 24 and AAA at exactly 44', () => {
    expect(rateTarget(24, 24)).toBe('aa')
    expect(rateTarget(44, 44)).toBe('aaa')
    expect(rateTarget(23.9, 40)).toBe('fail')
  })

  it('reports the threshold the finding is measured against', () => {
    expect(requiredTarget('fail')).toBe(24)
    expect(requiredTarget('aa')).toBe(44)
  })

  it('recognises control names as a fallback signal', () => {
    for (const name of ['Button / primary', 'Close', 'Icon button', 'Tab', 'Checkbox']) {
      expect(isControlName(name)).toBe(true)
    }
  })

  it('does not treat ordinary layers as controls', () => {
    for (const name of ['Card', 'Hero image', 'Caption', 'Buttonhole illustration']) {
      expect(isControlName(name)).toBe(false)
    }
  })
})

describe('hasSpacingException (2.5.8)', () => {
  const small = { x: 100, y: 100, width: 16, height: 16 }

  it('passes an undersized target with nothing near it', () => {
    expect(hasSpacingException(small, [])).toBe(true)
    expect(hasSpacingException(small, [{ x: 200, y: 200, width: 16, height: 16 }])).toBe(true)
  })

  it('fails it when another target sits inside the 24px circle', () => {
    // Neighbour 2px to the right: the circle (radius 12 from centre 108) reaches it.
    expect(hasSpacingException(small, [{ x: 118, y: 100, width: 16, height: 16 }])).toBe(false)
  })

  it('measures from the circle to the nearest edge, not centre to centre', () => {
    // Centre at (108,108); a neighbour whose edge is exactly 12px away is clear.
    expect(hasSpacingException(small, [{ x: 120.01, y: 100, width: 16, height: 16 }])).toBe(true)
  })
})
