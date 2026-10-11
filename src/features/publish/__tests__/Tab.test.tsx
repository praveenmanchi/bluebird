import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { EXTRACT_FAILED_MESSAGE, createMockHandlers, type PublishMockOptions } from '../mock'

function renderTab(options: PublishMockOptions = {}) {
  const client = createRpcClient(createMockTransport(createMockHandlers({ stepDelayMs: 0, ...options }), 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const find = (text: string | RegExp) => screen.findByText(text, {}, { timeout: 3000 })

async function extracted(options: PublishMockOptions = {}) {
  renderTab(options)
  fireEvent.click(await screen.findByRole('button', { name: 'Run extract' }))
  await find('Changes since v3.0.0')
}

afterEach(cleanup)

describe('Publish tab', () => {
  it('starts on Review changes with the last release and a Run extract button', async () => {
    renderTab()
    expect(await screen.findByRole('button', { name: 'Run extract' })).toBeInTheDocument()
    expect(screen.getByText(/the last published release/)).toHaveTextContent('v3.0.0')
    expect(screen.getByRole('button', { name: 'Next: Release notes' })).toBeDisabled()
    expect(screen.getByText('Review changes').closest('[aria-current="step"]')).not.toBeNull()
  })

  it('lists the 12 changes, five at a time, with filters', async () => {
    await extracted()
    expect(screen.getAllByRole('checkbox', { name: /^Include / })).toHaveLength(5)
    expect(screen.getByText('12 of 12 changes selected for the next release')).toBeInTheDocument()
    click('Show 7 more changes')
    expect(screen.getAllByRole('checkbox', { name: /^Include / })).toHaveLength(12)
    fireEvent.click(screen.getByRole('tab', { name: 'Components 4' }))
    expect(screen.getAllByRole('checkbox', { name: /^Include / })).toHaveLength(4)
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Filter changes' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Variables 8' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('checkbox', { name: /^Include / })).toHaveLength(5)
  })

  it('shows the Publish route before the extract and drops it once changes are listed (Figma "Changes")', async () => {
    renderTab()
    const run = await screen.findByRole('button', { name: 'Run extract' })
    expect(screen.getByText('Publish route')).toBeInTheDocument()
    fireEvent.click(run)
    await find('Changes since v3.0.0')
    expect(screen.queryByText('Publish route')).toBeNull()
  })

  it('shows two changelog notes, then the rest on demand, and regenerates edited notes', async () => {
    await extracted()
    click('Next: Release notes')
    await find('Changelog')
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Regenerate' })).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    fireEvent.input(screen.getByRole('textbox', { name: /^Changelog note for / }), { target: { value: 'Rewritten by hand.' } })
    expect(screen.getByText(/1 edited, 11 drafted from the diff/)).toBeInTheDocument()
    click('Regenerate')
    expect(screen.getByText(/0 edited, 12 drafted from the diff/)).toBeInTheDocument()
    expect(screen.queryByText('Rewritten by hand.')).toBeNull()
    click('Show 10 more notes')
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(12)
  })

  it('expands a change to show its value per brand and where it is used', async () => {
    await extracted()
    const toggles = screen.getAllByRole('button', { name: 'Show details' })
    fireEvent.click(toggles[2]!) // button/bg/primary sorts after the two breaking changes and the additions
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Hide details' })).toHaveLength(1))
  })

  it('excluding a change updates the count and what ships', async () => {
    await extracted()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include surface/translucent' }))
    expect(screen.getByText('11 of 12 changes selected for the next release')).toBeInTheDocument()
  })

  it('walks through notes and final review to a live release with a link', async () => {
    await extracted()
    click('Next: Release notes')
    expect(await find('Suggested because surface/translucent was removed. Sites pinned to v3 keep working.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Major v4.0.0/ })).toBeChecked()
    expect(screen.getByLabelText('Release title')).toHaveValue('Button, Date picker and 10 more')
    click('Next: Final review')
    expect(await find('Opens a pull request on praveenmanchi/bridge-ds-site · the repository’s CI builds the site')).toBeInTheDocument()
    click('Publish v4.0.0')
    expect(await find('v4.0.0 is live')).toBeInTheDocument()
    expect(screen.getByLabelText('Generated for this release')).toHaveValue('https://ds.bridge.design/releases/v4.0.0')
    expect(screen.getByRole('button', { name: 'Start the next release' })).toBeInTheDocument()
  })

  it('lets the designer pick another version and edit a note', async () => {
    await extracted()
    click('Next: Release notes')
    fireEvent.click(await screen.findByRole('radio', { name: /Minor v3.1.0/ }))
    expect(screen.getByRole('radio', { name: /Minor v3.1.0/ })).toBeChecked()
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    const box = screen.getByRole('textbox', { name: /^Changelog note for / })
    fireEvent.input(box, { target: { value: 'Rewritten by hand.' } })
    expect(screen.getByText(/1 edited, 11 drafted from the diff/)).toBeInTheDocument()
  })

  it('shows the push-rejected and build-failed outcomes with their logs', async () => {
    await extracted({ outcome: 'push-rejected' })
    click('Next: Release notes'); click('Next: Final review'); click('Publish v4.0.0')
    expect(await find('Push to main was rejected')).toBeInTheDocument()
    expect(screen.getByText(/protected branch hook declined/)).toBeInTheDocument()
    cleanup()
    await extracted({ outcome: 'build-failed' })
    click('Next: Release notes'); click('Next: Final review'); click('Publish v4.0.0')
    expect(await find('Site build failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry build' })).toBeInTheDocument()
  })

  it('shows the extract error with Try again', async () => {
    renderTab({ scenario: 'error' })
    fireEvent.click(await screen.findByRole('button', { name: 'Run extract' }))
    expect(await find(EXTRACT_FAILED_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('covers the empty states: no changes, first release, not connected', async () => {
    renderTab({ scenario: 'empty' })
    fireEvent.click(await screen.findByRole('button', { name: 'Run extract' }))
    expect(await find('No variable or component changes since v3.0.0. Edits made in this file show up the next time you run an extract.')).toBeInTheDocument()
    cleanup()
    renderTab({ scenario: 'many' })
    expect(await screen.findByRole('button', { name: 'Run first extract' })).toBeInTheDocument()
    cleanup()
    renderTab({ notConnected: true })
    expect(await screen.findByRole('button', { name: 'Connect GitHub' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extract anyway' })).toBeInTheDocument()
  })
})
