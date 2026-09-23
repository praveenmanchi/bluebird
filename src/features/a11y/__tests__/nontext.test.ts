import { describe, it, expect } from 'vitest'
import { NON_TEXT_MIN, isDecorativeName, passesNonText } from '../nontext'

describe('non-text contrast (1.4.11)', () => {
  it('uses a single 3:1 threshold at every size', () => {
    expect(NON_TEXT_MIN).toBe(3)
    expect(passesNonText(3)).toBe(true)
    expect(passesNonText(2.99)).toBe(false)
  })

  it('treats dividers and separators as decoration, which the criterion exempts', () => {
    for (const name of ['Divider', 'Line / separator', 'Hairline rule', 'Grid guide']) {
      expect(isDecorativeName(name)).toBe(true)
    }
  })

  it('does not exempt a real control boundary', () => {
    for (const name of ['Input border', 'Button', 'Card outline', 'Focus ring']) {
      expect(isDecorativeName(name)).toBe(false)
    }
  })

  it('does not fire on words that merely contain a keyword', () => {
    expect(isDecorativeName('Backgrounder')).toBe(false)
    expect(isDecorativeName('Ruler panel')).toBe(false)
  })
})
