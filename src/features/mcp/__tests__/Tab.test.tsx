import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createMockTransport, createRpcClient, type HandlerMap } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { SHIP_STEP_MS, nextBranchName } from '../ui/McpHandoff'
import { createMockHandlers, type McpMockOptions } from '../mock'
import { MSG } from '../messages'
import { PULL_REQUEST, TICKET_ROW } from '../fixtures'
import { generation, mcpConnected, rejectNextPush, reset, selectScenario, steps } from '../state'

const TICKET_PATH = 'Plugin UI › Components › Jira · 3 variants'

/** Renders the tab and waits for the mock selection to arrive (the tab reads the canvas on mount). */
async function renderTab(options: McpMockOptions | HandlerMap = {}, awaitSelection = true) {
  const handlers = typeof (options as HandlerMap)[MSG.selection] === 'function' ? options as HandlerMap : createMockHandlers(options as McpMockOptions)
  const client = createRpcClient(createMockTransport(handlers, 0))
  const result = render(<RpcProvider client={client}><Tab /></RpcProvider>)
  if (awaitSelection) await screen.findByText(TICKET_PATH)
  return result
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const currentStep = () => document.querySelector('[aria-current="step"]')?.textContent ?? null
const status = () => screen.getByRole('status')
const next = (label: string) => fireEvent.click(button(label))
/** Select → Check (waits for the checks) → Generate. */
async function toGenerate() {
  next('Next: Check')
  await screen.findByRole('list', { name: 'Handoff checks' })
  next('Next: Generate')
}
/** Walk the happy path from Select to the Ship form. */
async function toShip() {
  await toGenerate()
  next('Next: Ship')
}
/** Run the fake push to the end (or to the rejection). */
function runPush() {
  act(() => { vi.advanceTimersByTime(SHIP_STEP_MS * (steps.value.length + 1)) })
}

afterEach(() => {
  cleanup()
  reset()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('mcp Tab — happy path (Figma "MCP flow v2 · 600")', () => {
  it('opens on Select with the selection read from Figma, the linked issue and the connections', async () => {
    await renderTab()
    expect(currentStep()).toContain('Select')
    expect(screen.getByText(TICKET_PATH)).toBeInTheDocument()
    expect(screen.getByText(/component set · 42 layers · One issue in the Jira tab/)).toBeInTheDocument()
    expect(screen.getByText('Jira tab: ticket list and detail view in Brand UI')).toBeInTheDocument()
    expect(screen.getByText('Figma MCP server')).toBeInTheDocument()
    expect(screen.getByText('praveenmanchi/bluebird · base main')).toBeInTheDocument()
    expect(status()).toHaveTextContent('Ticket Row · 3 variants · linked to BB-142')
  })

  it('runs the checks on entering Check, then steps to Generate with Back / Next', async () => {
    await renderTab()
    next('Next: Check')
    expect(currentStep()).toContain('Check')
    expect(await screen.findByText('84%')).toBeInTheDocument()
    expect(screen.getByText('98% bound to variables · 1 unbound gap (6px)')).toBeInTheDocument()
    expect(screen.getByText(/42 layers · 14 instances \(14 from the library\) · 49 of 50 values bound/)).toBeInTheDocument()
    expect(status()).toHaveTextContent('Ready to generate · 2 warnings won’t block the push')
    next('Back')
    expect(currentStep()).toContain('Select')
    await toGenerate()
    expect(currentStep()).toContain('Generate')
    expect(screen.getByText('TSX · generated from Ticket Row')).toBeInTheDocument()
    expect(status()).toHaveTextContent('3 files · reuses 14 components · 1 hardcoded value')
  })

  it('switches the generated file and drops the story when "Storybook story" is off', async () => {
    await renderTab()
    await toGenerate()
    fireEvent.click(screen.getByRole('tab', { name: 'TicketRow.css' }))
    expect(screen.getByText('CSS · generated from Ticket Row')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'TicketRow.stories.tsx' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Storybook story' }))
    expect(screen.queryByRole('tab', { name: 'TicketRow.stories.tsx' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'TicketRow.tsx' })).toHaveAttribute('aria-selected', 'true')
    expect(status()).toHaveTextContent('2 files')
  })

  it('picks a framework from the dropdown', async () => {
    await renderTab()
    await toGenerate()
    fireEvent.click(button('Framework'))
    fireEvent.click(screen.getByText('React + TypeScript'))
    expect(button('Framework')).toHaveTextContent('React + TypeScript')
    expect(screen.queryByRole('listbox', { name: 'Framework' })).toBeNull()
  })

  it('shows the branch, commit and files to push on Ship', async () => {
    await renderTab()
    await toShip()
    expect(currentStep()).toContain('Ship')
    expect(screen.getByLabelText('Branch')).toHaveValue('feat/BB-142-ticket-row')
    expect(screen.getByLabelText('Commit message')).toHaveValue('feat(jira): add Ticket Row (BB-142)')
    expect(screen.getByRole('checkbox', { name: 'Move BB-142 to In review' })).toBeChecked()
    expect(screen.getByText('src/shared/ui/TicketRow/TicketRow.tsx')).toBeInTheDocument()
    expect(status()).toHaveTextContent('3 files → praveenmanchi/bluebird · base main')
    expect(button('Push and open PR')).toBeEnabled()
  })

  it('needs a branch and commit message to push', async () => {
    await renderTab()
    await toShip()
    fireEvent.input(screen.getByLabelText('Branch'), { target: { value: ' ' } })
    expect(button('Push and open PR')).toBeDisabled()
  })

  it('pushes step by step, then shows the PR link and what else changed', async () => {
    await renderTab()
    await toShip()
    vi.useFakeTimers()
    next('Push and open PR')
    expect(screen.getByText('Keep the plugin open')).toBeInTheDocument()
    expect(button('Opening PR…')).toBeDisabled()
    runPush()
    expect(screen.getByText(`PR #${PULL_REQUEST.number} is open`)).toBeInTheDocument()
    expect(screen.getByLabelText('Share it with your developer')).toHaveValue(PULL_REQUEST.url)
    expect(screen.getByText('Moved to In review · PR #63 linked')).toBeInTheDocument()
    expect(currentStep()).toBeNull()
    expect(status()).toHaveTextContent('Shipped in 9 s')
    next('Done')
    expect(currentStep()).toContain('Select')
    expect(screen.getByText(TICKET_PATH)).toBeInTheDocument() // the live selection survives "Done"
  })

  it('skips the Jira rows when those options are off', async () => {
    await renderTab()
    await toShip()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Move BB-142 to In review' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add PR link to BB-142' }))
    next('Push and open PR')
    runPush()
    expect(screen.queryByText('Link PR to BB-142')).toBeNull()
    expect(screen.queryByText(/Jira · BB-142/)).toBeNull()
  })

  it('opens the pull request through the sandbox', async () => {
    const open = vi.fn(async () => undefined)
    await renderTab({ ...createMockHandlers(), [MSG.open]: open })
    await toShip()
    vi.useFakeTimers()
    next('Push and open PR')
    runPush()
    vi.useRealTimers()
    next('Open PR')
    await waitFor(() => expect(open).toHaveBeenCalled())
    expect((open.mock.calls[0] as unknown[])[0]).toEqual({ url: PULL_REQUEST.url })
  })

  it('asks Figma to reveal the selected frame', async () => {
    const focus = vi.fn(async () => undefined)
    await renderTab({ ...createMockHandlers(), [MSG.focus]: focus })
    fireEvent.click(button('Open in Figma'))
    await waitFor(() => expect(focus).toHaveBeenCalled())
    expect((focus.mock.calls[0] as unknown[])[0]).toEqual({ nodeId: TICKET_ROW.nodeId })
  })

  it('switches the Figma MCP server between remote and local, and copies the matching setup', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await renderTab()
    next('Copy MCP setup')
    await waitFor(() => expect(status()).toHaveTextContent('registers the remote Figma MCP server'))
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('claude mcp add --transport http figma https://mcp.figma.com/mcp'))
    fireEvent.click(button('Use local'))
    expect(screen.getByText('Local · 127.0.0.1:3845/mcp')).toBeInTheDocument()
    next('Copy MCP setup')
    await waitFor(() => expect(status()).toHaveTextContent('registers the desktop Figma MCP server'))
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('http://127.0.0.1:3845/mcp'))
    fireEvent.click(button('Use remote'))
    expect(screen.getByText('Remote · mcp.figma.com/mcp')).toBeInTheDocument()
  })

  it('copies a Claude Code prompt that names the frame, the node, the gaps the checks found, options and branch', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await renderTab({ fileKey: 'AbC123' })
    await toShip()
    next('Copy prompt for Claude Code')
    await waitFor(() => expect(status()).toHaveTextContent('Prompt copied'))
    const prompt = String((writeText.mock.calls[0] as unknown[])[0])
    expect(prompt).toContain('Implement the Figma component set "Ticket Row" (Plugin UI › Components › Jira · 3 variants)')
    expect(prompt).toContain('get_design_context on https://www.figma.com/design/AbC123?node-id=40000267-8004 (node 40000267:8004)')
    expect(prompt).toContain('Known gaps in the design')
    expect(prompt).toContain('- Variables: 98% bound to variables · 1 unbound gap (6px)')
    expect(prompt).toContain('Framework: Preact + TypeScript.')
    expect(prompt).toContain('Branch: feat/BB-142-ticket-row')
  })

  it('names the file instead of a link when the plugin has no file key', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await renderTab()
    await toGenerate()
    next('Copy prompt for Claude Code')
    await waitFor(() => expect(status()).toHaveTextContent('Prompt copied'))
    expect(String((writeText.mock.calls[0] as unknown[])[0])).toContain('node 40000267:8004 in the file "Bluebird · Plugin UI"')
  })

  it('says so when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    await renderTab()
    await toShip()
    next('Copy prompt for Claude Code')
    await waitFor(() => expect(status()).toHaveTextContent('Copying is blocked'))
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
    expect(status()).toHaveTextContent('Nothing selected on the canvas.')
    handlers[MSG.selection] = createMockHandlers()[MSG.selection]! // the designer selects Ticket Row
    next('Use current selection')
    expect(await screen.findByText(TICKET_PATH)).toBeInTheDocument()
    expect(button('Next: Check')).toBeEnabled()
  })

  it('shows "Nothing selected" after Change selection too', async () => {
    await renderTab()
    next('Change selection')
    expect(screen.getByText('Select a frame or component')).toBeInTheDocument()
    expect(button('Next: Check')).toBeDisabled()
  })

  it('needs a Jira issue before Check', async () => {
    selectScenario('no-issue')
    await renderTab({ scenario: 'no-issue' })
    expect(screen.getByText('Link a Jira issue')).toBeInTheDocument()
    expect(button('Next: Check')).toBeDisabled()
    next('Link issue')
    expect(screen.getByText('Jira tab: ticket list and detail view in Brand UI')).toBeInTheDocument()
    expect(button('Next: Check')).toBeEnabled()
  })

  it('locks the push without GitHub (Settings › MCP + code sync) but still offers the prompt', async () => {
    await renderTab({ githubConnected: false })
    expect(await screen.findByText('Add the repository and personal access token in Settings › MCP + code sync')).toBeInTheDocument()
    await toShip()
    expect(screen.getByText('Connect GitHub to push')).toBeInTheDocument()
    expect(button('Push and open PR')).toBeDisabled()
    expect(button('Copy prompt for Claude Code')).toBeEnabled()
    expect(screen.queryByLabelText('Branch')).toBeNull()
  })
})

describe('mcp Tab — error states', () => {
  it('locks Generate while checks fail (Figma "Error · Not ready")', async () => {
    await renderTab({ scenario: 'not-ready' })
    next('Next: Check')
    expect(await screen.findByText('42%')).toBeInTheDocument()
    expect(screen.getByText('Generate locked · 2 checks are failing')).toBeInTheDocument()
    expect(status()).toHaveTextContent('2 checks must pass before you can generate')
    expect(button('Next: Generate')).toBeDisabled()
  })

  it('offers Try again when the checks cannot run', async () => {
    const handlers = createMockHandlers()
    const good = handlers[MSG.check]!
    handlers[MSG.check] = async () => { throw new Error('That frame no longer exists. Select it again.') }
    await renderTab(handlers)
    next('Next: Check')
    expect(await screen.findByText('The checks could not run')).toBeInTheDocument()
    expect(status()).toHaveTextContent('That frame no longer exists. Select it again.')
    expect(button('Next: Generate')).toBeDisabled()
    handlers[MSG.check] = good
    next('Try again')
    expect(await screen.findByText('84%')).toBeInTheDocument()
    expect(button('Next: Generate')).toBeEnabled()
  })

  it('offers Retry when generation fails', async () => {
    await renderTab()
    await toGenerate()
    act(() => { generation.value = 'failed' })
    expect(screen.getByText('Code generation failed')).toBeInTheDocument()
    expect(button('Next: Ship')).toBeDisabled()
    next('Retry')
    expect(button('Next: Ship')).toBeEnabled()
    expect(screen.getByText('TSX · generated from Ticket Row')).toBeInTheDocument()
  })

  it('shows the rejected push and ships to a new branch', async () => {
    rejectNextPush.value = true
    await renderTab()
    await toShip()
    vi.useFakeTimers()
    next('Push and open PR')
    runPush()
    expect(screen.getByText('Push rejected')).toBeInTheDocument()
    expect(screen.getByText(/\[rejected\]\s+feat\/BB-142-ticket-row/)).toBeInTheDocument()
    expect(status()).toHaveTextContent('Nothing was pushed · BB-142 unchanged')
    next('Push to new branch')
    runPush()
    expect(screen.getByText('PR #63 is open')).toBeInTheDocument()
    expect(screen.getByText(/feat\/BB-142-ticket-row-2 → main/)).toBeInTheDocument()
  })

  it('keeps rejecting a retry on the same branch', async () => {
    rejectNextPush.value = true
    await renderTab()
    await toShip()
    vi.useFakeTimers()
    next('Push and open PR')
    runPush()
    next('Retry push')
    runPush()
    expect(screen.getByText('Push rejected')).toBeInTheDocument()
  })
})

describe('nextBranchName', () => {
  it('adds or bumps a numeric suffix', () => {
    expect(nextBranchName('feat/BB-142-ticket-row')).toBe('feat/BB-142-ticket-row-2')
    expect(nextBranchName('feat/BB-142-ticket-row-2')).toBe('feat/BB-142-ticket-row-3')
  })
})
