import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ReadinessMeter } from './ReadinessMeter'

describe('ReadinessMeter', () => {
  it('defaults to Tone=Success with the Figma copy and a named progressbar', () => {
    const { container } = render(<ReadinessMeter />)
    expect(container.querySelector('.bb-readiness-meter')?.getAttribute('data-tone')).toBe('success')
    expect(screen.getByText('Handoff readiness')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('Ready to generate · 2 warnings won’t block the push')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Handoff readiness' })
    expect(bar.getAttribute('aria-valuenow')).toBe('92')
    expect(bar.getAttribute('data-tone')).toBe('success')
  })
  it('passes tone to the bar and uses each variant\'s score and caption', () => {
    const { rerender } = render(<ReadinessMeter tone="warning" />)
    expect(screen.getByRole('progressbar').getAttribute('data-tone')).toBe('warning')
    expect(screen.getByText('74%')).toBeInTheDocument()
    expect(screen.getByText('Generate allowed · fix warnings before pushing')).toBeInTheDocument()
    rerender(<ReadinessMeter tone="danger" />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('58')
    expect(screen.getByText('Push locked · 3 checks are failing')).toBeInTheDocument()
  })
  it('drives bar and score from value, with overrides for the text layers', () => {
    render(<ReadinessMeter value={130} label="Readiness" caption="All clear" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Readiness' }).getAttribute('aria-valuenow')).toBe('100')
    expect(screen.getByText('All clear')).toBeInTheDocument()
  })
  it('renders a custom score node', () => {
    render(<ReadinessMeter value={40} score="4 / 10" />)
    expect(screen.getByText('4 / 10')).toBeInTheDocument()
  })
})
