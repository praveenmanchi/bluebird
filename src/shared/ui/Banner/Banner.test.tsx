import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Banner } from './Banner'

describe('Banner', () => {
  it('renders the product name, tagline, brand logos and the Powered By block', () => {
    const { container } = render(<Banner />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Design Studio')).toBeInTheDocument()
    expect(screen.getByText('Connecting Gap between design workflow')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-brand-logo')).toHaveLength(5)
    expect(screen.getByText('Powered By')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'HCLTech' })).toBeInTheDocument()
  })
  it('hides the Powered By block (Figma "HCL Logo" = false) and forces a brand logo', () => {
    const { container } = render(<Banner showPoweredBy={false} brand="fiskars" title="Bluebird" tagline="Design ops" />)
    expect(screen.queryByText('Powered By')).toBeNull()
    expect(container.querySelectorAll('.bb-brand-logo')).toHaveLength(1)
    expect(container.querySelector('.bb-brand-logo')?.getAttribute('data-logo')).toBe('fiskars')
    expect(screen.getByText('Bluebird')).toBeInTheDocument()
  })
})
