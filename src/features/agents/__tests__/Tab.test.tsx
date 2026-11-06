import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport, type HandlerMap } from '@shared/bridge'
import { DEFAULT_INTEGRATIONS, INTEGRATIONS_MSG } from '@shared/integrations'
import { Tab } from '../ui/Tab'
import { createMockHandlers, MOCK_STEP } from '../mock'
import { SPEAK_MS } from '../run'
import { reset } from '../state'
import { MSG, type AgentFinding, type RunRequest, type RunResult } from '../messages'
import { agentById } from '../agents'

const TICK = 10
const RUN_TICKS = Math.ceil(100 / MOCK_STEP)

function renderTab(extra: HandlerMap = {}, ai = DEFAULT_INTEGRATIONS.ai) {
  const handlers: HandlerMap = { ...createMockHandlers({ tickMs: TICK }), [INTEGRATIONS_MSG.get]: async () => ({ ...DEFAULT_INTEGRATIONS, ai }), ...extra }
  const client = createRpcClient(createMockTransport(handlers, 0))
  return { ...render(<RpcProvider client={client}><Tab /></RpcProvider>), handlers }
}

const card = (name: string) => screen.getByRole('heading', { name }).closest('article') as HTMLElement
/** Let the mock sandbox tick `n` times (plus the bridge's zero-latency hops). */
const tick = async (n: number) => { for (let i = 0; i < n; i += 1) await act(async () => { await vi.advanceTimersByTimeAsync(TICK) }) }
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(5) })

describe('agents Tab', () => {
  beforeEach(() => { vi.useFakeTimers(); reset() })
  afterEach(() => { vi.useRealTimers() })

  it('opens on the gallery with the scope read from the sandbox and six idle agents', async () => {
    renderTab()
    await settle()
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run all on scope' })).toBeInTheDocument()
    expect(screen.getByText('3 frames · 148 layers selected')).toBeInTheDocument()
    for (const name of ['Accessibility', 'Content', 'UX writing', 'Spelling & grammar', 'Design system', 'Localization']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    expect(within(card('Spelling & grammar')).getByText('Needs a model key in Settings')).toBeInTheDocument()
    expect(screen.getByText('No runs yet in this session.')).toBeInTheDocument()
  })

  it('switches the scope and asks the sandbox again', async () => {
    renderTab()
    await settle()
    fireEvent.click(screen.getByRole('tab', { name: 'Whole page' }))
    await settle()
    expect(screen.getByRole('tab', { name: 'Whole page' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Checkout flow · 12 frames · 640 layers')).toBeInTheDocument()
  })

  it('opens Setup for a card, toggles rules and brand modes, and goes back', async () => {
    renderTab()
    await settle()
    fireEvent.click(within(card('Accessibility')).getByRole('button', { name: 'Run' }))
    expect(screen.getByRole('heading', { name: 'Accessibility agent' })).toBeInTheDocument()
    expect(screen.getByText('RULE PACK · WCAG 2.2')).toBeInTheDocument()
    const rule = screen.getByRole('checkbox', { name: '1.4.6 Contrast (enhanced)' })
    expect(rule).not.toBeChecked()
    fireEvent.click(rule)
    expect(rule).toBeChecked()
    fireEvent.click(screen.getByRole('tab', { name: 'Review only' }))
    expect(screen.getByText(/Review only lists each issue/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Ikea' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '‹ All agents' }))
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
  })

  it('runs an agent through the sandbox, streams findings and lands on Results with the run’s outputs', async () => {
    const annotate = vi.fn(async () => ({ annotated: 5 }))
    const report = vi.fn(async () => ({ nodeId: 'r', name: 'UX AI agents · Accessibility agent · Checkout flow' }))
    const { handlers } = renderTab({ [MSG.annotate]: annotate, [MSG.report]: report })
    await settle()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Run accessibility review' }))
    await tick(16)
    expect(screen.getByText(/Running \d+%/)).toBeInTheDocument()
    expect(screen.getByText(/FOUND SO FAR · \d+/)).toBeInTheDocument()
    await tick(RUN_TICKS + 2)
    expect(screen.getByText('Done · 14 issues')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 14' })).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(report).toHaveBeenCalled())
    expect(annotate).toHaveBeenCalledWith(expect.objectContaining({ findings: expect.arrayContaining([expect.objectContaining({ label: expect.stringContaining('WCAG 1.4.3') })]) }), expect.anything())
    await settle()
    expect(screen.getByText(/Dev Mode annotations on 5 layers/)).toBeInTheDocument()
    expect(handlers[MSG.run]).toBeDefined()
  })

  it('Stop tells the sandbox and returns to Setup', async () => {
    const stop = vi.fn(async () => undefined)
    renderTab({ [MSG.stop]: stop })
    await settle()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Run accessibility review' }))
    await tick(5)
    fireEvent.click(screen.getByRole('button', { name: 'Stop agent' }))
    await settle()
    expect(screen.getByRole('button', { name: 'Run accessibility review' })).toBeInTheDocument()
    expect(stop).toHaveBeenCalledWith(expect.objectContaining({ runId: expect.stringMatching(/^run-/) }), expect.anything())
    await tick(RUN_TICKS)
    expect(screen.getByRole('button', { name: 'Run accessibility review' })).toBeInTheDocument()
  })

  it('filters results, applies and ignores findings through the sandbox, and copies the rest for Jira', async () => {
    const apply = vi.fn(async (payload: { fixes: { id: string }[] }) => ({ applied: payload.fixes.map((f) => f.id), failed: [] }))
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderTab({ [MSG.apply]: apply as never })
    await settle()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Run accessibility review' }))
    await tick(RUN_TICKS + 2)
    fireEvent.click(screen.getByRole('tab', { name: 'Critical 2' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(within(screen.getAllByRole('listitem')[0]!).getByRole('button', { name: 'Apply fix' }))
    await settle()
    expect(apply).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('tab', { name: 'Critical 1' })).toBeInTheDocument()
    expect(screen.getByText('Done · 13 issues')).toBeInTheDocument()
    fireEvent.click(within(screen.getAllByRole('listitem')[0]!).getByRole('button', { name: 'Ignore' }))
    expect(screen.getByText('Nothing left in this filter.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'All 12' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply 4 safe fixes' }))
    await settle()
    expect(screen.getByRole('tab', { name: 'Fixable 0' })).toBeInTheDocument()
    expect(screen.getByText(/4 safe fixes applied in Figma/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy 8 for Jira' }))
    await settle()
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('* [serious]'))
  })

  it('explains a manual fix instead of applying it, and locates through the bridge', async () => {
    renderTab()
    await settle()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Run accessibility review' }))
    await tick(RUN_TICKS + 2)
    fireEvent.click(screen.getByRole('tab', { name: 'Minor 2' }))
    fireEvent.click(within(screen.getAllByRole('listitem')[0]!).getByRole('button', { name: 'Apply fix' }))
    // The chip and the notice both carry the advice; nothing was sent to the sandbox.
    expect(screen.getAllByText('Fix: name it for what it shows')).toHaveLength(2)
    fireEvent.click(within(screen.getAllByRole('listitem')[0]!).getByRole('button', { name: 'Locate' }))
    await settle()
    expect(screen.getByText('Done · 14 issues')).toBeInTheDocument()
  })

  it('talks to the agent by typing when there is no microphone, and acts on its reply', async () => {
    const apply = vi.fn(async (payload: { fixes: { id: string }[] }) => ({ applied: payload.fixes.map((f) => f.id), failed: [] }))
    renderTab({ [MSG.apply]: apply as never })
    await settle()
    fireEvent.click(card('Accessibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Run accessibility review' }))
    await tick(RUN_TICKS + 2)
    fireEvent.click(screen.getByRole('button', { name: '‹ All agents' }))
    fireEvent.click(screen.getByRole('button', { name: 'Talk to the agents' }))
    expect(screen.getByRole('heading', { name: 'Accessibility agent' })).toBeInTheDocument()
    expect(screen.getByText(/this window has no microphone access/)).toBeInTheDocument()
    fireEvent.input(screen.getByRole('textbox', { name: 'Ask the Accessibility agent' }), { target: { value: 'Please apply the fixes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await settle()
    expect(screen.getByText('Please apply the fixes')).toBeInTheDocument()
    // The reply shows as a message and, while speaking, as the Voice Bar transcript.
    expect(screen.getAllByText('Applying the safe fixes now; the rest need a design decision.').length).toBeGreaterThan(0)
    expect(screen.getByText('Speaking')).toBeInTheDocument()
    await waitFor(() => expect(apply).toHaveBeenCalled())
    await act(async () => { await vi.advanceTimersByTimeAsync(SPEAK_MS) })
    expect(screen.getByText('Ready')).toBeInTheDocument()
    // "[show-findings]" in the reply opens the Results screen, with the applied fixes gone.
    fireEvent.click(screen.getByRole('button', { name: 'Show me the findings' }))
    await settle()
    expect(screen.getByText('Done · 8 issues')).toBeInTheDocument()
  })

  it('Run all walks every agent one after another and unlocks Apply', async () => {
    renderTab()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Run all on scope' }))
    expect(screen.getByRole('heading', { name: 'Running all agents' })).toBeInTheDocument()
    expect(screen.getByText('0 of 6 agents done · 0 findings so far')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply 0 safe fixes' })).toBeDisabled()
    await tick(RUN_TICKS + 3)
    expect(screen.getByText(/1 of 6 agents done · 14 findings so far/)).toBeInTheDocument()
    expect(screen.getByText(/Waits for Design system to finish/)).toBeInTheDocument()
    await tick((RUN_TICKS + 3) * 5)
    expect(screen.getByText('6 of 6 agents done · 29 findings so far')).toBeInTheDocument()
    const apply = screen.getByRole('button', { name: 'Apply 16 safe fixes' })
    expect(apply).toBeEnabled()
    fireEvent.click(apply)
    await settle()
    expect(screen.getByRole('button', { name: '16 safe fixes applied' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Open Accessibility results' }))
    expect(screen.getByText('Done · 8 issues')).toBeInTheDocument()
  })

  it('Stop all returns to the gallery', async () => {
    renderTab()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Run all on scope' }))
    await tick(3)
    fireEvent.click(screen.getByRole('button', { name: 'Stop all' }))
    await settle()
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
  })
})

describe('agent scenarios', () => {
  beforeEach(() => { vi.useFakeTimers(); reset() })
  afterEach(() => { vi.useRealTimers() })

  const scopeInfo = { scope: 'selection', name: 'Checkout flow', frames: 3, layers: 148, empty: false }
  const finished = (request: RunRequest, extra: Partial<RunResult> = {}): RunResult => ({
    runId: request.runId, agent: request.agent, scope: scopeInfo, brandModes: [], steps: [], findings: [], score: 100, checked: 148, durationMs: 1, model: null, stopped: false, ...extra,
  } as RunResult)
  const open = async (name: string, id: Parameters<typeof agentById>[0]) => {
    await settle()
    fireEvent.click(within(card(name)).getByRole('button', { name: 'Run' }))
    fireEvent.click(screen.getByRole('button', { name: agentById(id).runLabel }))
    await settle()
  }

  it('says an agent isn’t plugged in before a run that needs a model', async () => {
    const run = vi.fn()
    renderTab({ [MSG.run]: run as never })
    await open('Spelling & grammar', 'spelling')
    expect(screen.getByRole('heading', { name: 'These agents aren’t plugged in' })).toBeInTheDocument()
    expect(run).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to agents' }))
    expect(screen.getByRole('heading', { name: 'UX AI agents' })).toBeInTheDocument()
  })

  it('says there’s nothing to check, and offers the whole page', async () => {
    renderTab({ [MSG.scope]: (async () => ({ ...scopeInfo, frames: 0, layers: 0, empty: true })) as never })
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Run all on scope' }))
    await settle()
    expect(screen.getByRole('heading', { name: 'Nothing to check' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Use the whole page' }))
    await settle()
    expect(screen.getByRole('tab', { name: 'Whole page' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the scene for a failed model request, not a clean result', async () => {
    renderTab({ [MSG.run]: (async (r: RunRequest) => finished(r, { failure: { kind: 'network', message: 'offline', provider: 'claude' } })) as never })
    await open('Accessibility', 'accessibility')
    expect(screen.getByRole('heading', { name: 'Someone tripped over the wire' })).toBeInTheDocument()
    expect(screen.getByText(/Accessibility couldn’t reach Claude/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nothing to fix!' })).toBeNull()
  })

  it('offers what a failed run found so far', async () => {
    const findings = [{ id: 'accessibility:1', severity: 'minor', fixable: false, nodeIds: [] }] as unknown as AgentFinding[]
    renderTab({ [MSG.run]: (async (r: RunRequest) => finished(r, { findings, failure: { kind: 'lost', message: 'gone', provider: 'claude' } })) as never })
    await open('Accessibility', 'accessibility')
    expect(screen.getByRole('heading', { name: 'The line dropped mid-run' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'See 1 finding' })).toBeInTheDocument()
  })

  it('celebrates a clean run', async () => {
    renderTab({ [MSG.run]: (async (r: RunRequest) => finished(r)) as never })
    await open('Accessibility', 'accessibility')
    expect(screen.getByRole('heading', { name: 'Nothing to fix!' })).toBeInTheDocument()
    expect(screen.getByText(/Accessibility checked 148 layers/)).toBeInTheDocument()
  })

  it('shows the scene when the run itself fails, and can run again', async () => {
    let calls = 0
    renderTab({ [MSG.run]: (async (r: RunRequest) => { calls += 1; if (calls === 1) throw new Error('Figma said no'); return finished(r) }) as never })
    await open('Accessibility', 'accessibility')
    expect(screen.getByRole('heading', { name: 'Well, that wasn’t meant to happen' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Run again' }))
    await settle()
    expect(calls).toBe(2)
    expect(screen.getByRole('heading', { name: 'Nothing to fix!' })).toBeInTheDocument()
  })

  it('stops Run all at the agent that failed, then carries on from it', async () => {
    const ran: string[] = []
    let failed = false
    renderTab({ [MSG.run]: (async (r: RunRequest) => {
      ran.push(r.agent)
      if (r.agent === 'content' && !failed) { failed = true; return finished(r, { failure: { kind: 'lost', message: 'gone', provider: 'claude' } }) }
      return finished(r)
    }) as never })
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Run all on scope' }))
    await settle()
    await settle()
    expect(screen.getByText('The line dropped mid-run')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getAllByText('Waiting for you to retry Content').length).toBeGreaterThan(0)
    const before = ran.length
    fireEvent.click(screen.getByRole('button', { name: 'Retry Content' }))
    await settle()
    await settle()
    expect(ran.slice(before)[0]).toBe('content')
    expect(ran.filter((a) => a === 'accessibility')).toHaveLength(1)
    expect(screen.queryByText('Failed')).toBeNull()
  })
})

