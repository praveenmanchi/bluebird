import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport, type HandlerMap } from '@shared/bridge'
import { LIBRARIES_MSG, type LibraryLoadResult } from '@shared/libraries'
import { Tab } from '../ui/Tab'
import { createMockHandlers, type UxaiMockOptions } from '../mock'
import { STEP_MS } from '../chat'
import { SAMPLE_LIBRARY } from '../fixtures'

const READY: LibraryLoadResult = { status: 'ready', index: { ...SAMPLE_LIBRARY, loadedAt: Date.now() } }

async function renderTab(options: UxaiMockOptions = { libraries: READY }, extra: HandlerMap = {}) {
  const client = createRpcClient(createMockTransport({ ...createMockHandlers(options), ...extra }, 0))
  const view = render(<RpcProvider client={client}><Tab /></RpcProvider>)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  return view
}

/** Lets the lookup resolve and the thinking steps play out. */
async function finish() {
  await act(async () => { await vi.advanceTimersByTimeAsync(STEP_MS * 4) })
}

function ask_(prompt: string) { ask(prompt) }

function ask(prompt: string) {
  fireEvent.input(screen.getByRole('textbox', { name: 'Ask UX AI' }), { target: { value: prompt } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('uxai Tab with Dual File libraries', () => {
  it('lists the library files as its sources', async () => {
    await renderTab()
    const cards = within(screen.getByRole('list', { name: 'Sources' })).getAllByRole('listitem')
    expect(cards.map((c) => c.textContent)).toEqual([expect.stringContaining('Brand UI'), expect.stringContaining('Components')])
    expect(screen.getByText(/From Settings › Dual File Mode · read just now/)).toBeInTheDocument()
    expect(screen.getByText('2 sources')).toBeInTheDocument()
  })

  it('answers a colour question from the variables, with the real steps and values', async () => {
    await renderTab()
    ask('What is our primary colour?')
    expect(screen.getByText('Searching your libraries…')).toBeInTheDocument()
    await finish()
    expect(screen.getByText(/surface\/accent \(Brand UI\) is #0C8CE9 in Bridge and #161616 in Ikea/)).toBeInTheDocument()
    expect(screen.getByText('Searched Brand UI (4 variables, 1 collection)')).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'Matching variables' })
    expect(within(panel).getByText('Brand UI · Bridge #0C8CE9 (blue/500) · Ikea #161616')).toBeInTheDocument()
    expect(screen.queryByText('Resolves')).toBeNull()
  })

  it('opens a matching component in its library file', async () => {
    const onOpen = vi.fn()
    await renderTab({ libraries: READY, onOpen })
    ask('Show me the Button atom')
    await finish()
    const panel = screen.getByRole('region', { name: 'Matching components' })
    fireEvent.click(within(panel).getAllByRole('button', { name: 'Open in Figma ↗' })[0]!)
    fireEvent.click(within(panel).getByRole('button', { name: 'Open library ↗' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(onOpen.mock.calls).toEqual([['https://www.figma.com/design/COMP2/?node-id=40000040-5139'], ['https://www.figma.com/design/COMP2/']])
  })

  it('checks the selection against the libraries', async () => {
    await renderTab()
    ask('What variables are used in this?')
    await finish()
    const report = screen.getByRole('region', { name: 'Selection checked against your libraries' })
    const rows = within(within(report).getByRole('list', { name: 'Bound variables' })).getAllByRole('listitem')
    expect(rows.map((r) => r.getAttribute('data-origin'))).toEqual(['library', 'other', 'library', 'library', 'local'])
    expect(within(rows[2]!).getByText('matched by name')).toBeInTheDocument()
    expect(within(report).getByRole('list', { name: 'Component instances' })).toHaveTextContent('Avatar')
    expect(screen.queryByRole('region', { name: 'Variables in Ticket Row' })).toBeNull()
  })

  it('stops a grounded answer while it is looking things up', async () => {
    await renderTab()
    ask('What is our primary colour?')
    fireEvent.click(screen.getByRole('button', { name: 'Stop generating' }))
    await finish()
    expect(screen.getByText('Stopped. Ask again when you’re ready.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Matching variables' })).toBeNull()
  })

  it('has Claude write the answer from the matching library context, keeping the artifacts', async () => {
    const ask = vi.fn(async () => ({ status: 'answered' as const, text: 'Use surface/accent for primary actions.', model: 'claude-opus-4-5' }))
    await renderTab({ libraries: READY, ask })
    ask_('What is our primary colour?')
    await finish()
    expect(screen.getByText('Use surface/accent for primary actions.')).toBeInTheDocument()
    expect(screen.getByText('Answered by Claude · claude-opus-4-5')).toBeInTheDocument()
    expect(screen.getByText('Asked Claude (claude-opus-4-5) with what matched')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Matching variables' })).toBeInTheDocument()
    const { messages } = (ask.mock.calls[0] as unknown as [{ messages: { content: string }[] }])[0]
    expect(messages.at(-1)!.content).toMatch(/surface\/accent \[COLOR, Brand UI\][\s\S]*Question: What is our primary colour\?$/)
  })

  it('keeps the library answer and says why when Claude fails', async () => {
    await renderTab({ libraries: READY, ask: async () => { throw new Error('Anthropic rejected the Claude API key.') } })
    ask_('What is our primary colour?')
    await finish()
    expect(screen.getByText(/surface\/accent \(Brand UI\) is #0C8CE9.*\(Claude couldn’t answer: Anthropic rejected the Claude API key\.\)/)).toBeInTheDocument()
  })

  it('keeps unticked files unticked across a refresh', async () => {
    await renderTab()
    const cards = () => within(screen.getByRole('list', { name: 'Sources' })).getAllByRole('checkbox')
    fireEvent.click(cards()[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(cards().map((c) => c.getAttribute('aria-checked') ?? String((c as HTMLInputElement).checked))).toEqual(['true', 'false'])
  })

  it('shows no sources, with the reason, when Dual File isn’t set up', async () => {
    await renderTab({ libraries: { status: 'not-configured', reason: 'empty', message: 'Add your library files in Settings › Dual File Mode.' } })
    expect(screen.getByText('No libraries connected')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Sources' })).toBeNull()
    ask('What is our primary colour?')
    await finish()
    expect(screen.getByText(/Your primary colour is surface\/accent/)).toBeInTheDocument()
  })

  it('explains a failed load and retries it', async () => {
    let calls = 0
    await renderTab({}, { [LIBRARIES_MSG.load]: async () => { calls++; if (calls === 1) throw new Error('Figma is rate-limiting requests.'); return READY } })
    expect(screen.getByRole('alert')).toHaveTextContent('Figma is rate-limiting requests.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(calls).toBe(2)
    expect(screen.getByText(/From Settings › Dual File Mode/)).toBeInTheDocument()
  })
})
