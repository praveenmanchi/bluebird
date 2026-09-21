import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = ['One', 'Two', 'Three', 'Four']

describe('SegmentedControl', () => {
  it('renders a tablist with one SegmentTab per option and marks the value selected', () => {
    render(<SegmentedControl options={OPTIONS} value="Two" />)
    const list = screen.getByRole('tablist')
    expect(list.dataset.level).toBe('4')
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false'])
  })
  it('calls onChange with the clicked option, not with the current one', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="One" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Three' }))
    expect(onChange).toHaveBeenCalledWith('Three')
    fireEvent.click(screen.getByRole('tab', { name: 'One' }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
  it('moves the selection with arrow keys and wraps around', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="Four" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('One')
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('Three')
  })
  it('renders two segments for the 2 level variant and disables all of them', () => {
    render(<SegmentedControl options={['A', 'B']} value="A" disabled />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    tabs.forEach((t) => expect(t).toBeDisabled())
  })
})
