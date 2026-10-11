import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { BotAvatar, BOT_AGENTS } from './BotAvatar'
import { BODY } from './geometry'

const q = (c: Element, sel: string) => c.querySelector(sel)

describe('BotAvatar', () => {
  it('defaults to Agent=Accessibility, State=Default with eyes and pupils', () => {
    const { container } = render(<BotAvatar />)
    const svg = q(container, '.bb-bot-avatar')!
    expect(svg.getAttribute('data-agent')).toBe('accessibility')
    expect(svg.getAttribute('data-state')).toBe('default')
    expect(svg.getAttribute('viewBox')).toBe('0 0 40 40')
    expect(container.querySelectorAll('.bb-bot-avatar__eye')).toHaveLength(2)
    expect(container.querySelectorAll('.bb-bot-avatar__pupil')).toHaveLength(2)
    expect(q(container, '.bb-bot-avatar__body')!.getAttribute('d')).toBe(BODY.accessibility.rest)
  })

  it('draws each agent with its own body shape', () => {
    const shapes = new Set(BOT_AGENTS.map((agent) => {
      const { container } = render(<BotAvatar agent={agent} />)
      return q(container, '.bb-bot-avatar__body')!.getAttribute('d')
    }))
    expect(shapes.size).toBe(BOT_AGENTS.length)
  })

  it('Working tilts the body, smiles and shows the motion ticks', () => {
    const { container } = render(<BotAvatar agent="content" state="working" />)
    expect(q(container, '.bb-bot-avatar__body')!.getAttribute('d')).toBe(BODY.content.working)
    expect(q(container, '.bb-bot-avatar__face-line')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__motion')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__eye')).toBeNull()
    expect(q(container, '.bb-bot-avatar__zzz')).toBeNull()
  })

  it('keeps the Writing working cloud where Figma puts it (1.0992 left overhang)', () => {
    const { container } = render(<BotAvatar agent="writing" state="working" />)
    expect(q(container, '.bb-bot-avatar__body')!.getAttribute('transform')).toBe('translate(-1.0992 0)')
  })

  it('Sleeping closes the eyes and adds the Zzz on the resting body', () => {
    const { container } = render(<BotAvatar agent="localization" state="sleeping" />)
    expect(q(container, '.bb-bot-avatar__body')!.getAttribute('d')).toBe(BODY.localization.rest)
    expect(q(container, '.bb-bot-avatar__zzz')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__motion')).toBeNull()
  })

  it('is an image named after the agent and its state', () => {
    render(<BotAvatar agent="design-system" state="sleeping" />)
    expect(screen.getByRole('img', { name: 'Design System agent, sleeping' })).toBeInTheDocument()
  })

  it('goes decorative when the label is empty', () => {
    const { container } = render(<BotAvatar label="" />)
    const svg = q(container, 'svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('role')).toBeNull()
  })
})
