import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/preact'
import { BrandLogo } from './BrandLogo'

describe('BrandLogo', () => {
  it('renders every brand logo so [data-brand] can reveal the active one', () => {
    const { container } = render(<BrandLogo />)
    const logos = [...container.querySelectorAll('svg[data-logo]')].map((n) => n.getAttribute('data-logo'))
    expect(logos).toEqual(['bridge', 'ikea', 'richemont', 'disney', 'fiskars'])
    expect(container.querySelector('[data-forced]')).toBeNull()
  })
  it('renders a single forced logo when brand is given', () => {
    const { container } = render(<BrandLogo brand="ikea" title="IKEA" />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0]!.getAttribute('data-logo')).toBe('ikea')
    expect(svgs[0]!.hasAttribute('data-forced')).toBe(true)
    expect(svgs[0]!.getAttribute('role')).toBe('img')
    expect(svgs[0]!.innerHTML).toContain('<title>IKEA</title>')
  })
})
