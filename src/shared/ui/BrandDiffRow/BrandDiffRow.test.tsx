import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { BrandDiffRow } from './BrandDiffRow'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-brand-diff-row')!
const badge = (c: Element) => c.querySelector<HTMLElement>('.bb-meta-badge')!

describe('BrandDiffRow', () => {
  it('defaults to State=Changed: Bridge, a colour Value Diff and an Accent "Changed" badge', () => {
    const { container } = render(<BrandDiffRow />)
    expect(root(container).getAttribute('data-state')).toBe('changed')
    expect(screen.getByText('Bridge')).toBeInTheDocument()
    expect(container.querySelector('.bb-value-diff')?.getAttribute('data-kind')).toBe('color')
    expect(screen.getByText('#0C8CE9').tagName).toBe('DEL')
    expect(screen.getByText('#0560A3').tagName).toBe('INS')
    expect(badge(container).getAttribute('data-tone')).toBe('accent')
    expect(badge(container).textContent).toBe('Changed')
  })
  it('renders State=Unchanged as "<value> · unchanged" with a Neutral "Same" badge', () => {
    const { container } = render(<BrandDiffRow state="unchanged" brand="Disney" />)
    expect(root(container).getAttribute('data-state')).toBe('unchanged')
    expect(screen.getByText('Disney')).toBeInTheDocument()
    expect(screen.getByText('#0C8CE9 · unchanged')).toBeInTheDocument()
    expect(container.querySelector('.bb-value-diff')).toBeNull()
    expect(badge(container).getAttribute('data-tone')).toBe('neutral')
    expect(badge(container).textContent).toBe('Same')
  })
  it('passes kind / old / new / swatch colours to the nested Value Diff', () => {
    const { container } = render(<BrandDiffRow kind="number" old="12px" new="16px" />)
    expect(container.querySelector('.bb-value-diff')?.getAttribute('data-kind')).toBe('number')
    expect(screen.getByText('12px')).toBeInTheDocument()
    expect(screen.getByText('16px')).toBeInTheDocument()
    const { container: c2 } = render(<BrandDiffRow old="a" new="b" oldColor="#111111" newColor="#222222" />)
    const swatches = c2.querySelectorAll<HTMLElement>('.bb-value-diff__swatch')
    expect(swatches[0]!.style.getPropertyValue('--value-diff-swatch')).toBe('#111111')
    expect(swatches[1]!.style.getPropertyValue('--value-diff-swatch')).toBe('#222222')
  })
  it('uses a custom unchanged value', () => {
    render(<BrandDiffRow state="unchanged" value="8px" />)
    expect(screen.getByText('8px · unchanged')).toBeInTheDocument()
  })
})
