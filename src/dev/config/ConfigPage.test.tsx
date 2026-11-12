import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import rawConfig from '@config'
import { ConfigPage } from './ConfigPage'

function serve() {
  const calls: { method: string; body?: unknown }[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) as unknown : undefined
    calls.push({ method: init?.method ?? 'GET', body })
    return new Response(JSON.stringify({ ok: true, config: rawConfig, build: { status: 'idle' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
  return calls
}

// The grid's checkboxes run effects after paint; Preact's fallback timer (35 ms) must fire before jsdom is torn down.
const AFTER_PAINT_MS = 50

afterEach(async () => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
  await new Promise((resolve) => setTimeout(resolve, AFTER_PAINT_MS))
})

describe('ConfigPage', () => {
  it('lists the eight brands and the selected brand’s tabs', async () => {
    serve()
    render(<ConfigPage brandId="ikea" onBrand={() => undefined} onPreview={() => undefined} />)
    const brands = await screen.findByRole('complementary', { name: 'Brands' })
    expect(within(brands).getAllByRole('button').map((b) => b.textContent)).toEqual([
      expect.stringContaining('Bridge'), expect.stringContaining('Ikea'), expect.stringContaining('Richemont'), expect.stringContaining('Disney'), expect.stringContaining('Fiskars'), expect.stringContaining('AkzoNobel'), expect.stringContaining('Adecco'), expect.stringContaining('Gap Inc.'),
    ])
    expect(within(screen.getByRole('list', { name: 'Tab order' })).getAllByRole('listitem')).toHaveLength(11)
  })

  it('saves a hidden tab, a new order and a section set here as one patch for that brand', async () => {
    const calls = serve()
    render(<ConfigPage brandId="ikea" onBrand={() => undefined} onPreview={() => undefined} />)
    fireEvent.click(await screen.findByRole('switch', { name: 'Show Jira board' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Publish up' }))
    const github = screen.getByRole('region', { name: 'GitHub output configuration' })
    fireEvent.click(within(github).getByText('Set here'))
    fireEvent.input(within(github).getByLabelText('Repository (owner/repo)'), { target: { value: 'ikea/tokens' } })
    expect(within(github).getByLabelText('API key')).toBeDisabled()
    expect(screen.getByText(/Unsaved changes: Ikea/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true))
    const patch = calls.find((c) => c.method === 'PUT')!.body as Record<string, { tabs: { id: string; enabled: boolean }[]; integrations: { github: Record<string, unknown> } }>
    expect(Object.keys(patch)).toEqual(['ikea'])
    expect(patch.ikea!.tabs.find((t) => t.id === 'jira')?.enabled).toBe(false)
    expect(patch.ikea!.tabs.map((t) => t.id).indexOf('publish')).toBe(7)
    expect(patch.ikea!.integrations.github).toMatchObject({ repo: 'ikea/tokens' })
    expect(patch.ikea!.integrations.github).not.toHaveProperty('apiKey')
    expect(await screen.findByRole('heading', { name: /Rebuild the plugin to use it in Figma/ })).toBeInTheDocument()
  })

  it('saves which features a persona gets for this brand only', async () => {
    const calls = serve()
    render(<ConfigPage brandId="ikea" onBrand={() => undefined} onPreview={() => undefined} />)
    const matrix = await screen.findByRole('table', { name: 'Features per persona' })
    expect(within(matrix).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Feature', expect.stringContaining('Design System'), expect.stringContaining('UI/UX Designer'), expect.stringContaining('Content'), expect.stringContaining('Developer'),
    ])
    const a11y = within(matrix).getByRole('checkbox', { name: 'Accessibility for Content' })
    expect(a11y).not.toBeChecked()
    fireEvent.click(a11y)
    expect(within(matrix).getByRole('checkbox', { name: 'Accessibility for Content' })).toBeChecked()
    expect(within(screen.getByRole('list', { name: 'Tab order' })).getAllByRole('listitem')[0]).toHaveTextContent('Content')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true))
    const patch = calls.find((c) => c.method === 'PUT')!.body as Record<string, { personas: Record<string, string[]> }>
    expect(Object.keys(patch)).toEqual(['ikea'])
    expect(patch.ikea!.personas).toEqual({ content: ['agents', 'uxai', 'jira', 'history', 'a11y'] })
    expect(await screen.findByRole('heading', { name: /Rebuild the plugin to use it in Figma/ })).toBeInTheDocument()
  })

  it('says when a persona has nothing and locks tabs this brand hides', async () => {
    serve()
    render(<ConfigPage brandId="ikea" onBrand={() => undefined} onPreview={() => undefined} />)
    const matrix = await screen.findByRole('table', { name: 'Features per persona' })
    for (const tab of ['UX AI agents', 'UXAI', 'Jira board', 'History']) fireEvent.click(within(matrix).getByRole('checkbox', { name: `${tab} for Content` }))
    expect(within(matrix).getByRole('columnheader', { name: /Content/ })).toHaveTextContent('Not offered')

    fireEvent.click(screen.getByRole('switch', { name: 'Show Publish' }))
    expect(within(matrix).getByRole('checkbox', { name: 'Publish for Design System' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Use default personas' }))
    expect(within(matrix).getByRole('columnheader', { name: /Content/ })).toHaveTextContent('4 features')
  })

  it('blocks Save when a brand would have no tab left', async () => {
    serve()
    render(<ConfigPage brandId="disney" onBrand={() => undefined} onPreview={() => undefined} />)
    for (const tab of await screen.findAllByRole('switch', { name: /^Show / })) fireEvent.click(tab)
    expect(screen.getByText(/Disney: turn at least one tab on/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('blocks Save while a section set here has an invalid field', async () => {
    serve()
    render(<ConfigPage brandId="bridge" onBrand={() => undefined} onPreview={() => undefined} />)
    const storybook = await screen.findByRole('region', { name: 'Storybook' })
    fireEvent.click(within(storybook).getByText('Set here'))
    fireEvent.input(within(storybook).getByLabelText('Base URL'), { target: { value: 'ftp://nope' } })
    expect(screen.getByText(/Fix Bridge › Storybook before saving/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
