import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { createMockHandlers, mockResult, type MockScenario } from '../mock'
import { MSG, type CheckResult } from '../messages'

function renderTab(scenario: MockScenario = 'default', overrides: Record<string, unknown> = {}) {
  const handlers = { ...createMockHandlers(scenario), ...overrides }
  const client = createRpcClient(createMockTransport(handlers as never, 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

const row = (name: string) => screen.findByRole('article', { name })

describe('varmapper Tab', () => {
  it('summarises the check and lists the values, split by match', async () => {
    renderTab()
    expect(await screen.findByRole('heading', { name: 'Page header' })).toBeInTheDocument()
    expect(screen.getByText('Frame on Login · 55 hard-coded values · Bridge mode')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 55' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Colours 16' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Typography 10' })).toBeInTheDocument()
    const gap = await row('Gap 32 px')
    expect(within(gap).getByText('Exact')).toBeInTheDocument()
    expect(within(gap).getByText('Recommended variable')).toBeInTheDocument()
    expect(within(gap).getByRole('button', { name: 'Variable for Gap 32 px' })).toHaveTextContent('dimension/space/32 · 32')
  })

  it('counts each kind of row in the tiles', async () => {
    renderTab()
    await screen.findByRole('heading', { name: 'Page header' })
    for (const [label, caption] of [['Exact', 'ready to bind'], ['Check', 'same value, pick one'], ['Near', 'changes the value'], ['No match', 'pick one by hand']] as const) {
      expect(screen.getByText(caption)).toBeInTheDocument()
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('asks for a check on a row with several variables of that value', async () => {
    renderTab()
    const padding = await row('Padding 16 px')
    expect(within(padding).getByText('Check')).toBeInTheDocument()
    expect(within(padding).getByText('Suggested variable')).toBeInTheDocument()
    expect(within(padding).getByText('6 variables have this value. Check this one fits.')).toBeInTheDocument()
    expect(within(padding).getByRole('checkbox', { name: 'Select Padding 16 px' })).toBeDisabled()
  })

  it('lets a Check row join Bind several once a variable is picked', async () => {
    renderTab()
    const padding = await row('Padding 16 px')
    fireEvent.click(within(padding).getByRole('button', { name: 'Variable for Padding 16 px' }))
    expect(await within(padding).findByText('Same value · 6 variables')).toBeInTheDocument()
    fireEvent.click(within(padding).getByText('a11y/space/panel'))
    await waitFor(() => expect(within(padding).getByRole('checkbox', { name: 'Select Padding 16 px' })).toBeEnabled())
    expect(within(padding).getByText('Exact')).toBeInTheDocument()
    expect(within(padding).queryByText(/Check this one fits/)).toBeNull()
  })

  it('folds a long same-value list behind Show all', async () => {
    renderTab()
    const padding = await row('Padding 16 px')
    fireEvent.click(within(padding).getByRole('button', { name: 'Variable for Padding 16 px' }))
    await within(padding).findByText('Same value · 6 variables')
    expect(within(padding).queryByText('docs/space/panel')).toBeNull()
    fireEvent.click(within(padding).getByText('Show all 6'))
    expect(await within(padding).findByText('docs/space/panel')).toBeInTheDocument()
  })

  it('says what a Near row will change and keeps it out of Bind several', async () => {
    renderTab()
    const radius = await row('Corner radius 999 px')
    expect(within(radius).getByText('Near')).toBeInTheDocument()
    expect(within(radius).getByText('Nearest variable')).toBeInTheDocument()
    expect(within(radius).getByText('Changes the value: 999 px becomes 100 px.')).toBeInTheDocument()
    expect(within(radius).getByRole('checkbox', { name: 'Select Corner radius 999 px' })).toBeDisabled()
    expect(within(radius).getByRole('button', { name: 'Change Corner radius 999 px' })).toHaveTextContent('Change value')
  })

  it('lets a Near bind change the value, and only an exact one must keep it', async () => {
    const bind = vi.fn(async (p: { targets: unknown[] }) => ({ bound: p.targets.length, skipped: 0, restored: 0, restoredLayers: 0, stuck: 0, variable: 'x', undoId: 'u' }))
    renderTab('default', { [MSG.bind]: bind })
    fireEvent.click(within(await row('Corner radius 999 px')).getByRole('button', { name: 'Change Corner radius 999 px' }))
    await waitFor(() => expect(bind).toHaveBeenCalledWith(expect.objectContaining({ keepValue: false }), expect.anything()))
    expect(await within(await row('Corner radius 999 px')).findByText('Bound. Value changed.')).toBeInTheDocument()
    fireEvent.click(within(await row('Gap 32 px')).getByRole('button', { name: 'Bind Gap 32 px' }))
    await waitFor(() => expect(bind).toHaveBeenLastCalledWith(expect.objectContaining({ keepValue: true }), expect.anything()))
    expect(await within(await row('Gap 32 px')).findByText('Bound. Value unchanged.')).toBeInTheDocument()
  })

  it('explains a row with nothing near it', async () => {
    renderTab()
    const radius = await row('Corner radius 24 px')
    expect(within(radius).getByText('Nothing in Bluebird UI is near this value.')).toBeInTheDocument()
    expect(within(radius).getByText('Variable')).toBeInTheDocument()
  })

  it('shows a layer restored by the read-back, and counts it as still hard-coded', async () => {
    const bind = async () => ({ bound: 6, skipped: 0, restored: 2, restoredLayers: 1, stuck: 0, variable: 'x', undoId: 'u' })
    renderTab('default', { [MSG.bind]: bind })
    const padding = await row('Padding 16 px')
    fireEvent.click(within(padding).getByRole('button', { name: 'Bind Padding 16 px' }))
    expect(await screen.findByText('1 layer kept its hard-coded value')).toBeInTheDocument()
    expect(screen.getByText('Binding changed how it looks, so it was restored. Your other layers are bound. Re-check to see it.')).toBeInTheDocument()
    expect(within(padding).getByText('3 of 4 layers bound · 1 restored')).toBeInTheDocument()
    expect(within(padding).getByText('3 layers bound, value unchanged. 1 restored, value would have changed.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 49' })).toBeInTheDocument()
  })

  it('moves leftovers from a partial Bind out of Exact', async () => {
    renderTab('default', { [MSG.bind]: async (p: { targets: unknown[] }) => ({ bound: p.targets.length - 1, skipped: 0, restored: 1, restoredLayers: 1, stuck: 0, variable: 'x', undoId: 'u' }) })
    const padding = await row('Padding 16 px')
    fireEvent.click(within(padding).getByRole('button', { name: 'Variable for Padding 16 px' }))
    fireEvent.click(await within(padding).findByText('dimension/space/16'))
    fireEvent.click(await within(padding).findByRole('button', { name: 'Bind Padding 16 px' }))
    await screen.findByText('1 layer kept its hard-coded value')
    expect(screen.getByText('ready to bind').closest('.bb-kpi-tile')).toHaveTextContent('1')
  })

  it('keeps going past a group that failed, and reports what did bind', async () => {
    const bind = vi.fn(async (p: { variableKey: string; targets: unknown[] }) => {
      if (p.variableKey === 'key:dimension/space/32') throw new Error('These layers changed since the check.')
      return { bound: p.targets.length, skipped: 0, restored: 0, restoredLayers: 0, stuck: 0, variable: 'x', undoId: 'u' }
    })
    renderTab('default', { [MSG.bind]: bind })
    const padding = await row('Padding 16 px')
    fireEvent.click(within(padding).getByRole('button', { name: 'Variable for Padding 16 px' }))
    fireEvent.click(await within(padding).findByText('dimension/space/16'))
    fireEvent.click(await screen.findByRole('button', { name: 'Select exact matches' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Bind 2 groups' }))
    expect(await screen.findByText('Bound 8 values to 1 variable')).toBeInTheDocument()
    expect(screen.getByText('1 group couldn’t be bound: These layers changed since the check.')).toBeInTheDocument()
    expect(within(await row('Padding 16 px')).getByRole('button', { name: 'Undo Padding 16 px' })).toBeInTheDocument()
  })

  it('says why when the only group failed', async () => {
    renderTab('default', { [MSG.bind]: async () => { throw new Error('These layers changed since the check.') } })
    fireEvent.click(within(await row('Gap 32 px')).getByRole('button', { name: 'Bind Gap 32 px' }))
    expect(await screen.findByText('That didn’t work')).toBeInTheDocument()
  })

  it('drops a Bind’s results when a newer check has replaced the list', async () => {
    let finish: (r: unknown) => void = () => undefined
    const bind = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    renderTab('default', { [MSG.bind]: bind })
    fireEvent.click(within(await row('Gap 32 px')).getByRole('button', { name: 'Bind Gap 32 px' }))
    await waitFor(() => expect(bind).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /Re-check/ }))
    await row('Gap 32 px')
    finish({ bound: 1, skipped: 0, restored: 0, restoredLayers: 0, stuck: 0, variable: 'x', undoId: 'u' })
    await new Promise((r) => setTimeout(r, 10))
    expect(within(await row('Gap 32 px')).getByRole('button', { name: 'Bind Gap 32 px' })).toBeInTheDocument()
  })

  it('leaves a row open when every layer was restored', async () => {
    renderTab('default', { [MSG.bind]: async () => ({ bound: 0, skipped: 0, restored: 1, restoredLayers: 1, stuck: 0, variable: 'x', undoId: 'u' }) })
    const gap = await row('Gap 32 px')
    fireEvent.click(within(gap).getByRole('button', { name: 'Bind Gap 32 px' }))
    expect(await screen.findByText('Binding changed how it looks, so it was restored. Re-check to see it.')).toBeInTheDocument()
    expect(within(gap).getByRole('button', { name: 'Bind Gap 32 px' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 55' })).toBeInTheDocument()
  })

  it('warns about a value that changed and couldn’t be put back', async () => {
    renderTab('default', { [MSG.bind]: async () => ({ bound: 1, skipped: 0, restored: 0, restoredLayers: 0, stuck: 1, variable: 'x', undoId: 'u' }) })
    fireEvent.click(within(await row('Gap 32 px')).getByRole('button', { name: 'Bind Gap 32 px' }))
    expect(await screen.findByText('1 value changed and couldn’t be put back')).toBeInTheDocument()
  })

  it('names the mode on rows when a selection spans modes', async () => {
    const r = mockResult()
    if (r.status !== 'ready') throw new Error(r.status)
    const groups = r.groups.map((g, i) => (i === 0 ? { ...g, mode: 'Ikea' } : g))
    renderTab('default', { [MSG.check]: async () => ({ ...r, groups }) })
    expect(await within(await row('Gap 32 px')).findByText(/· Ikea$/)).toBeInTheDocument()
  })

  it('filters by category', async () => {
    renderTab()
    fireEvent.click(await screen.findByRole('tab', { name: 'Border 6' }))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Padding 16 px' })).toBeNull())
    expect(screen.getByRole('article', { name: 'Corner radius 999 px' })).toBeInTheDocument()
  })

  it('filters by layer name', async () => {
    renderTab()
    await screen.findByRole('heading', { name: 'Page header' })
    fireEvent.input(screen.getByRole('searchbox', { name: 'Filter by layer or value' }), { target: { value: 'pagination' } })
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByRole('article', { name: 'Gap 32 px' })).toBeInTheDocument()
  })

  it('binds one row and can undo it', async () => {
    const bind = vi.fn(async (p: { targets: unknown[] }) => ({ bound: p.targets.length, skipped: 0, restored: 0, restoredLayers: 0, stuck: 0, variable: 'docs/page/space/stack', undoId: 'undo:1' }))
    const undo = vi.fn(async () => ({ restored: 8, skipped: 0 }))
    renderTab('default', { [MSG.bind]: bind, [MSG.undo]: undo })
    const padding = await row('Padding 16 px')
    fireEvent.click(within(padding).getByRole('button', { name: 'Bind Padding 16 px' }))
    expect(await screen.findByText('Bound 8 values to 1 variable')).toBeInTheDocument()
    expect(bind).toHaveBeenCalledWith(expect.objectContaining({ variableKey: 'key:docs/page/space/stack', keepValue: true }), expect.anything())
    expect(screen.getByRole('tab', { name: 'All 47' })).toBeInTheDocument()
    fireEvent.click(within(await row('Padding 16 px')).getByRole('button', { name: 'Undo Padding 16 px' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'All 55' })).toBeInTheDocument())
    expect(undo).toHaveBeenCalledWith({ undoId: 'undo:1' }, expect.anything())
  })

  it('selects only exact rows for Bind several, and adds picked ones', async () => {
    const bind = vi.fn(async (p: { targets: unknown[] }) => ({ bound: p.targets.length, skipped: 0, restored: 0, restoredLayers: 0, stuck: 0, variable: 'x', undoId: 'undo:2' }))
    renderTab('default', { [MSG.bind]: bind })
    const padding = await row('Padding 16 px')
    fireEvent.click(within(padding).getByRole('button', { name: 'Variable for Padding 16 px' }))
    fireEvent.click(await within(padding).findByText('dimension/space/16'))
    fireEvent.click(await screen.findByRole('button', { name: 'Select exact matches' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Bind 2 groups' }))
    await waitFor(() => expect(bind).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Bound 9 values to 2 variables')).toBeInTheDocument()
  })

  it('says when a layer changed since the check', async () => {
    renderTab('default', { [MSG.bind]: async () => ({ bound: 7, skipped: 1, restored: 0, restoredLayers: 0, stuck: 0, variable: 'x', undoId: 'u' }) })
    fireEvent.click(within(await row('Padding 16 px')).getByRole('button', { name: 'Bind Padding 16 px' }))
    expect(await screen.findByText('1 value changed since the check and was left alone. Re-check to see them.')).toBeInTheDocument()
  })

  it('ignores an older check that answers after a newer one', async () => {
    let finishOld: (r: CheckResult) => void = () => undefined
    let calls = 0
    const check = () => {
      calls += 1
      return calls === 1 ? new Promise<CheckResult>((resolve) => { finishOld = resolve }) : Promise.resolve(mockResult())
    }
    renderTab('default', { [MSG.check]: check })
    fireEvent.click(screen.getByRole('button', { name: /Re-check/ }))
    await screen.findByRole('heading', { name: 'Page header' })
    finishOld({ status: 'no-selection', source: { name: 'Bluebird UI', variables: 1 } })
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.getByRole('heading', { name: 'Page header' })).toBeInTheDocument()
  })

  it('needs a variable chosen by hand when there is no match', async () => {
    renderTab()
    const radius = await row('Corner radius 24 px')
    expect(within(radius).getByRole('button', { name: 'Bind Corner radius 24 px' })).toBeDisabled()
    fireEvent.click(within(radius).getByRole('button', { name: 'Variable for Corner radius 24 px' }))
    expect(await within(radius).findByText('The value changes')).toBeInTheDocument()
    fireEvent.click(within(radius).getByText('radius/xl'))
    await waitFor(() => expect(within(radius).getByRole('button', { name: 'Change Corner radius 24 px' })).toBeEnabled())
    expect(within(radius).getByText('Changes the value: 24 px becomes 8 px.')).toBeInTheDocument()
  })

  it('shows where a value is and selects a single layer', async () => {
    const select = vi.fn(async () => ({ selected: 1, page: 'Login' }))
    renderTab('default', { [MSG.select]: select })
    const size = await row('Font size 14 px')
    fireEvent.click(within(size).getByRole('button', { name: 'Show layers of Font size 14 px' }))
    fireEvent.click(await within(size).findByRole('button', { name: 'Select SSO flow' }))
    expect(await screen.findByText('Selected 1 layer')).toBeInTheDocument()
  })

  it('asks for a selection when nothing is selected', async () => {
    renderTab('empty')
    expect(await screen.findByText('Select a layer to check')).toBeInTheDocument()
    expect(screen.getByText('Source: Bluebird UI · 1,633 variables · Dual File')).toBeInTheDocument()
  })

  it('points to Settings without a source', async () => {
    renderTab('default', { [MSG.check]: async (): Promise<CheckResult> => ({ status: 'no-source', message: 'Add your library files in Settings › Dual File Mode.' }) })
    expect(await screen.findByText('Add a variable source first')).toBeInTheDocument()
  })

  it('reports a source that failed to load', async () => {
    renderTab('error')
    expect(await screen.findByText('Could not load your variables')).toBeInTheDocument()
  })

  it('celebrates a clean selection', async () => {
    renderTab('default', { [MSG.check]: async () => ({ ...mockResult(), groups: [] }) })
    expect(await screen.findByText('Everything is bound')).toBeInTheDocument()
  })

  it('offers Try again when the check fails', async () => {
    renderTab('default', { [MSG.check]: async () => { throw new Error('Figma did not answer') } })
    expect(await screen.findByText('The check didn’t finish')).toBeInTheDocument()
  })
})
