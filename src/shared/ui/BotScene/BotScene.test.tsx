import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/preact'
import { BotScene, BOT_SCENES } from './BotScene'

describe('BotScene', () => {
  it('has the 14 Figma scenes, each with a robot and props', () => {
    expect(BOT_SCENES).toHaveLength(14)
    for (const scene of BOT_SCENES) {
      const { container } = render(<BotScene scene={scene} />)
      expect(container.querySelector('.bb-bot-avatar__head')).toBeInTheDocument()
      expect(container.querySelector('[class*="bb-bot-scene__"]')).toBeInTheDocument()
    }
  })

  it('is UX AI by default, with the sparkle on its chest', () => {
    const { container } = render(<BotScene scene="wire-cut" />)
    expect(container.querySelector('svg')!.getAttribute('data-character')).toBe('uxai')
    expect(container.querySelector('.bb-bot-avatar__icon')!.getAttribute('data-icon')).toBe('uxai')
  })

  it('wears the agent that hit the problem', () => {
    const { container } = render(<BotScene scene="wire-cut" character="spelling" />)
    expect(container.querySelector('svg')!.getAttribute('data-agent')).toBe('spelling')
    expect(container.querySelector('.bb-bot-avatar__icon')!.getAttribute('data-icon')).toBe('ui-text-underline-wave')
  })

  it('pops the head on a spring when something breaks', () => {
    const { container } = render(<BotScene scene="something-broke" />)
    expect(container.querySelector('.bb-bot-avatar__spring')).toBeInTheDocument()
    expect(container.querySelector('.bb-bot-avatar__neck')).toBeNull()
  })

  it('is decorative', () => {
    const { container } = render(<BotScene scene="all-clear" />)
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })
})
