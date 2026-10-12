import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ChatInput } from './ChatInput'

const field = () => screen.getByRole('textbox', { name: 'Ask UX AI' }) as HTMLTextAreaElement

describe('ChatInput', () => {
  it('renders the Idle default: context chips, placeholder, tools, hint and Send', () => {
    const { container } = render(<ChatInput />)
    const root = container.querySelector('.bb-chat-input')!
    expect(root.getAttribute('data-state')).toBe('idle')
    expect(screen.getByText('Ticket Row · State=Selected').closest('.bb-context-chip')?.getAttribute('data-type')).toBe('selection')
    expect(screen.getByText('5 sources').closest('.bb-context-chip')?.getAttribute('data-type')).toBe('source')
    expect(field().placeholder).toBe('Ask about colours, type, components, icons… or your selection')
    expect(screen.getByText('Answers cite your sources')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add source' }).querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('file')
    expect(screen.getByRole('button', { name: 'Use selection' }).querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('component-select')
    expect(screen.getByRole('button', { name: 'Send' }).querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('arrow')
  })
  it('hides the context row when Show context is off', () => {
    const { container } = render(<ChatInput showContext={false} />)
    expect(container.querySelector('.bb-chat-input__context')).toBeNull()
  })
  it('reports typing through onInput and sends on Enter, clearing its own draft', () => {
    const onInput = vi.fn()
    const onSend = vi.fn()
    render(<ChatInput onInput={onInput} onSend={onSend} />)
    fireEvent.input(field(), { target: { value: 'Primary colour?' } })
    expect(onInput).toHaveBeenLastCalledWith('Primary colour?')
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('Primary colour?')
    expect(field().value).toBe('')
  })
  it('keeps Shift+Enter for a newline and never sends empty text', () => {
    const onSend = vi.fn()
    render(<ChatInput value="Line one" onSend={onSend} />)
    fireEvent.keyDown(field(), { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenCalledWith('Line one')
  })
  it('marks Send unavailable while the field is empty', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const send = screen.getByRole('button', { name: 'Send' })
    expect(send.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(send)
    expect(onSend).not.toHaveBeenCalled()
  })
  it('swaps Send for Stop while generating, with the Generating hint', () => {
    const onStop = vi.fn()
    const onSend = vi.fn()
    render(<ChatInput state="generating" value="What variables are used in this component?" onStop={onStop} onSend={onSend} />)
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
    expect(screen.getByText('Reading Brand UI…')).toBeInTheDocument()
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Stop generating' }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })
  it('shows the Sources bar in place of the context row in the Sources state (Figma "source expend")', () => {
    const onManageSources = vi.fn()
    const onSend = vi.fn()
    const { container } = render(
      <ChatInput state="sources" value="Primary colour?" onManageSources={onManageSources} onSend={onSend} sources={[<span key="a">Brand UI variables</span>, <span key="b">+2</span>]} />,
    )
    expect(container.querySelector('.bb-chat-input')!.getAttribute('data-state')).toBe('sources')
    expect(container.querySelector('.bb-chat-input__context')).toBeNull()
    const bar = screen.getByLabelText('Sources in use')
    expect(bar).toHaveTextContent('Sources')
    expect(bar).toHaveTextContent('Brand UI variables')
    expect(bar).toHaveTextContent('+2')
    fireEvent.click(screen.getByRole('button', { name: 'Manage sources' }))
    expect(onManageSources).toHaveBeenCalledTimes(1)
    // The field still works like Idle: hint, Send.
    expect(screen.getByText('Answers cite your sources')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenCalledWith('Primary colour?')
  })
  it('defaults the Sources bar to the Figma chips and leaves out Manage sources without a handler', () => {
    render(<ChatInput state="sources" />)
    expect(screen.getByLabelText('Sources in use')).toHaveTextContent(/Brand UI variables.*Components.*Icons.*Type styles.*\+2/)
    expect(screen.queryByRole('button', { name: 'Manage sources' })).toBeNull()
  })
  it('wires the tool buttons', () => {
    const onAddSource = vi.fn()
    const onUseSelection = vi.fn()
    render(<ChatInput onAddSource={onAddSource} onUseSelection={onUseSelection} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use selection' }))
    expect(onAddSource).toHaveBeenCalledTimes(1)
    expect(onUseSelection).toHaveBeenCalledTimes(1)
  })
})
