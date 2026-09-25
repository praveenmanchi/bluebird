import { describe, it, expect } from 'vitest'
import { isOnScale, nearestOnScale, tokenCoverage, SPACING_PROPERTIES } from '../audit'

const scale = new Set([4, 8, 9, 12, 41])

describe('isOnScale', () => {
  it('accepts a value the scale offers', () => {
    expect(isOnScale(8, scale)).toBe(true)
  })
  it('rejects a value it does not', () => {
    expect(isOnScale(10, scale)).toBe(false)
  })
  it('tolerates float drift, because Figma stores lengths as floats', () => {
    expect(isOnScale(11.999999, scale)).toBe(true)
    expect(isOnScale(12.5, scale)).toBe(false)
  })
  it('always accepts zero — "no gap" is a choice, not drift', () => {
    expect(isOnScale(0, new Set())).toBe(true)
  })
})

describe('nearestOnScale', () => {
  it('finds the closest allowed value', () => {
    expect(nearestOnScale(10, scale)).toBe(9)
    expect(nearestOnScale(37, scale)).toBe(41)
  })
  it('returns null rather than inventing a suggestion', () => {
    expect(nearestOnScale(10, new Set())).toBeNull()
  })
})

describe('tokenCoverage', () => {
  it('is the bound share, to three places', () => {
    expect(tokenCoverage(87, 13)).toBe(0.87)
    expect(tokenCoverage(1, 2)).toBe(0.333)
  })
  it('scores an empty page as clean, not as a total failure', () => {
    expect(tokenCoverage(0, 0)).toBe(1)
  })
  it('scores nothing-bound as zero', () => {
    expect(tokenCoverage(0, 10)).toBe(0)
  })
})

describe('SPACING_PROPERTIES', () => {
  it('covers the gap and all four paddings', () => {
    expect([...SPACING_PROPERTIES]).toEqual(['gap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'])
  })
})
