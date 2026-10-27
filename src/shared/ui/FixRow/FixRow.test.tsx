import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { FixRow } from './FixRow'

describe('FixRow', () => {
  it('falls back to a neutral label and renders no action when it cannot be applied', () => {
    render(<FixRow />)
    expect(screen.getByText('Suggested value')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('uppercases the hex and shows the ratio the fix reaches', () => {
    render(<FixRow label="Rebind to Brand/Text/OnAccent" hex="#ffffff" on="#0c8ce9" ratio="5.12:1" />)
    expect(screen.getByText('#FFFFFF')).toBeInTheDocument()
    expect(screen.getByText('5.12:1')).toBeInTheDocument()
  })
  it('only paints the sample when both sides of the pair are known', () => {
    const { container, rerender } = render(<FixRow hex="#ffffff" />)
    expect(container.querySelector('.bb-fix-row__sample')).toBeNull()
    rerender(<FixRow hex="#ffffff" on="#0c8ce9" />)
    expect(container.querySelector('.bb-fix-row__sample')).toBeInTheDocument()
  })
  it('fires onApply through the shared Button', () => {
    const calls: string[] = []
    const { container } = render(<FixRow onApply={() => calls.push('apply')} />)
    expect(container.querySelector('.bb-button')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Apply' }).click()
    expect(calls).toEqual(['apply'])
  })
  it('leads the Apply button with the Variables glyph, as the Figma instance does', () => {
    render(<FixRow onApply={() => undefined} />)
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply.querySelector('.bb-button__icon [data-icon="ui-general-check"]')).toBeInTheDocument()
  })
  it('fixes the Apply button at the Medium frame width, as the Figma instance does', () => {
    render(<FixRow onApply={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveAttribute('data-width', 'fixed')
  })
})
