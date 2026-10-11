import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport, type HandlerMap } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { createMockHandlers } from '../mock'
import { MSG } from '../messages'
import { STEP_MS } from '../chat'
import { NODES, SAMPLE_LIBRARY } from '../fixtures'

function renderTab(handlers: HandlerMap = createMockHandlers()) {
  const client = createRpcClient(createMockTransport(handlers, 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

/** Lets the fake "thinking" run to the end (the longest canned answer has three steps). */
function finishThinking() {
  act(() => { vi.advanceTimersByTime(STEP_MS * 4) })
}

function ask(prompt: string) {
  fireEvent.input(screen.getByRole('textbox', { name: 'Ask UX AI' }), { target: { value: prompt } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('uxai Tab', () => {
  it('starts on Sources with no sample cards and no unwired actions', () => {
    renderTab()
    expect(screen.getByRole('heading', { name: 'Knowledge sources' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Sources' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Upload file' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add Figma library' })).toBeNull()
    expect(screen.queryByText(/^Drop variable, component/)).toBeNull()
    expect(screen.getByRole('button', { name: 'What is our primary colour?' })).toBeInTheDocument()
    expect(screen.getByText('0 sources')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back to conversation' })).toBeNull()
  })

  it('answers a colour prompt chip after thinking, with the Color Artifact and follow-ups', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'What is our primary colour?' }))

    const thread = screen.getByRole('log', { name: 'Conversation' })
    expect(within(thread).getByText('What is our primary colour?')).toBeInTheDocument()
    expect(screen.getByText('Searching your variables…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument()

    finishThinking()
    expect(screen.getByText(/Your primary colour is surface\/accent/)).toBeInTheDocument()
    expect(screen.getByText('Thought for 2s')).toBeInTheDocument()
    expect(screen.getByText('Resolves')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Swap it on my selection' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('reveals the thinking steps one by one while the answer runs', () => {
    renderTab()
    ask('Which icons do we use for status?')
    const step = (label: string) => screen.queryByText(label)?.closest('[data-status]')?.getAttribute('data-status')
    expect(step('Read Iconography · 69 glyphs')).toBe('running')
    expect(screen.queryByText('Read Components · Status error icons (4 variants)')).toBeNull()
    act(() => { vi.advanceTimersByTime(STEP_MS) })
    expect(step('Read Iconography · 69 glyphs')).toBe('done')
    expect(step('Read Components · Status error icons (4 variants)')).toBe('running')
    expect(screen.getByText('Searching Iconography…')).toBeInTheDocument()
  })

  it('stops the fake thinking and never answers', () => {
    renderTab()
    ask('What is our primary colour?')
    fireEvent.click(screen.getByRole('button', { name: 'Stop generating' }))
    finishThinking()
    expect(screen.getByText(/Stopped/)).toBeInTheDocument()
    expect(screen.queryByText('Resolves')).toBeNull()
  })

  it('answers a component question with the Component Artifact and focuses the set in Figma', async () => {
    const focus = vi.fn(async () => undefined)
    renderTab({ ...createMockHandlers(), [MSG.focus]: focus })
    fireEvent.click(screen.getByRole('button', { name: 'Show me the Button atom' }))
    finishThinking()
    expect(screen.getByText(/Button is an atom on the Components page/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go to component ↗' }))
    await act(async () => { await vi.runAllTimersAsync() })
    expect(focus).toHaveBeenCalledWith({ nodeId: NODES.button }, expect.anything())
  })

  it('opens the Selection view for a selection question; swaps mark rows Changed until Discard', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'What variables does my selection use?' }))
    finishThinking()
    expect(screen.getByRole('region', { name: 'Selection' })).toBeInTheDocument()
    expect(screen.getByText('Variables in Ticket Row')).toBeInTheDocument()
    expect(screen.getByText('1 change · 3 variants')).toBeInTheDocument()
    expect(screen.getByText('Ticket Row · State=Selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Swap jira/text/key' }))
    fireEvent.click(screen.getByRole('option', { name: 'surface/accent-subtle' }))
    expect(screen.getByText('2 changes · 3 variants')).toBeInTheDocument()
    expect(screen.getByText('Text fill · Key · pending: surface/accent-subtle')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByText('0 changes · 3 variants')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('applies swaps as the new bindings', () => {
    renderTab()
    ask('Swap it on my selection')
    finishThinking()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByText('0 changes · 3 variants')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Swap surface/accent' })).toBeInTheDocument()
  })

  it('goes to Sources from "Manage sources", and source toggles update the chips', async () => {
    renderTab(createMockHandlers({ libraries: { status: 'ready', index: SAMPLE_LIBRARY } }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    ask('What is our primary colour?')
    await act(async () => { await vi.advanceTimersByTimeAsync(STEP_MS * 4) })
    expect(screen.getByLabelText('Sources in use')).toHaveTextContent('Brand UI')

    fireEvent.click(screen.getByRole('button', { name: 'Manage sources' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include Brand UI' }))
    expect(screen.getByText('1 source')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to conversation' }))
    expect(screen.getByLabelText('Sources in use')).not.toHaveTextContent('Brand UI')
    expect(screen.getByText(/surface\/accent \(Brand UI\)/)).toBeInTheDocument()
  })

  it('drafts the selection question from the Use selection tool', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Use selection' }))
    expect(screen.getByRole('textbox', { name: 'Ask UX AI' })).toHaveValue('What variables are used in this?')
  })
})
