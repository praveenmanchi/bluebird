import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { VariableCard } from './VariableCard'

describe('VariableCard', () => {
  it('renders the name, meta and timestamp with the Variables glyph by default', () => {
    const { container } = render(<VariableCard name="Color/Border/Black" meta="Used by 52 components" updated="12 Days ago" />)
    expect(screen.getByText('Color/Border/Black')).toHaveClass('bb-variable-card__name')
    expect(screen.getByText('Used by 52 components')).toHaveClass('bb-variable-card__meta')
    expect(screen.getByText('12 Days ago')).toHaveClass('bb-variable-card__updated')
    expect(container.querySelector('.bb-variable-card')?.getAttribute('data-kind')).toBe('variable')
    expect(container.querySelector('.bb-variable-card__glyph[data-icon="variables"]')).not.toBeNull()
  })
  it('switches to the text glyph for kind="text-style"', () => {
    const { container } = render(<VariableCard kind="text-style" name="Heading/H2" />)
    expect(container.querySelector('.bb-variable-card')?.getAttribute('data-kind')).toBe('text-style')
    expect(container.querySelector('.bb-variable-card__glyph[data-icon="text"]')).not.toBeNull()
  })
  it('composes ChangeStatus with the change count', () => {
    const { container } = render(<VariableCard name="x" changeCount={7} changeStatus="added" />)
    const chip = container.querySelector('.bb-change-status')
    expect(chip?.getAttribute('data-status')).toBe('added')
    expect(chip?.querySelector('.bb-change-status__count')?.textContent).toBe('7')
  })
  it('captions the chip "Usage No." (the Figma text override) unless changeLabel says otherwise', () => {
    const { container, rerender } = render(<VariableCard name="x" />)
    expect(container.querySelector('.bb-change-status__label')?.textContent).toBe('Usage No.')
    rerender(<VariableCard name="x" changeStatus="added" changeLabel="Added" />)
    expect(container.querySelector('.bb-change-status__label')?.textContent).toBe('Added')
  })
  it('fires onToggle with the next state and flips the chevron when expanded', () => {
    const onToggle = vi.fn()
    const { container, rerender } = render(<VariableCard name="x" onToggle={onToggle} />)
    const toggle = screen.getByRole('button', { name: 'Expand' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalledWith(true)
    rerender(<VariableCard name="x" expanded onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('.bb-icon[data-icon="dropdown-up"]')).not.toBeNull()
    expect(container.querySelector('.bb-variable-card')?.hasAttribute('data-expanded')).toBe(true)
  })
  it('fires onInspect from the research action', () => {
    const onInspect = vi.fn()
    render(<VariableCard name="x" onInspect={onInspect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }))
    expect(onInspect).toHaveBeenCalledTimes(1)
  })
})
