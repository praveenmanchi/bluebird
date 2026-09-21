import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SizeExpander } from './SizeExpander'

describe('SizeExpander', () => {
  it('renders three size steps as a labelled radiogroup', () => {
    render(<SizeExpander />)
    expect(screen.getByRole('radiogroup', { name: 'Plugin size' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['S', 'M', 'L'])
  })
  it('marks the active step through aria-checked and data-selected', () => {
    render(<SizeExpander value="L" />)
    const large = screen.getByRole('radio', { name: 'L' })
    expect(large).toHaveAttribute('aria-checked', 'true')
    expect(large).toHaveAttribute('data-selected')
    expect(screen.getByRole('radio', { name: 'S' })).toHaveAttribute('aria-checked', 'false')
  })
  it('calls onChange with the clicked step and ignores the current one', () => {
    const onChange = vi.fn()
    render(<SizeExpander value="M" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'L' }))
    expect(onChange).toHaveBeenCalledWith('L')
    fireEvent.click(screen.getByRole('radio', { name: 'M' }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
  it('disables every step and flags the root when disabled', () => {
    const onChange = vi.fn()
    render(<SizeExpander value="S" disabled onChange={onChange} />)
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled()
    expect(screen.getByRole('radiogroup')).toHaveAttribute('data-disabled')
    fireEvent.click(screen.getByRole('radio', { name: 'L' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
