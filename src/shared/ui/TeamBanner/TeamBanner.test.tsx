import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { TeamBanner } from './TeamBanner'

describe('TeamBanner', () => {
  it('renders the team credit, the version pill and the default tagline', () => {
    const { container } = render(<TeamBanner team="Gap Design System" version="1.3.3" />)
    expect(screen.getByRole('banner')).toHaveClass('bb-team-banner')
    expect(screen.getByText('Built with Care by the Gap Design System Team')).toBeInTheDocument()
    expect(screen.getByText('Version 1.3.3')).toBeInTheDocument()
    expect(container.querySelector('.bb-icon[data-icon="version"]')).not.toBeNull()
    expect(container.querySelector('.bb-team-banner__tagline')?.textContent).toContain('Together, every')
  })
  it('renders the team mark through BrandLogo so it follows the active brand', () => {
    const { container } = render(<TeamBanner />)
    expect(container.querySelector('.bb-team-banner__mark .bb-brand-logo[data-logo="bridge"]')).not.toBeNull()
    // BrandLogo renders one mark per brand and lets [data-brand] CSS reveal the active one.
    expect(screen.getAllByRole('img', { name: 'Team mark' }).length).toBeGreaterThan(0)
  })
  it('toggles the Fabric logo and its hairline with showFabric', () => {
    const { container, rerender } = render(<TeamBanner />)
    expect(screen.getByRole('img', { name: 'Fabric' })).toBeInTheDocument()
    expect(container.querySelector('.bb-team-banner__hairline')).not.toBeNull()
    rerender(<TeamBanner showFabric={false} />)
    expect(screen.queryByRole('img', { name: 'Fabric' })).toBeNull()
    expect(container.querySelector('.bb-team-banner__hairline')).toBeNull()
  })
  it('lets children replace the tagline and forwards root attributes', () => {
    const { container } = render(<TeamBanner title="hdr"><b>Slot</b></TeamBanner>)
    expect(container.querySelector('.bb-team-banner__tagline')?.textContent).toBe('Slot')
    expect(container.querySelector('.bb-team-banner')).toHaveAttribute('title', 'hdr')
  })
})
