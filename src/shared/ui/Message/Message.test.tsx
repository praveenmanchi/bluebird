import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Message } from './Message'

describe('Message', () => {
  it('defaults to the User bubble with the Figma text and no orb', () => {
    const { container } = render(<Message />)
    const root = container.querySelector('.bb-message')!
    expect(root.getAttribute('data-role')).toBe('user')
    expect(screen.getByText('What is our primary colour?').closest('.bb-message__bubble')).toBeInTheDocument()
    expect(root.querySelector('.bb-thinking-orb')).toBeNull()
  })
  it('composes a Breathing 20 Thinking Orb for the assistant', () => {
    const { container } = render(<Message role="assistant" text="Brand/Primary" />)
    const orb = container.querySelector('.bb-thinking-orb')!
    expect(orb.getAttribute('data-state')).toBe('breathing')
    expect(orb.getAttribute('data-size')).toBe('20')
    expect(screen.getByText('Brand/Primary')).toBeInTheDocument()
  })
  it('lets a streaming answer switch the orb and renders rich content below the text', () => {
    const { container } = render(
      <Message role="assistant" orbState="composing" text="Here it is">
        <div data-testid="artifact">artifact</div>
      </Message>,
    )
    expect(container.querySelector('.bb-thinking-orb')?.getAttribute('data-state')).toBe('composing')
    const body = container.querySelector('.bb-message__body')!
    expect(body.firstElementChild?.textContent).toBe('Here it is')
    expect(body.lastElementChild).toBe(screen.getByTestId('artifact'))
  })
})
