import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ChangeCount } from './ChangeCount'

const root = (c: Element) => c.querySelector('.bb-change-count') as HTMLElement

describe('ChangeCount', () => {
  it('defaults to a neutral "Changes" total with icon + label and a zero count', () => {
    const { container } = render(<ChangeCount />)
    const el = root(container)
    expect(el.dataset.type).toBe('default')
    expect(el.dataset.display).toBe('icon-label')
    expect(el.dataset.surface).toBe('app')
    expect(screen.getByText('Changes')).toBeVisible()
    expect(el.querySelector('.bb-icon')?.getAttribute('data-icon')).toBe('variables')
    expect(el.querySelector('.bb-change-count__count')?.textContent).toBe('0')
  })

  it('maps each type to its caption and icon', () => {
    const cases = [['added', 'Added', 'ui-general-add'], ['modified', 'Modified', 'ui-toolbar-pencil'], ['removed', 'Removed', 'ui-general-remove']] as const
    for (const [type, caption, icon] of cases) {
      const { container, unmount } = render(<ChangeCount type={type} count={3} />)
      expect(root(container).dataset.type).toBe(type)
      expect(screen.getByText(caption)).toBeInTheDocument()
      expect(container.querySelector('.bb-icon')?.getAttribute('data-icon')).toBe(icon)
      unmount()
    }
  })

  it('icon only hides the label visually but keeps it for screen readers and the tooltip', () => {
    const { container } = render(<ChangeCount type="added" display="icon" count={12} />)
    const label = screen.getByText('Added')
    expect(label).toHaveClass('bb-change-count__label--hidden')
    expect(root(container)).toHaveAttribute('title', 'Added')
    expect(container.querySelector('.bb-icon')).not.toBeNull()
  })

  it('label only drops the icon', () => {
    const { container } = render(<ChangeCount type="removed" display="label" count={1} />)
    expect(container.querySelector('.bb-icon')).toBeNull()
    expect(screen.getByText('Removed')).not.toHaveClass('bb-change-count__label--hidden')
  })

  it('passes the surface, label and icon overrides and spreads attributes', () => {
    const { container } = render(<ChangeCount type="modified" surface="report" label="Updated" icon="ui-general-add" count="1,204" data-testid="cc" title="Custom" />)
    const el = screen.getByTestId('cc')
    expect(el.dataset.surface).toBe('report')
    expect(el).toHaveTextContent('Updated')
    expect(el).toHaveAttribute('title', 'Custom')
    expect(container.querySelector('.bb-icon')?.getAttribute('data-icon')).toBe('ui-general-add')
    expect(el.querySelector('.bb-change-count__count')?.textContent).toBe('1,204')
  })
})
