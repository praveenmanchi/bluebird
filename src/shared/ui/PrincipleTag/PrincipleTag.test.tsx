import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { PrincipleTag, PRINCIPLES } from './PrincipleTag'

describe('PrincipleTag', () => {
  it('defaults to Perceivable with the matching glyph', () => {
    render(<PrincipleTag />)
    const root = screen.getByText('Perceivable').closest('.bb-principle-tag') as HTMLElement
    expect(root.dataset.principle).toBe('perceivable')
    expect(root.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('principle-perceivable')
  })
  it('renders every Figma Principle variant with its caption and glyph', () => {
    for (const principle of PRINCIPLES) {
      const { container, unmount } = render(<PrincipleTag principle={principle} />)
      expect(container.querySelector('.bb-principle-tag')?.getAttribute('data-principle')).toBe(principle)
      expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe(`principle-${principle}`)
      expect(container.textContent).toBe(principle.charAt(0).toUpperCase() + principle.slice(1))
      unmount()
    }
  })
  it('accepts a custom caption and spreads attributes', () => {
    render(<PrincipleTag principle="robust" label="4. Robust" data-testid="tag" />)
    expect(screen.getByTestId('tag')).toHaveTextContent('4. Robust')
  })
})
