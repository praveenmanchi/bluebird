import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SegmentTab } from './SegmentTab'

describe('SegmentTab', () => {
  it('renders an unselected tab named after Select Text', () => {
    render(<SegmentTab>JSON</SegmentTab>)
    const tab = screen.getByRole('tab', { name: 'JSON' })
    expect(tab.getAttribute('aria-selected')).toBe('false')
    expect(tab.hasAttribute('data-selected')).toBe(false)
    expect(tab.tabIndex).toBe(-1)
  })
  it('reflects Selected through aria-selected, data-selected and roving tabindex', () => {
    render(<SegmentTab selected>Label</SegmentTab>)
    const tab = screen.getByRole('tab')
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(tab.dataset.selected).toBe('true')
    expect(tab.tabIndex).toBe(0)
  })
  it('renders the icon only when given', () => {
    const { container, rerender } = render(<SegmentTab>x</SegmentTab>)
    expect(container.querySelector('.bb-segment-tab__icon')).toBeNull()
    rerender(<SegmentTab icon="text">x</SegmentTab>)
    expect(container.querySelector('[data-icon="text"]')).not.toBeNull()
  })
  it('calls onClick and respects disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<SegmentTab onClick={onClick}>x</SegmentTab>)
    fireEvent.click(screen.getByRole('tab'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<SegmentTab onClick={onClick} disabled>x</SegmentTab>)
    expect(screen.getByRole('tab')).toBeDisabled()
  })
})
