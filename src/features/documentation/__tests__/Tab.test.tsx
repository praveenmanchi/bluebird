import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { GENERATE_FAILED_MESSAGE, createMockHandlers, type DocumentationMockOptions } from '../mock'

function renderTab(options: DocumentationMockOptions = {}) {
  const client = createRpcClient(createMockTransport(createMockHandlers({ delayMs: 0, ...options }), 0))
  render(<RpcProvider client={client}><Tab /></RpcProvider>)
  return client
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const find = (text: string | RegExp) => screen.findByText(text, {}, { timeout: 3000 })
const button = (name: string | RegExp) => screen.findByRole('button', { name }, { timeout: 3000 })

async function generated(options: DocumentationMockOptions = {}) {
  const client = renderTab(options)
  fireEvent.click(await button('Generate docs'))
  await find('Up to date')
  return client
}

async function onHandoff(options: DocumentationMockOptions = {}) {
  const client = renderTab(options)
  await button('Generate docs')
  fireEvent.click(screen.getByRole('tab', { name: 'Handoff' }))
  await find('Pages in this file')
  return client
}

async function audited(options: DocumentationMockOptions = {}) {
  const client = await onHandoff(options)
  fireEvent.click(screen.getByRole('checkbox', { name: /^Publish · 14 screens/ }))
  click('Check and hand off')
  await screen.findByRole('dialog', { name: 'Before you hand off' })
  return client
}

afterEach(cleanup)

describe('Documentation tab · Components', () => {
  it('asks for a component when nothing is selected', async () => {
    renderTab({ scenario: 'empty' })
    expect(await find('Select a component to document')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate docs' })).toBeDisabled()
    expect(screen.getByText('Nothing selected')).toBeInTheDocument()
  })

  it('shows the selection, its sections and the count in the action bar', async () => {
    renderTab()
    await button('Generate docs')
    expect(screen.getAllByText('Button').length).toBeGreaterThan(0)
    expect(screen.getByText(/Component set · 12 variants/)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(7)
    expect(screen.getByText('6 sections · 5 brands · 12 variants')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Code snippet/ }))
    expect(screen.getByText('5 sections · 5 brands · 12 variants')).toBeInTheDocument()
    click('Select all')
    expect(screen.getByText('6 sections · 5 brands · 12 variants')).toBeInTheDocument()
    click('Clear all')
    expect(screen.getByRole('button', { name: 'Generate docs' })).toBeDisabled()
  })

  it('generates the doc and shows every section', async () => {
    await generated()
    for (const heading of ['Anatomy', 'Properties and variants', 'Tokens used', 'Brand differences · button/primary/bg/default', 'Accessibility', 'Code']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByText('button/primary/radius')).toBeInTheDocument()
    expect(screen.getByText('Contrast 1.4.3 · fails at 3.5:1')).toBeInTheDocument()
    expect(screen.getByText('Doc frame placed on the Documentation page')).toBeInTheDocument()
  })

  it('opens the doc frame on the canvas', async () => {
    const client = await generated()
    click('Open doc frame')
    await new Promise((r) => setTimeout(r, 20))
    expect(await client.call('documentation:mock-located')).toBe('mock-frame:Doc · Button')
  })

  it('leaves out unchecked sections and the frame', async () => {
    renderTab()
    await button('Generate docs')
    fireEvent.click(screen.getByRole('checkbox', { name: /^Anatomy/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^Doc frame/ }))
    click('Generate docs')
    await find('Up to date')
    expect(screen.queryByRole('heading', { name: 'Anatomy' })).toBeNull()
    expect(screen.getByText('Kept on the component · no frame drawn')).toBeInTheDocument()
    click('Generate again')
    expect(await button('Back to doc')).toBeInTheDocument()
  })

  it('flags the doc out of date when the component changed, and regenerates', async () => {
    const client = await generated({ scenario: 'many' })
    // The designer edits the component and comes back to the tab: the stored doc no longer matches.
    cleanup()
    render(<RpcProvider client={client}><Tab /></RpcProvider>)
    expect(await find('Out of date')).toBeInTheDocument()
    expect(screen.getByText(/^3 changes since/)).toBeInTheDocument()
    expect(screen.getByText('18 variants, was 12 · Size is now Small · Medium · Large · button/primary/radius 6 → 8')).toBeInTheDocument()
    click('Copy Markdown')
    click('Regenerate')
    expect(await find('Up to date')).toBeInTheDocument()
  })

  it('shows why a doc failed and retries', async () => {
    renderTab({ scenario: 'error' })
    fireEvent.click(await button('Generate docs'))
    expect(await find(GENERATE_FAILED_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('Couldn’t finish the Button doc')).toBeInTheDocument()
    click('Change sections')
    expect(await button('Generate docs')).toBeEnabled()
  })

  it('shows the Style guide as on hold', async () => {
    renderTab()
    await button('Generate docs')
    fireEvent.click(screen.getByRole('tab', { name: 'Style guide' }))
    expect(screen.getByText('Style guide is on hold')).toBeInTheDocument()
  })
})

describe('Documentation tab · Hand-off', () => {
  it('lists the pages and counts what is picked', async () => {
    await onHandoff()
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Check and hand off' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Publish · 14 screens · 6 prototype flows/ }))
    expect(screen.getByText('1 page · 14 screens · 6 flows')).toBeInTheDocument()
    click('Select all')
    expect(screen.getByText('5 pages · 52 screens · 15 flows')).toBeInTheDocument()
  })

  it('says so when the file has no pages with screens', async () => {
    renderTab({ scenario: 'empty' })
    await find('Select a component to document')
    fireEvent.click(screen.getByRole('tab', { name: 'Handoff' }))
    expect(await find('No pages with screens')).toBeInTheDocument()
  })

  it('audits the picked pages in a pop-up', async () => {
    await audited()
    expect(screen.getByText('3 hard-coded spacing values')).toBeInTheDocument()
    expect(screen.getByText('Colours and type are bound to variables')).toBeInTheDocument()
    click('Cancel')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reviews issues: filter, ignore one, ignore all, continue', async () => {
    await audited()
    click('Review issues')
    expect(await find('Hard-coded spacing')).toBeInTheDocument()
    expect(screen.getByText('8 issues open · fixing is optional')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Apply fix/ })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Components 2' }))
    expect(screen.queryByText('Hard-coded spacing')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: /Ignore/ })[0]!)
    expect(screen.getByText('7 issues open · fixing is optional')).toBeInTheDocument()
    expect(screen.getByText(/^Ignored · Actions bar/)).toBeInTheDocument()
    click('Ignore all')
    expect(screen.getByText('8 issues ignored · listed as known issues')).toBeInTheDocument()
    click('Continue')
    expect(await find('About this hand-off')).toBeInTheDocument()
  })

  it('locates a finding on the canvas', async () => {
    const client = await audited()
    click('Review issues')
    await find('Hard-coded spacing')
    fireEvent.click(screen.getAllByRole('button', { name: /Locate/ })[0]!)
    await new Promise((r) => setTimeout(r, 20))
    expect(await client.call('documentation:mock-located')).toBe('publish:gap0')
  })

  it('creates the hand-off with a ticket and posts it to Jira', async () => {
    await audited()
    click('Ignore and continue')
    await find('About this hand-off')
    expect(screen.getByText('Creates the page “Handoff · Publish”')).toBeInTheDocument()
    fireEvent.click(await button('Jira ticket'))
    fireEvent.click(screen.getByRole('option', { name: /BB-210/ }))
    fireEvent.input(screen.getByRole('textbox', { name: 'What is this for?' }), { target: { value: 'Ship the v2 publish flow.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Version' }))
    fireEvent.click(screen.getByRole('option', { name: 'Draft v0.2' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^User flow/ }))
    click('Create hand-off')
    expect(await find('What’s in it')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Handoff · Publish' })).toBeInTheDocument()
    expect(screen.getByText('8 ignored, listed for the developers')).toBeInTheDocument()
    expect(screen.getByText('BB-210 · not posted yet')).toBeInTheDocument()
    expect(screen.queryByText('User flow', { selector: '.bb-check-item *' })).toBeNull()
    click('Post to BB-210')
    expect(await find('Posted to BB-210')).toBeInTheDocument()
    expect(screen.getByText('BB-210 · posted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Post to BB-210' })).toBeNull()
    click('Start another hand-off')
    expect(await find('Pages in this file')).toBeInTheDocument()
  })

  it('works without Jira and goes back through the steps', async () => {
    await audited({ noJira: true })
    click('Ignore and continue')
    expect(await find(/Connect Jira in Settings/)).toBeInTheDocument()
    click('Back')
    expect(await find('Hard-coded spacing')).toBeInTheDocument()
    click('Back')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('offers canvas order when the page has no prototype', async () => {
    await onHandoff()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Jira · 12 screens · no prototype/ }))
    click('Check and hand off')
    expect(await find('Jira has no prototype links')).toBeInTheDocument()
    click('Use canvas order')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    click('Continue')
    await find('About this hand-off')
    click('Back')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
