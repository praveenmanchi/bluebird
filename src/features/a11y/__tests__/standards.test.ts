import { describe, it, expect } from 'vitest'
import { DEFAULT_STANDARD, STANDARDS, includes, quickrefUrl, standardLabel, standardOf, understandingUrl } from '../standards'
import { RULES, ruleIn, rulesFor } from '../rules'

describe('standards', () => {
  it('lists every WCAG 2.x version, newest first, with 2.2 as the default', () => {
    expect(STANDARDS.map((s) => s.label)).toEqual(['WCAG 2.2', 'WCAG 2.1', 'WCAG 2.0'])
    expect(DEFAULT_STANDARD).toBe('wcag22')
    expect(standardOf(undefined).id).toBe('wcag22')
    expect(standardLabel('wcag20')).toBe('WCAG 2.0')
  })

  it('treats each version as a superset of the one before', () => {
    expect(includes('wcag22', 'wcag20')).toBe(true)
    expect(includes('wcag21', 'wcag22')).toBe(false)
    expect(includes(undefined, 'wcag22')).toBe(true)
  })

  it('gives each rule the version that introduced it', () => {
    expect(RULES.map((r) => [r.id, r.since])).toEqual([
      ['1.4.3', 'wcag20'], ['1.4.6', 'wcag20'], ['1.4.11', 'wcag21'], ['2.5.8', 'wcag22'], ['2.5.5', 'wcag21'],
    ])
    expect(ruleIn('1.4.11', 'wcag20')).toBe(false)
    expect(ruleIn('2.5.8', 'wcag21')).toBe(false)
    expect(ruleIn('2.5.5', 'wcag21')).toBe(true)
  })

  it('lists only the rules a version has, but keeps a native platform’s own target bar', () => {
    expect(rulesFor('web', 'wcag20').map((r) => r.id)).toEqual(['1.4.3', '1.4.6'])
    expect(rulesFor('web', 'wcag21').map((r) => r.id)).toEqual(['1.4.3', '1.4.6', '1.4.11', '2.5.5'])
    expect(rulesFor('web', 'wcag22').map((r) => r.id)).toEqual(['1.4.3', '1.4.6', '1.4.11', '2.5.8', '2.5.5'])
    // Apple's 44 pt is Apple's rule, not the W3C's, so it stays under 2.0.
    expect(rulesFor('ios', 'wcag20').map((r) => r.name)).toEqual(['1.4.3 Contrast (minimum)', '1.4.6 Contrast (enhanced)', 'iOS target size (Apple HIG)'])
  })

  it('links each version to its own W3C pages, allowing for 2.1’s single target-size page', () => {
    expect(quickrefUrl('wcag20')).toBe('https://www.w3.org/WAI/WCAG20/quickref/')
    expect(quickrefUrl()).toBe('https://www.w3.org/WAI/WCAG22/quickref/')
    expect(understandingUrl('wcag22', 'contrast-minimum')).toBe('https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html')
    expect(understandingUrl('wcag21', 'target-size-enhanced')).toBe('https://www.w3.org/WAI/WCAG21/Understanding/target-size.html')
    expect(understandingUrl('wcag22', 'target-size-enhanced')).toBe('https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html')
  })
})
