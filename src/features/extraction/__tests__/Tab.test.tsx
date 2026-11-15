import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { EXTRACT_FAILED_MESSAGE, createMockHandlers, type ExtractionMockOptions } from '../mock'

function renderTab(options: ExtractionMockOptions = {}) {
  const client = createRpcClient(createMockTransport(createMockHandlers({ delayMs: 0, ...options }), 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const find = (text: string | RegExp) => screen.findByText(text, {}, { timeout: 3000 })

async function extracted(options: ExtractionMockOptions = {}) {
  renderTab(options)
  await find('GitHub connected')
  fireEvent.click(button('Extract'))
  await find('Variable changes')
}

afterEach(cleanup)

describe('Extraction tab', () => {
  it('starts with the GitHub status, the default branch and nothing compared', async () => {
    renderTab()
    expect(await find('GitHub connected')).toBeInTheDocument()
    expect(button('Compare with')).toHaveTextContent('Compare with: main')
    expect(screen.getByText('Nothing compared yet')).toBeInTheDocument()
    expect(screen.getByText(/latest extraction on main: Praveen Manchi/)).toBeInTheDocument()
  })

  it('lists every branch with who extracted last and when', async () => {
    renderTab()
    await find('GitHub connected')
    fireEvent.click(button('Compare with'))
    expect(screen.getByText(/^Anita Rao · 8 Nov/)).toBeInTheDocument()
    expect(screen.getByText('No extraction yet')).toBeInTheDocument()
    fireEvent.click(screen.getByText('develop'))
    expect(button('Compare with')).toHaveTextContent('Compare with: develop')
  })

  it('shows variable changes, the brand modes and the impacted components on one page', async () => {
    await extracted()
    expect(screen.getByText('Drift detected')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 6' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Changes by brand mode')).toBeInTheDocument()
    const modeRows = within(screen.getByRole('list', { name: 'Brand modes' })).getAllByRole('listitem')
    expect(modeRows.length).toBeGreaterThan(0)
    for (const row of modeRows) expect(row.querySelectorAll('.bb-change-count').length).toBeGreaterThan(0)
    expect(screen.getByText('Component impact')).toBeInTheDocument()
    expect(screen.getByText('Breaking')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /^Include / })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Removed 1' }))
    expect(screen.getByRole('list', { name: 'Variable changes' }).children).toHaveLength(1)
    expect(button('Extract again')).toBeInTheDocument()
  })

  it('opens a pull request from another branch and reports it', async () => {
    await extracted()
    // main is the default branch: it can be pushed to, but a pull request needs another one.
    expect(button('Create pull request')).toBeDisabled()
    fireEvent.click(button('Target branch'))
    fireEvent.click(screen.getAllByText('develop').pop()!)
    fireEvent.click(button('Create pull request'))
    expect(await find('Pull request #74 is open')).toBeInTheDocument()
    expect(screen.getByText(/2 channels were notified/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Pushed')).toBeInTheDocument())
    expect(screen.getByText('Nothing compared yet')).toBeInTheDocument()
  })

  it('validates a new branch name and the Jira key before pushing', async () => {
    await extracted()
    fireEvent.click(screen.getByRole('tab', { name: 'New branch' }))
    const name = screen.getByLabelText('New branch name')
    fireEvent.input(name, { target: { value: 'has space' } })
    expect(button('Push to branch')).toBeDisabled()
    fireEvent.input(name, { target: { value: 'develop' } })
    expect(screen.getByText(/develop already exists/)).toBeInTheDocument()
    fireEvent.input(name, { target: { value: 'extraction/button-refresh' } })
    expect(button('Push to branch')).not.toBeDisabled()
    fireEvent.input(screen.getByLabelText('Jira ticket (optional)'), { target: { value: 'nope' } })
    expect(button('Push to branch')).toBeDisabled()
  })

  it('keeps the list when a push is rejected', async () => {
    await extracted({ outcome: 'rejected' })
    fireEvent.click(button('Push to branch'))
    expect(await find('Push to main was rejected')).toBeInTheDocument()
    expect(screen.getByText('Variable changes')).toBeInTheDocument()
  })

  it('says so when nothing changed', async () => {
    renderTab({ scenario: 'empty' })
    await find('GitHub connected')
    fireEvent.click(button('Extract'))
    expect(await find('Nothing changed')).toBeInTheDocument()
    expect(screen.getByText('In sync')).toBeInTheDocument()
  })

  it('ignores Extract until the branches have loaded', async () => {
    renderTab()
    fireEvent.click(button('Extract'))
    await find('GitHub connected')
    expect(screen.getByText('Nothing compared yet')).toBeInTheDocument()
  })

  it('asks for a new branch when the repository has none', async () => {
    renderTab({ scenario: 'many' })
    expect(await screen.findByLabelText('New branch · created on your first push')).toBeInTheDocument()
    fireEvent.click(button('Extract'))
    await find('Variable changes')
    expect(screen.getByRole('tab', { name: 'New branch' })).toHaveAttribute('aria-selected', 'true')
    expect(button('Create pull request')).toBeDisabled()
  })

  it('points to Settings when GitHub is not connected, and shows an extract error', async () => {
    renderTab({ notConnected: true })
    expect(await find('GitHub not connected')).toBeInTheDocument()
    expect(button('Extract')).toBeDisabled()
    cleanup()
    renderTab({ scenario: 'error' })
    await find('GitHub connected')
    fireEvent.click(button('Extract'))
    expect(await find(EXTRACT_FAILED_MESSAGE)).toBeInTheDocument()
  })
})
