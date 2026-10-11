import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { TypeCompare } from './TypeCompare'

describe('TypeCompare', () => {
  it('renders the sample twice, at the current and the suggested size and line height', () => {
    const { container } = render(
      <TypeCompare current={{ size: 13, lineHeight: 16 }} suggested={{ size: 16, lineHeight: 24 }} sample="Read me" />,
    )
    const samples = container.querySelectorAll<HTMLElement>('.bb-type-compare__sample')
    expect(samples).toHaveLength(2)
    expect(samples[0]!.style.fontSize).toBe('13px')
    expect(samples[0]!.style.lineHeight).toBe('16px')
    expect(samples[1]!.style.fontSize).toBe('16px')
    expect(samples[1]!.style.lineHeight).toBe('24px')
    expect(screen.getAllByText('Read me')).toHaveLength(2)
  })

  it('writes the spec line from the numbers, ratio to two decimals', () => {
    render(<TypeCompare current={{ size: 13, lineHeight: 16 }} suggested={{ size: 16, lineHeight: 24 }} />)
    expect(screen.getByText('13px / 16px · 1.23')).toBeInTheDocument()
    expect(screen.getByText('16px / 24px · 1.5')).toBeInTheDocument()
  })

  it('lets a caller override the spec text and badge labels', () => {
    render(
      <TypeCompare
        current={{ size: 13, lineHeight: 16, spec: 'Body S' }}
        suggested={{ size: 16, lineHeight: 24, spec: 'Body M' }}
        currentLabel="Now"
        suggestedLabel="Use"
      />,
    )
    expect(screen.getByText('Body S')).toBeInTheDocument()
    expect(screen.getByText('Use')).toBeInTheDocument()
  })
})
