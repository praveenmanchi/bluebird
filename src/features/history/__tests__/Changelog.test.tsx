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

  it('picks a ticket from Jira, posts the changes to it, notifies the reviewers and lists it as under review', async () => {
    renderTab()
    const dialog = await openDialog()
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Generate changelog' }))
    await within(dialog).findByRole('region', { name: 'Variable changes' })
    // Type a number: a bad key blocks the submit.
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Type a number' }))
    fireEvent.input(within(dialog).getByLabelText('Ticket number'), { target: { value: 'nope' } })
    expect(within(dialog).getByRole('button', { name: 'Submit for review' })).toBeDisabled()
    // Pick a ticket: the open tickets from the Jira project.
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Pick a ticket' }))
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Jira ticket' }))
    fireEvent.click(await within(dialog).findByText('BB-342 · Darker primary button for AA contrast'))
    const comment = within(dialog).getByLabelText('Jira comment on BB-342')
    expect(within(comment).getByRole('checkbox', { name: 'Post the changes to BB-342 as a Jira comment' })).toBeChecked()
    expect(within(comment).getByText(/Changelog sent for review/)).toBeInTheDocument()
    expect(within(comment).getByText('Figma branch')).toBeInTheDocument()
    const notify = within(dialog).getByRole('region', { name: 'Notify reviewers' })
    expect(within(notify).getByText('Microsoft Teams')).toBeInTheDocument()
    expect(within(notify).getByText('Outlook')).toBeInTheDocument()
    fireEvent.input(within(dialog).getByLabelText('Title'), { target: { value: 'Button refresh v2' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit for review' }))
    expect(await find(/BB-342 got a Jira comment with the changes and the Figma branch link\. Microsoft Teams and Outlook were notified\./)).toBeInTheDocument()
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
    // The reviewer doesn't pick a ticket: the one the designer linked is shown, with the approval comment.
    const jira = screen.getByRole('region', { name: 'Jira ticket' })
    expect(within(jira).getByText(/linked by Meera Shah/)).toBeInTheDocument()
    expect(within(jira).getByRole('checkbox', { name: 'Post the approval to BB-336 as a Jira comment' })).toBeChecked()
    expect(within(jira).queryByRole('tab', { name: 'Pick a ticket' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Approve and publish' }))
    expect(await find(/Approved\. “Toggle surface cleanup” is now in .* BB-336 got a Jira comment with the approval/)).toBeInTheDocument()
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
