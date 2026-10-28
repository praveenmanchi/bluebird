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
  it('takes { value, label, icon } options and points every tab at the controlled panel', () => {
    const onChange = vi.fn()
    const { container } = render(
      <SegmentedControl
        options={[{ value: 'all', label: 'All 12', icon: 'ui-general-show-as-list' }, { value: 'variable', label: 'Variables 8' }]}
        value="all"
        controls="panel"
        icons={{ variable: 'ui-variable-color' }}
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('tab', { name: 'All 12' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('tab').every((t) => t.getAttribute('aria-controls') === 'panel')).toBe(true)
    expect(container.querySelector('[data-icon="ui-general-show-as-list"]')).not.toBeNull()
    expect(container.querySelector('[data-icon="ui-variable-color"]')).not.toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Variables 8' }))
    expect(onChange).toHaveBeenCalledWith('variable')
  })
  it('ignores arrow keys while disabled', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="One" disabled onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(onChange).not.toHaveBeenCalled()
  })
  it('renders two segments for the Level=2 variant and disables all of them', () => {
    render(<SegmentedControl options={['A', 'B']} value="A" disabled />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    tabs.forEach((t) => expect(t).toBeDisabled())
  })
})
