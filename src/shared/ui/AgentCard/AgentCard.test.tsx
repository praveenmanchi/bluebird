import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { AgentCard, type AgentCardState } from './AgentCard'

describe('AgentCard', () => {
  it('renders the Figma defaults for State=Ready', () => {
    const { container } = render(<AgentCard />)
    expect(container.querySelector('.bb-agent-card')).toHaveAttribute('data-state', 'ready')
    expect(screen.getByRole('heading', { name: 'Accessibility' })).toBeInTheDocument()
    expect(screen.getByText(/Reviews contrast, target size/)).toBeInTheDocument()
    expect(screen.getByText('WCAG 2.2 AA · 86 rules').closest('.bb-context-chip')).toHaveAttribute('data-type', 'citation')
    expect(screen.getByText('Last run 2h ago · 14 issues')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run' })).toHaveAttribute('data-variant', 'primary')
  })
  it.each<[AgentCardState, string, string, string, string]>([
    ['ready', 'default', 'success', 'Ready', 'Run'],
    ['running', 'working', 'accent', 'Running 64%', 'Stop'],
    ['idle', 'sleeping', 'neutral', 'Idle', 'Run'],
    ['coming-soon', 'default', 'neutral', 'Coming soon', 'Notify me'],
  ])('State=%s → bot %s, %s badge "%s", action "%s"', (state, bot, tone, status, action) => {
    const { container } = render(<AgentCard state={state} />)
    expect(container.querySelector('.bb-bot-avatar')).toHaveAttribute('data-state', bot)
    const badge = container.querySelector('.bb-meta-badge')!
    expect(badge).toHaveAttribute('data-tone', tone)
    expect(badge).toHaveTextContent(status)
    expect(screen.getByRole('button', { name: action })).toBeInTheDocument()
  })
  it('fires onRun from Ready / Idle and onStop from Running', () => {
    const onRun = vi.fn()
    const onStop = vi.fn()
    const { rerender } = render(<AgentCard onRun={onRun} onStop={onStop} />)
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))
    rerender(<AgentCard state="running" onRun={onRun} onStop={onStop} />)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onRun).toHaveBeenCalledTimes(1)
    expect(onStop).toHaveBeenCalledTimes(1)
  })
  it('disables the action when the agent is coming soon', () => {
    const onRun = vi.fn()
    render(<AgentCard state="coming-soon" onRun={onRun} />)
    const button = screen.getByRole('button', { name: 'Notify me' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onRun).not.toHaveBeenCalled()
  })
  it('honours copy overrides and hides the rules chip on null', () => {
    const { container } = render(<AgentCard agent="content" status="Done" meta="Ran 1m ago" actionLabel="Re-run" rules={null} />)
    expect(container.querySelector('.bb-bot-avatar')).toHaveAttribute('data-agent', 'content')
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Ran 1m ago')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Re-run' })).toBeInTheDocument()
    expect(container.querySelector('.bb-context-chip')).toBeNull()
  })
})
