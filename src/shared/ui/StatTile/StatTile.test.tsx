import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { StatTile } from './StatTile'

describe('StatTile', () => {
  it('renders the value, the label and the Variables glyph by default', () => {
    const { container } = render(<StatTile value={68} label="Variables" />)
    expect(container.querySelector('.bb-stat-tile__value')?.textContent).toBe('68')
    expect(screen.getByText('Variables')).toBeInTheDocument()
    expect(container.querySelector('.bb-icon[data-icon="variables"]')).not.toBeNull()
  })
  it('swaps the Tab Icon instance through icon', () => {
    const { container } = render(<StatTile value="1k" label="Colors" icon="colors" />)
    expect(container.querySelector('.bb-icon[data-icon="colors"]')).not.toBeNull()
    expect(container.querySelector('.bb-stat-tile__value')?.textContent).toBe('1k')
  })
  it('forwards root attributes', () => {
    const { container } = render(<StatTile value={0} label="x" title="tile" />)
    expect(container.querySelector('.bb-stat-tile')).toHaveAttribute('title', 'tile')
  })
})
