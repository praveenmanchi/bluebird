import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { CheckItem } from './CheckItem'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-check-item')!

describe('CheckItem', () => {
  it('defaults to Status=Pass with the Figma copy and no action', () => {
    const { container } = render(<CheckItem />)
    expect(root(container).getAttribute('data-status')).toBe('pass')
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-good')
    expect(screen.getByRole('img', { name: 'Pass' })).toBeInTheDocument()
    expect(screen.getByText('Variables')).toBeInTheDocument()
    expect(screen.getByText('98% of fills, strokes, spacing and type are bound to Brand UI')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('swaps the status glyph and shows the Fix link for Warning and Fail', () => {
    const { container, rerender } = render(<CheckItem status="warning" />)
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-issue')
    expect(screen.getByRole('button', { name: 'Fix' }).tagName).toBe('BUTTON')
    rerender(<CheckItem status="fail" />)
    expect(root(container).getAttribute('data-status')).toBe('fail')
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('status-error')
    expect(screen.getByRole('img', { name: 'Fail' })).toBeInTheDocument()
  })
  it('fires onAction and honours showAction / actionLabel overrides', () => {
    const calls: string[] = []
    const { rerender } = render(<CheckItem status="fail" actionLabel="Open" onAction={() => calls.push('open')} />)
    screen.getByRole('button', { name: 'Open' }).click()
    expect(calls).toEqual(['open'])
    rerender(<CheckItem status="fail" showAction={false} />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<CheckItem status="pass" showAction />)
    expect(screen.getByRole('button', { name: 'Fix' })).toBeInTheDocument()
  })
  it('renders custom title and detail', () => {
    render(<CheckItem title="Naming" detail="All layers follow the convention" />)
    expect(screen.getByText('Naming')).toBeInTheDocument()
    expect(screen.getByText('All layers follow the convention')).toBeInTheDocument()
  })
})
