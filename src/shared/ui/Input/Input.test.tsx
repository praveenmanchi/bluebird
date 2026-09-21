import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Input } from './Input'

describe('Input', () => {
  it('is a labelled native text input with the leading icon', () => {
    const { container } = render(<Input label="Repository" icon="variables" value="" />)
    const input = screen.getByRole('textbox', { name: 'Repository' })
    expect(input.getAttribute('type')).toBe('text')
    expect(container.querySelector('[data-icon="variables"]')).not.toBeNull()
  })
  it('masks the value as a password and the eye toggle reveals it', () => {
    const { container } = render(<Input label="Token" password value="secret" />)
    const control = container.querySelector('.bb-input__control') as HTMLInputElement
    expect(control.type).toBe('password')
    expect(container.querySelector('[data-icon="eye-open"]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show value' }))
    expect(control.type).toBe('text')
    expect(container.querySelector('[data-icon="eye-close"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Hide value' }).getAttribute('aria-pressed')).toBe('true')
  })
  it('renders helper text and links it with aria-describedby', () => {
    render(<Input label="File" value="" helperText="Write the file name." />)
    const input = screen.getByRole('textbox')
    const helper = screen.getByText('Write the file name.')
    expect(helper.className).toContain('bb-input__helper')
    expect(input.getAttribute('aria-describedby')).toBe(helper.id)
  })
  it('reports value changes and exposes error / disabled states', () => {
    const onValueChange = vi.fn()
    const { container, rerender } = render(<Input label="Name" value="" onValueChange={onValueChange} error />)
    fireEvent.input(screen.getByRole('textbox'), { target: { value: 'abc' } })
    expect(onValueChange).toHaveBeenCalledWith('abc')
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true')
    expect(container.querySelector('.bb-input')?.hasAttribute('data-error')).toBe(true)
    rerender(<Input label="Name" value="" disabled password />)
    expect(container.querySelector('.bb-input__control')).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
    expect(container.querySelector('.bb-input')?.hasAttribute('data-disabled')).toBe(true)
  })
})
