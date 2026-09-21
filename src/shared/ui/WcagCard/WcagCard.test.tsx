import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { WcagCard } from './WcagCard'

describe('WcagCard', () => {
  it('renders the criterion code, title and description in an <article>', () => {
    render(<WcagCard code="1.4.3" title="Contrast (Minimum)" description="Body text needs 4.5:1." />)
    expect(screen.getByRole('article')).toHaveClass('bb-wcag-card')
    expect(screen.getByText('1.4.3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contrast (Minimum)' })).toBeInTheDocument()
    expect(screen.getByText('Body text needs 4.5:1.')).toBeInTheDocument()
  })
  it('composes Rating and PrincipleTag and exposes them through data attributes', () => {
    const { container } = render(<WcagCard code="2.1.1" title="Keyboard" rating="AA" principle="operable" />)
    expect(container.querySelector('.bb-wcag-card')?.getAttribute('data-rating')).toBe('AA')
    expect(container.querySelector('.bb-rating')?.getAttribute('data-rating')).toBe('AA')
    expect(container.querySelector('.bb-principle-tag')?.getAttribute('data-principle')).toBe('operable')
  })
  it('shows one DisabilityIndicator per Figma boolean, defaulting to all four', () => {
    const { container, rerender } = render(<WcagCard code="x" title="y" />)
    expect(container.querySelectorAll('.bb-disability-indicator')).toHaveLength(4)
    rerender(<WcagCard code="x" title="y" disabilities={['visual']} />)
    expect(container.querySelectorAll('.bb-disability-indicator')).toHaveLength(1)
    expect(container.querySelector('.bb-disability-indicator')?.getAttribute('data-kind')).toBe('visual')
  })
  it('renders the detail rows, colour swatches and ThemeChips when given', () => {
    const { container } = render(
      <WcagCard code="x" title="y" node="Label (TEXT)" colors={{ fg: '#8fb7e8', bg: '#0c8ce9' }} whyItFails="Too light." howToFix="Darken it." themes={['forms', 'keyboard']} link={{ label: 'Understanding', href: 'https://w3.org' }} />,
    )
    expect(screen.getByText('Label (TEXT)')).toBeInTheDocument()
    expect(screen.getByText('#8FB7E8')).toBeInTheDocument()
    expect(screen.getByText('#0C8CE9')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-wcag-card__swatch')).toHaveLength(2)
    expect(screen.getByText('Too light.')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-theme-chip')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Understanding' })).toHaveAttribute('href', 'https://w3.org')
  })
  it('paints the placeholder preview until a preview is supplied', () => {
    const { container, rerender } = render(<WcagCard code="x" title="y" />)
    expect(container.querySelector('.bb-wcag-card__preview')?.hasAttribute('data-placeholder')).toBe(true)
    rerender(<WcagCard code="x" title="y" preview={<img alt="shot" />} />)
    expect(container.querySelector('.bb-wcag-card__preview')?.hasAttribute('data-placeholder')).toBe(false)
    expect(screen.getByRole('img', { name: 'shot' })).toBeInTheDocument()
  })
})
