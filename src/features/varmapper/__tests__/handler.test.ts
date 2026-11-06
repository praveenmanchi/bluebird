import { describe, it, expect, vi } from 'vitest'
import type { LibraryIndex, LibraryLoadResult, LibraryVariable } from '@shared/libraries'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { createHandlers } from '../sandbox/handler'
import { findingsOf } from '../sandbox/collect'
import { MSG, type BindResult, type CheckResult, type UndoResult } from '../messages'

type Fake = Record<string, unknown> & { id: string; type: string; name: string; children?: Fake[]; parent?: Fake }

function tree(spec: Fake, parent?: Fake): Fake {
  const n: Fake = { visible: true, ...spec, parent }
  if (spec.children) n.children = spec.children.map((c) => tree(c, n))
  return n
}

const solid = (r: number, g: number, b: number, extra: object = {}) => ({ type: 'SOLID', color: { r, g, b }, visible: true, ...extra })
const VAR = { id: 'v', key: 'key:space', name: 'space/inset-xl', resolvedType: 'FLOAT' }
const LIB: LibraryVariable = { id: 'v', key: 'key:space', name: 'space/inset-xl', collection: 'Semantics', type: 'FLOAT', description: '', scopes: ['GAP'], values: [{ mode: 'Value', value: '16', aliasOf: 'x' }], fileKey: 'lib' }
const INDEX: LibraryIndex = { files: [{ slot: 1, fileKey: 'lib', name: 'Bluebird UI', roles: ['variables'], variables: 1, components: 0, collections: [] }], variables: [LIB], components: [], collections: [], loadedAt: 0 }
const READY: LibraryLoadResult = { status: 'ready', index: INDEX }
const BRAND = { name: 'Brand UI', modes: [{ modeId: 'm1', name: 'Bridge' }, { modeId: 'm2', name: 'Ikea' }] }

function install(selection: Fake[], nodes: Fake[] = selection, extra: Record<string, unknown> = {}) {
  const byId = new Map<string, Fake>()
  const index = (n: Fake) => { byId.set(n.id, n); n.children?.forEach(index) }
  nodes.forEach(index)
  return installFigmaMock({
    currentPage: { name: '  ↳ Login', selection, children: [] },
    commitUndo: vi.fn(),
    getNodeByIdAsync: vi.fn(async (id: string) => byId.get(id) ?? null),
    loadFontAsync: vi.fn(async () => undefined),
    variables: {
      getLocalVariablesAsync: vi.fn(async () => []),
      importVariableByKeyAsync: vi.fn(async () => VAR),
      getVariableByIdAsync: vi.fn(async (id: string) => ({ id, key: `key:${id}`, name: id })),
      getVariableCollectionByIdAsync: vi.fn(async () => BRAND),
      setBoundVariableForPaint: vi.fn((p: object, _f: string, v: { id: string }) => ({ ...p, boundVariables: { color: { id: v.id } } })),
    },
    ...extra,
  } as unknown as Partial<PluginAPI>)
}

const run = <T,>(type: string, payload?: unknown, result: LibraryLoadResult = READY) =>
  (createHandlers({ loadLibraries: async () => result })[type] as unknown as (p: unknown, c: { emit: () => void }) => Promise<T>)(payload, { emit: vi.fn() })

const frame = (o: Partial<Fake> = {}): Fake => ({ id: '1', type: 'FRAME', name: 'Card', fillStyleId: '', strokeStyleId: '', fills: [], strokes: [], ...o })

describe('findingsOf', () => {
  const props = (o: Partial<Fake>) => findingsOf(tree(frame(o)) as unknown as SceneNode).map((f) => [f.property, f.value])

  it('reads a hard-coded fill as hex and skips a bound one', () => {
    expect(props({ fills: [solid(1, 1, 1), solid(0, 0, 0, { boundVariables: { color: { id: 'x' } } })] })).toEqual([['Fill', '#FFFFFF']])
  })

  it('skips a fill that comes from a style, a hidden paint and a gradient', () => {
    expect(props({ fills: [solid(1, 1, 1)], fillStyleId: 'S:1' })).toEqual([])
    expect(props({ fills: [solid(1, 1, 1, { visible: false }), { type: 'GRADIENT_LINEAR' }] })).toEqual([])
  })

  it('reads a uniform radius once, and each corner of a mixed one', () => {
    expect(props({ topLeftRadius: 8, cornerRadius: 8 })).toEqual([['Corner radius', 8]])
    expect(props({ topLeftRadius: 8, topRightRadius: 0, bottomLeftRadius: 4, bottomRightRadius: 0, cornerRadius: Symbol('mixed') })).toEqual([['Corner radius', 8], ['Corner radius', 4]])
  })

  it('reads stroke width only when there is a visible stroke', () => {
    expect(props({ strokeWeight: 1 })).toEqual([])
    expect(props({ strokeWeight: 1, strokes: [solid(0, 0, 0, { boundVariables: { color: { id: 'x' } } })] })).toEqual([['Stroke width', 1]])
  })

  it('reads gap and padding on auto layout, not on a space-between row', () => {
    expect(props({ layoutMode: 'VERTICAL', itemSpacing: 12, paddingLeft: 16 })).toEqual([['Gap', 12], ['Padding', 16]])
    expect(props({ layoutMode: 'HORIZONTAL', itemSpacing: 12, primaryAxisAlignItems: 'SPACE_BETWEEN' })).toEqual([])
    expect(props({ layoutMode: 'NONE', itemSpacing: 12 })).toEqual([])
  })

  it('reads text sizes unless a text style owns them', () => {
    const text = { type: 'TEXT', textStyleId: '', fontSize: 14, lineHeight: { unit: 'PIXELS', value: 20 }, letterSpacing: { unit: 'PERCENT', value: 0 } }
    expect(props(text)).toEqual([['Font size', 14], ['Line height', 20]])
    expect(props({ ...text, textStyleId: 'S:1' })).toEqual([])
  })

  it('labels a text colour as Text fill', () => {
    expect(props({ type: 'TEXT', textStyleId: 'S:1', fills: [solid(1, 1, 1)] })).toEqual([['Text fill', '#FFFFFF']])
  })

  it('asks for a shape scope on shapes and a frame scope on frames', () => {
    const scope = (type: string) => findingsOf(tree(frame({ type, fills: [solid(1, 1, 1)] })) as unknown as SceneNode)[0]?.scope
    expect(scope('FRAME')).toBe('FRAME_FILL')
    expect(scope('COMPONENT')).toBe('FRAME_FILL')
    expect(scope('RECTANGLE')).toBe('SHAPE_FILL')
    expect(scope('ELLIPSE')).toBe('SHAPE_FILL')
  })

  it('reads the free corners when only some are bound, so Bind can’t overwrite the others', () => {
    const corners = { cornerRadius: 8, topLeftRadius: 8, topRightRadius: 8, bottomLeftRadius: 8, bottomRightRadius: 8 }
    const fields = (o: Partial<Fake>) => findingsOf(tree(frame(o)) as unknown as SceneNode).map((f) => f.target.field)
    expect(fields({ ...corners, boundVariables: { topRightRadius: { id: 'v' } } })).toEqual(['topLeftRadius', 'bottomLeftRadius', 'bottomRightRadius'])
    expect(fields(corners)).toEqual(['cornerRadius'])
  })

  it('reads the free sides when only some are bound', () => {
    const paint = [solid(0, 0, 0, { boundVariables: { color: { id: 'x' } } })]
    const sides = { strokes: paint, strokeWeight: 1, strokeTopWeight: 1, strokeBottomWeight: 1, strokeLeftWeight: 1, strokeRightWeight: 1 }
    const fields = (o: Partial<Fake>) => findingsOf(tree(frame(o)) as unknown as SceneNode).map((f) => f.target.field)
    expect(fields({ ...sides, boundVariables: { strokeLeftWeight: { id: 'v' } } })).toEqual(['strokeTopWeight', 'strokeBottomWeight', 'strokeRightWeight'])
    expect(fields(sides)).toEqual(['strokeWeight'])
  })

  it('reads each side of a mixed stroke', () => {
    const paint = [solid(0, 0, 0, { boundVariables: { color: { id: 'x' } } })]
    const sides = { strokes: paint, strokeWeight: Symbol('mixed'), strokeTopWeight: 2, strokeBottomWeight: 0, strokeLeftWeight: 1, strokeRightWeight: 1 }
    expect(props(sides)).toEqual([['Stroke width', 2], ['Stroke width', 1], ['Stroke width', 1]])
    expect(props({ ...sides, boundVariables: { strokeTopWeight: { id: 'v' } } })).toEqual([['Stroke width', 1], ['Stroke width', 1]])
  })

  it('reads font weight and paragraph spacing unless a text style owns them', () => {
    const text = { type: 'TEXT', textStyleId: '', fontWeight: 600, paragraphSpacing: 8 }
    expect(props(text)).toEqual([['Font weight', 600], ['Paragraph spacing', 8]])
    expect(props({ ...text, textStyleId: 'S:1' })).toEqual([])
    expect(props({ ...text, fontWeight: Symbol('mixed'), paragraphSpacing: 0 })).toEqual([])
  })
})

describe('varmapper:check', () => {
  it('says so when Dual File has no source', async () => {
    install([])
    const r = await run<CheckResult>(MSG.check, undefined, { status: 'not-configured', reason: 'empty', message: 'Add your library files.' })
    expect(r).toEqual({ status: 'no-source', message: 'Add your library files.' })
  })

  it('reports a source that failed to load', async () => {
    install([])
    const r = await run<CheckResult>(MSG.check, undefined, { status: 'ready', index: { ...INDEX, variables: [], files: [{ ...INDEX.files[0]!, error: 'Figma said no.' }] } })
    expect(r).toEqual({ status: 'source-failed', message: 'Figma said no.' })
  })

  it('waits for a selection, naming the source', async () => {
    install([])
    expect(await run<CheckResult>(MSG.check)).toEqual({ status: 'no-selection', source: { name: 'Bluebird UI', variables: 1 } })
  })

  it('walks the selection, leaving instances to their main component', async () => {
    const root = tree(frame({ layoutMode: 'VERTICAL', itemSpacing: 16, children: [
      { id: '2', type: 'INSTANCE', name: 'Button', fills: [solid(1, 1, 1)], children: [frame({ id: '3', fills: [solid(0, 0, 0)] })] },
      frame({ id: '4', name: 'Hidden', visible: false, fills: [solid(0, 0, 0)] }),
    ] }))
    install([root])
    const r = await run<CheckResult>(MSG.check)
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.groups.map((g) => [g.current, g.match, g.candidates[0]?.name])).toEqual([['16 px', 'exact', 'space/inset-xl']])
    expect(r.skippedInstances).toBe(1)
    expect(r.selection).toEqual({ name: 'Card', meta: 'Frame on Login · 1 hard-coded value' })
  })

  const library = (variables: LibraryVariable[]): LibraryLoadResult => ({ status: 'ready', index: { ...INDEX, variables } })
  const brandVar = (name: string, bridge: string, ikea: string): LibraryVariable => ({ ...LIB, id: name, key: `key:${name}`, name, collection: 'Brand UI', values: [{ mode: 'Bridge', value: bridge, aliasOf: 'x' }, { mode: 'Ikea', value: ikea, aliasOf: 'y' }] })

  it('compares values in the mode the layer renders in, and says which', async () => {
    const root = tree(frame({ layoutMode: 'VERTICAL', itemSpacing: 16, resolvedVariableModes: { c1: 'm2' } }))
    install([root])
    const r = await run<CheckResult>(MSG.check, undefined, library([brandVar('space/gap', '8', '16')]))
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.groups.map((g) => [g.match, g.mode, g.candidates[0]?.value])).toEqual([['exact', 'Ikea', '16']])
    expect(r.selection.meta).toBe('Frame on Login · 1 hard-coded value · Ikea mode')
  })

  it('names every mode a mixed selection renders in', async () => {
    const a = tree(frame({ layoutMode: 'VERTICAL', itemSpacing: 16, resolvedVariableModes: { c1: 'm1' } }))
    const b = tree(frame({ id: '2', layoutMode: 'VERTICAL', itemSpacing: 16, resolvedVariableModes: { c1: 'm2' } }))
    install([a, b])
    const r = await run<CheckResult>(MSG.check, undefined, library([brandVar('space/gap', '8', '16')]))
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.selection.meta).toBe('On Login · 2 hard-coded values · Bridge, Ikea modes')
    expect(r.groups).toHaveLength(2)
  })

  it('learns from what neighbouring layers already use', async () => {
    const bound = (id: string, v: string) => frame({ id, boundVariables: { itemSpacing: { id: v } } })
    const root = tree(frame({ id: 'root', name: 'Board', children: [
      bound('a', 'jira/space/row'), bound('b', 'jira/space/card'), bound('c', 'jira/radius/card'),
      frame({ id: 'target', name: 'Thing', layoutMode: 'VERTICAL', itemSpacing: 16 }),
    ] }))
    const target = root.children![3]!
    install([target], [root])
    const twin = (name: string): LibraryVariable => ({ ...LIB, id: name, key: `key:${name}`, name })
    const r = await run<CheckResult>(MSG.check, undefined, library([twin('a11y/space/panel'), twin('jira/space/panel')]))
    if (r.status !== 'ready') throw new Error(r.status)
    expect(r.groups[0]?.candidates[0]?.name).toBe('jira/space/panel')
    expect(r.groups[0]?.match).toBe('exact')
  })

  it('still answers when a binding or collection can’t be read', async () => {
    const root = tree(frame({ layoutMode: 'VERTICAL', itemSpacing: 16 }))
    install([root], [root], { variables: { getVariableByIdAsync: vi.fn(async () => null), getVariableCollectionByIdAsync: vi.fn(async () => null) } })
    const r = await run<CheckResult>(MSG.check)
    expect(r.status).toBe('ready')
  })
})

describe('varmapper:select and goto', () => {
  it('selects the layers and zooms to them', async () => {
    const node = tree(frame())
    const page = tree({ id: 'p', type: 'PAGE', name: 'Login', children: [] })
    node.parent = page
    const figmaMock = install([], [node])
    ;(figmaMock as unknown as { currentPage: unknown }).currentPage = page
    expect(await run(MSG.select, { nodeIds: ['1'] })).toEqual({ selected: 1, page: 'Login' })
    expect((page as unknown as { selection: unknown }).selection).toEqual([node])
    expect(figmaMock.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node])
  })

  it('opens the layer’s page when the designer has moved on', async () => {
    const other = tree({ id: 'q', type: 'PAGE', name: '  ↳ Other', children: [] })
    const node = tree(frame())
    node.parent = other
    const figmaMock = install([], [node], { setCurrentPageAsync: vi.fn(async (p: unknown) => { (figmaMock as unknown as { currentPage: unknown }).currentPage = p }) })
    expect(await run(MSG.goto, { nodeId: '1' })).toEqual({ page: 'Other', name: 'Card' })
    expect(figmaMock.setCurrentPageAsync).toHaveBeenCalledWith(other)
  })

  it('explains a layer that was deleted since the check', async () => {
    install([])
    await expect(run(MSG.goto, { nodeId: 'gone' })).rejects.toThrow(/no longer exists/)
  })
})

describe('varmapper:bind and undo', () => {
  const target = { nodeId: '1', field: 'itemSpacing' } as const
  const bindGap = { variableKey: 'key:space', targets: [target], value: 16, keepValue: true }
  const gapFrame = (o: Partial<Fake> = {}) => frame({ itemSpacing: 16, setBoundVariable: vi.fn(), ...o })
  const shared = () => createHandlers({ loadLibraries: async () => READY })
  const send = <T,>(h: ReturnType<typeof shared>, type: string, payload: unknown) => (h[type] as unknown as (p: unknown) => Promise<T>)(payload)

  it('binds through the library key and commits one undo step', async () => {
    const node = gapFrame()
    const figmaMock = install([], [node])
    const r = await run<BindResult>(MSG.bind, bindGap)
    expect(r).toMatchObject({ bound: 1, skipped: 0, variable: 'space/inset-xl' })
    expect(node.setBoundVariable).toHaveBeenCalledWith('itemSpacing', VAR)
    expect(figmaMock.commitUndo).toHaveBeenCalledTimes(1)
  })

  it('leaves a layer alone when its value changed since the check', async () => {
    const changed = gapFrame({ id: '2', itemSpacing: 24 })
    install([], [gapFrame(), changed])
    const r = await run<BindResult>(MSG.bind, { ...bindGap, targets: [target, { nodeId: '2', field: 'itemSpacing' }] })
    expect(r).toMatchObject({ bound: 1, skipped: 1 })
    expect(changed.setBoundVariable).not.toHaveBeenCalled()
  })

  it('refuses when every layer changed', async () => {
    install([], [gapFrame({ itemSpacing: 24 })])
    await expect(run(MSG.bind, bindGap)).rejects.toThrow(/changed since the check/)
  })

  it('never binds a paint that moved: another colour, an image, or a bound one', async () => {
    const paint = { nodeId: '1', field: 'fills', paintIndex: 0 }
    const req = { variableKey: 'key:space', targets: [paint], value: '#FF0000', keepValue: true }
    const colour = { ...VAR, resolvedType: 'COLOR' }
    for (const fills of [[solid(0, 0, 1)], [{ type: 'IMAGE' }], [solid(1, 0, 0, { boundVariables: { color: { id: 'x' } } })], []]) {
      const node = frame({ fills })
      install([], [node], { variables: { getLocalVariablesAsync: vi.fn(async () => [{ ...colour }]), importVariableByKeyAsync: vi.fn(async () => colour), setBoundVariableForPaint: vi.fn() } })
      await expect(run(MSG.bind, req)).rejects.toThrow(/changed since the check/)
    }
  })

  it('refuses a variable of the wrong type', async () => {
    install([], [gapFrame()], { variables: { getLocalVariablesAsync: vi.fn(async () => []), importVariableByKeyAsync: vi.fn(async () => ({ ...VAR, resolvedType: 'COLOR' })) } })
    await expect(run(MSG.bind, bindGap)).rejects.toThrow(/can’t hold/)
  })

  it('binds all four corners for a uniform radius', async () => {
    const node = gapFrame({ cornerRadius: 16, topLeftRadius: 16, topRightRadius: 16, bottomLeftRadius: 16, bottomRightRadius: 16 })
    install([], [node])
    await run(MSG.bind, { ...bindGap, targets: [{ nodeId: '1', field: 'cornerRadius' }] })
    expect((node.setBoundVariable as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'])
  })

  it('leaves all four corners as they were when one can’t be bound', async () => {
    const corners = { cornerRadius: 16, topLeftRadius: 16, topRightRadius: 16, bottomLeftRadius: 16, bottomRightRadius: 16 }
    const setBoundVariable = vi.fn((field: string, v: unknown) => { if (v && field === 'bottomLeftRadius') throw new Error('locked') })
    const node = gapFrame({ ...corners, setBoundVariable })
    install([], [node])
    await expect(run(MSG.bind, { ...bindGap, targets: [{ nodeId: '1', field: 'cornerRadius' }] })).rejects.toThrow(/changed since the check/)
    const unbound = setBoundVariable.mock.calls.filter((c) => c[1] === null).map((c) => c[0])
    expect(unbound).toEqual(['topLeftRadius', 'topRightRadius'])
    expect(node.topLeftRadius).toBe(16)
  })

  it('binds a paint without touching the others', async () => {
    const node = frame({ fills: [solid(1, 0, 0), solid(0, 0, 1)] })
    const colour = { ...VAR, resolvedType: 'COLOR' }
    install([], [node], { variables: { getLocalVariablesAsync: vi.fn(async () => []), importVariableByKeyAsync: vi.fn(async () => colour), setBoundVariableForPaint: vi.fn((p: object, _f: string, v: { id: string }) => ({ ...p, boundVariables: { color: { id: v.id } } })) } })
    await run(MSG.bind, { variableKey: 'key:space', targets: [{ nodeId: '1', field: 'fills', paintIndex: 1 }], value: '#0000FF', keepValue: true })
    const fills = node.fills as { boundVariables?: unknown }[]
    expect(fills[0]?.boundVariables).toBeUndefined()
    expect(fills[1]?.boundVariables).toEqual({ color: { id: 'v' } })
  })

  it('loads the fonts before binding a text field', async () => {
    const node = gapFrame({ type: 'TEXT', fontSize: 16, characters: 'Hi', getRangeAllFontNames: () => [{ family: 'Noto Sans', style: 'Regular' }] })
    const figmaMock = install([], [node])
    await run(MSG.bind, { ...bindGap, targets: [{ nodeId: '1', field: 'fontSize' }] })
    expect(figmaMock.loadFontAsync).toHaveBeenCalledWith({ family: 'Noto Sans', style: 'Regular' })
  })

  it('never treats a text field on a frame as bindable', async () => {
    install([], [gapFrame({ fontSize: 16 })])
    await expect(run(MSG.bind, { ...bindGap, targets: [{ nodeId: '1', field: 'fontSize' }] })).rejects.toThrow(/changed since the check/)
  })

  it('counts a deleted layer as skipped and keeps going', async () => {
    install([], [gapFrame()])
    const r = await run<BindResult>(MSG.bind, { ...bindGap, targets: [target, { nodeId: 'gone', field: 'itemSpacing' }] })
    expect(r).toMatchObject({ bound: 1, skipped: 1 })
  })

  it('explains an unpublished variable', async () => {
    install([], [frame()], { variables: { getLocalVariablesAsync: vi.fn(async () => []), importVariableByKeyAsync: vi.fn(async () => { throw new Error('nope') }) } })
    await expect(run(MSG.bind, bindGap)).rejects.toThrow(/Publish its library/)
  })

  it('uses a variable from this file without importing it', async () => {
    const node = gapFrame()
    const local = { id: 'l', key: 'key:space', name: 'local', resolvedType: 'FLOAT' }
    const importVariableByKeyAsync = vi.fn()
    install([], [node], { variables: { getLocalVariablesAsync: vi.fn(async () => [local]), importVariableByKeyAsync } })
    await run(MSG.bind, bindGap)
    expect(node.setBoundVariable).toHaveBeenCalledWith('itemSpacing', local)
    expect(importVariableByKeyAsync).not.toHaveBeenCalled()
  })

  it('undo unbinds and restores the exact number', async () => {
    const node = gapFrame()
    install([], [node])
    const h = shared()
    const { undoId } = await send<BindResult>(h, MSG.bind, bindGap)
    node.boundVariables = { itemSpacing: { id: 'v' } }
    node.itemSpacing = 20
    expect(await send<UndoResult>(h, MSG.undo, { undoId })).toEqual({ restored: 1, skipped: 0 })
    expect(node.setBoundVariable).toHaveBeenLastCalledWith('itemSpacing', null)
    expect(node.itemSpacing).toBe(16)
  })

  it('undo keeps an edit made after Bind', async () => {
    const node = gapFrame()
    install([], [node])
    const h = shared()
    const { undoId } = await send<BindResult>(h, MSG.bind, bindGap)
    node.boundVariables = {}
    node.itemSpacing = 24
    expect(await send<UndoResult>(h, MSG.undo, { undoId })).toEqual({ restored: 0, skipped: 1 })
    expect(node.itemSpacing).toBe(24)
  })

  it('undo restores the original paint, floats and all', async () => {
    const original = solid(0.50196, 0, 0, { opacity: 0.501 })
    const node = frame({ fills: [original] })
    const colour = { ...VAR, resolvedType: 'COLOR' }
    install([], [node], { variables: { getLocalVariablesAsync: vi.fn(async () => []), importVariableByKeyAsync: vi.fn(async () => colour), setBoundVariableForPaint: vi.fn((p: object, _f: string, v: { id: string }) => ({ ...p, boundVariables: { color: { id: v.id } } })) } })
    const h = shared()
    const { undoId } = await send<BindResult>(h, MSG.bind, { variableKey: 'key:space', targets: [{ nodeId: '1', field: 'fills', paintIndex: 0 }], value: '#800000', opacity: 0.5, keepValue: true })
    await send(h, MSG.undo, { undoId })
    expect((node.fills as object[])[0]).toEqual(original)
  })

  it('finishes the other layers when one can’t be restored', async () => {
    const bad = gapFrame({ id: '2' })
    const good = gapFrame({ id: '3' })
    const figmaMock = install([], [bad, good])
    const h = shared()
    const { undoId } = await send<BindResult>(h, MSG.bind, { ...bindGap, targets: [{ nodeId: '2', field: 'itemSpacing' }, { nodeId: '3', field: 'itemSpacing' }] })
    bad.boundVariables = { itemSpacing: { id: 'v' } }
    good.boundVariables = { itemSpacing: { id: 'v' } }
    bad.setBoundVariable = vi.fn(() => { throw new Error('locked') })
    expect(await send<UndoResult>(h, MSG.undo, { undoId })).toEqual({ restored: 1, skipped: 1 })
    expect(figmaMock.commitUndo).toHaveBeenCalledTimes(2)
  })

  describe('reading the value back', () => {
    /** What Figma does: a bound field shows the variable's value, not the old one. */
    const rendersAs = (value: number) => ({
      setBoundVariable: vi.fn(function (this: Fake, field: string, v: unknown) {
        if (v) { this[field] = value; this.boundVariables = { [field]: { id: 'v' } } } else this.boundVariables = {}
      }),
    })

    it('restores a layer the variable changed, and says so', async () => {
      const node = gapFrame(rendersAs(20))
      const figmaMock = install([], [node])
      const r = await run<BindResult>(MSG.bind, bindGap)
      expect(r).toMatchObject({ bound: 0, restored: 1, restoredLayers: 1, stuck: 0 })
      expect(node.itemSpacing).toBe(16)
      expect(node.setBoundVariable).toHaveBeenLastCalledWith('itemSpacing', null)
      expect(figmaMock.commitUndo).not.toHaveBeenCalled()
    })

    it('keeps the layers that were fine', async () => {
      const bad = gapFrame({ id: '2', ...rendersAs(20) })
      const good = gapFrame({ id: '3', ...rendersAs(16) })
      install([], [bad, good])
      const r = await run<BindResult>(MSG.bind, { ...bindGap, targets: [{ nodeId: '2', field: 'itemSpacing' }, { nodeId: '3', field: 'itemSpacing' }] })
      expect(r).toMatchObject({ bound: 1, restored: 1, skipped: 0 })
      expect(good.boundVariables).toEqual({ itemSpacing: { id: 'v' } })
    })

    it('counts layers, not fields, for a layer restored twice', async () => {
      const node = gapFrame({ paddingLeft: 16, paddingRight: 16, ...rendersAs(20) })
      install([], [node])
      const r = await run<BindResult>(MSG.bind, { ...bindGap, targets: [{ nodeId: '1', field: 'paddingLeft' }, { nodeId: '1', field: 'paddingRight' }] })
      expect(r).toMatchObject({ restored: 2, restoredLayers: 1 })
    })

    it('leaves the new value alone when the designer chose to change it', async () => {
      const node = gapFrame(rendersAs(20))
      install([], [node])
      const r = await run<BindResult>(MSG.bind, { ...bindGap, keepValue: false })
      expect(r).toMatchObject({ bound: 1, restored: 0 })
      expect(node.itemSpacing).toBe(20)
    })

    it('restores a paint whose colour changed', async () => {
      const original = solid(1, 0, 0)
      const node = frame({ fills: [original] })
      const colour = { ...VAR, resolvedType: 'COLOR' }
      install([], [node], { variables: { getLocalVariablesAsync: vi.fn(async () => []), importVariableByKeyAsync: vi.fn(async () => colour), setBoundVariableForPaint: vi.fn((p: object, _f: string, v: { id: string }) => ({ ...p, color: { r: 0, g: 0, b: 1 }, boundVariables: { color: { id: v.id } } })) } })
      const r = await run<BindResult>(MSG.bind, { variableKey: 'key:space', targets: [{ nodeId: '1', field: 'fills', paintIndex: 0 }], value: '#FF0000', keepValue: true })
      expect(r).toMatchObject({ bound: 0, restored: 1 })
      expect((node.fills as object[])[0]).toEqual(original)
    })

    it('restores a paint when the variable’s alpha replaced its opacity', async () => {
      const node = frame({ fills: [solid(1, 0, 0, { opacity: 0.5 })] })
      const colour = { ...VAR, resolvedType: 'COLOR' }
      install([], [node], { variables: { getLocalVariablesAsync: vi.fn(async () => []), importVariableByKeyAsync: vi.fn(async () => colour), setBoundVariableForPaint: vi.fn((p: object, _f: string, v: { id: string }) => ({ ...p, opacity: 1, boundVariables: { color: { id: v.id } } })) } })
      const r = await run<BindResult>(MSG.bind, { variableKey: 'key:space', targets: [{ nodeId: '1', field: 'fills', paintIndex: 0 }], value: '#FF0000', opacity: 0.5, keepValue: true })
      expect(r).toMatchObject({ bound: 0, restored: 1 })
    })

    it('reports a layer it could not put back, and keeps it for Undo', async () => {
      const node = gapFrame()
      node.setBoundVariable = vi.fn((field: string, v: unknown) => {
        if (!v) throw new Error('locked')
        node[field] = 20
        node.boundVariables = { [field]: { id: 'v' } }
      })
      const figmaMock = install([], [node])
      const r = await run<BindResult>(MSG.bind, bindGap)
      expect(r).toMatchObject({ bound: 1, restored: 0, stuck: 1 })
      expect(figmaMock.commitUndo).toHaveBeenCalledTimes(1)
    })

    it('still says when every layer had changed before binding', async () => {
      install([], [gapFrame({ itemSpacing: 24 })])
      await expect(run(MSG.bind, bindGap)).rejects.toThrow(/changed since the check/)
    })
  })

  it('binds one side of a stroke', async () => {
    const node = gapFrame({ strokeTopWeight: 2, strokeBottomWeight: 0 })
    install([], [node])
    await run(MSG.bind, { ...bindGap, value: 2, targets: [{ nodeId: '1', field: 'strokeTopWeight' }] })
    expect((node.setBoundVariable as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(['strokeTopWeight'])
  })

  it('undo puts the original font back after a font weight bind', async () => {
    const font = { family: 'Noto Sans', style: 'Regular' }
    const node = gapFrame({ type: 'TEXT', fontWeight: 400, fontName: font, characters: 'Hi', getRangeAllFontNames: () => [font] })
    Object.defineProperty(node, 'fontWeight', { get: () => 400, set: () => { throw new Error('read only') } })
    install([], [node])
    const h = shared()
    const { undoId } = await send<BindResult>(h, MSG.bind, { ...bindGap, value: 400, keepValue: false, targets: [{ nodeId: '1', field: 'fontWeight' }] })
    node.boundVariables = { fontWeight: { id: 'v' } }
    node.fontName = { family: 'Noto Sans', style: 'Bold' }
    expect(await send<UndoResult>(h, MSG.undo, { undoId })).toEqual({ restored: 1, skipped: 0 })
    expect(node.fontName).toEqual(font)
  })

  it('points to Cmd+Z when the Bind is unknown', async () => {
    install([])
    await expect(run(MSG.undo, { undoId: 'undo:1' })).rejects.toThrow(/Cmd\+Z/)
  })

  it('rejects an empty target list and a bad paint index at the boundary', async () => {
    install([])
    await expect(run(MSG.bind, { variableKey: 'k', targets: [], value: 1, keepValue: true })).rejects.toThrow()
    await expect(run(MSG.bind, { variableKey: 'k', targets: [{ nodeId: '1', field: 'itemSpacing' }], value: 1 })).rejects.toThrow()
    await expect(run(MSG.bind, { variableKey: 'k', targets: [{ nodeId: '1', field: 'fills', paintIndex: -1 }], value: '#000000', keepValue: true })).rejects.toThrow()
  })
})
