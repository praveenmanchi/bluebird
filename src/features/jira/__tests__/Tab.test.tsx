import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport, type HandlerMap } from '@shared/bridge'
import { OPEN_SETTINGS_EVENT } from '@shared/navigation'
import { JiraTab, type TabProps } from '../ui/Tab'
import { createMockHandlers, type MockScenario } from '../mock'
import { MSG } from '../messages'
import { reset } from '../state'

function mount(props: TabProps = {}, handlers: HandlerMap = createMockHandlers('default')) {
  const client = createRpcClient(createMockTransport(handlers, 0))
  return render(<RpcProvider client={client}><JiraTab {...props} /></RpcProvider>)
}

/** Renders the tab and waits for `jira:load` to put the board up. */
async function renderTab(props: TabProps = {}, scenario: MockScenario = 'default') {
  const view = mount(props, createMockHandlers(scenario))
  await screen.findByRole('heading', { name: 'My tickets' })
  return view
}

const list = () => screen.getByRole('region', { name: 'My tickets' })
const detail = () => screen.getByRole('region', { name: /^BB-\d+ / })
const rows = () => list().querySelectorAll('.bb-ticket-row')

beforeEach(() => reset())

describe('jira Tab', () => {
  it('renders the Figma board: groups with counts and BB-142 selected', async () => {
    await renderTab()
    expect(screen.getByRole('heading', { name: 'My tickets' })).toBeInTheDocument()
    for (const h of ['IN PROGRESS · 2', 'IN REVIEW · 1', 'TO DO · 3']) expect(screen.getByRole('heading', { name: h })).toBeInTheDocument()
    expect(rows()).toHaveLength(6)
    expect(screen.getByRole('heading', { level: 2, name: 'Jira tab: ticket list and detail view in Brand UI' })).toBeInTheDocument()
    expect(screen.getByText('Sprint 42 · ends Oct 17')).toBeInTheDocument()
    expect(screen.getByText('Synced 2m ago · Refresh')).toBeInTheDocument()
  })

  it('shows no avatars in the list rows or the detail fields', async () => {
    await renderTab()
    expect(list().querySelector('.bb-avatar')).toBeNull()
    expect(detail().querySelector('.bb-jira-board__details .bb-avatar')).toBeNull()
    const fields = [...detail().querySelectorAll('.bb-jira-board__details .bb-field-row__text')].map((n) => n.textContent)
    expect(fields).toEqual(expect.arrayContaining(['Praveen Manchi', 'Anika Kumar']))
  })

  it('selecting a row shows its detail', async () => {
    await renderTab()
    fireEvent.click(screen.getByText('Focus ring disappears on Dropdown in Ikea mode'))
    expect(within(detail()).getByRole('heading', { level: 2, name: 'Focus ring disappears on Dropdown in Ikea mode' })).toBeInTheDocument()
  })

  it('switches scope from the dropdown and searches by key, title or label', async () => {
    await renderTab()
    expect(within(list()).queryByRole('tab')).not.toBeInTheDocument()
    expect(within(list()).getByText('Assigned')).toBeInTheDocument()
    fireEvent.click(within(list()).getByRole('button', { name: 'Which tickets' }))
    fireEvent.click(screen.getByRole('option', { name: /Reported/ }))
    expect(rows()).toHaveLength(2)
    expect(within(list()).getByText('Reported')).toBeInTheDocument()
    fireEvent.click(within(list()).getByRole('button', { name: 'Which tickets' }))
    fireEvent.click(screen.getByRole('option', { name: /Assigned to me/ }))
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    fireEvent.click(within(list()).getByRole('button', { name: 'Search tickets' }))
    expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toHaveFocus()
    fireEvent.input(screen.getByRole('searchbox', { name: 'Search tickets' }), { target: { value: 'storybook' } })
    expect(rows()).toHaveLength(1)
    fireEvent.input(screen.getByRole('searchbox', { name: 'Search tickets' }), { target: { value: 'nothing-matches' } })
    expect(screen.getByRole('heading', { name: 'No tickets match' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(rows()).toHaveLength(6)
  })

  it('closing search clears the query', async () => {
    await renderTab()
    const toggle = within(list()).getByRole('button', { name: 'Search tickets' })
    fireEvent.click(toggle)
    fireEvent.input(screen.getByRole('searchbox', { name: 'Search tickets' }), { target: { value: 'storybook' } })
    expect(rows()).toHaveLength(1)
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(rows()).toHaveLength(6)
  })

  it('filters by status and priority from the dropdowns behind the filter toggle', async () => {
    await renderTab()
    expect(within(list()).queryByRole('button', { name: 'Status' })).not.toBeInTheDocument()
    const toggle = within(list()).getByRole('button', { name: 'Filters' })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(list()).getByText('Sprint 42')).toBeInTheDocument()
    fireEvent.click(within(list()).getByRole('button', { name: 'Status' }))
    fireEvent.click(screen.getByRole('option', { name: /In review/ }))
    expect(rows()).toHaveLength(1)
    expect(within(list()).getByText('Status: In review')).toBeInTheDocument()
    fireEvent.click(within(list()).getByRole('button', { name: 'Status' }))
    fireEvent.click(screen.getByRole('option', { name: /All/ }))
    fireEvent.click(within(list()).getByRole('button', { name: 'Priority' }))
    fireEvent.click(screen.getByRole('option', { name: /Lowest/ }))
    expect(rows()).toHaveLength(1)
    fireEvent.click(toggle)
    expect(within(list()).queryByRole('button', { name: 'Priority' })).not.toBeInTheDocument()
    expect(toggle).toHaveAttribute('data-active')
    expect(rows()).toHaveLength(1)
  })

  it('changes the ticket status locally and regroups the list', async () => {
    await renderTab()
    fireEvent.click(within(detail()).getByRole('button', { name: 'Status' }))
    fireEvent.click(screen.getByRole('option', { name: /Done/ }))
    expect(await screen.findByRole('heading', { name: 'IN PROGRESS · 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'DONE · 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'History' }))
    expect(screen.getByText('changed Status from In progress to Done')).toBeInTheDocument()
  })

  it('changes story points', async () => {
    await renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Story points: 5. Change' }))
    fireEvent.click(screen.getByRole('option', { name: /^8$/ }))
    expect(await screen.findByRole('button', { name: 'Story points: 8. Change' })).toBeInTheDocument()
  })

  it('toggles subtasks and updates the count', async () => {
    await renderTab()
    expect(within(detail()).getByText('2/4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wire Jira REST search (JQL)' }))
    expect(await within(detail()).findByText('3/4')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Wire Jira REST search (JQL)' })).toBeChecked()
  })

  it('adds a comment from the composer and deletes it again', async () => {
    await renderTab()
    fireEvent.input(screen.getByRole('textbox', { name: 'Comment' }), { target: { value: 'Attached the Ikea frame.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const added = await screen.findByText('Attached the Ikea frame.')
    expect(added).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveValue('')
    const article = added.closest('article')!
    fireEvent.click(within(article as HTMLElement).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('Attached the Ikea frame.')).toBeNull())
  })

  it('switches activity tabs', async () => {
    await renderTab()
    fireEvent.click(screen.getByRole('tab', { name: 'Work log' }))
    expect(screen.getByText('Logged 3h — ticket list layout')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Comment' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Log work' }))
    expect(await screen.findByText('Logged 1h')).toBeInTheDocument()
  })

  it('attaches the current Figma selection as a link', async () => {
    await renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Attach Figma link' }))
    await waitFor(() => expect(screen.getByText('Ticket detail')).toBeInTheDocument())
    expect(within(detail()).getByText('3')).toBeInTheDocument()
  })

  it('asks for a selection when nothing is selected in Figma', async () => {
    await renderTab({}, 'empty-selection')
    fireEvent.click(screen.getByRole('button', { name: 'Attach Figma link' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Select a frame in Figma, then attach it.'))
  })

  it('edits a comment in place', async () => {
    await renderTab()
    const article = screen.getByText(/Dev handoff is blocked/).closest('article') as HTMLElement
    fireEvent.click(within(article).getByRole('button', { name: 'Edit' }))
    fireEvent.input(screen.getByRole('textbox', { name: 'Comment' }), { target: { value: 'Frame attached, thanks.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Frame attached, thanks.')).toBeInTheDocument()
    expect(screen.queryByText(/Dev handoff is blocked/)).toBeNull()
  })

  it('refreshes from Jira and shows when it last synced', async () => {
    await renderTab()
    expect(screen.getByText('Synced 2m ago · Refresh')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Synced 2m ago · Refresh' }))
    expect(await screen.findByText('Synced just now · Refresh')).toBeInTheDocument()
  })

  it('keeps the tickets and shows an inline error when a refresh fails', async () => {
    const handlers = createMockHandlers('default')
    const load = handlers[MSG.load]!
    let calls = 0
    mount({}, { ...handlers, [MSG.load]: async (p: never, c) => { calls += 1; if (calls > 1) throw new Error('Jira answered 503.'); return load(p, c) } })
    await screen.findByRole('heading', { name: 'My tickets' })
    fireEvent.click(screen.getByRole('button', { name: 'Synced 2m ago · Refresh' }))
    expect(await screen.findByText('Couldn’t refresh tickets')).toBeInTheDocument()
    expect(screen.getByText(/Jira answered 503\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync failed · Retry' })).toBeInTheDocument()
    expect(rows()).toHaveLength(6)
  })

  it('shows the all-caught-up empty state when Jira has no tickets', async () => {
    await renderTab({}, 'no-tickets')
    expect(screen.getByRole('heading', { name: 'You’re all caught up' })).toBeInTheDocument()
    expect(screen.getByText('Select a ticket to see its detail.')).toBeInTheDocument()
  })

  it('shows Not connected with what is missing and opens Settings', async () => {
    const opened = vi.fn()
    window.addEventListener(OPEN_SETTINGS_EVENT, opened)
    mount({}, createMockHandlers('not-connected'))
    expect(await screen.findByRole('heading', { name: 'Connect your Jira site' })).toBeInTheDocument()
    expect(screen.getByText(/Add your Jira address, API token, email in Settings/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }))
    expect(opened).toHaveBeenCalledTimes(1)
    window.removeEventListener(OPEN_SETTINGS_EVENT, opened)
  })

  it('shows the Jira error on a failed load and retries', async () => {
    mount({}, createMockHandlers('error'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The Jira API didn’t respond.')
    expect(screen.getByRole('heading', { name: 'Couldn’t reach Jira' })).toBeInTheDocument()
  })

  it('Retry from the error state loads the board', async () => {
    mount({ initialConnection: 'error' })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'My tickets' })).toBeInTheDocument()
  })
})
