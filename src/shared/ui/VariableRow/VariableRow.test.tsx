import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { VariableRow } from './VariableRow'

describe('VariableRow', () => {
  it('defaults to Kind=Color, State=Default with the Figma texts and a Small swatch', () => {
    const { container } = render(<VariableRow />)
    const row = container.querySelector('.bb-variable-row')!
    expect(row.getAttribute('data-kind')).toBe('color')
    expect(row.getAttribute('data-state')).toBe('default')
    expect(container.querySelector('.bb-color-swatch')?.getAttribute('data-size')).toBe('small')
    expect(screen.getByText('jira/row/bg/selected')).toBeInTheDocument()
    expect(screen.getByText('Fill · root · #0B3A6E')).toBeInTheDocument()
    expect(screen.getByText('surface/accent-subtle')).toBeInTheDocument()
  })
  it('maps Kind=Number to the value tile and its default Swap value', () => {
    const { container } = render(<VariableRow kind="number" state="changed" />)
    const row = container.querySelector('.bb-variable-row')!
    expect(row.getAttribute('data-kind')).toBe('number')
    expect(row.getAttribute('data-state')).toBe('changed')
    expect(container.querySelector('.bb-color-swatch')).toBeNull()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('space/inset-lg-alt')).toBeInTheDocument()
  })
  it('swaps through the shared Dropdown: open, pick, onChange, close', () => {
    const picked: string[] = []
    const { container } = render(<VariableRow options={['surface/accent', 'surface/accent-subtle']} onChange={(v) => picked.push(v)} />)
    const swap = screen.getByRole('button', { name: 'Swap jira/row/bg/selected' })
    expect(container.querySelector('.bb-dropdown')).toBe(swap)
    expect(swap.getAttribute('aria-haspopup')).toBe('listbox')
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(swap)
    expect(swap.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('option', { name: 'surface/accent-subtle' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('option', { name: 'surface/accent' }))
    expect(picked).toEqual(['surface/accent'])
    expect(screen.queryByRole('listbox')).toBeNull()
  })
  it('keeps the trigger closed when there is nothing to swap to, and closes on Escape', () => {
    const { rerender } = render(<VariableRow />)
    const swap = screen.getByRole('button')
    fireEvent.click(swap)
    expect(swap.getAttribute('aria-expanded')).toBe('false')
    rerender(<VariableRow options={['a']} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })
  it('does not claim the menu is open in State=Changed', () => {
    render(<VariableRow state="changed" />)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })
})
