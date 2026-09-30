import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { VariableCardExpanded } from './VariableCardExpanded'

const rows = [
  { label: 'Button', value: 12 },
  { label: 'Checkbox', value: 4, status: 'added' as const, icon: 'component' as const },
]

describe('VariableCardExpanded', () => {
  it('composes VariableCard as an expanded header and lists one row per component', () => {
    const { container } = render(<VariableCardExpanded name="Color/Border/Black" meta="Used by 52" rows={rows} />)
    const header = container.querySelector('.bb-variable-card-expanded__header.bb-variable-card')
    expect(header).not.toBeNull()
    expect(header?.hasAttribute('data-expanded')).toBe(true)
    expect(screen.getByText('Color/Border/Black')).toHaveClass('bb-variable-card__name')
    expect(screen.getByRole('heading', { name: 'Components Using the Searched Variable' })).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-variable-card-expanded__row')).toHaveLength(2)
    expect(container.querySelectorAll('.bb-variable-card-expanded__glyph[data-icon="multiple-component"]')).toHaveLength(1)
    expect(container.querySelectorAll('.bb-variable-card-expanded__glyph[data-icon="component"]')).toHaveLength(1)
  })
  it('captions the header chip "Usage No." like Figma and passes changeLabel through', () => {
    const { container, rerender } = render(<VariableCardExpanded name="x" rows={[]} />)
    const label = () => container.querySelector('.bb-variable-card-expanded__header .bb-change-status__label')?.textContent
    expect(label()).toBe('Usage No.')
    rerender(<VariableCardExpanded name="x" rows={[]} changeLabel="Nodes" />)
    expect(label()).toBe('Nodes')
  })
  it('renders row values inside ChangeStatus chips and the summary chips', () => {
    const { container } = render(<VariableCardExpanded name="x" rows={rows} summary={[{ label: 'Frames', count: 18 }]} />)
    const chips = container.querySelectorAll('.bb-variable-card-expanded__chip')
    expect(chips).toHaveLength(3)
    expect(screen.getByText('Frames')).toBeInTheDocument()
    expect(chips[2]?.getAttribute('data-status')).toBe('added')
    expect(chips[2]?.querySelector('.bb-change-status__count')?.textContent).toBe('4')
  })
  it('fires onShow / onShowLayers with the row and index', () => {
    const onShow = vi.fn()
    const onShowLayers = vi.fn()
    render(<VariableCardExpanded name="x" rows={rows} onShow={onShow} onShowLayers={onShowLayers} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show Checkbox' }))
    expect(onShow).toHaveBeenCalledWith(rows[1], 1)
    fireEvent.click(screen.getByRole('button', { name: 'Show layers of Button' }))
    expect(onShowLayers).toHaveBeenCalledWith(rows[0], 0)
  })
  it('fires onCollapse from the header chevron and onInspect from research', () => {
    const onCollapse = vi.fn()
    const onInspect = vi.fn()
    render(<VariableCardExpanded name="x" rows={[]} onCollapse={onCollapse} onInspect={onInspect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }))
    expect(onInspect).toHaveBeenCalledTimes(1)
  })
})
