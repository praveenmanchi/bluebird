import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ChangeRow, CHANGE_BADGE } from './ChangeRow'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-change-row')!
const badge = (c: Element) => c.querySelector<HTMLElement>('.bb-meta-badge')!

describe('ChangeRow', () => {
  it('defaults to Kind=Color, State=Default with the Figma copy, a checked Include and a Modified badge', () => {
    const { container } = render(<ChangeRow />)
    expect(root(container).getAttribute('data-kind')).toBe('color')
    expect(root(container).getAttribute('data-state')).toBe('default')
    expect(screen.getByText('button/bg/primary')).toBeInTheDocument()
    expect(screen.getByText('#0C8CE9 → #0560A3 · 3 of 5 brands')).toBeInTheDocument()
    const include = screen.getByRole('checkbox', { name: 'Include button/bg/primary' }) as HTMLInputElement
    expect(include.checked).toBe(true)
    expect(badge(container).textContent).toBe('Modified')
    expect(badge(container).getAttribute('data-tone')).toBe('accent')
    const swatch = container.querySelector<HTMLElement>('.bb-change-row__preview--swatch')!
    expect(swatch.style.getPropertyValue('--change-row-swatch')).toBe('#0560A3')
    expect(container.querySelector('[data-icon]')).toBeNull()
  })
  it('shows the Tab Icons glyph box for Kind=Number and Kind=Component', () => {
    const { container, rerender } = render(<ChangeRow kind="number" />)
    expect(container.querySelector('.bb-change-row__preview--swatch')).toBeNull()
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('variables')
    rerender(<ChangeRow kind="component" />)
    expect(root(container).getAttribute('data-kind')).toBe('component')
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('component')
  })
  it('marks State=Selected', () => {
    const { container } = render(<ChangeRow state="selected" />)
    expect(root(container).getAttribute('data-state')).toBe('selected')
  })
  it('maps every change kind to its badge label and tone', () => {
    for (const [change, { label, tone }] of Object.entries(CHANGE_BADGE)) {
      const { container, unmount } = render(<ChangeRow change={change as keyof typeof CHANGE_BADGE} />)
      expect(badge(container).textContent).toBe(label)
      expect(badge(container).getAttribute('data-tone')).toBe(tone)
      unmount()
    }
    expect(CHANGE_BADGE.added.tone).toBe('success')
    expect(CHANGE_BADGE.removed.tone).toBe('danger')
    expect(CHANGE_BADGE.deprecated.tone).toBe('warning')
  })
  it('toggles Include on its own and reports the change', () => {
    const calls: boolean[] = []
    const { container } = render(<ChangeRow onIncludedChange={(next) => calls.push(next)} />)
    const include = screen.getByRole('checkbox') as HTMLInputElement
    fireEvent.click(include)
    expect(calls).toEqual([false])
    expect(include.checked).toBe(false)
    expect(root(container).getAttribute('data-included')).toBe('false')
    fireEvent.click(include)
    expect(calls).toEqual([false, true])
  })
  it('follows a controlled `included`', () => {
    const calls: boolean[] = []
    const { rerender } = render(<ChangeRow included={false} onIncludedChange={(next) => calls.push(next)} />)
    const include = screen.getByRole('checkbox') as HTMLInputElement
    expect(include.checked).toBe(false)
    fireEvent.click(include)
    expect(calls).toEqual([true])
    rerender(<ChangeRow included onIncludedChange={(next) => calls.push(next)} />)
    expect(include.checked).toBe(true)
  })
  it('renders custom copy, swatch and a trailing slot, and passes div attributes', () => {
    const { container } = render(
      <ChangeRow name="space/gutter" detail="12 → 16" swatch="#123456" trailing={<button type="button">More</button>} data-testid="row" />,
    )
    expect(screen.getByRole('checkbox', { name: 'Include space/gutter' })).toBeInTheDocument()
    expect(screen.getByText('12 → 16')).toBeInTheDocument()
    expect(container.querySelector<HTMLElement>('.bb-change-row__preview--swatch')!.style.getPropertyValue('--change-row-swatch')).toBe('#123456')
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
    expect(screen.getByTestId('row')).toBe(root(container))
  })
})
