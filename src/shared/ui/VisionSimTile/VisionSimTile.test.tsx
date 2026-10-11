import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { VisionSimTile } from './VisionSimTile'

const pair = { a: '#D93025', b: '#1E8E3E', bg: '#FFFFFF' }

describe('VisionSimTile', () => {
  it('paints the pair as seen under the simulation', () => {
    const { container } = render(<VisionSimTile simulation="achromatopsia" colors={pair} />)
    const pills = container.querySelectorAll<HTMLElement>('.bb-vision-sim-tile__pill')
    expect(pills).toHaveLength(2)
    // achromatopsia → grey: equal channels
    const [r, g, b] = pills[0]!.style.background.match(/\d+/g)!.map(Number)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('says "Look alike" when the pair collapses and "Distinct" when it survives', () => {
    const { rerender } = render(<VisionSimTile simulation="deuteranopia" colors={pair} />)
    expect(screen.getByText('Look alike')).toBeInTheDocument()
    rerender(<VisionSimTile simulation="tritanopia" colors={pair} />)
    expect(screen.getByText('Distinct')).toBeInTheDocument()
  })

  it('blurs the sample for low vision and never calls it distinct', () => {
    const { container } = render(<VisionSimTile simulation="low-vision" colors={pair} />)
    expect(container.querySelector('.bb-vision-sim-tile')).toHaveAttribute('data-simulation', 'low-vision')
    expect(screen.getByText('Blurred')).toBeInTheDocument()
  })

  it('names the simulation and its prevalence by default, labels the pills', () => {
    render(<VisionSimTile simulation="protanopia" colors={pair} labels={['Fail', 'Pass']} />)
    expect(screen.getByText('Protanopia')).toBeInTheDocument()
    expect(screen.getByText('Red-blind · ~1% of men')).toBeInTheDocument()
    expect(screen.getByText('Fail')).toBeInTheDocument()
  })

  it('renders nothing it cannot parse rather than a black pill', () => {
    const { container } = render(<VisionSimTile simulation="normal" colors={{ a: 'red', b: '#1E8E3E' }} />)
    expect(container.querySelector('.bb-vision-sim-tile')).toBeNull()
  })
})
