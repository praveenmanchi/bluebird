import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ColorSwatch } from './ColorSwatch'

describe('ColorSwatch', () => {
  it('defaults to Size=Small, decorative, with the Figma default fill from CSS', () => {
    const { container } = render(<ColorSwatch />)
    const swatch = container.querySelector('.bb-color-swatch') as HTMLElement
    expect(swatch.getAttribute('data-size')).toBe('small')
    expect(swatch.getAttribute('aria-hidden')).toBe('true')
    expect(swatch.style.background).toBe('')
  })
  it('maps Size=Large to data-size', () => {
    const { container } = render(<ColorSwatch size="large" />)
    expect(container.querySelector('.bb-color-swatch')?.getAttribute('data-size')).toBe('large')
  })
  it('paints the colour it is given and keeps other inline styles', () => {
    const { container } = render(<ColorSwatch color="rgb(12, 140, 233)" style={{ marginLeft: '0' }} />)
    const swatch = container.querySelector('.bb-color-swatch') as HTMLElement
    expect(swatch.style.background).toContain('rgb(12, 140, 233)')
    expect(swatch.style.marginLeft).toBe('0px')
  })
  it('exposes an image role when labelled', () => {
    render(<ColorSwatch color="#0C8CE9" label="surface/accent" />)
    expect(screen.getByRole('img', { name: 'surface/accent' })).toBeInTheDocument()
  })
})
