import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('is a labelled native checkbox', () => {
    render(<Checkbox label="Color" />)
    const input = screen.getByRole('checkbox', { name: 'Color' })
    expect(input).not.toBeChecked()
  })
  it('reports Figma Selected through data-checked and aria-checked', () => {
    const { rerender } = render(<Checkbox label="x" checked />)
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByText('x').closest('label')?.dataset.checked).toBe('true')
    rerender(<Checkbox label="x" checked="mixed" />)
    const input = screen.getByRole('checkbox') as HTMLInputElement
    expect(input.getAttribute('aria-checked')).toBe('mixed')
    expect(input.indeterminate).toBe(true)
    expect(document.querySelector('.bb-checkbox__dash')).not.toBeNull()
  })
  it('renders the check mark only when checked', () => {
    const { container, rerender } = render(<Checkbox />)
    expect(container.querySelector('[data-mark="check"]')).toBeNull()
    rerender(<Checkbox checked />)
    expect(container.querySelector('[data-mark="check"]')).not.toBeNull()
  })
  it('exposes a forced focus state for the Figma Focus variants', () => {
    render(<Checkbox label="f" state="focus" />)
    expect(screen.getByText('f').closest('label')?.dataset.state).toBe('focus')
  })
  it('calls onChange with the next value and respects disabled', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Checkbox label="a" onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<Checkbox label="a" disabled onChange={onChange} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByText('a').closest('label')?.hasAttribute('data-disabled')).toBe(true)
  })
})
