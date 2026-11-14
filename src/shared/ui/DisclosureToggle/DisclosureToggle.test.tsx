import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { DisclosureToggle } from './DisclosureToggle'

describe('DisclosureToggle', () => {
  it('is a collapsed button with the show label and the down-arrow glyph', () => {
    render(<DisclosureToggle />)
    const btn = screen.getByRole('button', { name: 'Show details' })
    expect(btn).toHaveAttribute('type', 'button')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).not.toHaveAttribute('data-expanded')
    expect(btn).not.toHaveAttribute('data-state')
    expect(btn.querySelector('.bb-disclosure-toggle__chevron')).toHaveAttribute('data-icon', 'ui-misc-down-arrow-small')
  })
  it('shows the hide label and marks itself expanded', () => {
    render(<DisclosureToggle expanded />)
    const btn = screen.getByRole('button', { name: 'Hide details' })
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(btn).toHaveAttribute('data-expanded')
  })
  it('reports the flipped value on click and still calls onClick', () => {
    const calls: unknown[] = []
    const { rerender } = render(<DisclosureToggle onToggle={(next) => calls.push(next)} onClick={() => calls.push('click')} />)
    screen.getByRole('button').click()
    rerender(<DisclosureToggle expanded onToggle={(next) => calls.push(next)} />)
    screen.getByRole('button').click()
    expect(calls).toEqual(['click', true, false])
  })
  it('forces the Figma focus state through data-state', () => {
    render(<><DisclosureToggle state="focus" /><DisclosureToggle expanded state="default" /></>)
    expect(screen.getByRole('button', { name: 'Show details' })).toHaveAttribute('data-state', 'focus')
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('data-state', 'default')
  })
  it('takes custom labels and passes attributes through', () => {
    render(<DisclosureToggle showLabel="More" aria-controls="panel" class="extra" />)
    const btn = screen.getByRole('button', { name: 'More' })
    expect(btn).toHaveAttribute('aria-controls', 'panel')
    expect(btn).toHaveClass('bb-disclosure-toggle', 'extra')
  })
})
