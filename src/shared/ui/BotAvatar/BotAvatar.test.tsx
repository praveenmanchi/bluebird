import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { BotAvatar, BOT_AGENTS, BOT_STATES } from './BotAvatar'
import { EMBLEM } from './geometry'

const q = (c: Element, sel: string) => c.querySelector(sel)
const all = (c: Element, sel: string) => c.querySelectorAll(sel)

describe('BotAvatar', () => {
  it('defaults to Agent=Accessibility, State=Default: a robot with two eyes, no beak or wings', () => {
    const { container } = render(<BotAvatar />)
    const svg = q(container, '.bb-bot-avatar')!
    expect(svg.getAttribute('data-agent')).toBe('accessibility')
    expect(svg.getAttribute('data-state')).toBe('default')
    expect(svg.getAttribute('viewBox')).toBe('0 0 40 40')
    expect(all(container, '.bb-bot-avatar__eye')).toHaveLength(2)
    for (const part of ['head', 'visor', 'torso', 'shield', 'hover', 'thruster']) {
      expect(q(container, `.bb-bot-avatar__${part}`)).toBeInTheDocument()
    }
    expect(all(container, '.bb-bot-avatar__arm')).toHaveLength(2)
    expect(all(container, '.bb-bot-avatar__ear')).toHaveLength(2)
  })

  it('wears a different library icon on the chest for each agent', () => {
    const icons = new Set(BOT_AGENTS.map((agent) => {
      const { container } = render(<BotAvatar agent={agent} />)
      const icon = q(container, '.bb-bot-avatar__icon')!
      expect(icon.getAttribute('data-icon')).toBe(EMBLEM[agent].icon)
      expect(icon.innerHTML).not.toBe('')
      return EMBLEM[agent].icon
    }))
    expect(icons.size).toBe(BOT_AGENTS.length)
  })

  it('keeps the emblem on every state', () => {
    for (const state of BOT_STATES) {
      const { container } = render(<BotAvatar agent="content" state={state} />)
      expect(q(container, '.bb-bot-avatar__icon')!.getAttribute('data-icon')).toBe('text')
    }
  })

  it('centres the emblem icon on the shield at its Figma size', () => {
    const { container } = render(<BotAvatar agent="spelling" />)
    const icon = q(container, '.bb-bot-avatar__icon')!
    const { size, cy } = EMBLEM.spelling
    expect(icon.getAttribute('width')).toBe(String(size))
    expect(icon.getAttribute('x')).toBe(String(20 - size / 2))
    expect(icon.getAttribute('y')).toBe(String(cy - size / 2))
  })

  it('Working swaps the eyes for a scan line, fires the thrusters and locks on the brackets', () => {
    const { container } = render(<BotAvatar agent="content" state="working" />)
    expect(q(container, '.bb-bot-avatar__scan')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__thrust')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__brackets')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__eye')).toBeNull()
    expect(q(container, '.bb-bot-avatar__zzz')).toBeNull()
  })

  it('Sleeping closes the eyes, dims the emblem and adds the Zzz', () => {
    const { container } = render(<BotAvatar agent="localization" state="sleeping" />)
    expect(all(container, '.bb-bot-avatar__eye--shut')).toHaveLength(2)
    expect(q(container, '.bb-bot-avatar__emblem')!.getAttribute('opacity')).not.toBeNull()
    expect(q(container, '.bb-bot-avatar__zzz')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__brackets')).toBeNull()
    expect(q(container, '.bb-bot-avatar__scan')).toBeNull()
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
