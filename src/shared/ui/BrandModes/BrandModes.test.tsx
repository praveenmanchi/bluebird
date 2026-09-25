import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { BrandModes } from './BrandModes'

const MODES = [
  { brand: 'Bridge', pass: false, ratio: '2.4:1', current: true },
  { brand: 'Ikea', pass: true, ratio: '7.1:1' },
]

describe('BrandModes', () => {
  it('renders one chip per brand mode with its verdict', () => {
    const { container } = render(<BrandModes modes={MODES} />)
    const chips = container.querySelectorAll('.bb-brand-mode-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0]?.getAttribute('data-current')).toBe('true')
    expect(chips[0]?.getAttribute('data-pass')).toBeNull()
    expect(chips[1]?.getAttribute('data-pass')).toBe('true')
  })
  it('titles each chip so the verdict survives a screen reader', () => {
    const { container } = render(<BrandModes modes={MODES} />)
    expect(container.querySelector('.bb-brand-mode-chip')?.getAttribute('title')).toBe('Bridge: fails (2.4:1)')
  })
  it('takes a label override', () => {
    render(<BrandModes modes={MODES} label="All brands" />)
    expect(screen.getByText('All brands')).toBeInTheDocument()
  })
})
