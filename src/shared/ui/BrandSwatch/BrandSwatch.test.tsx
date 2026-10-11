import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { BrandSwatch } from './BrandSwatch'

describe('BrandSwatch', () => {
  it('renders the Figma defaults: a Large swatch, "Bridge" and "#0A84FF"', () => {
    const { container } = render(<BrandSwatch />)
    expect(container.querySelector('.bb-color-swatch')?.getAttribute('data-size')).toBe('large')
    expect(screen.getByText('Bridge')).toBeInTheDocument()
    expect(screen.getByText('#0A84FF')).toBeInTheDocument()
  })
  it('puts the brand mode on the swatch only and labels it with the brand name', () => {
    const { container } = render(<BrandSwatch brand="richemont" hex="#004165" />)
    expect(container.querySelector('.bb-color-swatch')?.getAttribute('data-brand')).toBe('richemont')
    expect(container.querySelector('.bb-brand-swatch')?.hasAttribute('data-brand')).toBe(false)
    expect(screen.getByText('Richemont')).toBeInTheDocument()
  })
  it('passes a token colour through and honours a label override', () => {
    const { container } = render(<BrandSwatch brand="ikea" color="var(--bb-surface-accent)" label="IKEA (dark)" />)
    expect((container.querySelector('.bb-color-swatch') as HTMLElement).getAttribute('style')).toContain('var(--bb-surface-accent)')
    expect(screen.getByText('IKEA (dark)')).toBeInTheDocument()
  })
})
