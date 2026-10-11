import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createMockTransport, createRpcClient, type HandlerMap } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { SHIP_STEP_MS, nextBranchName } from '../ui/McpHandoff'
import { createMockHandlers } from '../mock'
import { MSG } from '../messages'
import { PULL_REQUEST } from '../fixtures'
import { generation, githubConnected, mcpConnected, rejectNextPush, reset, selectScenario, steps } from '../state'

function renderTab(handlers: HandlerMap = createMockHandlers()) {
  const client = createRpcClient(createMockTransport(handlers, 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const currentStep = () => document.querySelector('[aria-current="step"]')?.textContent ?? null
const status = () => screen.getByRole('status')
const next = (label: string) => fireEvent.click(button(label))
/** Walk the happy path from Select to the Ship form. */
function toShip() {
  next('Next: Check')
  next('Next: Generate')
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
  it('opens on Select with the selection, linked issue and connections', () => {
    renderTab()
    expect(currentStep()).toContain('Select')
    expect(screen.getByText('Plugin UI › Components › Jira · 3 variants')).toBeInTheDocument()
    expect(screen.getByText('Jira tab: ticket list and detail view in Brand UI')).toBeInTheDocument()
    expect(screen.getByText('Figma MCP server')).toBeInTheDocument()
    expect(status()).toHaveTextContent('Ticket Row · 3 variants · linked to BB-142')
  })

  it('steps through Check and Generate with Back / Next', () => {
    renderTab()
    next('Next: Check')
    expect(currentStep()).toContain('Check')
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(status()).toHaveTextContent('Ready to generate · 2 warnings won’t block the push')
    next('Back')
    expect(currentStep()).toContain('Select')
    next('Next: Check')
    next('Next: Generate')
    expect(currentStep()).toContain('Generate')
    expect(screen.getByText('TSX · generated from Ticket Row')).toBeInTheDocument()
    expect(status()).toHaveTextContent('3 files · reuses 5 components · 0 hardcoded values')
  })

  it('switches the generated file and drops the story when "Storybook story" is off', () => {
    renderTab()
    next('Next: Check')
    next('Next: Generate')
    fireEvent.click(screen.getByRole('tab', { name: 'TicketRow.css' }))
    expect(screen.getByText('CSS · generated from Ticket Row')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'TicketRow.stories.tsx' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Storybook story' }))
    expect(screen.queryByRole('tab', { name: 'TicketRow.stories.tsx' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'TicketRow.tsx' })).toHaveAttribute('aria-selected', 'true')
    expect(status()).toHaveTextContent('2 files')
  })

  it('picks a framework from the dropdown', () => {
    renderTab()
    next('Next: Check')
    next('Next: Generate')
    fireEvent.click(button('Framework'))
    fireEvent.click(screen.getByText('React + TypeScript'))
    expect(button('Framework')).toHaveTextContent('React + TypeScript')
    expect(screen.queryByRole('listbox', { name: 'Framework' })).toBeNull()
  })

  it('shows the branch, commit and files to push on Ship', () => {
    renderTab()
    toShip()
    expect(currentStep()).toContain('Ship')
    expect(screen.getByLabelText('Branch')).toHaveValue('feat/BB-142-ticket-row')
    expect(screen.getByLabelText('Commit message')).toHaveValue('feat(jira): add Ticket Row (BB-142)')
    expect(screen.getByRole('checkbox', { name: 'Move BB-142 to In review' })).toBeChecked()
    expect(screen.getByText('src/shared/ui/TicketRow/TicketRow.tsx')).toBeInTheDocument()
    expect(button('Push and open PR')).toBeEnabled()
  })

  it('needs a branch and commit message to push', () => {
    renderTab()
    toShip()
    fireEvent.input(screen.getByLabelText('Branch'), { target: { value: ' ' } })
    expect(button('Push and open PR')).toBeDisabled()
  })

  it('pushes step by step, then shows the PR link and what else changed', () => {
    vi.useFakeTimers()
    renderTab()
    toShip()
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
  })

  it('skips the Jira rows when those options are off', () => {
    vi.useFakeTimers()
    renderTab()
    toShip()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Move BB-142 to In review' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add PR link to BB-142' }))
    next('Push and open PR')
    runPush()
    expect(screen.queryByText('Link PR to BB-142')).toBeNull()
    expect(screen.queryByText(/Jira · BB-142/)).toBeNull()
  })

  it('opens the pull request through the sandbox', async () => {
    vi.useFakeTimers()
    const open = vi.fn(async () => undefined)
    renderTab({ ...createMockHandlers(), [MSG.open]: open })
    toShip()
    next('Push and open PR')
    runPush()
    vi.useRealTimers()
    next('Open PR')
    await waitFor(() => expect(open).toHaveBeenCalled())
    expect((open.mock.calls[0] as unknown[])[0]).toEqual({ url: PULL_REQUEST.url })
  })

  it('asks Figma to reveal the selected frame', async () => {
    const focus = vi.fn(async () => undefined)
    renderTab({ ...createMockHandlers(), [MSG.focus]: focus })
    fireEvent.click(button('Open in Figma'))
    await waitFor(() => expect(focus).toHaveBeenCalled())
    expect((focus.mock.calls[0] as unknown[])[0]).toEqual({ nodeId: '40000267:8004' })
  })

  it('switches the Figma MCP server between remote and local', () => {
    renderTab()
    fireEvent.click(button('Use local'))
    expect(screen.getByText('Local · 127.0.0.1:3845/mcp')).toBeInTheDocument()
    fireEvent.click(button('Use remote'))
    expect(screen.getByText('Remote · mcp.figma.com/mcp')).toBeInTheDocument()
  })

  it('copies a Claude Code prompt that names the frame, options and branch', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderTab()
    toShip()
    next('Copy prompt for Claude Code')
    await waitFor(() => expect(status()).toHaveTextContent('Prompt copied'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Ticket Row'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Preact + TypeScript'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Branch: feat/BB-142-ticket-row'))
  })

  it('says so when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    renderTab()
    toShip()
    next('Copy prompt for Claude Code')
    await waitFor(() => expect(status()).toHaveTextContent('Copying is blocked'))
  })
})

describe('mcp Tab — empty states', () => {
  it('asks for the MCP server first, and connects to the remote one', () => {
    mcpConnected.value = false
    renderTab()
    expect(screen.getByText('Connect the Figma MCP server')).toBeInTheDocument()
    expect(button('Next: Check')).toBeDisabled()
    next('Use remote server')
    expect(button('Next: Check')).toBeEnabled()
  })

  it('shows "Nothing selected" after Change selection and restores it', () => {
    renderTab()
    next('Change selection')
    expect(screen.getByText('Select a frame or component')).toBeInTheDocument()
    expect(button('Next: Check')).toBeDisabled()
    next('Use current selection')
    expect(screen.getByText('Plugin UI › Components › Jira · 3 variants')).toBeInTheDocument()
    expect(button('Next: Check')).toBeEnabled()
  })

  it('needs a Jira issue before Check', () => {
    selectScenario('no-issue')
    renderTab()
    expect(screen.getByText('Link a Jira issue')).toBeInTheDocument()
    expect(button('Next: Check')).toBeDisabled()
    next('Link issue')
    expect(screen.getByText('Jira tab: ticket list and detail view in Brand UI')).toBeInTheDocument()
    expect(button('Next: Check')).toBeEnabled()
  })

  it('locks the push without GitHub but still offers the prompt', () => {
    githubConnected.value = false
    renderTab()
    toShip()
    expect(screen.getByText('Connect GitHub to push')).toBeInTheDocument()
    expect(button('Push and open PR')).toBeDisabled()
    expect(button('Copy prompt for Claude Code')).toBeEnabled()
    expect(screen.queryByLabelText('Branch')).toBeNull()
  })
})

describe('mcp Tab — error states', () => {
  it('locks Generate while checks fail (Figma "Error · Not ready")', () => {
    selectScenario('not-ready')
    renderTab()
    next('Next: Check')
    expect(screen.getByText('58%')).toBeInTheDocument()
    expect(screen.getByText('Push locked · 2 checks are failing')).toBeInTheDocument()
    expect(status()).toHaveTextContent('2 checks must pass before you can generate')
    expect(button('Next: Generate')).toBeDisabled()
  })

  it('offers Retry when generation fails', () => {
    renderTab()
    next('Next: Check')
    next('Next: Generate')
    act(() => { generation.value = 'failed' })
    expect(screen.getByText('Code generation failed')).toBeInTheDocument()
    expect(button('Next: Ship')).toBeDisabled()
    next('Retry')
    expect(button('Next: Ship')).toBeEnabled()
    expect(screen.getByText('TSX · generated from Ticket Row')).toBeInTheDocument()
  })

  it('shows the rejected push and ships to a new branch', () => {
    vi.useFakeTimers()
    rejectNextPush.value = true
    renderTab()
    toShip()
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

  it('keeps rejecting a retry on the same branch', () => {
    vi.useFakeTimers()
    rejectNextPush.value = true
    renderTab()
    toShip()
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
