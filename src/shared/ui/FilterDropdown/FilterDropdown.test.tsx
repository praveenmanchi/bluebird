import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { FilterDropdown } from './FilterDropdown'

describe('FilterDropdown', () => {
  it('renders a menu trigger named after the Dropdown Name', () => {
    render(<FilterDropdown>Component</FilterDropdown>)
    const button = screen.getByRole('button', { name: 'Component' })
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.querySelector('[data-icon="chevron-small"]')).not.toBeNull()
  })
  it('shows the component mark by default and hides it with icon=false', () => {
    const { container, rerender } = render(<FilterDropdown>x</FilterDropdown>)
    expect(container.querySelector('[data-icon="component-mark"]')).not.toBeNull()
    rerender(<FilterDropdown icon={false}>x</FilterDropdown>)
    expect(container.querySelector('[data-icon="component-mark"]')).toBeNull()
  })
  it('reflects open and forced hover state', () => {
    render(<FilterDropdown open state="hover">x</FilterDropdown>)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.dataset.open).toBe('true')
    expect(button.dataset.state).toBe('hover')
  })
  it('calls onClick and respects disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<FilterDropdown onClick={onClick}>x</FilterDropdown>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<FilterDropdown onClick={onClick} disabled>x</FilterDropdown>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
