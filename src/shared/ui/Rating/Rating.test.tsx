import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Rating } from './Rating'

describe('Rating', () => {
  it('defaults to level A', () => {
    render(<Rating />)
    const root = screen.getByText('A').closest('.bb-rating') as HTMLElement
    expect(root.dataset.rating).toBe('A')
    expect(root.getAttribute('title')).toBe('WCAG level A')
  })
  it('maps the Figma Rating variant to data-rating and the label', () => {
    render(<Rating rating="AAA" />)
    expect(screen.getByText('AAA').closest('.bb-rating')?.getAttribute('data-rating')).toBe('AAA')
  })
  it('lets callers override the title and pass through attributes', () => {
    render(<Rating rating="AA" title="Contrast AA" data-testid="r" />)
    expect(screen.getByTestId('r').getAttribute('title')).toBe('Contrast AA')
  })
})
