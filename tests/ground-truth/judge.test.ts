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
