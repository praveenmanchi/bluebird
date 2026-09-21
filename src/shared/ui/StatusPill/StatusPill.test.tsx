import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it('renders the Figma "Status" text with the good icon by default', () => {
    render(<StatusPill>Connected</StatusPill>)
    const root = screen.getByRole('status')
    expect(root).toHaveTextContent('Connected')
    expect(root.dataset.status).toBe('good')
    expect(root.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-good')
  })
  it('swaps the leading glyph per status', () => {
    const { rerender } = render(<StatusPill status="issue">x</StatusPill>)
    expect(document.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-issue')
    rerender(<StatusPill status="error">x</StatusPill>)
    expect(document.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-error')
    rerender(<StatusPill status="retry">x</StatusPill>)
    expect(document.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-retry')
  })
  it('falls back to the Figma default text "Value" and spreads attributes', () => {
    render(<StatusPill data-testid="pill" />)
    expect(screen.getByTestId('pill')).toHaveTextContent('Value')
  })
})
