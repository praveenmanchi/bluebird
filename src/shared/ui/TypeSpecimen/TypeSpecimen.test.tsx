import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { TypeSpecimen } from './TypeSpecimen'

describe('TypeSpecimen', () => {
  it('defaults to Level=Title with the Figma sample and spec', () => {
    const { container } = render(<TypeSpecimen />)
    expect(container.querySelector('.bb-type-specimen')?.getAttribute('data-level')).toBe('title')
    expect(screen.getByText('The quick brown fox jumps')).toBeInTheDocument()
    expect(screen.getByText('font/size-title · 16 · SemiBold')).toBeInTheDocument()
  })
  it.each([
    ['label', 'font/size-label · 12 / 16.8 · Medium'],
    ['body', 'font/size-body · 11 / 15.4 · Regular'],
    ['caption', 'font/size-caption · 10 / 14 · Regular'],
  ] as const)('maps Level=%s to data-level and its spec', (level, spec) => {
    const { container } = render(<TypeSpecimen level={level} />)
    expect(container.querySelector('.bb-type-specimen')?.getAttribute('data-level')).toBe(level)
    expect(screen.getByText(spec)).toBeInTheDocument()
  })
  it('renders custom sample and spec text', () => {
    render(<TypeSpecimen level="body" spec="font/size-body · 11 · Regular">Aa Bb</TypeSpecimen>)
    expect(screen.getByText('Aa Bb')).toBeInTheDocument()
    expect(screen.getByText('font/size-body · 11 · Regular')).toBeInTheDocument()
  })
})
