import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { HistoryTab } from '../ui/Tab'
import { createMockHandlers, type HistoryMockOptions } from '../mock'

const NOW = new Date('2026-11-12T12:00:00')

function renderTab(options: HistoryMockOptions = {}) {
  const client = createRpcClient(createMockTransport(createMockHandlers({ delayMs: 0, growOnRefresh: false, now: () => NOW, ...options }), 0))
  return render(<RpcProvider client={client}><HistoryTab now={() => NOW} /></RpcProvider>)
}
const find = (text: string | RegExp) => screen.findByText(text, {}, { timeout: 3000 })

async function openDialog() {
  await find('GitHub connected')
  fireEvent.click(screen.getByRole('button', { name: 'New changelog' }))
  return screen.findByRole('dialog', { name: 'New changelog' })
}

afterEach(cleanup)

describe('History › New changelog', () => {
  it('shows where you are, generates the changelog and previews what changed', async () => {
    renderTab()
    const dialog = await openDialog()
    const where = await within(dialog).findByLabelText('Where you are')
    expect(within(where).getByText('button-refresh')).toBeInTheDocument()
    expect(within(where).getByText('Project Bluebird UI')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Generate changelog' }))
    const variables = await within(dialog).findByRole('region', { name: 'Variable changes' })
    expect(within(variables).getByText('surface/translucent')).toBeInTheDocument()
    expect(within(variables).getByText('Removed')).toBeInTheDocument()
    expect(within(within(dialog).getByRole('region', { name: 'Component changes' })).getByText('Filter chip')).toBeInTheDocument()
    expect(within(dialog).getByText('1 added · 2 modified · 1 removed')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Title')).toHaveValue('button-refresh')
  })

  it('tags a ticket the team already used, submits, and lists it as under review', async () => {
    renderTab()
    const dialog = await openDialog()
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Generate changelog' }))
    await within(dialog).findByRole('region', { name: 'Variable changes' })
    fireEvent.input(within(dialog).getByLabelText('Jira ticket'), { target: { value: 'nope' } })
    expect(within(dialog).getByRole('button', { name: 'Submit for review' })).toBeDisabled()
    fireEvent.click(within(within(dialog).getByRole('group', { name: 'Tickets the team used' })).getByRole('button', { name: 'BB-342' }))
    expect(within(dialog).getByLabelText('Jira ticket')).toHaveValue('BB-342')
    fireEvent.input(within(dialog).getByLabelText('Title'), { target: { value: 'Button refresh v2' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit for review' }))
    expect(await find(/Submitted for review\. Your team sees it in History as Under review\. The changelog card is on this page\./)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const card = await screen.findByRole('article', { name: 'Changelog: Button refresh v2' })
    expect(card).toHaveAttribute('data-status', 'review')
    expect(within(card).getByText('Under review')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Open BB-342 in Jira' })).toBeInTheDocument()
  })

  it('lets a teammate review and approve a changelog', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(screen.getByRole('button', { name: 'View details: Toggle surface cleanup' }))
    expect(screen.getByText('Under review')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Variable changes' })).getAllByText('1 variable')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Approve and publish' }))
    expect(await find(/Approved\. “Toggle surface cleanup” is now in/)).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'View details: Toggle surface cleanup' }))
    expect(await find('Approved')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument()
  })

  it('explains when the file is not a branch, and closes', async () => {
    renderTab({ notBranch: true })
    const dialog = await openDialog()
    expect(await within(dialog).findByText(/This file is not a branch/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Generate changelog' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says why a compare failed and what an unchanged branch looks like', async () => {
    renderTab({ scenario: 'error' })
    // The error scenario fails the list too; the pop-up is reached from a connected list only.
    expect(await find('Couldn’t read the team history')).toBeInTheDocument()
    cleanup()
    renderTab({ scenario: 'empty' })
    const dialog = await openDialog()
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Generate changelog' }))
    expect(await within(dialog).findByText('No changes found')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
