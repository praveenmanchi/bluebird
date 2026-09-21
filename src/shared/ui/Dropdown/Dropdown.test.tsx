import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Dropdown } from './Dropdown'

describe('Dropdown', () => {
  it('is a listbox trigger showing the value and a down chevron when closed', () => {
    const { container } = render(<Dropdown value="All Pages" />)
    const button = screen.getByRole('button', { name: 'All Pages' })
    expect(button.getAttribute('aria-haspopup')).toBe('listbox')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('[data-icon="dropdown-down"]')).not.toBeNull()
  })
  it('flips the chevron when open and toggles through onOpenChange', () => {
    const onToggle = vi.fn()
    const { container } = render(<Dropdown value="x" open onOpenChange={onToggle} />)
    expect(container.querySelector('[data-icon="dropdown-up"]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith(false)
  })
  it('shows the placeholder when there is no value and disables cleanly', () => {
    render(<Dropdown placeholder="Pick one" disabled />)
    expect(screen.getByText('Pick one').hasAttribute('data-placeholder')).toBe(true)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('carries the Figma Type as data-mode', () => {
    render(<Dropdown mode="multi" value="3 selected" />)
    expect(screen.getByRole('button').dataset.mode).toBe('multi')
  })
})
