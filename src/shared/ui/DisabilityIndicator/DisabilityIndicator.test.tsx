import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { DisabilityIndicator, DISABILITY_KINDS } from './DisabilityIndicator'

describe('DisabilityIndicator', () => {
  it('defaults to the Auditory variant with a labelled glyph', () => {
    const { container } = render(<DisabilityIndicator />)
    const root = container.querySelector('.bb-disability-indicator') as HTMLElement
    expect(root.dataset.kind).toBe('auditory')
    expect(screen.getByRole('img', { name: 'Auditory' }).getAttribute('data-icon')).toBe('disability-auditory')
  })
  it('renders the matching disability-<kind> glyph for every Figma variant', () => {
    for (const kind of DISABILITY_KINDS) {
      const { container, unmount } = render(<DisabilityIndicator kind={kind} />)
      expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe(`disability-${kind}`)
      expect(container.querySelector('.bb-disability-indicator')?.getAttribute('data-kind')).toBe(kind)
      unmount()
    }
  })
  it('accepts a custom accessible label and spreads attributes', () => {
    render(<DisabilityIndicator kind="visual" label="Low vision" data-testid="tile" />)
    expect(screen.getByRole('img', { name: 'Low vision' })).toBeInTheDocument()
    expect(screen.getByTestId('tile')).toHaveClass('bb-disability-indicator')
  })
})
