import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { FindingRow, type FindingSeverity } from './FindingRow'

describe('FindingRow', () => {
  it('renders the Figma defaults: Critical badge, title, meta and fix chip', () => {
    const { container } = render(<FindingRow />)
    expect(container.querySelector('.bb-finding-row')).toHaveAttribute('data-severity', 'critical')
    expect(screen.getByText('Key text is 2.9:1 on the selected row — needs 4.5:1')).toBeInTheDocument()
    expect(screen.getByText('WCAG 1.4.3 · Ticket Row › Key · Ikea mode')).toBeInTheDocument()
    expect(container.querySelector('.bb-context-chip')).toHaveAttribute('data-type', 'citation')
    expect(screen.getByText('Fix: jira/text/key → text/primary (7.8:1)')).toBeInTheDocument()
  })
  it.each<[FindingSeverity, string, string]>([
    ['critical', 'danger', 'CRITICAL'],
    ['serious', 'warning', 'SERIOUS'],
    ['moderate', 'accent', 'MODERATE'],
    ['minor', 'neutral', 'MINOR'],
  ])('maps Severity=%s to a %s Meta Badge reading %s', (severity, tone, word) => {
    const { container } = render(<FindingRow severity={severity} />)
    const badge = container.querySelector('.bb-meta-badge')!
    expect(badge).toHaveAttribute('data-tone', tone)
    expect(badge).toHaveTextContent(word)
  })
  it('renders the three Link Buttons as buttons and reports the action', () => {
    const onAction = vi.fn()
    render(<FindingRow onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Locate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply fix' }))
    expect(onAction.mock.calls).toEqual([['locate'], ['ignore'], ['apply']])
  })
  it('makes the title a button only when onSelect is given', () => {
    const onSelect = vi.fn()
    const { rerender } = render(<FindingRow title="Low contrast" />)
    expect(screen.queryByRole('button', { name: 'Low contrast' })).toBeNull()
    rerender(<FindingRow title="Low contrast" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Low contrast' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
  it('hides the fix chip when fix is null', () => {
    const { container } = render(<FindingRow fix={null} />)
    expect(container.querySelector('.bb-context-chip')).toBeNull()
  })
})
