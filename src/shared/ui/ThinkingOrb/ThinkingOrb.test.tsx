import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ThinkingOrb } from './ThinkingOrb'

const tones = (root: Element) => [...root.querySelectorAll('.bb-thinking-orb__blob')].map((b) => b.getAttribute('data-tone'))

describe('ThinkingOrb', () => {
  it('defaults to Searching at Size 20 and is decorative', () => {
    const { container } = render(<ThinkingOrb />)
    const orb = container.querySelector('.bb-thinking-orb')!
    expect(orb.getAttribute('data-state')).toBe('searching')
    expect(orb.getAttribute('data-size')).toBe('20')
    expect(orb.getAttribute('aria-hidden')).toBe('true')
  })
  it('stacks the Figma ellipses of each state in layer order, with the highlight on top', () => {
    const { container, rerender } = render(<ThinkingOrb state="searching" />)
    const orb = () => container.querySelector('.bb-thinking-orb')!
    expect(tones(orb())).toEqual(['core', 'a', 'b'])
    rerender(<ThinkingOrb state="composing" />)
    expect(tones(orb())).toEqual(['a', 'c', 'core'])
    rerender(<ThinkingOrb state="breathing" size="40" />)
    expect(tones(orb())).toEqual(['core', 'a'])
    expect(orb().getAttribute('data-size')).toBe('40')
    expect(orb().lastElementChild?.classList.contains('bb-thinking-orb__highlight')).toBe(true)
  })
  it('becomes an image with a name when labelled', () => {
    render(<ThinkingOrb state="composing" label="Writing the answer" />)
    expect(screen.getByRole('img', { name: 'Writing the answer' })).toBeInTheDocument()
  })
})
