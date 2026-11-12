import { describe, it, expect } from 'vitest'
import { parseExpectation, judge, observed, type ScanLike } from './judge'

const scan: ScanLike = {
  meta: { page: 'Accessibility · Ground truth' },
  issues: [{ nodeIds: ['t1'], level: 'fail' }, { nodeIds: ['t2'], level: 'fail', assumedBackground: true }, { nodeIds: ['t3'], level: 'aa-large' }],
  nonText: [{ nodeIds: ['s1'] }],
  targets: [{ nodeIds: ['b1', 'b2'] }],
  unmeasurable: [{ nodeId: 'u1' }],
}
const c = (name: string, ids: string[]) => ({ id: name, name, ids: new Set(ids), expect: parseExpectation(name) })

describe('parseExpectation', () => {
  it('reads the list after the marker', () => {
    expect(parseExpectation('GT-C01 · thing ▸ none')).toEqual([])
    expect(parseExpectation('GT-C02 · thing ▸ contrast')).toEqual(['contrast'])
    expect(parseExpectation('GT-X · thing ▸ contrast, nontext')).toEqual(['contrast', 'nontext'])
  })
  it('rejects a frame with no expectation or an unknown one', () => {
    expect(() => parseExpectation('GT-C01 · thing')).toThrow(/no ▸/)
    expect(() => parseExpectation('GT-C01 · thing ▸ sparkle')).toThrow(/unknown expectation/)
  })
})

describe('observed / judge', () => {
  it('attributes each kind of finding to the case that contains its node', () => {
    expect(observed(c('a ▸ none', ['t1', 'x']), scan)).toEqual(['contrast'])
    expect(observed(c('b ▸ none', ['t2']), scan)).toEqual(['assumed', 'contrast'])
    expect(observed(c('b2 ▸ none', ['t3']), scan)).toEqual(['contrast:aaa'])
    expect(observed(c('c ▸ none', ['s1']), scan)).toEqual(['nontext'])
    expect(observed(c('d ▸ none', ['b2']), scan)).toEqual(['target'])
    expect(observed(c('e ▸ none', ['u1']), scan)).toEqual(['unmeasurable'])
  })
  it('passes when observed matches expected regardless of order, fails otherwise', () => {
    expect(judge(c('ok ▸ contrast', ['t1']), scan).pass).toBe(true)
    expect(judge(c('clean ▸ none', ['nothing']), scan).pass).toBe(true)
    const wrong = judge(c('miss ▸ none', ['t1']), scan)
    expect(wrong.pass).toBe(false)
    expect(wrong.got).toEqual(['contrast'])
  })
})

describe('target detail and brand modes', () => {
  const sized: ScanLike = {
    meta: { page: 'Accessibility · Ground truth' },
    issues: [{ nodeIds: ['k1'], level: 'aa', brandModes: [{ brand: 'Bridge', pass: false }] }, { nodeIds: ['k2'], level: 'aa' }],
    nonText: [],
    targets: [{ nodeIds: ['small'], width: 16, height: 16 }, { nodeIds: ['mid'], width: 200, height: 32 }],
    unmeasurable: [],
  }

  it('tells a target under 24px from a larger one that still misses its bar', () => {
    expect(observed(c('a ▸ none', ['small']), sized)).toEqual(['target:small'])
    expect(observed(c('b ▸ none', ['mid']), sized)).toEqual(['target:large'])
    expect(judge(c('a ▸ target:small', ['small']), sized).pass).toBe(true)
    expect(judge(c('a ▸ target:large', ['small']), sized).pass).toBe(false)
  })

  it('lets a case that only says "target" accept either bar', () => {
    expect(judge(c('old ▸ target', ['small']), sized).pass).toBe(true)
    expect(judge(c('old ▸ target', ['mid', 'small']), sized).pass).toBe(true)
    expect(judge(c('old ▸ target', ['nothing']), sized).pass).toBe(false)
  })

  it('checks brand modes only where the case asks for them', () => {
    expect(judge(c('k ▸ contrast:aaa, modes', ['k1']), sized).pass).toBe(true)
    // Asked for, but the finding carries no per-brand verdicts.
    expect(judge(c('k ▸ contrast:aaa, modes', ['k2']), sized).pass).toBe(false)
    // Not asked for: a finding that happens to carry them still passes.
    expect(judge(c('k ▸ contrast:aaa', ['k1']), sized).pass).toBe(true)
  })
})

describe('per-run expectations', () => {
  const name = 'GT-T02 · two 16px targets ▸ target:small | wcag20: none | ios: target:small'

  it('reads the default for a run the name does not mention', () => {
    expect(parseExpectation(name)).toEqual(['target:small'])
    expect(parseExpectation(name, 'wcag21')).toEqual(['target:small'])
    expect(parseExpectation(name, 'android')).toEqual(['target:small'])
  })

  it('reads the override for a run that has one', () => {
    expect(parseExpectation(name, 'wcag20')).toEqual([])
    expect(parseExpectation(name, 'ios')).toEqual(['target:small'])
  })

  it('rejects an override that names no run or an unknown one', () => {
    expect(() => parseExpectation('GT-X · thing ▸ none | wcag20')).toThrow(/reads "<run>: <expectation>"/)
    expect(() => parseExpectation('GT-X · thing ▸ none | wcag19: none')).toThrow(/unknown run "wcag19"/)
    expect(() => parseExpectation('GT-X · thing ▸ none | wcag20: ', 'wcag20')).toThrow(/no ▸ expectation/)
  })
})
