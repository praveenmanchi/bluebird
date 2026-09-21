import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Navbar, NAVBAR_DEFAULT_ITEMS } from './Navbar'

describe('Navbar', () => {
  it('renders <nav> with a tablist holding the seven Figma tabs', () => {
    render(<Navbar />)
    expect(screen.getByRole('navigation')).toHaveClass('bb-navbar')
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(7)
    expect(tabs.map((t) => t.textContent)).toEqual(NAVBAR_DEFAULT_ITEMS.map((i) => i.label))
  })
  it('marks the active item as the Tab Active variant', () => {
    render(<Navbar active="inspect" />)
    const active = screen.getByRole('tab', { name: 'Inspect', selected: true })
    expect(active.dataset.variant).toBe('active')
    expect(screen.getByRole('tab', { name: 'Variables' }).dataset.variant).toBe('default')
  })
  it('renders the trailing compact Variant3 tab with the navbar glyph', () => {
    const { container } = render(<Navbar trailing={{ id: 'more', label: 'More' }} />)
    const compact = screen.getByRole('tab', { name: 'More' })
    expect(compact.dataset.variant).toBe('variant3')
    expect(container.querySelector('.bb-navbar__tab--compact .bb-icon[data-icon="navbar-tab-icon"]')).not.toBeNull()
  })
  it('calls onChange on click and on arrow keys', () => {
    const onChange = vi.fn()
    render(<Navbar active="variables" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'MCP' }))
    expect(onChange).toHaveBeenCalledWith('mcp')
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('inspect')
  })
})
