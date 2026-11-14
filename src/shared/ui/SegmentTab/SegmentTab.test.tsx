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
  it('renders the icon only when given and marks text-only tabs (Show icon = false)', () => {
    const { container, rerender } = render(<SegmentTab>x</SegmentTab>)
    expect(container.querySelector('.bb-segment-tab__icon')).toBeNull()
    expect(screen.getByRole('tab').classList.contains('bb-segment-tab--text-only')).toBe(true)
    rerender(<SegmentTab icon="ui-variable-text">x</SegmentTab>)
    expect(container.querySelector('[data-icon="ui-variable-text"]')).not.toBeNull()
    expect(screen.getByRole('tab').classList.contains('bb-segment-tab--text-only')).toBe(false)
  })
  it('exposes a forced focus state for the Figma State=Focus variant', () => {
    render(<SegmentTab state="focus">x</SegmentTab>)
    expect(screen.getByRole('tab').dataset.state).toBe('focus')
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
