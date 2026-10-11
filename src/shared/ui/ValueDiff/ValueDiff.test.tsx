import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ValueDiff } from './ValueDiff'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-value-diff')!
const swatches = (c: Element) => [...c.querySelectorAll<HTMLElement>('.bb-value-diff__swatch')]

describe('ValueDiff', () => {
  it('defaults to Kind=Color with the Figma sample values and a swatch per side', () => {
    const { container } = render(<ValueDiff />)
    expect(root(container).getAttribute('data-kind')).toBe('color')
    expect(screen.getByText('#0C8CE9').tagName).toBe('DEL')
    expect(screen.getByText('#0560A3').tagName).toBe('INS')
    expect(screen.getByText('→').getAttribute('aria-hidden')).toBe('true')
    const [before, after] = swatches(container)
    expect(before!.style.getPropertyValue('--value-diff-swatch')).toBe('#0C8CE9')
    expect(after!.style.getPropertyValue('--value-diff-swatch')).toBe('#0560A3')
    expect(before!.getAttribute('aria-hidden')).toBe('true')
  })
  it('drops the swatches for Kind=Number', () => {
    const { container } = render(<ValueDiff kind="number" old="12px" new="16px" />)
    expect(root(container).getAttribute('data-kind')).toBe('number')
    expect(swatches(container)).toHaveLength(0)
    expect(screen.getByText('12px').tagName).toBe('DEL')
    expect(screen.getByText('16px').tagName).toBe('INS')
  })
  it('paints swatches from oldColor / newColor when the labels are not colours', () => {
    const { container } = render(<ValueDiff old="primary/400" new="primary/600" oldColor="#111111" newColor="#222222" />)
    const [before, after] = swatches(container)
    expect(before!.style.getPropertyValue('--value-diff-swatch')).toBe('#111111')
    expect(after!.style.getPropertyValue('--value-diff-swatch')).toBe('#222222')
    expect(screen.getByText('primary/400')).toBeInTheDocument()
  })
  it('passes span attributes through and keeps its own class', () => {
    const { container } = render(<ValueDiff class="extra" data-testid="diff" />)
    expect(root(container).classList.contains('extra')).toBe(true)
    expect(screen.getByTestId('diff')).toBe(root(container))
  })
})
