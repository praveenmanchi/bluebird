import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ThinkingStep } from './ThinkingStep'

describe('ThinkingStep', () => {
  it('defaults to Done with the Figma label and the status-good glyph', () => {
    const { container } = render(<ThinkingStep />)
    const root = container.querySelector('.bb-thinking-step')!
    expect(root.getAttribute('data-status')).toBe('done')
    expect(root.getAttribute('aria-busy')).toBeNull()
    expect(screen.getByText('Searched Variables · Brand UI (421)')).toBeInTheDocument()
    expect(root.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-good')
  })
  it('swaps to the retry glyph and marks itself busy while running', () => {
    const { container } = render(<ThinkingStep status="running">Reading bindings</ThinkingStep>)
    const root = container.querySelector('.bb-thinking-step')!
    expect(root.getAttribute('aria-busy')).toBe('true')
    expect(root.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-retry')
    expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
  })
})
