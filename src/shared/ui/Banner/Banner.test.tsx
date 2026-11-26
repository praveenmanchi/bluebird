import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Banner } from './Banner'
import { BRANDS } from '../../brand/generated/tokens'

describe('Banner', () => {
  it('renders the product name, tagline, brand logos and the Powered By block', () => {
    const { container } = render(<Banner />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Design Studio')).toBeInTheDocument()
    expect(screen.getByText('Connecting design and development')).toBeInTheDocument()
    // Every brand's logo (CSS reveals the active one) plus the HCL mark, which since 2026-09-23 is
    // a composed <BrandLogo> at half size — Figma replaced the inline vector with an instance.
    expect(container.querySelectorAll('.bb-brand-logo')).toHaveLength(BRANDS.length + 1)
    expect(screen.getByText('Powered By')).toBeInTheDocument()
    const mark = screen.getByRole('img', { name: 'HCLTech' })
    expect(mark).toBeInTheDocument()
    expect(mark.getAttribute('data-logo')).toBe('hcltech')
    expect(mark.getAttribute('data-size')).toBe('sm')
  })
  it('hides the Powered By block (Figma "HCL Logo" = false) and forces a brand logo', () => {
    const { container } = render(<Banner showPoweredBy={false} brand="ibm" title="Bluebird" tagline="Design ops" />)
    expect(screen.queryByText('Powered By')).toBeNull()
    expect(container.querySelectorAll('.bb-brand-logo')).toHaveLength(1)
    expect(container.querySelector('.bb-brand-logo')?.getAttribute('data-logo')).toBe('ibm')
    expect(screen.getByText('Bluebird')).toBeInTheDocument()
  })
})
