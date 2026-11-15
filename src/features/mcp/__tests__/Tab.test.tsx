import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createMockTransport, createRpcClient, type HandlerMap } from '@shared/bridge'
import { Tab, TRACK_EVERY_MS } from '../ui/Tab'
import { clock } from '../ui/McpHandoff'
import { createMockHandlers, type McpMockOptions } from '../mock'
import { MSG, type TrackResult } from '../messages'
import { CHECKOUT, SAMPLE_IMPACT, SAMPLE_PULL, SAMPLE_RELEASES, TICKET_ROW } from '../fixtures'
import { applySelection, branch, detectKind, kind, mcpConnected, reset, startOver, step, trackResult } from '../state'

const TICKET_PATH = 'Molecules › Jira · 3 variants'

/** Renders the tab and waits for the mock selection to arrive (the tab reads the canvas on mount). */
async function renderTab(options: McpMockOptions | HandlerMap = {}, awaitSelection: string | false = TICKET_PATH) {
  const handlers = typeof (options as HandlerMap)[MSG.selection] === 'function' ? options as HandlerMap : createMockHandlers(options as McpMockOptions)
  const client = createRpcClient(createMockTransport(handlers, 0))
  const result = render(<RpcProvider client={client}><Tab /></RpcProvider>)
  if (awaitSelection) await screen.findByText(awaitSelection)
  return result
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const tab = (name: string) => screen.getByRole('tab', { name })
const currentStep = () => document.querySelector('[aria-current="step"]')?.textContent ?? null
const status = () => screen.getByRole('status')
const next = (label: string) => fireEvent.click(button(label))
const stubClipboard = () => {
  const writeText = vi.fn(async (_text: string) => undefined)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  return writeText
}
const copied = (writeText: ReturnType<typeof stubClipboard>, call = 0) => String(writeText.mock.calls[call]?.[0])
/** Select → Check (waits for the checks) → Hand off. */
async function toHandOff() {
  next('Next: Check')
  await screen.findByRole('list', { name: 'Handoff checks' })
  next('Next: Hand off')
}
/** Hand off → Copy prompt → Track. */
async function toTrack() {
  await toHandOff()
  next('Copy prompt')
  await waitFor(() => expect(currentStep()).toContain('Track'))
}

afterEach(() => {
  cleanup()
  reset()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('mcp Tab — Select (Figma "MCP flow v3 · 600")', () => {
  it('opens on Select with the selection read from Figma, what was detected and the scenario’s repository', async () => {
    await renderTab()
    expect(currentStep()).toContain('Select')
    expect(tab('Component')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(TICKET_PATH)).toBeInTheDocument()
    expect(screen.getByText('Component set')).toBeInTheDocument()
    expect(screen.getByText('3 variants')).toBeInTheDocument()
    expect(screen.getByText('3 properties')).toBeInTheDocument()
    expect(screen.getByText('42 layers')).toBeInTheDocument()
    expect(screen.getByText('Figma MCP server')).toBeInTheDocument()
    expect(screen.getByText('Component repository')).toBeInTheDocument()
    expect(screen.getByText('acme/design-system · base main')).toBeInTheDocument()
    expect(status()).toHaveTextContent('Ticket Row · component · goes to acme/design-system')
  })

  it('treats a frame as the Screen scenario, with the screen repository', async () => {
    await renderTab({ scenario: 'screen' }, 'Web › Checkout flow')
    expect(tab('Screen')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Screen repository')).toBeInTheDocument()
    expect(screen.getByText('acme/web · base develop')).toBeInTheDocument()
    expect(detectKind('COMPONENT')).toBe('component')
    expect(detectKind('INSTANCE')).toBe('screen')
  })

  it('lets the designer pick the scenario by hand', async () => {
    await renderTab()
    fireEvent.click(tab('Screen'))
    expect(tab('Screen')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('acme/web · base develop')).toBeInTheDocument()
  })

  it('takes an optional Jira issue key and refuses one that isn’t a key', async () => {
    await renderTab()
    const issue = screen.getByLabelText('Jira issue (optional)')
    fireEvent.input(issue, { target: { value: 'bb-142' } })
    expect(issue).toHaveValue('BB-142')
    expect(status()).toHaveTextContent('BB-142')
    expect(button('Next: Check')).toBeEnabled()
    fireEvent.input(issue, { target: { value: 'ticket' } })
    expect(screen.getAllByText('Use the issue key, e.g. BB-142').length).toBeGreaterThan(0)
    expect(button('Next: Check')).toBeDisabled()
  })

  it('asks Figma to reveal the selected frame', async () => {
    const focus = vi.fn(async () => undefined)
    await renderTab({ ...createMockHandlers(), [MSG.focus]: focus })
    fireEvent.click(button('Open in Figma'))
    await waitFor(() => expect(focus).toHaveBeenCalled())
    expect((focus.mock.calls[0] as unknown[])[0]).toEqual({ nodeId: TICKET_ROW.nodeId })
  })

  it('switches the Figma MCP server between remote and local, and copies the matching setup', async () => {
    const writeText = stubClipboard()
    await renderTab()
    next('Copy MCP setup')
    await waitFor(() => expect(status()).toHaveTextContent('registers the remote Figma MCP server'))
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('claude mcp add --transport http figma https://mcp.figma.com/mcp'))
    fireEvent.click(button('Use local'))
    expect(screen.getByText('Local · 127.0.0.1:3845/mcp')).toBeInTheDocument()
    next('Copy MCP setup')
    await waitFor(() => expect(status()).toHaveTextContent('registers the desktop Figma MCP server'))
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('http://127.0.0.1:3845/mcp'))
  })
})

describe('mcp Tab — Check and Hand off', () => {
  it('runs the checks on entering Check and lists what the selection is built from', async () => {
    await renderTab()
    next('Next: Check')
    expect(currentStep()).toContain('Check')
    expect(await screen.findByText('84%')).toBeInTheDocument()
    expect(screen.getByText('98% bound to variables · 1 unbound gap (6px)')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Built from' })).toHaveTextContent('Meta Badge')
    expect(screen.getByText('6 instances · from a library')).toBeInTheDocument()
    expect(status()).toHaveTextContent('Ready to hand off · 2 warnings won’t block it')
    next('Back')
    expect(currentStep()).toContain('Select')
  })

  it('shows the real prompt on Hand off, with the repository from Settings', async () => {
    await renderTab({ fileKey: 'AbC123' })
    await toHandOff()
    expect(currentStep()).toContain('Hand off')
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveTextContent('Implement the Figma component set "Ticket Row" (Molecules › Jira · 3 variants) using the Figma MCP server.')
    expect(panel).toHaveTextContent('get_design_context on https://www.figma.com/design/AbC123?node-id=40000267-8004 (node 40000267:8004)')
    expect(panel).toHaveTextContent('Variants: State = Default, Hover, Selected.')
    expect(panel).toHaveTextContent('Built from: Meta Badge, Avatar, Issue Type, Priority Icon.')
    expect(panel).toHaveTextContent('- Variables: 98% bound to variables · 1 unbound gap (6px)')
    expect(panel).toHaveTextContent('Repository: acme/design-system (base main).')
    expect(screen.getByLabelText('Branch')).toHaveValue('feat/ticket-row')
    expect(status()).toHaveTextContent('Prompt ready · 4 components to reuse · goes to acme/design-system')
  })

  it('follows the options: Include, styling, Update existing and the branch', async () => {
    await renderTab()
    await toHandOff()
    const panel = () => screen.getByRole('tabpanel')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Storybook story' }))
    expect(panel()).toHaveTextContent('Include: Code Connect mapping, Test.')
    fireEvent.click(button('Styling'))
    fireEvent.click(screen.getByText('Tailwind'))
    expect(panel()).toHaveTextContent('Styling: Tailwind.')
    fireEvent.click(tab('Update existing'))
    expect(panel()).toHaveTextContent('Update the existing component set "Ticket Row" to match Figma')
    expect(screen.getByRole('checkbox', { name: 'Update Code Connect' })).toBeChecked()
    expect(screen.getByLabelText('Branch')).toHaveValue('chore/ticket-row')
    expect(status()).toHaveTextContent('Update prompt ready')
    fireEvent.input(screen.getByLabelText('Branch'), { target: { value: 'feat/my branch' } })
    expect(button('Copy prompt')).toBeDisabled()
    fireEvent.input(screen.getByLabelText('Branch'), { target: { value: 'feat/BB-9-row' } })
    expect(panel()).toHaveTextContent('Branch: feat/BB-9-row.')
    expect(button('Copy prompt')).toBeEnabled()
  })

  it('switches the snippet between the prompt, the MCP setup and what gets built', async () => {
    await renderTab()
    await toHandOff()
    fireEvent.click(tab('MCP setup'))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('claude mcp add --transport http figma https://mcp.figma.com/mcp')
    fireEvent.click(tab('What gets built'))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('src/components/TicketRow/TicketRow story — Storybook, one story per variant')
  })

  it('builds a screen prompt that imports from the design-system package', async () => {
    await renderTab({ scenario: 'screen' }, 'Web › Checkout flow')
    await toHandOff()
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveTextContent('Rebuild the Figma screen "Checkout"')
    expect(panel).toHaveTextContent('Import design-system components from @acme/ui.')
    expect(panel).toHaveTextContent('Repository: acme/web (base develop).')
  })
})

describe('mcp Tab — Track', () => {
  it('copies the prompt, moves to Track and asks GitHub for the pull request', async () => {
    const writeText = stubClipboard()
    const track = vi.fn(async (): Promise<TrackResult> => ({ state: 'waiting', repo: 'acme/design-system', branch: 'feat/ticket-row' }))
    await renderTab({ ...createMockHandlers(), [MSG.track]: track })
    await toTrack()
    expect(copied(writeText)).toContain('Implement the Figma component set "Ticket Row"')
    await waitFor(() => expect(track).toHaveBeenCalled())
    expect((track.mock.calls[0] as unknown[])[0]).toEqual({ scenario: 'component', branch: 'feat/ticket-row' })
    expect(await screen.findByText('Waiting for the pull request')).toBeInTheDocument()
    expect(screen.getByText('Watching acme/design-system for feat/ticket-row')).toBeInTheDocument()
    expect(screen.getByText('You can close the plugin')).toBeInTheDocument()
    expect(screen.getAllByText(/paste it into Claude Code in acme\/design-system/).length).toBeGreaterThan(0)
  })

  it('shows the pull request once GitHub has it, and opens it through the sandbox', async () => {
    stubClipboard()
    const open = vi.fn(async () => undefined)
    await renderTab({ ...createMockHandlers({ pull: 'open' }), [MSG.open]: open })
    await toTrack()
    expect(await screen.findByText(`PR #${SAMPLE_PULL.number} is open`)).toBeInTheDocument()
    expect(screen.getByLabelText('Share it with your team')).toHaveValue(SAMPLE_PULL.url)
    expect(status()).toHaveTextContent(`Pull request #${SAMPLE_PULL.number} in acme/design-system`)
    next('Open PR')
    await waitFor(() => expect(open).toHaveBeenCalled())
    expect((open.mock.calls[0] as unknown[])[0]).toEqual({ url: SAMPLE_PULL.url })
    next('New handoff')
    expect(currentStep()).toContain('Select')
  })

  it('looks again on a timer while it waits', async () => {
    stubClipboard()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await renderTab() // the default mock: waiting on the first look, open from the second
    await toTrack()
    expect(await screen.findByText('Waiting for the pull request')).toBeInTheDocument()
    await waitFor(() => expect(button('Check now')).toBeEnabled()) // the first look has answered: no pull request yet
    await act(async () => { await vi.advanceTimersByTimeAsync(TRACK_EVERY_MS + 50) })
    expect(await screen.findByText(`PR #${SAMPLE_PULL.number} is open`)).toBeInTheDocument()
  })

  it('reports why GitHub could not be asked, and tries again', async () => {
    stubClipboard()
    const handlers = createMockHandlers({ pull: 'merged' })
    const good = handlers[MSG.track]!
    handlers[MSG.track] = async () => { throw new Error('GitHub rejected the token for acme/design-system.') }
    await renderTab(handlers)
    await toTrack()
    expect(await screen.findByText('Couldn’t ask GitHub')).toBeInTheDocument()
    expect(screen.getByText('GitHub rejected the token for acme/design-system.')).toBeInTheDocument()
    handlers[MSG.track] = good
    next('Check now')
    expect(await screen.findByText(`PR #${SAMPLE_PULL.number} is merged`)).toBeInTheDocument()
  })

  it('stays on Hand off when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    await renderTab()
    await toHandOff()
    next('Copy prompt')
    await waitFor(() => expect(status()).toHaveTextContent('Copying is blocked'))
    expect(currentStep()).toContain('Hand off')
    next('Next: Track') // the prompt can be selected by hand, so tracking is still reachable
    expect(currentStep()).toContain('Track')
    expect(await screen.findByText('Waiting for the pull request')).toBeInTheDocument()
  })

  it('keeps watching the handed-off branch when the canvas selection moves on, and picks the new selection up afterwards', async () => {
    const writeText = stubClipboard()
    const track = vi.fn(async (): Promise<TrackResult> => ({ state: 'waiting', repo: 'acme/design-system', branch: 'feat/ticket-row' }))
    await renderTab({ ...createMockHandlers(), [MSG.track]: track })
    await toTrack()
    await waitFor(() => expect(button('Check now')).toBeEnabled())
    act(() => { applySelection({ selected: CHECKOUT, count: 1, fileName: 'File', fileKey: null }) })
    expect(step.value).toBe(3)
    expect(kind.value).toBe('component')
    expect(branch.value).toBe('feat/ticket-row')
    expect(status()).not.toHaveTextContent('checkout')
    next('Check now')
    await waitFor(() => expect(track).toHaveBeenCalledTimes(2))
    expect((track.mock.calls[1] as unknown[])[0]).toEqual({ scenario: 'component', branch: 'feat/ticket-row' })
    next('Copy prompt again')
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    expect(copied(writeText, 1)).toContain('"Ticket Row"')
    next('Back')
    expect(currentStep()).toContain('Select')
    expect(await screen.findByText('Web › Checkout flow')).toBeInTheDocument()
    expect(tab('Screen')).toHaveAttribute('aria-selected', 'true')
  })

  it('ignores an answer that belongs to a hand-off that was started over', async () => {
    stubClipboard()
    let answer: (r: TrackResult) => void = () => undefined
    const slow = () => new Promise<TrackResult>((resolve) => { answer = resolve })
    await renderTab({ ...createMockHandlers(), [MSG.track]: slow })
    await toTrack()
    act(() => { startOver() })
    await act(async () => { answer({ state: 'open', repo: 'acme/design-system', branch: 'feat/ticket-row', ...SAMPLE_PULL }); await Promise.resolve() })
    expect(trackResult.value).toBeNull()
    expect(currentStep()).toContain('Select')
  })

  it('says so when a timed look fails, instead of waiting forever', async () => {
    stubClipboard()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const handlers = createMockHandlers({ pull: 'waiting' })
    await renderTab(handlers)
    await toTrack()
    await waitFor(() => expect(button('Check now')).toBeEnabled())
    handlers[MSG.track] = async () => { throw new Error('GitHub rejected the token for Component to Storybook.') }
    await act(async () => { await vi.advanceTimersByTimeAsync(TRACK_EVERY_MS + 50) })
    expect(await screen.findByText('Couldn’t ask GitHub')).toBeInTheDocument()
  })

  it('formats the time the prompt was copied', () => {
    expect(clock(new Date(2026, 10, 15, 9, 5))).toBe('09:05')
  })
})

describe('mcp Tab — empty states', () => {
  it('asks for the MCP server first, and connects to the remote one', async () => {
    mcpConnected.value = false
    await renderTab({}, false)
    expect(await screen.findByText('Connect the Figma MCP server')).toBeInTheDocument()
    expect(button('Next: Check')).toBeDisabled()
    next('Use remote server')
    expect(await screen.findByText(TICKET_PATH)).toBeInTheDocument()
    expect(button('Next: Check')).toBeEnabled()
  })

  it('shows "Nothing selected" when the canvas has no selection, and reads it again on request', async () => {
    const handlers = createMockHandlers({ nothingSelected: true })
    await renderTab(handlers, false)
    expect(await screen.findByText('Select a frame or component')).toBeInTheDocument()
    expect(button('Next: Check')).toBeDisabled()
    handlers[MSG.selection] = createMockHandlers()[MSG.selection]!
    next('Use current selection')
    expect(await screen.findByText(TICKET_PATH)).toBeInTheDocument()
  })

  it('asks for the scenario’s repository when Settings has none, without touching the other scenarios', async () => {
    await renderTab({ notConnected: ['component'] }, false)
    expect(await screen.findByText('Connect a repository for Component to Storybook')).toBeInTheDocument()
    expect(screen.getByText(/Add the repository and personal access token for Component to Storybook in Settings › MCP \+ code sync\. The other scenarios are not affected\./)).toBeInTheDocument()
    const list = screen.getByRole('region', { name: 'Repositories by scenario' })
    expect(list).toHaveTextContent('Component to StorybookNot connected')
    expect(list).toHaveTextContent('acme/web · base develop')
    expect(button('Next: Check')).toBeDisabled()
    expect(status()).toHaveTextContent('Connect a repository to use Component.')
    fireEvent.click(tab('Screen'))
    expect(await screen.findByText(TICKET_PATH)).toBeInTheDocument()
    expect(button('Next: Check')).toBeEnabled()
  })
})

describe('mcp Tab — error states', () => {
  it('locks Hand off while checks fail (Figma "Error · Not ready")', async () => {
    await renderTab({ scenario: 'not-ready' })
    next('Next: Check')
    expect(await screen.findByText('42%')).toBeInTheDocument()
    expect(screen.getByText('Hand off locked · 2 checks are failing')).toBeInTheDocument()
    expect(status()).toHaveTextContent('2 checks must pass before you can hand off')
    expect(button('Next: Hand off')).toBeDisabled()
  })

  it('offers Try again when the checks cannot run', async () => {
    const handlers = createMockHandlers()
    const good = handlers[MSG.check]!
    handlers[MSG.check] = async () => { throw new Error('That frame no longer exists. Select it again.') }
    await renderTab(handlers)
    next('Next: Check')
    expect(await screen.findByText('The checks could not run')).toBeInTheDocument()
    expect(status()).toHaveTextContent('That frame no longer exists. Select it again.')
    expect(button('Next: Hand off')).toBeDisabled()
    handlers[MSG.check] = good
    next('Try again')
    expect(await screen.findByText('84%')).toBeInTheDocument()
    expect(button('Next: Hand off')).toBeEnabled()
  })

  it('starts again from Select when the selection changes before the hand-off', async () => {
    await renderTab()
    await toHandOff()
    act(() => { applySelection({ selected: CHECKOUT, count: 1, fileName: 'File', fileKey: null }) })
    expect(currentStep()).toContain('Select')
    expect(tab('Screen')).toHaveAttribute('aria-selected', 'true')
    expect(status()).toHaveTextContent('Selection changed to Checkout — starting again from Select.')
  })
})

describe('mcp Tab — Library update (Figma "MCP v3 · Library update")', () => {
  /** Select → Library update: the releases load from the team History. */
  async function toChanges(options: McpMockOptions | HandlerMap = {}) {
    await renderTab(options)
    fireEvent.click(tab('Library update'))
    await waitFor(() => expect(currentStep()).toContain('Changes'))
  }

  it('lists the releases from the team History and what the newest one changed', async () => {
    await toChanges()
    expect(await screen.findByText('Approved changelog by Anita Rao · 14 Nov · Bridge DS · BB-351')).toBeInTheDocument()
    expect(button('Library release')).toHaveTextContent('Bridge DS 2.0 · 14 Nov')
    expect(screen.getByRole('region', { name: 'Library release' })).toHaveTextContent('Replaced by Switch')
    expect(screen.getByText('Breaking')).toBeInTheDocument()
    expect(screen.getByText(/8 variable changes arrive with the token push/)).toBeInTheDocument()
    expect(status()).toHaveTextContent('Bridge DS 2.0 · 3 components to look for in this file')
    fireEvent.click(button('Library release'))
    fireEvent.click(screen.getByText('Button refresh · 12 Nov'))
    expect(screen.getByText(/^Extraction by Praveen Manchi/)).toBeInTheDocument()
    expect(status()).toHaveTextContent('Button refresh · 1 component to look for in this file')
  })

  it('scans the file for the screens that use the changed components, and lets one be left out', async () => {
    const impact = vi.fn(createMockHandlers()[MSG.impact]!)
    const focus = vi.fn(async () => undefined)
    await toChanges({ ...createMockHandlers(), [MSG.impact]: impact, [MSG.focus]: focus })
    await screen.findByText(/Approved changelog/)
    next('Next: Impact')
    expect(currentStep()).toContain('Impact')
    await waitFor(() => expect(impact).toHaveBeenCalled())
    expect((impact.mock.calls[0] as unknown[])[0]).toEqual({ components: ['Button', 'Date picker', 'Toggle'] })
    expect(await screen.findByText('Checkout')).toBeInTheDocument()
    expect(screen.getByText('Web · Button ×12 · Toggle ×2 · uses a removed component')).toBeInTheDocument()
    expect(status()).toHaveTextContent('3 screens to update in acme/web · 2 with a breaking change')
    fireEvent.click(screen.getAllByRole('button', { name: 'Leave out' })[2]!)
    expect(screen.getByText(/^Left out · Web · Toggle ×3/)).toBeInTheDocument()
    expect(status()).toHaveTextContent('2 screens to update in acme/web · 1 with a breaking change')
    fireEvent.click(button('Show Checkout in Figma'))
    await waitFor(() => expect(focus).toHaveBeenCalled())
    expect((focus.mock.calls[0] as unknown[])[0]).toEqual({ nodeId: SAMPLE_IMPACT.screens[0]!.nodeId })
    // Selecting the screen on the canvas changes the selection: the library flow stays where it is.
    act(() => { applySelection({ selected: CHECKOUT, count: 1, fileName: 'File', fileKey: null }) })
    expect(currentStep()).toContain('Impact')
    expect(screen.getByText(/^Left out · Web · Toggle ×3/)).toBeInTheDocument()
    expect(screen.getByText('Accept the library update in this file')).toBeInTheDocument()
  })

  it('builds the update prompt with a branch per screen, then tracks every pull request', async () => {
    const writeText = stubClipboard()
    await toChanges()
    await screen.findByText(/Approved changelog/)
    next('Next: Impact')
    await screen.findByText('Checkout')
    next('Next: Hand off')
    expect(currentStep()).toContain('Hand off')
    expect(screen.getByLabelText('Branch prefix')).toHaveValue('chore/BB-351-bridge-ds-2-0')
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveTextContent('Update existing screens for the library release "Bridge DS 2.0"')
    expect(panel).toHaveTextContent('branch chore/BB-351-bridge-ds-2-0/sign-in')
    expect(status()).toHaveTextContent('Update prompt ready · 3 screens · goes to acme/web')
    next('Copy prompt')
    await waitFor(() => expect(currentStep()).toContain('Track'))
    expect(copied(writeText)).toContain('Screens to update (3):')
    expect(await screen.findByText('Checkout: PR #63 is open')).toBeInTheDocument()
    expect(screen.getByText('Cart: waiting for the pull request')).toBeInTheDocument()
    expect(status()).toHaveTextContent('1 of 3 pull requests opened…')
    next('Check now')
    expect(await screen.findByText('3 pull requests are open')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Open' })).toHaveLength(3)
    expect(status()).toHaveTextContent('3 pull requests in acme/web')
  })

  it('picks the newest release when a refresh drops the one in hand, and forgets its screens', async () => {
    const handlers = createMockHandlers()
    await toChanges(handlers)
    await screen.findByText(/Approved changelog/)
    next('Next: Impact')
    await screen.findByText('Checkout')
    fireEvent.click(screen.getAllByRole('button', { name: 'Leave out' })[0]!)
    next('Back')
    handlers[MSG.releases] = async () => ({ releases: [SAMPLE_RELEASES[1]!] })
    next('Refresh')
    expect(await screen.findByText(/^Extraction by Praveen Manchi/)).toBeInTheDocument()
    next('Next: Impact')
    expect(await screen.findByText('Checkout')).toBeInTheDocument()
    expect(screen.queryByText(/^Left out/)).toBeNull()
    expect(screen.getByText('Web · Button ×12')).toBeInTheDocument()
  })

  it('asks for the team History when Settings › Storage has no repository', async () => {
    await toChanges({ noHistory: true })
    expect(await screen.findByText('Connect the team History')).toBeInTheDocument()
    expect(button('Next: Impact')).toBeDisabled()
  })

  it('says when no screen in this file uses the changed components', async () => {
    await toChanges({ noImpact: true })
    await screen.findByText(/Approved changelog/)
    next('Next: Impact')
    expect(await screen.findByText('No screen uses these components')).toBeInTheDocument()
    expect(button('Next: Hand off')).toBeDisabled()
  })

  it('reports a scan that fails, and scans again', async () => {
    const handlers = createMockHandlers()
    const good = handlers[MSG.impact]!
    handlers[MSG.impact] = async () => { throw new Error('The page could not be loaded.') }
    await toChanges(handlers)
    await screen.findByText(/Approved changelog/)
    next('Next: Impact')
    expect(await screen.findByText('Couldn’t scan the file')).toBeInTheDocument()
    handlers[MSG.impact] = good
    next('Try again')
    expect(await screen.findByText('Checkout')).toBeInTheDocument()
  })

  it('asks for the library repository when it is not set up', async () => {
    await renderTab({ notConnected: ['library'] })
    fireEvent.click(tab('Library update'))
    expect(await screen.findByText('Connect a repository for Library update to screens')).toBeInTheDocument()
  })
})
