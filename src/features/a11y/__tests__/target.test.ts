import { describe, it, expect } from 'vitest'
import { TARGET_MIN_AA, TARGET_MIN_AAA, checksTargets, hasSpacingException, isControlName, rateTarget, requiredTarget, spacingExceptionApplies, targetCitation, targetCriterion, targetThresholds } from '../target'

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

  it('has only the 44px bar under WCAG 2.1, and none at all on the web under 2.0', () => {
    expect(targetThresholds('web', 'wcag21')).toEqual({ min: 44, enhanced: 44 })
    expect(rateTarget(16, 16, 'web', 'wcag21')).toBe('fail')
    expect(rateTarget(32, 32, 'web', 'wcag21')).toBe('fail')
    expect(rateTarget(44, 44, 'web', 'wcag21')).toBe('aaa')
    expect(requiredTarget('fail', 'web', 'wcag21')).toBe(44)
    expect(checksTargets('web', 'wcag20')).toBe(false)
    expect(checksTargets('web', 'wcag21')).toBe(true)
    // iOS keeps Apple's bar whatever the version.
    expect(checksTargets('ios', 'wcag20')).toBe(true)
    expect(targetThresholds('ios', 'wcag20')).toEqual({ min: 44, enhanced: 44 })
  })

  it('files a finding under 2.5.8 only where 2.5.8 exists', () => {
    expect(targetCriterion({ width: 16, height: 16 })).toBe('2.5.8')
    expect(targetCriterion({ width: 16, height: 16, standard: 'wcag22' })).toBe('2.5.8')
    expect(targetCriterion({ width: 16, height: 16, standard: 'wcag21' })).toBe('2.5.5')
    expect(spacingExceptionApplies('web', 'wcag22')).toBe(true)
    expect(spacingExceptionApplies('web', 'wcag21')).toBe(false)
    expect(spacingExceptionApplies('ios', 'wcag22')).toBe(false)
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

describe('targetCitation', () => {
  it('cites the WCAG criterion a web target misses', () => {
    expect(targetCitation({ width: 16, height: 16 })).toMatchObject({ code: '2.5.8', level: 'AA' })
    expect(targetCitation({ width: 30, height: 30 })).toMatchObject({ code: '2.5.5', level: 'AAA' })
    expect(targetCitation({ width: 16, height: 16, standard: 'wcag21' })).toMatchObject({ code: '2.5.5', level: 'AAA' })
  })

  it('cites only the platform guideline when no WCAG bar is missed', () => {
    // 46dp clears 2.5.5's 44 and only misses Material's 48.
    expect(targetCitation({ width: 46, height: 46, platform: 'android' })).toMatchObject({ code: null, label: 'Material Design', title: 'Android tap target' })
    // WCAG 2.0 has no target-size criterion to cite.
    expect(targetCitation({ width: 30, height: 30, platform: 'ios', standard: 'wcag20' })).toMatchObject({ code: null, label: 'Apple HIG' })
    expect(targetCitation({ width: 30, height: 30, platform: 'ios' })).toMatchObject({ code: '2.5.5' })
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
    // Centre at (108,108); a full-size neighbour whose edge is just over 12px away is clear.
    expect(hasSpacingException(small, [{ x: 120.01, y: 86, width: 44, height: 44 }])).toBe(true)
  })

  it('fails when the circles of two undersized targets overlap, even if neither touches the other target', () => {
    // 16px icons 6px apart: centres 22px apart, so the two 24px circles intersect.
    expect(hasSpacingException(small, [{ x: 122, y: 100, width: 16, height: 16 }])).toBe(false)
    // 8px apart: centres 24px apart, the circles only touch.
    expect(hasSpacingException(small, [{ x: 124, y: 100, width: 16, height: 16 }])).toBe(true)
  })
})
