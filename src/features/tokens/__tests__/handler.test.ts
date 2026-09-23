import { describe, it, expect, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers } from '../sandbox/handler'
import { MSG, type AuditResult } from '../messages'

const solid = (r: number, g: number, b: number) => ({ type: 'SOLID', visible: true, color: { r, g, b } })

function install(children: (parent: Record<string, unknown>) => Record<string, unknown>[], variables: Record<string, unknown> = {}) {
  const frame: Record<string, unknown> = {
    id: 'f', type: 'FRAME', name: 'Root', visible: true, opacity: 1, fills: [], layoutMode: 'NONE', parent: { type: 'PAGE' },
  }
  frame.children = children(frame)
  installFigmaMock({
    currentPage: { name: 'Home', selection: [], children: [frame] } as unknown as PageNode,
    variables: {
      getLocalVariableCollectionsAsync: vi.fn(async () => [
        { id: 'c1', name: 'Primitives', modes: [{ modeId: 'm', name: 'Value' }], defaultModeId: 'm', variableIds: Object.keys(variables) },
      ]),
      getVariableByIdAsync: vi.fn(async (id: string) => variables[id] ?? null),
      getVariableCollectionByIdAsync: vi.fn(async () => null),
    } as unknown as PluginAPI['variables'],
  })
}

const run = (scope: 'selection' | 'page' = 'page') =>
  (handlers[MSG.audit] as unknown as (p: unknown, c: { emit: () => void }) => Promise<AuditResult>)({ scope }, { emit: vi.fn() })

const SPACING_VARS = {
  'v:8': { id: 'v:8', name: 'dimension/space/8', resolvedType: 'FLOAT', variableCollectionId: 'c1', scopes: ['GAP'], valuesByMode: { m: 8 } },
  'v:9': { id: 'v:9', name: 'dimension/space/9', resolvedType: 'FLOAT', variableCollectionId: 'c1', scopes: ['GAP'], valuesByMode: { m: 9 } },
  // A 10px type size exists, but it is not spacing and must not excuse a 10px gap.
  'v:t10': { id: 'v:t10', name: 'type/size/10', resolvedType: 'FLOAT', variableCollectionId: 'c1', scopes: ['FONT_SIZE'], valuesByMode: { m: 10 } },
}

describe('tokens:audit — unbound colours', () => {
  it('reports a literal fill and counts it against coverage', async () => {
    install((frame) => [{ id: 'a', type: 'RECTANGLE', name: 'Card', visible: true, fills: [solid(1, 0, 0)], parent: frame }])
    const result = await run()
    expect(result.unbound).toHaveLength(1)
    expect(result.unbound[0]).toMatchObject({ kind: 'fill', hex: '#ff0000', occurrences: 1 })
    expect(result.coverage).toBe(0)
  })

  it('does not report a fill that already reads a variable', async () => {
    install((frame) => [{
      id: 'a', type: 'RECTANGLE', name: 'Card', visible: true, fills: [solid(1, 0, 0)],
      boundVariables: { fills: [{ id: 'v:red' }] }, parent: frame,
    }])
    const result = await run()
    expect(result.unbound).toHaveLength(0)
    expect(result.boundPaints).toBe(1)
    expect(result.coverage).toBe(1)
  })

  it('groups the same literal across layers and offers every node for selection', async () => {
    install((frame) => ['a', 'b'].map((id) => ({ id, type: 'RECTANGLE', name: id, visible: true, fills: [solid(1, 0, 0)], parent: frame })))
    const result = await run()
    expect(result.unbound[0]?.occurrences).toBe(2)
    expect(result.unbound[0]?.nodeIds).toEqual(['a', 'b'])
  })

  it('separates a stroke from a fill of the same colour', async () => {
    install((frame) => [{
      id: 'a', type: 'RECTANGLE', name: 'Card', visible: true,
      fills: [solid(1, 0, 0)], strokes: [solid(1, 0, 0)], parent: frame,
    }])
    const result = await run()
    expect(result.unbound.map((u) => u.kind).sort()).toEqual(['fill', 'stroke'])
  })

  it('names the variable that already holds the value, when one does', async () => {
    install(
      (frame) => [{ id: 'a', type: 'RECTANGLE', name: 'Card', visible: true, fills: [solid(1, 0, 0)], parent: frame }],
      { 'v:red': { id: 'v:red', name: 'Brand/Accent', resolvedType: 'COLOR', variableCollectionId: 'c1', valuesByMode: { m: { r: 1, g: 0, b: 0 } } } },
    )
    expect((await run()).unbound[0]?.suggestion).toEqual({ id: 'v:red', name: 'Brand/Accent' })
  })
})

describe('tokens:audit — hardening', () => {
  it('treats a fill bound to a paint style as from the system', async () => {
    install((frame) => [{ id: 'a', type: 'RECTANGLE', name: 'Card', visible: true, fills: [solid(1, 0, 0)], fillStyleId: 'S:abc', parent: frame }])
    const result = await run()
    expect(result.unbound).toHaveLength(0)
    expect(result.boundPaints).toBe(1)
  })

  it('does not let a font-size variable excuse an off-scale gap', async () => {
    install((frame) => [{
      id: 'a', type: 'FRAME', name: 'Toolbar', visible: true, fills: [], parent: frame,
      layoutMode: 'HORIZONTAL', itemSpacing: 10, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, children: [],
    }], SPACING_VARS)
    expect((await run()).offScale).toHaveLength(1)
  })

  it('reports spacing on components, not again on every instance of them', async () => {
    install((frame) => {
      const inst: Record<string, unknown> = { id: 'i', type: 'INSTANCE', name: 'Card', visible: true, fills: [], parent: frame, layoutMode: 'NONE' }
      inst.children = [{
        id: 'inner', type: 'FRAME', name: 'Row', visible: true, fills: [], parent: inst,
        layoutMode: 'HORIZONTAL', itemSpacing: 10, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, children: [],
      }]
      return [inst]
    }, SPACING_VARS)
    expect((await run()).offScale).toHaveLength(0)
  })
})

describe('tokens:audit — spacing', () => {
  it('reports an auto-layout gap that is not on the scale, with the nearest that is', async () => {
    install((frame) => [{
      id: 'a', type: 'FRAME', name: 'Toolbar', visible: true, fills: [], parent: frame,
      layoutMode: 'HORIZONTAL', itemSpacing: 10, paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 8,
      children: [],
    }], SPACING_VARS)
    const result = await run()
    expect(result.offScale).toHaveLength(1)
    expect(result.offScale[0]).toMatchObject({ property: 'gap', value: 10, nearest: 9 })
  })

  it('ignores a frame with no auto-layout', async () => {
    install((frame) => [{
      id: 'a', type: 'FRAME', name: 'Group', visible: true, fills: [], parent: frame,
      layoutMode: 'NONE', itemSpacing: 10, children: [],
    }], SPACING_VARS)
    expect((await run()).offScale).toHaveLength(0)
  })

  it('treats zero padding as deliberate', async () => {
    install((frame) => [{
      id: 'a', type: 'FRAME', name: 'Bare', visible: true, fills: [], parent: frame,
      layoutMode: 'VERTICAL', itemSpacing: 8, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      children: [],
    }], SPACING_VARS)
    expect((await run()).offScale).toHaveLength(0)
  })
})

describe('tokens:select-all', () => {
  it('selects every layer sharing a finding', async () => {
    const nodes: Record<string, { id: string; type: string }> = { a: { id: 'a', type: 'RECTANGLE' } }
    const figma = installFigmaMock({
      getNodeByIdAsync: vi.fn(async (id: string) => nodes[id] ?? null) as unknown as PluginAPI['getNodeByIdAsync'],
    })
    const result = await (handlers[MSG.selectAll] as unknown as (p: unknown, c: unknown) => Promise<{ selected: number }>)(
      { nodeIds: ['a', 'gone'] }, { emit: vi.fn() },
    )
    expect(result.selected).toBe(1)
    expect(figma.currentPage.selection).toHaveLength(1)
  })
})
