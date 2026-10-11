import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Step } from './Step'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-step')!

describe('Step', () => {
  it('defaults to State=Done with the check mark and the Figma label', () => {
    const { container } = render(<Step />)
    expect(root(container).getAttribute('data-state')).toBe('done')
    expect(screen.getByRole('img', { name: 'Done' }).querySelector('svg[data-mark="check"]')).not.toBeNull()
    expect(screen.getByText('Select')).toBeInTheDocument()
    expect(root(container).hasAttribute('aria-current')).toBe(false)
  })
  it('shows the number for Current and marks it aria-current="step"', () => {
    const { container } = render(<Step state="current" number="3" label="Generate" />)
    expect(root(container).getAttribute('data-state')).toBe('current')
    expect(root(container).getAttribute('aria-current')).toBe('step')
    expect(container.querySelector('.bb-step__index')?.textContent).toBe('3')
    expect(screen.getByText('Generate')).toBeInTheDocument()
  })
  it('shows the number for Upcoming without the done glyph', () => {
    const { container } = render(<Step state="upcoming" number="4" label="Ship" />)
    expect(root(container).getAttribute('data-state')).toBe('upcoming')
    expect(container.querySelector('.bb-step__index')?.textContent).toBe('4')
    expect(screen.queryByRole('img')).toBeNull()
  })
})
