import { describe, it, expect } from 'vitest'
import { exemptionFor, EXEMPTION_REASON } from '../exempt'

describe('exemptionFor', () => {
  it('exempts nothing for an ordinary label', () => {
    expect(exemptionFor(['Label', 'Card', 'Page'])).toBeNull()
  })
  it('exempts a disabled control by variant value', () => {
    expect(exemptionFor(['Label'], ['State=Disabled'])).toBe('inactive')
    expect(exemptionFor(['Label'], ['Disabled'])).toBe('inactive')
  })
  it('does not exempt the enabled side of a Disabled property', () => {
    expect(exemptionFor(['Label'], ['Disabled=False'])).toBeNull()
    expect(exemptionFor(['Label'], ['Disabled=false', 'Size=Large'])).toBeNull()
    expect(exemptionFor(['Label'], ['Disabled=True'])).toBe('inactive')
    expect(exemptionFor(['Label'], ['Is disabled=Yes'])).toBe('inactive')
  })
  it('exempts a disabled or inactive ancestor by name', () => {
    expect(exemptionFor(['Label', 'Button / disabled'])).toBe('inactive')
    expect(exemptionFor(['Inactive tab'])).toBe('inactive')
  })
  it('exempts logotypes', () => {
    expect(exemptionFor(['Bridge wordmark'])).toBe('logotype')
    expect(exemptionFor(['Label', 'Logo'])).toBe('logotype')
  })
  it('does NOT exempt placeholder text — it is real text a user must read', () => {
    expect(exemptionFor(['Placeholder', 'Input'])).toBeNull()
  })
  it('does not fire on words that merely contain the keyword', () => {
    expect(exemptionFor(['Disabledness report'])).toBeNull()
    expect(exemptionFor(['Blogosphere'])).toBeNull()
  })
  it('names every exemption it can return', () => {
    expect(Object.keys(EXEMPTION_REASON).sort()).toEqual(['inactive', 'logotype'])
  })
})
