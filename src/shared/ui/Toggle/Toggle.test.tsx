import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('renders a switch named by the title and described by the description', () => {
    render(<Toggle title="Sync" description="Compare before PR" checked />)
    const sw = screen.getByRole('switch', { name: 'Sync' })
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(sw).toHaveAccessibleDescription('Compare before PR')
  })
  it('mirrors checked on the root data attribute', () => {
    const { container, rerender } = render(<Toggle label="x" checked={false} />)
    expect(container.querySelector<HTMLElement>('.bb-toggle')?.dataset.checked).toBe('false')
    rerender(<Toggle label="x" checked />)
    expect(container.querySelector<HTMLElement>('.bb-toggle')?.dataset.checked).toBe('true')
  })
  it('calls onChange with the next value', () => {
    const onChange = vi.fn()
    render(<Toggle label="Enable" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Enable' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it('keeps the switch visible when unchecked (Status is not the Figma "Toggle" boolean)', () => {
    render(<Toggle title="Sync" description="Compare before PR" checked={false} />)
    expect(screen.getByRole('switch', { name: 'Sync' }).getAttribute('aria-checked')).toBe('false')
  })
  it('hides the switch for Figma Toggle=false, leaving a text-only title and description', () => {
    const { container } = render(<Toggle title="Sync" description="Compare before PR" showSwitch={false} />)
    expect(screen.queryByRole('switch')).toBeNull()
    expect(container.querySelector('.bb-toggle__title')?.textContent).toBe('Sync')
    expect(container.querySelector('.bb-toggle__description')?.textContent).toBe('Compare before PR')
  })
  it('does not fire when disabled', () => {
    const onChange = vi.fn()
    const { container } = render(<Toggle label="Enable" checked disabled onChange={onChange} />)
    const sw = screen.getByRole('switch')
    expect(sw).toBeDisabled()
    fireEvent.click(sw)
    expect(onChange).not.toHaveBeenCalled()
    expect(container.querySelector('.bb-toggle')?.hasAttribute('data-disabled')).toBe(true)
  })
})
