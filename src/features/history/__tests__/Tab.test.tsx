import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { HistoryTab } from '../ui/Tab'
import { LIST_FAILED_MESSAGE, createMockHandlers, type HistoryMockOptions } from '../mock'

const NOW = new Date('2026-11-12T12:00:00')

function renderTab(options: HistoryMockOptions = {}) {
  const client = createRpcClient(createMockTransport(createMockHandlers({ delayMs: 0, growOnRefresh: false, now: () => NOW, ...options }), 0))
  return render(<RpcProvider client={client}><HistoryTab now={() => NOW} /></RpcProvider>)
}
const find = (text: string | RegExp) => screen.findByText(text, {}, { timeout: 3000 })

afterEach(cleanup)

describe('History tab', () => {
  it('groups the team’s entries by day, with type, ticket, person and changes on each card', async () => {
    renderTab()
    expect(await find('GitHub connected')).toBeInTheDocument()
    const today = screen.getByRole('region', { name: 'Today' })
    // Code Connect entries are no longer listed in History.
    expect(within(today).getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByRole('article', { name: /^Code Connect:/ })).toBeNull()
    const card = screen.getByRole('article', { name: 'Extraction: Button refresh' })
    expect(within(card).getByRole('button', { name: 'Open BB-342 in Jira' })).toBeInTheDocument()
    expect(within(card).getByText('DS')).toHaveAttribute('title', 'Design System')
    const variables = within(card).getByRole('group', { name: 'Variables: 2 added, 5 modified, 1 removed' })
    const chips = variables.querySelectorAll('.bb-change-count')
    expect([...chips].map((c) => c.getAttribute('data-type'))).toEqual(['added', 'modified', 'removed'])
    expect(within(variables).getByText('Added').closest('.bb-change-count')?.querySelector('.bb-change-count__count')).toHaveTextContent('2')
    expect(within(card).getByRole('group', { name: 'Components: 6 components' })).toHaveTextContent('6 components')
    expect(screen.getByRole('region', { name: 'Yesterday' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Extraction: Bridge components sync' })).toHaveAttribute('data-status', 'failed')
  })

  it('filters by feature', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(screen.getByRole('tab', { name: 'Extraction 3' }))
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByRole('region', { name: 'Extraction' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'UX AI 1' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.queryByRole('tab', { name: /Code Connect/ })).toBeNull()
  })

  it('shows the open file’s versions and what one changed', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(screen.getByRole('tab', { name: 'Versioning' }))
    const version = await screen.findByRole('article', { name: 'Version: Button refresh ready for review' })
    expect(within(version).getByText('Praveen Manchi')).toBeInTheDocument()
    expect(screen.getAllByRole('article', { name: /^Autosave:/ })).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Versioning 5' })).toBeInTheDocument()
    fireEvent.click(within(version).getByRole('button', { name: 'View details: Button refresh ready for review' }))
    const dialog = await screen.findByRole('dialog', { name: 'Button refresh ready for review' })
    expect(await within(dialog).findByText('Filter chip')).toBeInTheDocument()
    expect(within(dialog).getByText('Component set · New component set on Molecules')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('searches Versioning by version name, description or author', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(screen.getByRole('tab', { name: 'Versioning' }))
    await screen.findByRole('article', { name: 'Version: Button refresh ready for review' })
    fireEvent.click(screen.getByRole('button', { name: 'Search the history' }))
    const field = screen.getByRole('searchbox', { name: 'Search the team history' })
    expect(field).toHaveAttribute('placeholder', 'Search versions by name, description or author')
    fireEvent.input(field, { target: { value: 'anita' } })
    const results = screen.getByRole('region', { name: 'Results for anita' })
    expect(within(results).getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText(/The changes inside a version are not searched\./)).toBeInTheDocument()
    fireEvent.input(field, { target: { value: 'carousel' } })
    expect(screen.getByText('No version matches carousel')).toBeInTheDocument()
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(screen.getAllByRole('article')).toHaveLength(5)
  })

  it('opens an entry with its full changelog and comes back', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(screen.getByRole('button', { name: 'View details: Button refresh' }))
    expect(await find('Changelog')).toBeInTheDocument()
    expect(screen.getByText('1 breaking change')).toBeInTheDocument()
    expect(screen.getByText('surface/translucent')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open pull request #74' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Back to history' }))
    expect(await find('Team history')).toBeInTheDocument()
  })

  it('renders the other entry types through the same details screen', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(screen.getByRole('button', { name: 'View details: Disabled text token' }))
    expect(await find('Conversation')).toBeInTheDocument()
    expect(screen.getByText(/Use text\/disabled/)).toBeInTheDocument()
  })

  it('says how many entries are new after a refresh', async () => {
    renderTab({ growOnRefresh: true })
    await find('GitHub connected')
    expect(screen.queryByRole('article', { name: 'Extraction: Button refresh' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await find('3 new entries')).toBeInTheDocument()
    expect(screen.getByText(/From Praveen Manchi, Ravi Kumar and Anita Rao since/)).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Extraction: Button refresh' })).toBeInTheDocument()
  })

  it('checks again on its own while open, on the Storage interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      renderTab({ growOnRefresh: true, refreshMs: 60_000 })
      await find('GitHub connected')
      expect(screen.queryByText('3 new entries')).toBeNull()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(await find('3 new entries')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('searches for a pasted variable path and shows only the matching changes', async () => {
    renderTab()
    await find('GitHub connected')
    const button = screen.getByRole('button', { name: 'Search the history' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    const field = screen.getByRole('searchbox', { name: 'Search the team history' })
    fireEvent.input(field, { target: { value: 'button/bg/primary' } })
    const results = screen.getByRole('region', { name: 'Search results' })
    expect(within(results).getByText('Results for button/bg/primary')).toBeInTheDocument()
    expect(within(results).getByText('Variable')).toBeInTheDocument()
    expect(within(results).getAllByRole('article')).toHaveLength(2)
    const card = screen.getByRole('article', { name: 'Extraction: Button refresh' })
    const matches = within(card).getByRole('group', { name: '3 matches' })
    expect(within(matches).getByText('button/bg/primary')).toBeInTheDocument()
    expect(within(matches).getByText('#0C8CE9 → #0978C8 · Bridge, Ikea')).toBeInTheDocument()
    expect(within(matches).queryByText('text/secondary')).toBeNull()
  })

  it('finds a Jira ticket and a colour, says when nothing matches, and closes on Escape', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(screen.getByRole('button', { name: 'Search the history' }))
    const field = screen.getByRole('searchbox', { name: 'Search the team history' })
    fireEvent.input(field, { target: { value: 'bb-342' } })
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('3 more in details')).toBeInTheDocument()
    fireEvent.input(field, { target: { value: '#8a8a8a' } })
    expect(screen.getByRole('article', { name: 'UX AI: Disabled text token' })).toBeInTheDocument()
    fireEvent.input(field, { target: { value: 'Carousel' } })
    expect(screen.getByText('Nothing touched Carousel')).toBeInTheDocument()
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument()
  })

  it('shows the empty, not-connected and error states', async () => {
    renderTab({ scenario: 'empty' })
    expect(await find('No history yet')).toBeInTheDocument()
    cleanup()
    renderTab({ notConnected: true })
    expect(await find('Connect the history repository')).toBeInTheDocument()
    expect(screen.getByText('GitHub not connected')).toBeInTheDocument()
    cleanup()
    renderTab({ scenario: 'error' })
    expect(await find(LIST_FAILED_MESSAGE)).toBeInTheDocument()
  })
})
