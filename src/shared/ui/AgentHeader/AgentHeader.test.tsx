import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { AgentHeader } from './AgentHeader'

describe('AgentHeader', () => {
  it('renders the Figma defaults: working Accessibility bot, two citation chips and a Running badge', () => {
    const { container } = render(<AgentHeader />)
    expect(screen.getByRole('heading', { name: 'Accessibility agent' })).toBeInTheDocument()
    expect(screen.getByText(/Expert in WCAG 2.2/)).toBeInTheDocument()
    const bot = container.querySelector('.bb-bot-avatar')!
    expect(bot).toHaveAttribute('data-agent', 'accessibility')
    expect(bot).toHaveAttribute('data-state', 'working')
    const chips = container.querySelectorAll('.bb-context-chip')
    expect(chips).toHaveLength(2)
    chips.forEach((c) => expect(c).toHaveAttribute('data-type', 'citation'))
    expect(screen.getByText('WCAG 2.2 AA · 86 rules')).toBeInTheDocument()
    const badge = container.querySelector('.bb-meta-badge')!
    expect(badge).toHaveAttribute('data-tone', 'accent')
    expect(badge).toHaveTextContent('Running')
  })
  it('forwards agent, bot state, chips and status', () => {
    const { container } = render(<AgentHeader agent="spelling" botState="sleeping" chips={['Dictionary · en-GB']} status="Idle" statusTone="neutral" />)
    expect(container.querySelector('.bb-bot-avatar')).toHaveAttribute('data-agent', 'spelling')
    expect(container.querySelector('.bb-bot-avatar')).toHaveAttribute('data-state', 'sleeping')
    expect(container.querySelectorAll('.bb-context-chip')).toHaveLength(1)
    expect(container.querySelector('.bb-meta-badge')).toHaveAttribute('data-tone', 'neutral')
  })
  it('hides the chips row and status when empty', () => {
    const { container } = render(<AgentHeader chips={[]} status={null} />)
    expect(container.querySelector('.bb-agent-header__chips')).toBeNull()
    expect(container.querySelector('.bb-meta-badge')).toBeNull()
  })
  it('keeps the avatar decorative — the heading names the agent', () => {
    const { container } = render(<AgentHeader />)
    expect(container.querySelector('.bb-bot-avatar')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('header')).toBeInTheDocument()
  })
})
