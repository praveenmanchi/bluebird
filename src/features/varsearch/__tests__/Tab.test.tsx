import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { createMockHandlers, type MockScenario } from '../mock'
import { recentResults } from '../state'
import { MSG, type SearchResult } from '../messages'

function renderTab(scenario: MockScenario = 'default') {
  const client = createRpcClient(createMockTransport(createMockHandlers(scenario), 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

async function searchFor(text: string) {
  fireEvent.input(screen.getByRole('searchbox', { name: 'Variable name' }), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  const scanning = () => screen.queryByText(/^(Starting the scan…|Scanning )/)
  await waitFor(() => expect(scanning()).not.toBeNull())
  await waitFor(() => expect(scanning()).toBeNull(), { timeout: 3000 })
}

describe('varsearch Tab', () => {
  it('starts with the toolbar and the Search variables empty state when nothing was searched', async () => {
    renderTab('empty')
    expect(screen.getByRole('toolbar', { name: 'Variable search' })).toBeInTheDocument()
    expect(screen.getByText('Search variables')).toBeInTheDocument()
    expect(screen.getByText('All-pages mode: scanning every page in the document.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled()
  })

  it('lists recent searches with their age and usage', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recent searches' })).toBeInTheDocument())
    expect(screen.getByText('button/primary/bg/default')).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    expect(screen.getByText('12 days ago')).toBeInTheDocument()
  })

  it('opens a recent search without scanning again; only its Inspect button re-runs the search', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recent searches' })).toBeInTheDocument())
    const card = () => screen.getByText('button/primary/bg/default').closest('article')!
    fireEvent.click(within(card()).getByRole('button', { name: 'Expand' }))
    // Still on Recent searches: no scan started, and the card says how to get its results.
    expect(screen.queryByText(/^(Starting the scan…|Scanning )/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Recent searches' })).toBeInTheDocument()
    expect(within(card()).getByRole('button', { name: 'Collapse' })).toBeInTheDocument()
    expect(screen.getByText(/Results from an earlier session aren’t kept/)).toBeInTheDocument()
    fireEvent.click(within(card()).getByRole('button', { name: 'Inspect' }))
    await waitFor(() => expect(screen.queryByText(/^(Starting the scan…|Scanning )/)).not.toBeNull())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Search results' })).toBeInTheDocument(), { timeout: 3000 })
  })

  it('opens a recent search from this session on the results it already found', async () => {
    // What a search earlier in this session left behind for this variable.
    const client = createRpcClient(createMockTransport(createMockHandlers('default'), 0))
    const found = await client.call<SearchResult>(MSG.search, { query: 'button/primary/bg/default', pageIds: [], types: [] }, 5000)
    recentResults.value = new Map(found.variables.map((v) => [v.name, v]))
    renderTab()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recent searches' })).toBeInTheDocument())
    const card = screen.getByText('button/primary/bg/default').closest('article')!
    fireEvent.click(within(card).getByRole('button', { name: 'Expand' }))
    expect(screen.queryByText(/^(Starting the scan…|Scanning )/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Recent searches' })).toBeInTheDocument()
    expect(screen.getByText('Components using this variable')).toBeInTheDocument()
    expect(screen.queryByText(/Results from an earlier session aren’t kept/)).toBeNull()
  })

  it('drops a scan that finishes after the tab closed, so the next visit starts clean', async () => {
    const first = renderTab()
    fireEvent.input(screen.getByRole('searchbox', { name: 'Variable name' }), { target: { value: 'dropdown/border/default' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(screen.queryByText(/^(Starting the scan…|Scanning )/)).not.toBeNull())
    first.unmount()
    await new Promise((r) => setTimeout(r, 1500)) // the mock scan finishes in the meantime
    renderTab()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recent searches' })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Search results' })).toBeNull()
  })

  it('offers Copy and Add to Figma only once a search has results', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recent searches' })).toBeInTheDocument())
    expect(screen.queryByRole('group', { name: 'Search report' })).toBeNull()
    await searchFor('dropdown/border/default')
    const bar = screen.getByRole('group', { name: 'Search report' })
    expect(within(bar).getByText('1 variable · 5 places · 11 nodes')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Add to Figma' })).toBeInTheDocument()
  })

  it('copies the whole search as plain text for Jira or Teams', async () => {
    const writeText = vi.fn(async (_text: string) => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderTab()
    await searchFor('dropdown/border/default')
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(screen.getByText('Copied the search report')).toBeInTheDocument())
    const text = writeText.mock.calls[0]![0] as string
    expect(text.startsWith('Variable search: “dropdown/border/default”')).toBe(true)
    expect(text).toContain('- Tab sub menu (Molecules) · 5 nodes · https://www.figma.com/design/MOCKFILEKEY?node-id=n-Tab sub menu')
    expect(text.endsWith('From Bluebird Variable search.')).toBe(true)
  })

  it('adds the report to the page and says where it went', async () => {
    renderTab()
    await searchFor('dropdown/border/default')
    fireEvent.click(screen.getByRole('button', { name: 'Add to Figma' }))
    await waitFor(() => expect(screen.getByText('Added the search report to this page')).toBeInTheDocument())
    expect(screen.getByText(/“Variable search report · dropdown\/border\/default” is on Molecules/)).toBeInTheDocument()
  })

  it('searches and opens the best match on the components using it', async () => {
    renderTab()
    await searchFor('dropdown/border/default')
    expect(screen.getByRole('heading', { name: 'Search results' })).toBeInTheDocument()
    expect(screen.getByText('Components using this variable')).toBeInTheDocument()
    expect(screen.getByText('Tab sub menu')).toBeInTheDocument()
    expect(screen.getByText('Brand UI · Used by 5 components · Affects 8 brand modes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show layers of Tab sub menu' })).toBeInTheDocument()
  })

  it('keeps other matches collapsed and expands them on demand', async () => {
    renderTab()
    await searchFor('border')
    expect(screen.queryAllByRole('button', { name: 'Expand' })).toHaveLength(0)
    await searchFor('/default')
    const expand = screen.getAllByRole('button', { name: 'Expand' })
    expect(expand.length).toBeGreaterThan(0)
    fireEvent.click(expand[0]!)
    await waitFor(() => expect(screen.getAllByText('Components using this variable')).toHaveLength(2))
  })

  it('confirms Show layers and Go to with a toast', async () => {
    renderTab()
    await searchFor('dropdown/border/default')
    fireEvent.click(screen.getByRole('button', { name: 'Show layers of Tab sub menu' }))
    await waitFor(() => expect(screen.getByText('Selected 5 layers in Tab sub menu')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Show Tab sub menu' }))
    await waitFor(() => expect(screen.getByText('Opened Molecules')).toBeInTheDocument())
  })

  it('narrows pages and types from the toolbar menus', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByRole('button', { name: /All Pages/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /All Pages/ }))
    const pages = await screen.findByRole('listbox', { name: 'Pages to search' })
    fireEvent.click(await within(pages).findByText('Organisms'))
    expect(screen.getByRole('button', { name: /Organisms/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /All types/ }))
    const types = await screen.findByRole('listbox', { name: 'Where to look' })
    fireEvent.click(within(types).getByText('Component'))
    expect(screen.getByRole('button', { name: /Component/ })).toBeInTheDocument()
    await searchFor('dropdown/border/default')
    expect(screen.getByText('Brand UI · Used by 1 component · Affects 8 brand modes')).toBeInTheDocument()
  })

  it('says why there are no results', async () => {
    renderTab()
    await searchFor('nothing/like/this')
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.getByText(/No variable is named like/)).toBeInTheDocument()
  })

  it('shows the scan error with a way to retry', async () => {
    renderTab('error')
    await searchFor('dropdown')
    expect(screen.getByText('The search didn’t finish')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
