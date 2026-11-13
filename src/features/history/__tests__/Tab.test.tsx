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
    const variables = within(card).getByRole('group', { name: 'Variables: 5 updated, 2 added, 1 removed' })
    expect(within(variables).getByText('Added').nextElementSibling).toHaveTextContent('2')
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
