import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { TeamBanner } from './TeamBanner'
import { BUILD_UPDATED_AT, BUILD_VERSION, formatBuildDate } from '../../buildInfo'

describe('TeamBanner', () => {
  it('renders the team credit, the version pill and the default tagline', () => {
    const { container } = render(<TeamBanner org="HCL" team="Design System" version="1.3.3" />)
    expect(screen.getByRole('banner')).toHaveClass('bb-team-banner')
    expect(container.querySelector('.bb-team-banner__credit')?.textContent).toBe('Built with Care by the HCL Design System Team')
    expect(screen.getByText('Version 1.3.3')).toBeInTheDocument()
    expect(container.querySelector('.bb-icon[data-icon="version"]')).not.toBeNull()
    expect(container.querySelector('.bb-team-banner__tagline')?.textContent).toContain('Together, every')
  })
  it('stamps the build version and date under it (Figma "Release" stack)', () => {
    const { container, rerender } = render(<TeamBanner version="2.0.1" updated="28 Oct 2026" />)
    const release = container.querySelector('.bb-team-banner__release')!
    expect(release.querySelector('.bb-team-banner__version-text')?.textContent).toBe('Version 2.0.1')
    expect(release.querySelector('.bb-team-banner__updated')?.textContent).toBe('Updated 28 Oct 2026')
    rerender(<TeamBanner updated={false} />)
    expect(container.querySelector('.bb-team-banner__updated')).toBeNull()
  })
  it('defaults version and date to build-info.json', () => {
    render(<TeamBanner />)
    expect(screen.getByText(`Version ${BUILD_VERSION}`)).toBeInTheDocument()
    expect(screen.getByText(`Updated ${formatBuildDate(BUILD_UPDATED_AT)}`)).toBeInTheDocument()
  })
  it('defaults the credit to the Figma copy (text node 264:10144)', () => {
    const { container } = render(<TeamBanner />)
    expect(container.querySelector('.bb-team-banner__credit')?.textContent).toBe('Built with Care by the HCL Design System Team')
  })
  it('sets "Care" and "<org> <team> Team" bold like the Figma text runs', () => {
    const { container } = render(<TeamBanner org="Acme" team="Platform" />)
    const bold = [...container.querySelectorAll('.bb-team-banner__credit strong')].map((b) => b.textContent)
    expect(bold).toEqual(['Care', 'Acme Platform Team'])
    expect(container.querySelector('.bb-team-banner__credit')?.textContent).toBe('Built with Care by the Acme Platform Team')
  })
  it('defaults the tagline to the Figma copy verbatim (text node 204:7255)', () => {
    const { container } = render(<TeamBanner />)
    expect(container.querySelector('.bb-team-banner__tagline')?.textContent).toBe('Together, every\nstep forward to Innovate’ & scale')
  })
  it('renders the team mark through BrandLogo so it follows the active brand', () => {
    const { container } = render(<TeamBanner />)
    expect(container.querySelector('.bb-team-banner__mark .bb-brand-logo[data-logo="bridge"]')).not.toBeNull()
    // BrandLogo renders one mark per brand and lets [data-brand] CSS reveal the active one.
    expect(screen.getAllByRole('img', { name: 'Team mark' }).length).toBeGreaterThan(0)
  })
  it('renders the Design Studio lockup after the brand logo (Figma Frame 1430102692)', () => {
    const { container } = render(<TeamBanner />)
    const brand = container.querySelector('.bb-team-banner__brand')!
    expect([...brand.children].map((c) => c.className)).toEqual(['bb-team-banner__mark', 'bb-team-banner__product'])
    expect(container.querySelector('.bb-team-banner__rule')).not.toBeNull()
    expect(container.querySelector('.bb-team-banner__product-name')?.textContent).toBe('Design Studio')
    expect(container.querySelector('.bb-team-banner__product-tagline')?.textContent).toBe('Connecting Gap between design workflow')
  })
  it('takes custom product copy and hides the lockup with showProduct', () => {
    const { container, rerender } = render(<TeamBanner product="Studio X" productTagline="Tagline" />)
    expect(container.querySelector('.bb-team-banner__product-name')?.textContent).toBe('Studio X')
    expect(container.querySelector('.bb-team-banner__product-tagline')?.textContent).toBe('Tagline')
    rerender(<TeamBanner showProduct={false} />)
    expect(container.querySelector('.bb-team-banner__product')).toBeNull()
    expect(container.querySelector('.bb-team-banner__mark .bb-brand-logo')).not.toBeNull()
  })
  it('lets children replace the tagline and forwards root attributes', () => {
    const { container } = render(<TeamBanner title="hdr"><b>Slot</b></TeamBanner>)
    expect(container.querySelector('.bb-team-banner__tagline')?.textContent).toBe('Slot')
    expect(container.querySelector('.bb-team-banner')).toHaveAttribute('title', 'hdr')
  })
  it('defaults the tagline to the component size and takes the Settings override', () => {
    const { container, rerender } = render(<TeamBanner />)
    expect(container.querySelector('.bb-team-banner')?.getAttribute('data-tagline')).toBe('md')
    rerender(<TeamBanner taglineSize="auto" />)
    expect(container.querySelector('.bb-team-banner')?.getAttribute('data-tagline')).toBe('auto')
  })
})
