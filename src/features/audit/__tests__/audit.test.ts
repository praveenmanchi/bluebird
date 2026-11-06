import { describe, it, expect, vi } from 'vitest'
import type { LibraryComponent, LibraryIndex, LibraryLoadResult, LibraryVariable } from '@shared/libraries'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { countItems, groupHits, issuesOf, scoreOf, unusedComponents } from '../audit'
import { createHandlers } from '../sandbox/handler'
import { placeOf } from '../sandbox/scan'
import { MSG, type AnalyticsResult, type AuditResult, type Hit, type PagesResult, type SelectResult } from '../messages'

const component = (name: string, keys: string[]): LibraryComponent => ({ key: keys[0]!, nodeId: '1:1', name, kind: 'set', description: '', location: 'Atoms', variants: keys.length, keys, fileKey: 'lib' })
const COMPONENTS = [component('Button', ['set:button', 'k:button:primary']), component('Tab', ['k:tab']), component('Stepper', ['k:stepper'])]
const INDEX: LibraryIndex = { files: [{ slot: 1, fileKey: 'lib', name: 'Bluebird UI', roles: ['components'], variables: 0, components: 3, collections: [] }], variables: [], components: COMPONENTS, collections: [], loadedAt: 0 }
const READY: LibraryLoadResult = { status: 'ready', index: INDEX }

const hit = (origin: Hit['origin'], name: string, nodeId: string, place = 'Screen'): Hit => ({ origin, groupKey: name, name, nodeId, place: { id: place, name: place }, page: 'Login' })

describe('groupHits', () => {
  it('groups by component and place, library first and the most used on top', () => {
    const items = groupHits([hit('local', 'Promo', '1'), hit('library', 'Tab', '2'), hit('library', 'Button', '3'), hit('library', 'Button', '4', 'Other'), hit('library', 'Button', '5', 'Other')])
    expect(items.map((i) => [i.name, i.count])).toEqual([['Button', 3], ['Tab', 1], ['Promo', 1]])
    expect(items[0]!.places.map((p) => [p.name, p.nodeIds.length])).toEqual([['Other', 2], ['Screen', 1]])
  })

  it('keeps a detached Button apart from Button instances', () => {
    expect(groupHits([hit('library', 'Button', '1'), hit('detached', 'Button', '2')])).toHaveLength(2)
  })
})

describe('counts', () => {
  it('scores library layers over everything counted', () => {
    const counts = countItems(groupHits([hit('library', 'A', '1'), hit('library', 'A', '2'), hit('library', 'A', '3'), hit('detached', 'B', '4')]), 0, 2, 5)
    expect(counts).toEqual({ bound: 0, paints: 0, colours: 0, spacing: 0, library: 3, detached: 1, notLibrary: 0, unused: 2, total: 4, published: 5 })
    expect(scoreOf(counts)).toEqual({ value: 75, used: 3, total: 4 })
  })

  it('scores paints and components together, in one number', () => {
    const counts = countItems(groupHits([hit('library', 'A', '1'), hit('detached', 'B', '2'), hit('colour', '#fff', '3'), hit('spacing', 'Gap 10', '4')]), 6, 1, 2)
    expect(scoreOf(counts)).toEqual({ value: 78, used: 7, total: 9 })
    expect(counts).toMatchObject({ bound: 6, paints: 7, colours: 1, spacing: 1 })
  })

  it('counts every kind of issue, but not healthy library instances', () => {
    const counts = countItems(groupHits([hit('library', 'A', '1'), hit('detached', 'B', '2'), hit('local', 'C', '3'), hit('colour', '#fff', '4'), hit('spacing', 'Gap 10', '5')]), 0, 2, 3)
    expect(issuesOf(counts)).toBe(6)
  })

  it('has no score when nothing was counted', () => {
    expect(scoreOf(countItems([], 0, 0, 3)).value).toBeNull()
  })

  it('finds components with no instance, by any of their keys', () => {
    expect(unusedComponents(COMPONENTS, new Set(['k:button:primary', 'k:tab'])).map((c) => c.name)).toEqual(['Stepper'])
  })
})

type Fake = Record<string, unknown> & { id: string; type: string; name: string; children?: Fake[]; parent?: Fake }
function tree(spec: Fake, parent?: Fake): Fake {
  const n: Fake = { visible: true, ...spec, parent }
  if (spec.children) n.children = spec.children.map((c) => tree(c, n))
  return n
}
const instance = (id: string, main: object | null, children?: Fake[]): Fake => ({ id, type: 'INSTANCE', name: `Instance ${id}`, getMainComponentAsync: async () => main, ...(children ? { children } : {}) })
const main = (key: string, name: string, extra: object = {}) => ({ key, name, remote: false, parent: { type: 'PAGE' }, ...extra })
const inSet = (key: string, setKey: string, setName: string) => main(key, 'Type=Primary', { parent: { type: 'COMPONENT_SET', key: setKey, name: setName } })

function install(page: Fake, selection: Fake[] = []) {
  const p = page
  p.loadAsync = vi.fn(async () => undefined)
  const byId = new Map<string, Fake>()
  const index = (n: Fake) => { byId.set(n.id, n); n.children?.forEach(index) }
  index(p)
  ;(p as Record<string, unknown>).selection = selection
  return installFigmaMock({
    root: { children: [p, { id: 'div', type: 'PAGE', name: '---', children: [] }] },
    currentPage: p,
    getNodeByIdAsync: vi.fn(async (id: string) => byId.get(id) ?? null),
    setCurrentPageAsync: vi.fn(),
  } as unknown as Partial<PluginAPI>)
}

const http = (routes: Record<string, unknown>) => vi.fn(async (url: string) => {
  const hitRoute = Object.keys(routes).find((r) => url.includes(r))
  if (!hitRoute) throw new Error(`no route ${url}`)
  const body = routes[hitRoute]
  if (typeof body === 'number') return { status: body, text: async () => '{}' }
  return { status: 200, text: async () => JSON.stringify(body) }
})

const SETTINGS = { enabled: true, file1Id: 'lib', file1Key: 'token', file1Role: 'Components', file2Id: '', file2Key: '', file2Role: 'Components', extraFiles: [] }
const VARIABLE_SETTINGS = { ...SETTINGS, file1Role: 'Variables' }

const call = <T,>(type: string, payload?: unknown, result: LibraryLoadResult = READY, fetch: unknown = vi.fn(), settings: typeof SETTINGS = SETTINGS) =>
  (createHandlers({ loadLibraries: async () => result, runtime: () => ({ readSettings: async () => settings, fetch: fetch as never }), now: () => Date.UTC(2026, 10, 6) })[type] as unknown as (p: unknown, c: { emit: () => void }) => Promise<T>)(payload, { emit: vi.fn() })

describe('audit:run', () => {
  const page = () => tree({ id: 'p', type: 'PAGE', name: '  ↳ Login', children: [
    { id: 'screen', type: 'FRAME', name: 'Access code flow', children: [
      instance('i1', inSet('k:button:primary', 'set:button', 'Button')),
      instance('i2', main('k:tab', 'Tab'), [instance('nested', main('k:stepper', 'Stepper'))]),
      instance('i3', main('k:local', 'Promo')),
      instance('i4', main('k:other', 'Kit card', { remote: true })),
      { id: 'd1', type: 'FRAME', name: 'Button copy', detachedInfo: { type: 'library', componentKey: 'set:button' } },
      { ...instance('hid', main('k:hidden', 'Hidden')), visible: false },
    ] },
  ] })

  it('sorts instances and detached frames by origin', async () => {
    install(page())
    const r = await call<AuditResult>(MSG.run, { mode: 'current' })
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.counts).toMatchObject({ library: 2, detached: 1, notLibrary: 2, unused: 1, total: 5, published: 3 })
    expect(r.score).toEqual({ value: 40, used: 2, total: 5 })
    expect(r.issues).toBe(4)
    expect(r.items.map((i) => [i.origin, i.name])).toEqual([['detached', 'Button'], ['local', 'Promo'], ['other', 'Kit card']])
    expect(r.scope).toBe('Login')
    expect(r.unused.map((u) => u.name)).toEqual(['Stepper'])
  })

  it('does not count what sits inside an instance', async () => {
    install(page())
    const r = await call<AuditResult>(MSG.run, { mode: 'current' })
    expect(JSON.stringify(r)).not.toContain('nested')
  })

  it('counts a library component used only inside another as used', async () => {
    const stepper = main('k:stepper', 'Stepper', { id: 'm:stepper' })
    const tab = main('k:tab', 'Tab', { id: 'm:tab', findAllWithCriteria: () => [{ getMainComponentAsync: async () => stepper }] })
    install(tree({ id: 'p', type: 'PAGE', name: 'Login', children: [{ id: 's', type: 'FRAME', name: 'Screen', children: [instance('i', tab)] }] }))
    const r = await call<AuditResult>(MSG.run, { mode: 'current' })
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.unused.map((u) => u.name)).toEqual(['Button'])
    expect(r.counts.total).toBe(1)
  })

  it('names the scope as it was when the audit started', async () => {
    const p = page()
    const figmaMock = install(p, [p.children![0]!.children![0]!])
    const scanned = createHandlers({ loadLibraries: async () => READY, runtime: () => ({ readSettings: async () => SETTINGS, fetch: vi.fn() as never }) })
    const running = (scanned[MSG.run] as unknown as (x: unknown, c: { emit: (t: string, v: unknown) => void }) => Promise<AuditResult>)({ mode: 'selection' }, { emit: () => { (figmaMock.currentPage as unknown as { selection: unknown[] }).selection = [] } })
    const r = await running
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.scope).toBe('1 selected layer')
  })

  it('restores Figma’s invisible-children setting after the scan', async () => {
    const figmaMock = install(page())
    figmaMock.skipInvisibleInstanceChildren = false
    await call(MSG.run, { mode: 'current' })
    expect(figmaMock.skipInvisibleInstanceChildren).toBe(false)
  })

  it('limits a selection audit to the selected layers', async () => {
    const p = page()
    install(p, [p.children![0]!.children![0]!])
    const r = await call<AuditResult>(MSG.run, { mode: 'selection' })
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.counts.total).toBe(1)
    expect(r.scope).toBe('1 selected layer')
  })

  it('asks for a selection instead of auditing nothing', async () => {
    install(page())
    expect(await call<AuditResult>(MSG.run, { mode: 'selection' })).toEqual({ status: 'nothing-selected' })
  })

  it('names the frame a layer sits in, ignoring sections', () => {
    const p = tree({ id: 'p', type: 'PAGE', name: 'P', children: [{ id: 's', type: 'SECTION', name: 'Sec', children: [{ id: 'f', type: 'FRAME', name: 'Screen', children: [{ id: 'g', type: 'FRAME', name: 'Inner' }] }] }] })
    expect(placeOf(p.children![0]!.children![0]!.children![0]! as unknown as SceneNode)).toEqual({ id: 'f', name: 'Screen' })
  })

  it('still checks variables without a library, and says why components were skipped', async () => {
    install(tree({ id: 'p', type: 'PAGE', name: 'Login', children: [
      { id: 's', type: 'FRAME', name: 'Screen', fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }], children: [instance('i', main('k:local', 'Promo'))] },
    ] }))
    const r = await call<AuditResult>(MSG.run, { mode: 'current' }, { status: 'not-configured', reason: 'empty', message: 'Add your files.' })
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r).toMatchObject({ source: null, problem: 'Add your files.', issues: 1 })
    expect(r.counts).toMatchObject({ colours: 1, total: 0, unused: 0 })
    expect(r.items.map((i) => i.origin)).toEqual(['colour'])
  })

  it('rejects an empty page list at the boundary', async () => {
    install(page())
    await expect(call(MSG.run, { mode: 'pages', pageIds: [] })).rejects.toThrow()
  })
})

describe('audit:pages and select', () => {
  it('lists pages without divider pages and names the source', async () => {
    install(tree({ id: 'p', type: 'PAGE', name: '  ↳ Login' }))
    const r = await call<PagesResult>(MSG.pages)
    expect(r.pages).toEqual([{ id: 'p', name: 'Login' }])
    expect(r.source).toBe('Bluebird UI')
  })

  it('selects layers on the first layer’s page and reports the rest', async () => {
    const p = tree({ id: 'p', type: 'PAGE', name: 'Login', children: [{ id: 'a', type: 'FRAME', name: 'A' }] })
    const other = tree({ id: 'q', type: 'PAGE', name: 'Other', children: [{ id: 'b', type: 'FRAME', name: 'B' }] })
    const figmaMock = install(p)
    ;(figmaMock.getNodeByIdAsync as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => (id === 'a' ? p.children![0] : id === 'b' ? other.children![0] : null))
    expect(await call<SelectResult>(MSG.select, { nodeIds: ['a', 'b'] })).toEqual({ selected: 1, page: 'Login', elsewhere: 1 })
  })
})

describe('audit:analytics', () => {
  const USAGE = { rows: [
    { component_key: 'k:button:primary', component_name: 'Type=Primary', component_set_key: 'set:button', component_set_name: 'Button', usages: 30, teams_using: 2, files_using: 4 },
    { component_key: 'k:button:secondary', component_name: 'Type=Secondary', component_set_key: 'set:button', component_set_name: 'Button', usages: 10, teams_using: 1, files_using: 2 },
    { component_key: 'k:tab', component_name: 'Tab', usages: 5, teams_using: 1, files_using: 1 },
  ] }
  const FILES = { rows: [{ file_name: 'Mobile app', team_name: 'Apps', usages: 12 }, { file_name: 'Checkout', team_name: 'Web', usages: 33 }] }
  const ACTIONS = { rows: [{ week: '2026-10-25', insertions: 7, detachments: 2 }, { week: '2026-10-18', insertions: 3, detachments: 1 }] }
  const components = { asset: 'components' }

  it('rolls variants into sets and lists components nobody uses', async () => {
    const fetch = http({ 'group_by=component&start_date': ACTIONS, 'usages?group_by=component': USAGE, 'usages?group_by=file': FILES })
    const r = await call<AnalyticsResult>(MSG.analytics, components, READY, fetch)
    expect(r).toEqual({
      status: 'ready', asset: 'components', uses: 45, files: 2, teams: 2, detached: 3, published: 3,
      top: [{ name: 'Button', usages: 40, hint: '2 teams · 4 files' }, { name: 'Tab', usages: 5, hint: '1 team · 1 file' }],
      breakdown: [{ name: 'Checkout', hint: 'Web', usages: 33 }, { name: 'Mobile app', hint: 'Apps', usages: 12 }],
      notUsed: ['Stepper'], truncated: false,
    })
    expect(fetch.mock.calls.some(([u]) => String(u).includes('start_date=2026-08-14'))).toBe(true)
  })

  it('keeps what it could read when one library file fails, and says it’s partial', async () => {
    const two = { ...SETTINGS, file2Id: 'other', file2Key: 'token' }
    const fetch = vi.fn(async (url: string) => {
      if (url.includes('/other/')) return { status: 404, text: async () => '{}' }
      const body = url.includes('actions') ? ACTIONS : url.includes('group_by=file') ? FILES : USAGE
      return { status: 200, text: async () => JSON.stringify(body) }
    })
    const r = await call<AnalyticsResult>(MSG.analytics, components, READY, fetch, two)
    expect(r).toMatchObject({ status: 'ready', uses: 45, truncated: true, notUsed: [] })
  })

  it('reads variables by collection, from the Variables file', async () => {
    const v = (key: string, name: string): LibraryVariable => ({ id: key, key, name, collection: 'Brand', type: 'COLOR', description: '', scopes: [], values: [], fileKey: 'vars' })
    const index: LibraryLoadResult = { status: 'ready', index: { ...INDEX, variables: [v('v:1', 'text/primary'), v('v:2', 'text/unused')] } }
    const fetch = http({
      '/variable/usages?group_by=variable': { rows: [
        { variable_key: 'v:1', variable_name: 'text/primary', variable_type: 'COLOR', collection_name: 'Brand', usages: 9, teams_using: 2, files_using: 3 },
        { variable_key: 'v:3', variable_name: 'space/md', variable_type: 'FLOAT', collection_name: 'Semantics', usages: 4, teams_using: 1, files_using: 1 },
      ] },
      '/variable/usages?group_by=file': FILES,
      '/variable/actions?group_by=variable': ACTIONS,
    })
    const r = await call<AnalyticsResult>(MSG.analytics, { asset: 'variables' }, index, fetch, VARIABLE_SETTINGS)
    expect(r).toMatchObject({
      status: 'ready', asset: 'variables', uses: 13, detached: 3, published: 2, notUsed: ['text/unused'],
      top: [{ name: 'text/primary', hint: 'Brand · Color · 2 teams · 3 files', usages: 9 }, { name: 'space/md', hint: 'Semantics · Float · 1 team · 1 file', usages: 4 }],
      breakdown: [{ name: 'Brand', hint: '1 variable', usages: 9 }, { name: 'Semantics', hint: '1 variable', usages: 4 }],
    })
  })

  it('reads styles with their type', async () => {
    const fetch = http({
      '/style/usages?group_by=style': { rows: [{ style_key: 's:1', style_name: 'Code/SM', style_type: 'TEXT', usages: 6, teams_using: 1, files_using: 2 }] },
      '/style/usages?group_by=file': FILES,
      '/style/actions?group_by=style': { rows: [] },
    })
    const r = await call<AnalyticsResult>(MSG.analytics, { asset: 'styles' }, READY, fetch)
    expect(r).toMatchObject({ asset: 'styles', uses: 6, detached: 0, top: [{ name: 'Code/SM', hint: 'Text · 1 team · 2 files', usages: 6 }] })
  })

  it('adds component activity up by team, newest week first, with a detach rate', async () => {
    const team = (week: string, team_name: string, insertions: number, detachments: number) => ({ week, team_name, workspace_name: 'Digital', insertions, detachments })
    const fetch = http({
      '/component/actions?group_by=team': { rows: [team('2026-10-18', 'Web', 6, 1), team('2026-10-25', 'Web', 2, 0), team('2026-10-25', 'Apps', 2, 1)] },
      '/component/actions?group_by=component': { rows: [{ week: '2026-10-25', component_name: 'Type=A', component_set_name: 'Button', insertions: 1, detachments: 2 }, { week: '2026-10-18', component_name: 'Tab', insertions: 3, detachments: 0 }] },
    })
    const r = await call<AnalyticsResult>(MSG.analytics, { asset: 'teams' }, READY, fetch)
    expect(r).toEqual({
      status: 'ready', asset: 'teams', inserted: 10, detached: 2, teams: 2, detachRate: 20,
      byTeam: [{ name: 'Web', hint: 'Digital · 1 detached', usages: 8 }, { name: 'Apps', hint: 'Digital · 1 detached', usages: 2 }],
      weeks: [{ name: 'Week of 25 Oct', hint: '4 inserted · 1 detached', usages: 4 }, { name: 'Week of 18 Oct', hint: '6 inserted · 1 detached', usages: 6 }],
      mostDetached: [{ name: 'Button', detachments: 2 }], truncated: false,
    })
  })

  it('has no detach rate when nothing was inserted', async () => {
    const r = await call<AnalyticsResult>(MSG.analytics, { asset: 'teams' }, READY, http({ '/actions': { rows: [] } }))
    expect(r).toMatchObject({ inserted: 0, detachRate: null, byTeam: [], weeks: [] })
  })

  it('asks for the right file when a view has none', async () => {
    const r = await call<AnalyticsResult>(MSG.analytics, { asset: 'variables' }, READY, vi.fn())
    expect(r).toEqual({ status: 'no-source', message: 'Add a Variables file in Settings › Dual File Mode.' })
  })

  it('rejects an asset it doesn’t know', async () => {
    await expect(call(MSG.analytics, { asset: 'fonts' })).rejects.toThrow()
  })

  it('follows the cursor to the next page', async () => {
    let served = 0
    const fetch = vi.fn(async (url: string) => {
      if (url.includes('usages?group_by=component')) {
        served += 1
        return { status: 200, text: async () => JSON.stringify(url.includes('cursor=next') ? USAGE : { rows: [], next_page: true, cursor: 'next' }) }
      }
      return { status: 200, text: async () => JSON.stringify({ rows: [] }) }
    })
    const r = await call<AnalyticsResult>(MSG.analytics, components, READY, fetch)
    expect(served).toBe(2)
    expect(r).toMatchObject({ uses: 45 })
  })

  it('reports a 403 for the plan as unavailable, not as a failure', async () => {
    const fetch = vi.fn(async () => ({ status: 403, text: async () => JSON.stringify({ err: 'Limited by Figma plan' }) }))
    const r = await call<AnalyticsResult>(MSG.analytics, components, READY, fetch)
    expect(r).toMatchObject({ status: 'unavailable', reason: 'plan' })
  })

  it('doesn’t blame the plan for a 403 about the file or account', async () => {
    const fetch = vi.fn(async () => ({ status: 403, text: async () => JSON.stringify({ err: 'Incorrect account type' }) }))
    const r = await call<AnalyticsResult>(MSG.analytics, components, READY, fetch)
    expect(r).toMatchObject({ status: 'unavailable', reason: 'access' })
  })

  it('tells a missing token scope apart from the plan', async () => {
    const fetch = vi.fn(async () => ({ status: 403, text: async () => JSON.stringify({ err: 'Invalid scope' }) }))
    const r = await call<AnalyticsResult>(MSG.analytics, components, READY, fetch)
    expect(r).toMatchObject({ status: 'unavailable', reason: 'scope' })
  })

  it('won’t call a component unused when it couldn’t read everything', async () => {
    const fetch = vi.fn(async () => ({ status: 200, text: async () => JSON.stringify({ rows: [], next_page: true, cursor: 'more' }) }))
    const r = await call<AnalyticsResult>(MSG.analytics, components, READY, fetch)
    expect(r).toMatchObject({ truncated: true, notUsed: [] })
  })

  it('lets any other failure through', async () => {
    await expect(call(MSG.analytics, components, READY, http({ analytics: 500 }))).rejects.toThrow(/500/)
  })
})
