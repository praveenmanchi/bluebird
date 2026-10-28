import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers, RECENT_KEY } from '../sandbox/handler'
import { boundVariableIds, ownerOf } from '../sandbox/scan'
import { MSG, type PagesResult, type RecentSearch, type SearchResult, type SelectResult, type GotoResult } from '../messages'

interface Spec { id: string; type: string; name: string; children?: Spec[]; [key: string]: unknown }
interface Node { id: string; type: string; name: string; children?: Node[]; parent?: Node; [key: string]: unknown }

/** Builds a node tree with parent links. */
function tree(spec: Spec, parent?: Node): Node {
  const { children, ...rest } = spec
  const n: Node = { visible: true, ...rest, parent }
  if (children) n.children = children.map((c) => tree(c, n))
  return n
}

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id })
const VAR = (id: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ id, name, resolvedType: 'COLOR', scopes: ['ALL_SCOPES'], variableCollectionId: 'c1', valuesByMode: { a: 0, b: 0 }, ...extra })

const LOCAL = [VAR('v:border', 'dropdown/border/default'), VAR('v:hover', 'dropdown/border/hover'), VAR('v:bg', 'button/primary/bg/default')]

function page(id: string, name: string, children: Spec[]): Node {
  const p = tree({ id, type: 'PAGE', name, children })
  p.loadAsync = vi.fn(async () => undefined)
  return p
}

let storage: Map<string, unknown>
let current: { page: Node }

function install(pages: Node[], { remote = {} as Record<string, unknown>, styles = [] as unknown[] } = {}) {
  storage = new Map()
  current = { page: pages[0]! }
  const nodes = new Map<string, Node>()
  const index = (n: Node) => { nodes.set(n.id, n); n.children?.forEach(index) }
  pages.forEach(index)
  const mock = installFigmaMock({
    root: { name: 'File', children: pages } as unknown as DocumentNode,
    variables: {
      getLocalVariablesAsync: vi.fn(async () => LOCAL),
      getVariableByIdAsync: vi.fn(async (id: string) => (remote[id] ?? LOCAL.find((v) => v.id === id) ?? null)),
      getVariableCollectionByIdAsync: vi.fn(async () => ({ id: 'c1', name: 'Brand UI', modes: [{ modeId: 'a' }, { modeId: 'b' }] })),
    } as unknown as PluginAPI['variables'],
    getLocalTextStylesAsync: vi.fn(async () => styles) as unknown as PluginAPI['getLocalTextStylesAsync'],
    getNodeByIdAsync: vi.fn(async (id: string) => nodes.get(id) ?? null) as unknown as PluginAPI['getNodeByIdAsync'],
    setCurrentPageAsync: vi.fn(async (p: Node) => { current.page = p }) as unknown as PluginAPI['setCurrentPageAsync'],
    clientStorage: {
      getAsync: vi.fn(async (k: string) => storage.get(k)),
      setAsync: vi.fn(async (k: string, v: unknown) => { storage.set(k, v) }),
      deleteAsync: vi.fn(async (k: string) => { storage.delete(k) }),
    } as unknown as PluginAPI['clientStorage'],
  })
  Object.defineProperty(mock, 'currentPage', { get: () => current.page, configurable: true })
  return mock
}

const call = <T,>(type: string, payload?: unknown) =>
  (handlers[type] as unknown as (p: unknown, c: { emit: (t: string, p: unknown) => void }) => Promise<T>)(payload, { emit: vi.fn() })
const search = (query: string, extra: Partial<{ pageIds: string[]; types: string[] }> = {}) =>
  call<SearchResult>(MSG.search, { query, pageIds: [], types: [], ...extra })

const molecules = () => page('p:mol', '  ↳ Molecules', [
  { id: 'set', type: 'COMPONENT_SET', name: 'Dropdown', children: [
    { id: 'v1', type: 'COMPONENT', name: 'Type=Single', boundVariables: { strokes: [alias('v:border')] } },
    { id: 'v2', type: 'COMPONENT', name: 'Type=Multi', boundVariables: { strokes: [alias('v:border')], fills: [alias('v:border')] } },
  ] },
  { id: 'solo', type: 'COMPONENT', name: 'dropbox', children: [
    { id: 'bg', type: 'FRAME', name: 'Background+Border', boundVariables: { strokes: [alias('v:border')], itemSpacing: alias('v:bg') } },
  ] },
  { id: 'screen', type: 'FRAME', name: 'Settings screen', children: [
    { id: 'inst', type: 'INSTANCE', name: 'Dropdown', boundVariables: { strokes: [alias('v:hover')] }, children: [
      { id: 'I:inner', type: 'FRAME', name: 'inner', boundVariables: { strokes: [alias('v:border')] } },
    ] },
  ] },
])

describe('scan helpers', () => {
  it('reads ids from single, array and component-property bindings', () => {
    const node = { boundVariables: { itemSpacing: alias('a'), fills: [alias('b'), alias('c')], componentProperties: { 'Label#1': alias('d') } } } as unknown as SceneNode
    expect(boundVariableIds(node)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('rolls a variant up to its set and a nested frame up to the top-level frame', () => {
    const p = molecules()
    const set = p.children![0]!
    expect(ownerOf(set.children![0] as unknown as SceneNode)).toEqual({ id: 'set', name: 'Dropdown', kind: 'component' })
    const inst = p.children![2]!.children![0]!
    expect(ownerOf(inst as unknown as SceneNode)).toEqual({ id: 'screen', name: 'Settings screen', kind: 'frame' })
  })
})

describe('varsearch:search', () => {
  beforeEach(() => { install([molecules(), page('p:org', 'Organisms', [])]) })

  it('groups bound layers by component and counts each layer once', async () => {
    const r = await search('dropdown/border/default')
    expect(r.variables).toHaveLength(1)
    const v = r.variables[0]!
    expect(v).toMatchObject({ name: 'dropdown/border/default', collection: 'Brand UI', modes: 2, totalNodes: 3 })
    expect(v.usages.map((u) => [u.name, u.count, u.kind, u.pageName])).toEqual([
      ['Dropdown', 2, 'component', 'Molecules'],
      ['dropbox', 1, 'component', 'Molecules'],
    ])
  })

  it('does not report layers inside an instance, but reports the instance’s own override', async () => {
    const r = await search('dropdown/border')
    const hover = r.variables.find((v) => v.name === 'dropdown/border/hover')!
    expect(hover.usages).toEqual([expect.objectContaining({ id: 'screen', kind: 'frame', nodeIds: ['inst'] })])
    const border = r.variables.find((v) => v.name === 'dropdown/border/default')!
    expect(border.usages.flatMap((u) => u.nodeIds)).not.toContain('I:inner')
  })

  it('puts an exact name first even when a longer match is used more', async () => {
    const r = await search('dropdown/border/hover')
    expect(r.variables[0]!.name).toBe('dropdown/border/hover')
  })

  it('applies the Type filter', async () => {
    const frames = await search('dropdown/border', { types: ['frame'] })
    expect(frames.variables.map((v) => v.name)).toEqual(['dropdown/border/hover'])
  })

  it('scans only the chosen pages', async () => {
    const r = await search('dropdown', { pageIds: ['p:org'] })
    expect(r.scannedPages).toBe(1)
    expect(r.variables).toEqual([])
    expect(r.matched).toBe(2)
  })

  it('names library variables met on the canvas', async () => {
    install([page('p:1', 'Screens', [{ id: 'f', type: 'FRAME', name: 'Home', boundVariables: { fills: [alias('lib:1')] } }])],
      { remote: { 'lib:1': VAR('lib:1', 'brand/primary', { variableCollectionId: 'remote' }) } })
    const r = await search('brand/primary')
    expect(r.variables[0]).toMatchObject({ name: 'brand/primary', totalNodes: 1 })
  })

  it('reports text styles bound to the variable', async () => {
    install([page('p:1', 'Screens', [])], {
      styles: [{ id: 's:1', name: 'Body/Regular', boundVariables: { fontFamily: alias('v:bg'), fontSize: alias('v:bg') } }],
    })
    const r = await search('button/primary', { types: ['text-style'] })
    expect(r.scannedPages).toBe(0)
    expect(r.variables[0]!.usages).toEqual([expect.objectContaining({ name: 'Body/Regular', kind: 'text-style', count: 2, nodeIds: [] })])
  })

  it('rejects a query shorter than two characters', async () => {
    await expect(search(' d ')).rejects.toThrow()
  })
})

describe('varsearch:pages', () => {
  it('lists pages without dividers and without the outline arrows', async () => {
    install([page('p:1', 'Cover', []), page('p:2', '---', []), page('p:3', '  ↳ Atoms', [])])
    const r = await call<PagesResult>(MSG.pages)
    expect(r.pages).toEqual([{ id: 'p:1', name: 'Cover' }, { id: 'p:3', name: 'Atoms' }])
    expect(r.currentPageId).toBe('p:1')
  })
})

describe('varsearch:select / goto', () => {
  it('opens the page of the layers, selects the ones on it and reports the rest', async () => {
    const figma = install([page('p:other', 'Cover', []), molecules()])
    const r = await call<SelectResult>(MSG.select, { nodeIds: ['v1', 'bg', 'missing'] })
    expect(figma.setCurrentPageAsync).toHaveBeenCalled()
    expect(r).toEqual({ selected: 2, page: 'Molecules', elsewhere: 0 })
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalled()
  })

  it('fails with a refresh hint when nothing still exists', async () => {
    install([molecules()])
    await expect(call(MSG.select, { nodeIds: ['gone'] })).rejects.toThrow(/Search again/)
  })

  it('goes to a component on its page', async () => {
    install([page('p:other', 'Cover', []), molecules()])
    expect(await call<GotoResult>(MSG.goto, { nodeId: 'set' })).toEqual({ page: 'Molecules', name: 'Dropdown' })
  })
})

describe('varsearch:recent', () => {
  const entry = (name: string, at = 1): RecentSearch => ({ query: name, name, meta: 'm', usage: 1, textLike: false, at })

  it('adds newest first, keeps one entry per variable and survives bad stored data', async () => {
    install([molecules()])
    storage.set(RECENT_KEY, [entry('a'), { junk: true }])
    expect(await call<RecentSearch[]>(MSG.recent)).toEqual([entry('a')])
    await call(MSG.recent, { add: entry('b', 2) })
    const list = await call<RecentSearch[]>(MSG.recent, { add: entry('a', 3) })
    expect(list.map((r) => [r.name, r.at])).toEqual([['a', 3], ['b', 2]])
  })

  it('clears', async () => {
    install([molecules()])
    await call(MSG.recent, { add: entry('a') })
    expect(await call<RecentSearch[]>(MSG.recentClear)).toEqual([])
    expect(storage.has(RECENT_KEY)).toBe(false)
  })
})
