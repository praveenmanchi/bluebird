import { describe, it, expect } from 'vitest'
import { rateContrast, isLargeText, isBoldStyle, roundRatio } from '../contrast'

describe('WCAG rating', () => {
  it('identifies large text by size and weight', () => {
    expect(isLargeText(24, false)).toBe(true)
    expect(isLargeText(18.66, true)).toBe(true)
    expect(isLargeText(18.66, false)).toBe(false)
    expect(isLargeText(14, true)).toBe(false)
  })

  it('rates normal text', () => {
    expect(rateContrast(7.1, 14, false)).toBe('aaa')
    expect(rateContrast(4.5, 14, false)).toBe('aa')
    expect(rateContrast(3.5, 14, false)).toBe('fail')
  })

  it('rates large text with relaxed thresholds', () => {
    expect(rateContrast(4.6, 24, false)).toBe('aaa')
    expect(rateContrast(3.2, 24, false)).toBe('aa-large')
    expect(rateContrast(2.9, 24, false)).toBe('fail')
  })

  it('detects bold from weight or style name', () => {
    expect(isBoldStyle('Bold')).toBe(true)
    expect(isBoldStyle('Regular')).toBe(false)
    expect(isBoldStyle('Regular', 700)).toBe(true)
    expect(isBoldStyle('Black', 400)).toBe(false)
  })

  it('does not let semibold claim the large-text exception — WCAG pins bold to 700', () => {
    expect(isBoldStyle('Regular', 600)).toBe(false)
    expect(isBoldStyle('Semi Bold')).toBe(false)
    expect(isBoldStyle('SemiBold')).toBe(false)
    expect(isBoldStyle('DemiBold')).toBe(false)
    expect(isBoldStyle('Extra Bold')).toBe(true)
    // "Extra" alone says nothing about weight: Extra Light is the thinnest cut there is.
    expect(isBoldStyle('Extra Light')).toBe(false)
    expect(isBoldStyle('ExtraLight')).toBe(false)
  })

  it('rounds ratios to two decimals', () => {
    expect(roundRatio(4.4849)).toBe(4.48)
  })
})
