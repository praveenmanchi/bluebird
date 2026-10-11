import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ColorArtifact } from './ColorArtifact'

describe('ColorArtifact', () => {
  it('renders one brand swatch per brand mode, each resolving in its own brand', () => {
    const { container } = render(<ColorArtifact />)
    const brands = [...container.querySelectorAll('.bb-color-swatch')].map((n) => n.getAttribute('data-brand'))
    expect(brands).toEqual(['bridge', 'ikea', 'richemont', 'disney', 'fiskars'])
    expect(screen.getByText('#FF8E00')).toBeInTheDocument()
    expect((container.querySelector('.bb-color-swatch') as HTMLElement).getAttribute('style')).toContain('var(--bb-surface-accent)')
  })
  it('titles the header with the variable and uses the colors glyph', () => {
    const { container } = render(<ColorArtifact variable="text/primary" />)
    expect(container.querySelector('.bb-artifact-header__title')?.textContent).toBe('text/primary')
    expect(container.querySelector('.bb-artifact-header [data-icon]')?.getAttribute('data-icon')).toBe('colors')
    expect((container.querySelector('.bb-color-swatch') as HTMLElement).getAttribute('style')).toContain('var(--bb-text-primary)')
  })
  it('renders the alias chain as Citation chips separated by arrows', () => {
    const { container } = render(<ColorArtifact />)
    const chips = [...container.querySelectorAll('.bb-context-chip')]
    expect(chips.map((c) => c.getAttribute('data-type'))).toEqual(['citation', 'citation', 'citation'])
    expect(chips.map((c) => c.textContent)).toEqual(['surface/accent', 'bridge/color/primary/400-brand', '#0C8CE9'])
    expect(screen.getAllByText('→')).toHaveLength(2)
  })
  it('renders usage as Meta Badges with their tones', () => {
    const { container } = render(<ColorArtifact usage={[{ label: 'Avatar' }, { label: 'AA', tone: 'success' }]} />)
    const tones = [...container.querySelectorAll('.bb-meta-badge')].map((b) => b.getAttribute('data-tone'))
    expect(tones).toEqual(['accent', 'success'])
  })
  it('fires onOpen from the header link', () => {
    const calls: string[] = []
    render(<ColorArtifact onOpen={() => calls.push('open')} />)
    screen.getByRole('button', { name: 'Open in Figma ↗' }).click()
    expect(calls).toEqual(['open'])
  })
})
