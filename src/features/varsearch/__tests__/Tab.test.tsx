import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { createMockHandlers, type MockScenario } from '../mock'

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
