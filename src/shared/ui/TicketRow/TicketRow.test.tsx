import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { TicketRow } from './TicketRow'

describe('TicketRow', () => {
  it('renders the Figma default as an unpressed button', () => {
    const { container } = render(<TicketRow />)
    const row = screen.getByRole('button')
    expect(row.getAttribute('data-state')).toBe('default')
    expect(row.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('BB-142')).toBeInTheDocument()
    expect(screen.getByText('IN PROGRESS').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('accent')
    expect(container.querySelector('.bb-issue-type')?.getAttribute('data-type')).toBe('story')
    expect(container.querySelector('.bb-priority-icon')?.getAttribute('data-priority')).toBe('high')
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(container.querySelector('.bb-avatar')).toBeNull()
  })
  it('shows the Assignee avatar when showAssignee is set (Figma "Show assignee")', () => {
    render(<TicketRow showAssignee assigneeName="Praveen Manchi" />)
    expect(screen.getByRole('img', { name: 'Praveen Manchi' })).toHaveTextContent('PM')
  })
  it('maps Figma State to data-state (forced hover, selected wins)', () => {
    const { rerender } = render(<TicketRow state="hover" />)
    expect(screen.getByRole('button').getAttribute('data-state')).toBe('hover')
    rerender(<TicketRow state="hover" selected />)
    expect(screen.getByRole('button').getAttribute('data-state')).toBe('selected')
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true')
  })
  it('swaps the nested instances through props', () => {
    const { container } = render(<TicketRow issueType="bug" status="DONE" statusTone="success" priority="lowest" points="8" showAssignee assignee="AK" assigneeName="Anika Kumar" title="Fix it" issueKey="BB-1" />)
    expect(container.querySelector('.bb-issue-type')?.getAttribute('data-type')).toBe('bug')
    expect(screen.getByText('DONE').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('success')
    expect(container.querySelector('.bb-priority-icon')?.getAttribute('data-priority')).toBe('lowest')
    expect(screen.getByRole('img', { name: 'Anika Kumar' })).toBeInTheDocument()
    expect(screen.getByText('Fix it')).toBeInTheDocument()
  })
  it('calls onSelect with the issue key and still runs onClick', () => {
    const onSelect = vi.fn()
    const onClick = vi.fn()
    render(<TicketRow issueKey="BB-7" onSelect={onSelect} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('BB-7')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
