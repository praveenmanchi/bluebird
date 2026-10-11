import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { JiraEmptyState } from './JiraEmptyState'

describe('JiraEmptyState', () => {
  it('defaults to State=No tickets with a secondary Clear filters action', () => {
    const { container } = render(<JiraEmptyState />)
    expect(container.querySelector('.bb-jira-empty-state')?.getAttribute('data-state')).toBe('no-tickets')
    expect(screen.getByRole('heading', { name: 'You’re all caught up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' }).getAttribute('data-variant')).toBe('secondary')
    expect(container.querySelector('[data-icon="jira"]')?.getAttribute('data-size')).toBe('lg')
  })
  it('maps Not connected to a primary Connect Jira action', () => {
    render(<JiraEmptyState state="not-connected" />)
    expect(screen.getByRole('heading', { name: 'Connect your Jira site' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect Jira' }).getAttribute('data-variant')).toBe('primary')
  })
  it('announces the Error state and calls onAction from Retry', () => {
    const onAction = vi.fn()
    render(<JiraEmptyState state="error" onAction={onAction} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t reach Jira')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })
  it('accepts copy overrides', () => {
    render(<JiraEmptyState title="Nothing here" actionLabel="Refresh">Try another project.</JiraEmptyState>)
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument()
    expect(screen.getByText('Try another project.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})
