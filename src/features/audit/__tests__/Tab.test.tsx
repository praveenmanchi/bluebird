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
  await screen.findByRole('tab', { name: 'Not mapped 87' })
}

describe('audit Tab', () => {
  beforeEach(reset)

  it('says what it compares against and how it works before the first run', async () => {
    renderTab()
    expect(screen.getByRole('heading', { name: 'Compared against' })).toBeInTheDocument()
    expect(await screen.findByText('Components · Bluebird Components')).toBeInTheDocument()
    expect(screen.getByText('Variables · Bluebird Variables')).toBeInTheDocument()
    expect(screen.getByText('232')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByText('By published library key')).toBeInTheDocument()
    expect(screen.queryByRole('search')).toBeNull()
  })

  it('asks for a library when none is connected', async () => {
    const pages = async () => ({ pages: [], currentPageId: 'p', currentPage: 'Login', screens: 2, selected: 0, source: null, libraries: [] })
    renderTab('default', { [MSG.pages]: pages })
    expect(await screen.findByText('No library connected yet')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Selection' })).toBeDisabled()
  })

  it('picks the scope from the cards, and runs it from the Ready button', async () => {
    const run = vi.fn(createMockHandlers()[MSG.run] as never)
    renderTab('default', { [MSG.run]: run })
    expect(await screen.findByText('Login · 14 screens')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'This page' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Selection' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Run audit on the selection' }))
    await screen.findByRole('tab', { name: 'Not mapped 87' })
    expect(run).toHaveBeenCalledWith({ mode: 'selection' }, expect.anything())
  })

  it('opens the page list from the Chosen pages card', async () => {
    renderTab()
    await screen.findByText('Pick from 8 pages')
    fireEvent.click(screen.getByRole('radio', { name: 'Chosen pages' }))
    fireEvent.click(await screen.findByText('Atoms'))
    fireEvent.click(screen.getByText('Molecules'))
    expect(await screen.findByText('2 pages chosen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run audit on 2 pages' })).toBeInTheDocument()
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

  it('gives one mapped score with the variable and component counts', async () => {
    renderTab()
    await audit()
    expect(screen.getByText('673 / 760')).toBeInTheDocument()
    expect(screen.getByText('Mapped to the design system')).toBeInTheDocument()
    expect(screen.getByText('487 of 528')).toBeInTheDocument()
    expect(screen.getByText('186 of 232')).toBeInTheDocument()
    expect(screen.getByText('87 not mapped')).toBeInTheDocument()
  })

  it('opens on an overview: mapped by library, then by screen', async () => {
    renderTab()
    await audit()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Mapped by library' })).toBeInTheDocument()
    expect(screen.getByText('46 instances not mapped')).toBeInTheDocument()
    expect(screen.getByText('41 values not mapped')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'By screen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Access code flow/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Error states/ })).toBeInTheDocument()
    expect(screen.queryByText('#FAFAFA')).toBeNull()
  })

  it('lists by page, with the screens that need attention, when several pages were audited', async () => {
    const base = mockAudit()
    const cover = (name: string, page: string, library: number, components: number) => ({ id: `s:${name}`, name, page, bound: 0, paints: 0, library, components })
    const screens = [cover('Campaign hero', 'Marketing', 41, 88), cover('Promo landing', 'Marketing', 66, 109), cover('Welcome', 'Onboarding', 97, 100)]
    const several: AuditResult = {
      ...base, screens,
      pageCoverage: [{ name: 'Marketing', screens: 2, bound: 0, paints: 0, library: 107, components: 197 }, { name: 'Onboarding', screens: 1, bound: 0, paints: 0, library: 97, components: 100 }],
    }
    renderTab('default', { [MSG.run]: async () => several })
    await audit()
    expect(screen.getByRole('heading', { name: 'By page' })).toBeInTheDocument()
    expect(screen.getByText('90 not mapped · 2 screens')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Screens that need attention' })).toBeInTheDocument()
    expect(screen.getByText('Marketing · 47 not mapped')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Welcome/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'By screen' })).toBeNull()
  })

  it('opens one screen with its own score and list, and goes back', async () => {
    renderTab()
    await audit()
    fireEvent.click(screen.getByRole('button', { name: /Error states/ }))
    expect(await screen.findByRole('heading', { name: 'Error states' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Screen summary' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^All \d+$/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Local component · 2 layers on this screen')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Overview' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('button', { name: 'All screens' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: 'All screens' }))
    expect(await screen.findByRole('heading', { name: 'By screen' })).toBeInTheDocument()
  })

  it('opens a screen from the keyboard', async () => {
    renderTab()
    await audit()
    fireEvent.keyDown(screen.getByRole('button', { name: /SSO flow/ }), { key: 'Enter' })
    expect(await screen.findByRole('heading', { name: 'SSO flow' })).toBeInTheDocument()
  })

  it('lists what is not mapped, without healthy library instances', async () => {
    renderTab()
    await audit()
    fireEvent.click(screen.getByRole('tab', { name: 'Not mapped 87' }))
    expect(await screen.findByText('#FAFAFA')).toBeInTheDocument()
    expect(screen.getByText('Fill · use text/secondary')).toBeInTheDocument()
    expect(screen.getByText('Promo tile')).toBeInTheDocument()
    expect(screen.getByText('From another library · on 2 screens')).toBeInTheDocument()
    expect(screen.queryByText('Meta Badge')).toBeNull()
    expect(screen.queryByText('Item spacing 14')).toBeNull()
  })

  it('filters by kind', async () => {
    renderTab()
    await audit()
    fireEvent.click(screen.getByRole('tab', { name: 'Spacing 12' }))
    await waitFor(() => expect(screen.getByText('Item spacing 14')).toBeInTheDocument())
    expect(screen.queryByText('#FAFAFA')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Other library 9' }))
    await waitFor(() => expect(screen.getByText('Promo tile')).toBeInTheDocument())
    expect(screen.queryByText('Card / Promo')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Local 23' }))
    await waitFor(() => expect(screen.getByText('Card / Promo')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('tab', { name: 'Detached 14' }))
    await waitFor(() => expect(screen.getByText('Detached · on 2 screens')).toBeInTheDocument())
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

  it('opens a card, then selects a screen’s layers and goes to it', async () => {
    const select = vi.fn(async (p: { nodeIds: string[] }) => ({ selected: p.nodeIds.length, page: 'Login', elsewhere: 0 }))
    const goto = vi.fn(async () => ({ page: 'Login', name: 'Button' }))
    renderTab('default', { [MSG.select]: select, [MSG.goto]: goto })
    await audit()
    fireEvent.click(screen.getByRole('tab', { name: 'Not mapped 87' }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Expand' }))[0]!)
    fireEvent.click(await screen.findByRole('button', { name: 'Show layers of Access code flow' }))
    expect(await screen.findByText('Selected 12 layers in Access code flow')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show Access code flow' }))
    expect(await screen.findByText('Opened Access code flow on Login')).toBeInTheDocument()
  })

  it('switches to Across files from the view menu, which is coming soon, and back', async () => {
    const analytics = vi.fn()
    renderTab('default', { [MSG.analytics]: analytics })
    await audit()
    fireEvent.click(screen.getByRole('button', { name: 'View: This scope' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Across files' }))
    expect(await screen.findByText('Across files is coming soon')).toBeInTheDocument()
    expect(screen.queryByText('673 / 760')).toBeNull()
    expect(analytics).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'View: Across files' }))
    fireEvent.click(await screen.findByRole('option', { name: 'This scope' }))
    expect(await screen.findByText('673 / 760')).toBeInTheDocument()
  })

  it('closes the view menu on Escape', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'View: This scope' }))
    expect(await screen.findByRole('option', { name: 'Across files' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Across files' })).toBeNull())
  })

  it('says when there is nothing to audit', async () => {
    renderTab('empty')
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('Nothing to audit')).toBeInTheDocument()
  })

  it('says when everything is mapped', async () => {
    const clean = mockAudit(mockAudit().items.filter(() => false), [], 528)
    renderTab('default', { [MSG.run]: async (): Promise<AuditResult> => clean })
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('Everything in this scope comes from the design system.')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Overview' })).toBeNull()
  })

  it('still reports variables without a library', async () => {
    renderTab('default', { [MSG.run]: async (): Promise<AuditResult> => mockNoLibrary() })
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('Components need a library')).toBeInTheDocument()
    expect(screen.getByText('Variables mapped to the design system')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Not mapped 41' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^Detached/ })).toBeNull()
    expect(screen.queryByText('46 instances not mapped')).toBeNull()
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
