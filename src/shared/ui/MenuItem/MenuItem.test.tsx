import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { MenuItem } from './MenuItem'

describe('MenuItem', () => {
  it('is an option with label, count and leading icon in single mode', () => {
    const { container } = render(<MenuItem label="Color" count={12} />)
    const option = screen.getByRole('option', { name: /Color/ })
    expect(option.getAttribute('aria-selected')).toBe('false')
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(container.querySelector('[data-icon="component"]')).not.toBeNull()
  })
  it('embeds a checkbox in multi mode and reports selection via aria-checked', () => {
    const { container } = render(<MenuItem mode="multi" label="Typography" selected />)
    const option = screen.getByRole('option', { name: /Typography/ })
    expect(option.getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('.bb-checkbox[data-checked="true"]')).not.toBeNull()
  })
  it('activates on click, Enter and Space but not when disabled', () => {
    const onSelect = vi.fn()
    const { rerender } = render(<MenuItem label="a" onSelect={onSelect} />)
    const option = screen.getByRole('option')
    fireEvent.click(option)
    fireEvent.keyDown(option, { key: 'Enter' })
    fireEvent.keyDown(option, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(3)
    rerender(<MenuItem label="a" disabled onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('option').getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('option').tabIndex).toBe(-1)
  })
})
