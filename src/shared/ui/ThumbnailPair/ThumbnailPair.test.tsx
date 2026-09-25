import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ThumbnailPair } from './ThumbnailPair'

const before = { src: 'before.png', alt: 'current' }
const after = { src: 'after.png', alt: 'fixed' }

describe('ThumbnailPair', () => {
  it('renders nothing when neither shot is supplied', () => {
    const { container } = render(<ThumbnailPair />)
    expect(container.querySelector('.bb-thumbnail-pair')).toBeNull()
  })
  it('captions a lone shot "Before" and does not claim to be a pair', () => {
    const { container } = render(<ThumbnailPair before={before} />)
    expect(container.querySelector('.bb-thumbnail-pair')?.getAttribute('data-pair')).toBeNull()
    expect(screen.getByText('Before')).toBeInTheDocument()
  })
  it('marks two shots as a pair and captions them Before / After', () => {
    const { container } = render(<ThumbnailPair before={before} after={after} />)
    expect(container.querySelector('.bb-thumbnail-pair')?.getAttribute('data-pair')).toBe('true')
    expect(screen.getByText('After')).toBeInTheDocument()
  })
})
