import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { CountBadge } from './CountBadge'

describe('CountBadge', () => {
  it('renders the label and the count box', () => {
    const { container } = render(<CountBadge label="Effected Components" count={52} />)
    expect(screen.getByText('Effected Components')).toBeInTheDocument()
    expect(container.querySelector('.bb-count-badge__count')?.textContent).toBe('52')
  })
  it('shows the count-badge-icon glyph only when icon is set', () => {
    const { container, rerender } = render(<CountBadge label="x" count={1} />)
    expect(container.querySelector('.bb-icon[data-icon="count-badge-icon"]')).toBeNull()
    expect(container.querySelector('.bb-count-badge')).not.toHaveAttribute('data-icon')
    rerender(<CountBadge label="x" count={1} icon />)
    expect(container.querySelector('.bb-icon[data-icon="count-badge-icon"]')).not.toBeNull()
    expect(container.querySelector('.bb-count-badge')).toHaveAttribute('data-icon')
  })
  it('accepts string counts and forwards root attributes', () => {
    const { container } = render(<CountBadge label="Effected Brand" count="ON" title="badge" />)
    expect(container.querySelector('.bb-count-badge__count')?.textContent).toBe('ON')
    expect(container.querySelector('.bb-count-badge')).toHaveAttribute('title', 'badge')
  })
})
