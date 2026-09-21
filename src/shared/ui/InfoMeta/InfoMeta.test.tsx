import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { InfoMeta } from './InfoMeta'

describe('InfoMeta', () => {
  it('renders every segment with the info-component glyph', () => {
    const { container } = render(<InfoMeta items={['20m', 'V2.11.0']} />)
    expect(screen.getByText('20m')).toBeInTheDocument()
    expect(screen.getByText('V2.11.0')).toBeInTheDocument()
    expect(container.querySelector('.bb-icon[data-icon="info-component"]')).not.toBeNull()
  })
  it('puts a hidden "|" divider between segments only', () => {
    const { container } = render(<InfoMeta items={['a', 'b', 'c']} />)
    const dividers = container.querySelectorAll('.bb-info-meta__divider')
    expect(dividers).toHaveLength(2)
    expect(dividers[0]).toHaveAttribute('aria-hidden', 'true')
  })
  it('swaps the glyph and forwards root attributes', () => {
    const { container } = render(<InfoMeta items={['x']} icon="version" title="meta" />)
    expect(container.querySelector('.bb-icon[data-icon="version"]')).not.toBeNull()
    expect(container.querySelector('.bb-info-meta')).toHaveAttribute('title', 'meta')
  })
})
