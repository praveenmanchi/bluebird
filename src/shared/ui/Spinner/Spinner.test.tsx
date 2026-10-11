import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('is decorative by default', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.dataset.tone).toBe('on-accent')
    expect(svg.dataset.size).toBe('sm')
  })
  it('exposes a name when labelled', () => {
    render(<Spinner tone="accent" size="lg" label="Waiting" />)
    expect(screen.getByRole('img', { name: 'Waiting' }).dataset.size).toBe('lg')
  })
  it('draws a third-of-a-ring arc (Figma arcData -90° → +30°)', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.bb-spinner__arc')?.getAttribute('stroke-dasharray')).toBe('120 360')
  })
})
