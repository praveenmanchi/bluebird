import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ProgressBar, clampPercent } from './ProgressBar'

const fill = (el: HTMLElement) => el.querySelector<HTMLElement>('.bb-progress-bar__fill')!

describe('ProgressBar', () => {
  it('defaults to the Figma default variant (Tone=Success, Value=92)', () => {
    render(<ProgressBar aria-label="Readiness" />)
    const bar = screen.getByRole('progressbar', { name: 'Readiness' })
    expect(bar.getAttribute('data-tone')).toBe('success')
    expect(bar.getAttribute('aria-valuenow')).toBe('92')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(fill(bar).style.width).toBe('92%')
  })
  it('maps tone to data-tone', () => {
    const { rerender } = render(<ProgressBar tone="warning" value={70} />)
    expect(screen.getByRole('progressbar').getAttribute('data-tone')).toBe('warning')
    rerender(<ProgressBar tone="danger" value={58} />)
    expect(screen.getByRole('progressbar').getAttribute('data-tone')).toBe('danger')
  })
  it('sizes the fill from value and clamps out-of-range input', () => {
    const { rerender } = render(<ProgressBar value={25} />)
    expect(fill(screen.getByRole('progressbar')).style.width).toBe('25%')
    rerender(<ProgressBar value={140} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
    expect(fill(screen.getByRole('progressbar')).style.width).toBe('100%')
    rerender(<ProgressBar value={-5} />)
    expect(fill(screen.getByRole('progressbar')).style.width).toBe('0%')
  })
  it('clampPercent treats non-finite input as 0', () => {
    expect(clampPercent(Number.NaN)).toBe(0)
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0)
    expect(clampPercent(64.44)).toBe(64.4)
  })
})
