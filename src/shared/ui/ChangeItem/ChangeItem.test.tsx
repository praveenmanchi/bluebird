import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ChangeItem } from './ChangeItem'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-change-item')!
const details = (c: Element) => c.querySelector<HTMLElement>('.bb-change-item__details')!
const disclosure = () => screen.getByRole('button', { name: /details/ })

describe('ChangeItem', () => {
  it('defaults to Expanded=No: the sample Change Row and a collapsed disclosure with hidden details', () => {
    const { container } = render(<ChangeItem />)
    expect(root(container).getAttribute('data-expanded')).toBe('false')
    expect(screen.getByText('button/bg/primary')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Include button/bg/primary' })).toBeInTheDocument()
    const toggle = disclosure()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-label')).toBe('Show details')
    expect(toggle.getAttribute('aria-controls')).toBe(details(container).id)
    expect(details(container).hidden).toBe(true)
    expect(screen.queryByRole('list')).toBeNull()
  })
  it('shows the Figma sample details when Expanded=Yes', () => {
    const { container } = render(<ChangeItem expanded />)
    expect(root(container).getAttribute('data-expanded')).toBe('true')
    expect(details(container).hidden).toBe(false)
    expect(disclosure().getAttribute('aria-expanded')).toBe('true')
    expect(disclosure().getAttribute('aria-label')).toBe('Hide details')
    const brands = screen.getByRole('list', { name: 'Value by brand' })
    const rows = brands.querySelectorAll('.bb-brand-diff-row')
    expect([...rows].map((r) => r.getAttribute('data-state'))).toEqual(['changed', 'changed', 'changed', 'unchanged', 'unchanged'])
    for (const brand of ['Bridge', 'Ikea', 'Richemont', 'Disney', 'Fiskars']) expect(screen.getByText(brand)).toBeInTheDocument()
    expect(screen.getAllByText('#0C8CE9 · unchanged')).toHaveLength(2)
    const used = screen.getByRole('list', { name: 'Used in' })
    expect([...used.querySelectorAll('.bb-context-chip')].map((c) => c.textContent)).toEqual(['Button', 'Date picker', 'Tab', 'Toggle'])
    expect(used.querySelector('.bb-context-chip')?.getAttribute('data-type')).toBe('source')
    expect(screen.getByText('Brand UI › button/bg/primary · scopes Frame fill, Shape fill · changed by Praveen, 2 h ago')).toBeInTheDocument()
  })
  it('toggles on its own when uncontrolled and calls onToggle', () => {
    let calls = 0
    const { container } = render(<ChangeItem onToggle={() => { calls += 1 }} />)
    fireEvent.click(disclosure())
    expect(calls).toBe(1)
    expect(disclosure().getAttribute('aria-expanded')).toBe('true')
    expect(details(container).hidden).toBe(false)
    fireEvent.click(disclosure())
    expect(calls).toBe(2)
    expect(details(container).hidden).toBe(true)
  })
  it('follows a controlled `expanded`', () => {
    let calls = 0
    const { container, rerender } = render(<ChangeItem expanded={false} onToggle={() => { calls += 1 }} />)
    fireEvent.click(disclosure())
    expect(calls).toBe(1)
    expect(details(container).hidden).toBe(true)
    rerender(<ChangeItem expanded onToggle={() => { calls += 1 }} />)
    expect(details(container).hidden).toBe(false)
  })
  it('renders custom row, brand values, usage, source and details id', () => {
    const { container } = render(
      <ChangeItem
        expanded
        detailsId="gutter-details"
        row={{ kind: 'number', name: 'space/gutter', detail: '12px → 16px', change: 'added' }}
        brandValues={[{ brand: 'Ikea', state: 'changed', kind: 'number', old: '12px', new: '16px' }, { brand: 'Disney', state: 'unchanged', value: '12px' }]}
        usedIn={['Card']}
        source="Brand UI › space/gutter"
      />,
    )
    expect(details(container).id).toBe('gutter-details')
    expect(disclosure().getAttribute('aria-controls')).toBe('gutter-details')
    expect(container.querySelector('.bb-change-row')?.getAttribute('data-kind')).toBe('number')
    expect(container.querySelector('.bb-change-row .bb-meta-badge')?.textContent).toBe('Added')
    expect(screen.getByText('12px · unchanged')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.getByText('Brand UI › space/gutter')).toBeInTheDocument()
  })
  it('keeps the Change Row include checkbox working inside the header', () => {
    const seen: boolean[] = []
    render(<ChangeItem row={{ onIncludedChange: (next) => seen.push(next) }} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(seen).toEqual([false])
  })
  it('leaves out the brand and usage groups when they are empty', () => {
    render(<ChangeItem expanded brandValues={[]} usedIn={[]} source="Components › Date picker" />)
    expect(screen.queryByText('Value by brand')).toBeNull()
    expect(screen.queryByText('Used in')).toBeNull()
    expect(screen.getByText('Components › Date picker')).toBeInTheDocument()
  })
})
