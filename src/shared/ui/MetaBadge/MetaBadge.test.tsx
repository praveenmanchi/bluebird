import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { MetaBadge } from './MetaBadge'

describe('MetaBadge', () => {
  it('defaults to the neutral tone and renders its label', () => {
    render(<MetaBadge>Existing</MetaBadge>)
    expect(screen.getByText('Existing').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('neutral')
  })
  it('maps the Figma Tone variant to data-tone', () => {
    const { container } = render(<MetaBadge tone="danger">Critical</MetaBadge>)
    expect(container.querySelector('.bb-meta-badge')?.getAttribute('data-tone')).toBe('danger')
  })
  it('renders the trailing meta only when supplied', () => {
    const { container, rerender } = render(<MetaBadge tone="accent">Regressed</MetaBadge>)
    expect(container.querySelector('.bb-meta-badge__meta')).toBeNull()
    rerender(<MetaBadge tone="accent" meta="passed on 21 Sep">Regressed</MetaBadge>)
    expect(screen.getByText('passed on 21 Sep')).toBeInTheDocument()
  })
})
