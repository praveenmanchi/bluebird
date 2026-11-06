import { describe, it, expect, vi } from 'vitest'
import type { LibraryIndex, LibraryVariable } from '@shared/libraries'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { createHandlers } from '../sandbox/handler'
import { MSG, type AuditItem, type AuditResult } from '../messages'

const MIXED = Symbol('mixed')
const solid = (r: number, g: number, b: number) => ({ type: 'SOLID', visible: true, color: { r, g, b } })
const rect = (id: string, extra: object = {}) => ({ id, type: 'RECTANGLE', name: id, visible: true, fills: [solid(1, 0, 0)], ...extra })
const flex = (id: string, extra: object = {}) => ({ id, type: 'FRAME', name: id, visible: true, fills: [], layoutMode: 'HORIZONTAL', itemSpacing: 8, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, children: [], ...extra })

function install(children: (parent: Record<string, unknown>) => Record<string, unknown>[], variables: Record<string, unknown> = {}) {
  const page: Record<string, unknown> = { id: 'p', type: 'PAGE', name: 'Home', selection: [], loadAsync: vi.fn(async () => undefined) }
  const frame: Record<string, unknown> = { id: 'f', type: 'FRAME', name: 'Root', visible: true, fills: [], layoutMode: 'NONE', parent: page }
  frame.children = children(frame).map((c) => ({ parent: frame, ...c }))
  page.children = [frame]
  installFigmaMock({
    root: { children: [page] },
    currentPage: page,
    mixed: MIXED,
    variables: {
      getLocalVariableCollectionsAsync: vi.fn(async () => [{ id: 'c1', name: 'Primitives', modes: [{ modeId: 'm', name: 'Value' }], defaultModeId: 'm', variableIds: Object.keys(variables) }]),
      getVariableByIdAsync: vi.fn(async (id: string) => variables[id] ?? null),
    },
  } as unknown as Partial<PluginAPI>)
}

const index = (variables: readonly LibraryVariable[] = []): LibraryIndex => ({ files: [], variables, components: [], collections: [], loadedAt: 0 })

async function run(library: LibraryIndex = index()) {
  const handlers = createHandlers({ loadLibraries: async () => ({ status: 'ready', index: library }), runtime: () => ({ readSettings: vi.fn() as never, fetch: vi.fn() as never }) })
  const r = await (handlers[MSG.run] as unknown as (p: unknown, c: { emit: () => void }) => Promise<AuditResult>)({ mode: 'current' }, { emit: vi.fn() })
  if (r.status !== 'ready') throw new Error(r.status)
  return r
}
const of = (items: readonly AuditItem[], origin: AuditItem['origin']) => items.filter((i) => i.origin === origin)

const SPACING_VARS = {
  'v:8': { id: 'v:8', name: 'dimension/space/8', resolvedType: 'FLOAT', scopes: ['GAP'], valuesByMode: { m: 8 } },
  'v:9': { id: 'v:9', name: 'dimension/space/9', resolvedType: 'FLOAT', scopes: ['GAP'], valuesByMode: { m: 9 } },
  // A 10px type size exists, but it is not spacing and must not excuse a 10px gap.
  'v:t10': { id: 'v:t10', name: 'type/size/10', resolvedType: 'FLOAT', scopes: ['FONT_SIZE'], valuesByMode: { m: 10 } },
}

describe('colours', () => {
  it('reports a literal fill and counts it against the score', async () => {
    install(() => [rect('a')])
    const r = await run()
    expect(of(r.items, 'colour')).toHaveLength(1)
    expect(r.items[0]).toMatchObject({ name: '#FF0000', count: 1, hint: 'Fill · no variable holds this' })
    expect(r.score).toEqual({ value: 0, used: 0, total: 1 })
  })

  it('does not report a fill that already reads a variable', async () => {
    install(() => [rect('a', { boundVariables: { fills: [{ id: 'v:red' }] } })])
    const r = await run()
    expect(r.items).toHaveLength(0)
    expect(r.counts).toMatchObject({ bound: 1, paints: 1 })
    expect(r.score.value).toBe(100)
  })

  it('groups the same literal across layers and keeps every layer for selection', async () => {
    install(() => [rect('a'), rect('b')])
    const r = await run()
    expect(r.items[0]?.count).toBe(2)
    expect(r.items[0]?.places.flatMap((p) => p.nodeIds)).toEqual(['a', 'b'])
  })

  it('separates a stroke from a fill of the same colour', async () => {
    install(() => [rect('a', { strokes: [solid(1, 0, 0)] })])
    expect((await run()).items.map((i) => i.hint).sort()).toEqual(['Fill · no variable holds this', 'Stroke · no variable holds this'])
  })

  it('names the local variable that already holds the value', async () => {
    install(() => [rect('a')], { 'v:red': { id: 'v:red', name: 'Brand/Accent', resolvedType: 'COLOR', scopes: [], valuesByMode: { m: { r: 1, g: 0, b: 0 } } } })
    expect((await run()).items[0]?.hint).toBe('Fill · use Brand/Accent')
  })

  it('names a library variable too: a consumer file has none of its own', async () => {
    install(() => [rect('a')])
    const red: LibraryVariable = { id: '1', key: 'k', name: 'lib/red', collection: 'C', type: 'COLOR', description: '', scopes: [], values: [{ mode: 'M', value: '#FF0000' }], fileKey: 'f' }
    expect((await run(index([red]))).items[0]?.hint).toBe('Fill · use lib/red')
  })

  it('treats a fill bound to a paint style as from the system', async () => {
    install(() => [rect('a', { fillStyleId: 'S:abc' })])
    const r = await run()
    expect(r.items).toHaveLength(0)
    expect(r.counts.bound).toBe(1)
  })

  it('ignores the outline Figma puts on a component set', async () => {
    install(() => [{ id: 'set', type: 'COMPONENT_SET', name: 'Button', visible: true, fills: [], strokes: [solid(0.59, 0.28, 1)], children: [] }])
    expect((await run()).counts.colours).toBe(0)
  })

  it('reads text with several colours run by run', async () => {
    const bound = { fills: [solid(0, 0, 0)], fillStyleId: '', boundVariables: { fills: [{ id: 'v' }] } }
    const literal = { fills: [solid(1, 0, 0)], fillStyleId: '', boundVariables: {} }
    install(() => [{ id: 't', type: 'TEXT', name: 'Label', visible: true, fills: MIXED, getStyledTextSegments: () => [bound, literal] }])
    const r = await run()
    expect(r.counts).toMatchObject({ bound: 1, colours: 1, paints: 2 })
    expect(r.items[0]?.name).toBe('#FF0000')
  })

  it('tells a see-through colour from the solid one', async () => {
    install(() => [rect('a', { fills: [{ ...solid(1, 0, 0), opacity: 0.5 }] })], { 'v:red': { id: 'v:red', name: 'Brand/Accent', resolvedType: 'COLOR', scopes: [], valuesByMode: { m: { r: 1, g: 0, b: 0 } } } })
    expect((await run()).items[0]).toMatchObject({ name: '#FF000080', hint: 'Fill · no variable holds this' })
  })

  it('leaves an instance’s paints to its main component', async () => {
    const main = { key: 'k', name: 'Card', remote: false, parent: { type: 'PAGE' } }
    install((frame) => {
      const inst: Record<string, unknown> = { ...rect('i'), type: 'INSTANCE', getMainComponentAsync: async () => main, parent: frame }
      inst.children = [rect('inner', { parent: inst })]
      return [inst]
    })
    expect((await run()).counts).toMatchObject({ paints: 0, colours: 0 })
  })
})

describe('spacing', () => {
  it('reports an auto-layout gap off the scale, with the nearest that is on it', async () => {
    install(() => [flex('a', { itemSpacing: 10, paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 8 })], SPACING_VARS)
    const items = of((await run()).items, 'spacing')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ name: 'Item spacing 10', hint: 'Nearest on the scale: 9' })
  })

  it('does not let a font-size variable excuse an off-scale gap', async () => {
    install(() => [flex('a', { itemSpacing: 10 })], SPACING_VARS)
    expect(of((await run()).items, 'spacing')).toHaveLength(1)
  })

  it('trusts spacing that already reads a variable, even one outside the scale', async () => {
    install(() => [flex('a', { itemSpacing: 10, boundVariables: { itemSpacing: { id: 'v:other' } } })], SPACING_VARS)
    expect(of((await run()).items, 'spacing')).toHaveLength(0)
  })

  it('counts spacing as an issue but not in the score', async () => {
    install(() => [flex('a', { itemSpacing: 10 })], SPACING_VARS)
    const r = await run()
    expect(r.issues).toBe(1)
    expect(r.score.total).toBe(0)
  })

  it('reads the scale from the library too', async () => {
    install(() => [flex('a', { itemSpacing: 10 })])
    const gap: LibraryVariable = { id: '1', key: 'k', name: 'space/12', collection: 'C', type: 'FLOAT', description: '', scopes: ['GAP'], values: [{ mode: 'M', value: '12' }], fileKey: 'f' }
    expect(of((await run(index([gap]))).items, 'spacing')[0]?.hint).toBe('Nearest on the scale: 12')
  })

  it('reports nothing when there is no scale to compare with', async () => {
    install(() => [flex('a', { itemSpacing: 10 })])
    expect(of((await run()).items, 'spacing')).toHaveLength(0)
  })

  it('reports spacing on components, not again on every instance of them', async () => {
    const main = { key: 'k', name: 'Card', remote: false, parent: { type: 'PAGE' } }
    install((frame) => {
      const inst: Record<string, unknown> = { id: 'i', type: 'INSTANCE', name: 'Card', visible: true, fills: [], parent: frame, getMainComponentAsync: async () => main }
      inst.children = [flex('inner', { itemSpacing: 10, parent: inst })]
      return [inst]
    }, SPACING_VARS)
    expect(of((await run()).items, 'spacing')).toHaveLength(0)
  })

  it('ignores a frame with no auto-layout', async () => {
    install(() => [flex('a', { layoutMode: 'NONE', itemSpacing: 10 })], SPACING_VARS)
    expect(of((await run()).items, 'spacing')).toHaveLength(0)
  })

  it('treats zero padding as deliberate', async () => {
    install(() => [flex('a')], SPACING_VARS)
    expect(of((await run()).items, 'spacing')).toHaveLength(0)
  })
})
