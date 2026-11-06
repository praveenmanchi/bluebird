import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { UxaiBot, UXAI_BOT_STATES } from './UxaiBot'

const q = (c: Element, sel: string) => c.querySelector(sel)

describe('UxaiBot', () => {
  it('defaults to Ready: the robot alone, with no bubble', () => {
    const { container } = render(<UxaiBot />)
    const svg = q(container, '.bb-uxai-bot')!
    expect(svg.getAttribute('data-state')).toBe('ready')
    expect(svg.getAttribute('viewBox')).toBe('0 0 40 40')
    expect(q(container, '.bb-uxai-bot__bubble')).toBeNull()
    expect(container.querySelectorAll('.bb-bot-avatar__eye')).toHaveLength(2)
  })

  it('stands at full size in Ready and steps back when the bubble appears', () => {
    const transform = (state: 'ready' | 'searching' | 'answering') => {
      const { container } = render(<UxaiBot state={state} />)
      return (q(container, '.bb-uxai-bot__robot') as SVGGElement).style.transform
    }
    expect(transform('ready')).toBe('')
    expect(transform('searching')).not.toBe('')
    expect(transform('answering')).toBe(transform('searching'))
  })

  it('wears the UX AI sparkle on its chest in every state', () => {
    for (const state of UXAI_BOT_STATES) {
      const { container } = render(<UxaiBot state={state} />)
      expect(q(container, '.bb-bot-avatar__icon')!.getAttribute('data-icon')).toBe('uxai')
    }
  })

  it('Searching scans, fires its thrusters and shows three dots in the bubble', () => {
    const { container } = render(<UxaiBot state="searching" />)
    expect(q(container, '.bb-bot-avatar__scan')).toBeInTheDocument()
    expect(q(container, '.bb-bot-avatar__thrust')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-uxai-bot__dot')).toHaveLength(3)
    expect(q(container, '.bb-uxai-bot__lines')).toBeNull()
  })

  it('Answering smiles and shows lines of text in the bubble', () => {
    const { container } = render(<UxaiBot state="answering" />)
    expect(q(container, '.bb-uxai-bot__smile')).toBeInTheDocument()
    expect(q(container, '.bb-uxai-bot__lines')).toBeInTheDocument()
    expect(q(container, '.bb-uxai-bot__dot')).toBeNull()
    expect(q(container, '.bb-bot-avatar__thrust')).toBeNull()
  })

  it('takes the Figma sizes', () => {
    const { container } = render(<UxaiBot size="20" />)
    expect(q(container, '.bb-uxai-bot')!.getAttribute('data-size')).toBe('20')
  })

  it('is decorative unless it is given a label', () => {
    const { container } = render(<UxaiBot />)
    expect(q(container, 'svg')!.getAttribute('aria-hidden')).toBe('true')
    render(<UxaiBot label="UX AI is searching" state="searching" />)
    expect(screen.getByRole('img', { name: 'UX AI is searching' })).toBeInTheDocument()
  })
})
