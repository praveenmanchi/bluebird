import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ConnectionBadge } from './ConnectionBadge'

describe('ConnectionBadge', () => {
  it('defaults to the retry status with the status-retry glyph', () => {
    render(<ConnectionBadge />)
    const root = screen.getByRole('status')
    expect(root.dataset.status).toBe('retry')
    expect(root.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-retry')
    expect(screen.getByRole('img', { name: 'Connection: retrying' })).toBeInTheDocument()
  })
  it('swaps the glyph per status', () => {
    const { rerender } = render(<ConnectionBadge status="good" />)
    expect(document.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-good')
    rerender(<ConnectionBadge status="error" />)
    expect(document.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-error')
    expect(screen.getByRole('status').dataset.status).toBe('error')
  })
  it('accepts a custom accessible label and spreads attributes', () => {
    render(<ConnectionBadge status="good" label="Figma link healthy" data-testid="badge" />)
    expect(screen.getByRole('img', { name: 'Figma link healthy' })).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveClass('bb-connection-badge')
  })
})
