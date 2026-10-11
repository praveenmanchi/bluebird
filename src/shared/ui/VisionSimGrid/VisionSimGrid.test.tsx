import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/preact'
import { VisionSimGrid } from './VisionSimGrid'

describe('VisionSimGrid', () => {
  it('renders all six simulations in the Figma order by default', () => {
    const { container } = render(<VisionSimGrid colors={{ a: '#D93025', b: '#1E8E3E' }} />)
    const kinds = [...container.querySelectorAll('.bb-vision-sim-tile')].map((t) => t.getAttribute('data-simulation'))
    expect(kinds).toEqual(['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'low-vision'])
  })
  it('renders only the simulations it is given', () => {
    const { container } = render(<VisionSimGrid colors={{ a: '#D93025', b: '#1E8E3E' }} simulations={['deuteranopia']} />)
    expect(container.querySelectorAll('.bb-vision-sim-tile')).toHaveLength(1)
  })
})
