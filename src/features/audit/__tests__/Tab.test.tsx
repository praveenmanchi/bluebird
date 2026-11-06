import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { createMockHandlers, mockAudit, mockNoLibrary, type MockScenario } from '../mock'
import { togglePage } from '../format'
import { OPEN_TAB_EVENT } from '@shared/navigation'
import { MSG, type AuditResult } from '../messages'
import { reset } from '../state'

function renderTab(scenario: MockScenario = 'default', overrides: Record<string, unknown> = {}) {
  const client = createRpcClient(createMockTransport({ ...createMockHandlers(scenario), ...overrides } as never, 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

async function audit() {
  fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
  await screen.findByRole('tab', { name: 'All 111' })
}

describe('audit Tab', () => {
  beforeEach(reset)

  it('explains what it counts before the first run', () => {
    renderTab()
    expect(screen.getByRole('heading', { name: 'Variables' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument()
    expect(screen.getByText('Colours')).toBeInTheDocument()
    expect(screen.getByText('Unused')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'This page' })).toBeInTheDocument()
  })

  it('offers the selection, this page and chosen pages', async () => {
    renderTab()
    await screen.findByText('Bluebird UI')
    fireEvent.click(screen.getByRole('button', { name: 'This page' }))
    expect(await screen.findByText('Selection (3)')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Atoms'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atoms' })).toBeInTheDocument())
  })

  it('sends the chosen scope', async () => {
    const run = vi.fn(createMockHandlers()[MSG.run] as never)
    renderTab('default', { [MSG.run]: run })
    await screen.findByText('Bluebird UI')
    fireEvent.click(screen.getByRole('button', { name: 'This page' }))
    fireEvent.click(await screen.findByText('Selection (3)'))
    await audit()
    expect(run).toHaveBeenCalledWith({ mode: 'selection' }, expect.anything())
  })

  it('gives one score with the variable and component counts', async () => {
    renderTab()
    await audit()
    expect(screen.getByText('673 / 760')).toBeInTheDocument()
    expect(screen.getByText('From the design system')).toBeInTheDocument()
    expect(screen.getByText('487 of 528')).toBeInTheDocument()
    expect(screen.getByText('186 of 232')).toBeInTheDocument()
    expect(screen.getByText('111 issues to review')).toBeInTheDocument()
  })

  it('lists variable and component issues together, in two groups', async () => {
    renderTab()
    await audit()
    expect(screen.getByRole('heading', { name: 'Variables' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument()
    expect(screen.getByText('#FAFAFA')).toBeInTheDocument()
    expect(screen.getByText('Fill · use text/secondary')).toBeInTheDocument()
    expect(screen.getByText('Promo tile')).toBeInTheDocument()
  })

  it('does not list healthy library instances as issues', async () => {
    renderTab()
    await audit()
    expect(screen.queryByText('Meta Badge')).toBeNull()
  })

  it('filters by kind of issue', async () => {
    renderTab()
    await audit()
    fireEvent.click(screen.getByRole('tab', { name: 'Spacing 12' }))
    await waitFor(() => expect(screen.getByText('Item spacing 14')).toBeInTheDocument())
    expect(screen.queryByText('#FAFAFA')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Not in library 32' }))
    await waitFor(() => expect(screen.getByText('Promo tile')).toBeInTheDocument())
    expect(screen.queryByText('Item spacing 14')).toBeNull()
  })

  it('sends variable issues to Variable mapper to fix', async () => {
    const opened = vi.fn()
    const listen = (e: Event) => opened((e as CustomEvent<string>).detail)
    window.addEventListener(OPEN_TAB_EVENT, listen)
    renderTab()
    await audit()
    expect(screen.queryByRole('button', { name: 'Fix these in Variable mapper' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Colours 41' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Fix these in Variable mapper' }))
    expect(opened).toHaveBeenCalledWith('varmapper')
    window.removeEventListener(OPEN_TAB_EVENT, listen)
  })

  it('lists library components with no instance', async () => {
    renderTab()
    await audit()
    fireEvent.click(screen.getByRole('tab', { name: 'Unused 12' }))
    expect(await screen.findByText('Stepper')).toBeInTheDocument()
  })

  it('opens a card, then selects a frame’s layers and goes to it', async () => {
    const select = vi.fn(async (p: { nodeIds: string[] }) => ({ selected: p.nodeIds.length, page: 'Login', elsewhere: 0 }))
    const goto = vi.fn(async () => ({ page: 'Login', name: 'Button' }))
    renderTab('default', { [MSG.select]: select, [MSG.goto]: goto })
    await audit()
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]!)
    fireEvent.click(await screen.findByRole('button', { name: 'Show layers of Access code flow' }))
    expect(await screen.findByText('Selected 12 layers in Access code flow')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show Access code flow' }))
    expect(await screen.findByText('Opened Access code flow on Login')).toBeInTheDocument()
  })

  it('shows Library Analytics under Across files, reading each view when opened', async () => {
    const analytics = vi.fn(createMockHandlers()[MSG.analytics] as never)
    renderTab('default', { [MSG.analytics]: analytics })
    await audit()
    fireEvent.click(screen.getByRole('tab', { name: 'Across files' }))
    expect(await screen.findByText('Most used components')).toBeInTheDocument()
    expect(screen.getByText('Checkout redesign')).toBeInTheDocument()
    expect(analytics).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }))
    expect(await screen.findByText('Most used variables')).toBeInTheDocument()
    expect(screen.getByText('Uses by collection')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Styles' }))
    expect(await screen.findByText('Most used styles')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Teams' }))
    expect(await screen.findByText('Components inserted by team')).toBeInTheDocument()
    expect(screen.getByText('Week by week')).toBeInTheDocument()
    expect(screen.getByText('Button · 38 detached')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Components' }))
    expect(await screen.findByText('Most used components')).toBeInTheDocument()
    expect(analytics).toHaveBeenCalledTimes(4)
  })

  it('explains Across files without Enterprise and keeps This scope working', async () => {
    const empty = createMockHandlers('empty')
    renderTab('default', { [MSG.analytics]: empty[MSG.analytics] })
    await audit()
    fireEvent.click(screen.getByRole('tab', { name: 'Across files' }))
    expect(await screen.findByText('Across files needs Figma Enterprise')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'This scope' }))
    expect(await screen.findByText('673 / 760')).toBeInTheDocument()
  })

  it('says when there is nothing to audit', async () => {
    renderTab('empty')
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('Nothing to audit')).toBeInTheDocument()
  })

  it('says when there is nothing to fix', async () => {
    const clean = mockAudit(mockAudit().items.filter(() => false), [], 528)
    renderTab('default', { [MSG.run]: async (): Promise<AuditResult> => clean })
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('Everything in this scope comes from the design system.')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^All/ })).toBeNull()
  })

  it('still reports variables without a library', async () => {
    renderTab('default', { [MSG.run]: async (): Promise<AuditResult> => mockNoLibrary() })
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('Components need a library')).toBeInTheDocument()
    expect(screen.getByText('Variables from the design system')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 53' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^Detached/ })).toBeNull()
    expect(screen.getByText('#FAFAFA')).toBeInTheDocument()
  })

  it('keeps the audit when you leave the tab and come back', async () => {
    const view = renderTab()
    await audit()
    view.unmount()
    renderTab()
    expect(await screen.findByText('673 / 760')).toBeInTheDocument()
  })

  it('offers Try again when the audit fails', async () => {
    renderTab('error')
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('The audit didn’t finish')).toBeInTheDocument()
  })
})

describe('togglePage', () => {
  it('starts a page list and returns to this page when it empties', () => {
    const one = togglePage({ mode: 'current' }, 'a')
    expect(one).toEqual({ mode: 'pages', pageIds: ['a'] })
    expect(togglePage(togglePage(one, 'b'), 'b')).toEqual(one)
    expect(togglePage(one, 'a')).toEqual({ mode: 'current' })
  })
})
