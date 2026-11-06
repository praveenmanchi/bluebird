import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Message } from './Message'

describe('Message', () => {
  it('defaults to the User bubble with the Figma text and no bot', () => {
    const { container } = render(<Message />)
    const root = container.querySelector('.bb-message')!
    expect(root.getAttribute('data-role')).toBe('user')
    expect(screen.getByText('What is our primary colour?').closest('.bb-message__bubble')).toBeInTheDocument()
    expect(root.querySelector('.bb-uxai-bot')).toBeNull()
  })
  it('composes a Ready 20 UX AI Bot for the assistant', () => {
    const { container } = render(<Message role="assistant" text="Brand/Primary" />)
    const bot = container.querySelector('.bb-uxai-bot')!
    expect(bot.getAttribute('data-state')).toBe('ready')
    expect(bot.getAttribute('data-size')).toBe('20')
    expect(screen.getByText('Brand/Primary')).toBeInTheDocument()
  })
  it('lets a streaming answer switch the bot and renders rich content below the text', () => {
    const { container } = render(
      <Message role="assistant" botState="answering" text="Here it is">
        <div data-testid="artifact">artifact</div>
      </Message>,
    )
    expect(container.querySelector('.bb-uxai-bot')?.getAttribute('data-state')).toBe('answering')
    const body = container.querySelector('.bb-message__body')!
    expect(body.firstElementChild?.textContent).toBe('Here it is')
    expect(body.lastElementChild).toBe(screen.getByTestId('artifact'))
  })
})
