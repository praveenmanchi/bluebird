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
    expect(container.querySelectorAll('.bb-wcag-card__indicator')).toHaveLength(4)
    rerender(<WcagCard code="x" title="y" disabilities={['visual']} />)
    expect(container.querySelectorAll('.bb-wcag-card__indicator')).toHaveLength(1)
    expect(container.querySelector('.bb-wcag-card__indicator')?.getAttribute('data-kind')).toBe('visual')
  })
  it('renders the colour sample and the ratio badge from colors + ratio', () => {
    const { container } = render(<WcagCard code="x" title="y" colors={{ fg: '#8fb7e8', bg: '#0c8ce9' }} ratio={{ value: '2.4:1', requirement: 'needs 4.5:1' }} />)
    expect(container.querySelector('.bb-wcag-card__sample')).toBeInTheDocument()
    expect(screen.getByText('Sample of this exact pair')).toBeInTheDocument()
    expect(container.querySelector('.bb-wcag-card__ratio-mark')?.textContent).toBe('\u2715')
    expect(container.querySelector('.bb-wcag-card__ratio-value')?.textContent).toContain('2.4:1')
  })
  it('renders the "Check With" indicators and fires the footer actions', async () => {
    const calls: string[] = []
    const { container } = render(<WcagCard code="x" title="y" onIgnore={() => calls.push('ignore')} onAnnotate={() => calls.push('annotate')} onSelect={() => calls.push('select')} />)
    expect(container.querySelectorAll('.bb-wcag-card__check')).toHaveLength(3)
    for (const name of ['Ignore', 'Annotation', 'Select in Figma']) screen.getByRole('button', { name }).click()
    expect(calls).toEqual(['ignore', 'annotate', 'select'])
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
  it('renders the placeholder slot only when a preview is supplied', () => {
    const { container, rerender } = render(<WcagCard code="x" title="y" />)
    expect(container.querySelector('.bb-wcag-card__placeholder')).toBeNull()
    rerender(<WcagCard code="x" title="y" preview={<img alt="shot" />} />)
    expect(container.querySelector('.bb-wcag-card__placeholder')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'shot' })).toBeInTheDocument()
  })
})
