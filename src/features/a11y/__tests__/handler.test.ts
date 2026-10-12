import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers } from '../sandbox/handler'
import { MSG, type ScanResult } from '../messages'

function text(id: string, chars: string, color: { r: number; g: number; b: number }, fontSize = 14, parent: unknown = null) {
  return { id, type: 'TEXT', name: id, visible: true, characters: chars, fontSize, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400,
    opacity: 1, fills: [{ type: 'SOLID', visible: true, opacity: 1, color }], parent }
}

describe('a11y:scan', () => {
  beforeEach(() => {
    const frame: Record<string, unknown> = { id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], parent: { type: 'PAGE' } }
    frame.children = [
      text('t-bad', 'faint', { r: 0.8, g: 0.8, b: 0.8 }, 12, frame),
      text('t-ok', 'strong', { r: 0, g: 0, b: 0 }, 12, frame),
    ]
    installFigmaMock({ currentPage: { selection: [frame], children: [frame] } as unknown as PageNode })
  })

  it('reports only text below AAA, worst first, and emits progress', async () => {
    const emit = vi.fn()
    const result = await (handlers[MSG.scan] as unknown as (p: unknown, c: { emit: typeof emit }) => Promise<ScanResult>)({ scope: 'selection' }, { emit })
    expect(result.scanned).toBe(3)
    expect(result.textNodes).toBe(2)
    expect(result.issues.map((i) => i.nodeId)).toEqual(['t-bad'])
    expect(result.issues[0]?.level).toBe('fail')
    expect(emit).toHaveBeenCalledWith(MSG.progress, { visited: 3 })
  })

  it('rejects an invalid scope', async () => {
    await expect((handlers[MSG.scan] as unknown as (p: unknown, c: unknown) => Promise<unknown>)({ scope: 'galaxy' }, { emit: vi.fn() })).rejects.toThrow()
  })
})

describe('a11y:focus', () => {
  it('selects and zooms to the node', async () => {
    const node = { id: '9', type: 'TEXT' }
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async () => node) as unknown as PluginAPI['getNodeByIdAsync'] })
    await (handlers[MSG.focus] as unknown as (p: unknown, c: unknown) => Promise<void>)({ nodeId: '9' }, { emit: vi.fn() })
    expect(figma.currentPage.selection).toEqual([node])
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node])
  })

  it('throws when the node is gone', async () => {
    installFigmaMock()
    await expect((handlers[MSG.focus] as unknown as (p: unknown, c: unknown) => Promise<void>)({ nodeId: 'x' }, { emit: vi.fn() })).rejects.toThrow(/no longer exists/)
  })
})

/** The accuracy work of 2026-09-23: what the scanner must NOT report, and how
 * repeated findings collapse into one card. */
describe('a11y:scan accuracy', () => {
  const run = (scope: 'selection' | 'page' = 'page', extra: Record<string, unknown> = {}) =>
    (handlers[MSG.scan] as unknown as (p: unknown, c: { emit: () => void }) => Promise<ScanResult>)(
      { scope, ...extra }, { emit: vi.fn() },
    )

  function page(children: (parent: Record<string, unknown>) => Record<string, unknown>[]) {
    const frame: Record<string, unknown> = {
      id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1,
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }], parent: { type: 'PAGE' },
    }
    frame.children = children(frame)
    installFigmaMock({ currentPage: { selection: [], children: [frame] } as unknown as PageNode })
    return frame
  }

  it('collapses layers that share a colour pair into one finding', async () => {
    page((frame) => [
      text('a', 'one', { r: 0.8, g: 0.8, b: 0.8 }, 12, frame),
      text('b', 'two', { r: 0.8, g: 0.8, b: 0.8 }, 12, frame),
      text('c', 'three', { r: 0.8, g: 0.8, b: 0.8 }, 12, frame),
    ])
    const result = await run()
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]?.occurrences).toBe(3)
    expect(result.issues[0]?.nodeIds).toEqual(['a', 'b', 'c'])
  })

  it('keeps the same pair separate when the size changes the threshold', async () => {
    page((frame) => [
      text('small', 'one', { r: 0.8, g: 0.8, b: 0.8 }, 12, frame),
      text('big', 'two', { r: 0.8, g: 0.8, b: 0.8 }, 32, frame),
    ])
    const result = await run()
    expect(result.issues).toHaveLength(2)
  })

  it('exempts text inside a disabled component instead of reporting it', async () => {
    page((frame) => {
      const disabled: Record<string, unknown> = {
        id: 'btn', type: 'INSTANCE', name: 'Button', visible: true, opacity: 1, fills: [], parent: frame,
        componentProperties: { State: { type: 'VARIANT', value: 'Disabled' } },
      }
      disabled.children = [text('label', 'Save', { r: 0.8, g: 0.8, b: 0.8 }, 12, disabled)]
      return [disabled]
    })
    const result = await run()
    expect(result.issues).toHaveLength(0)
    expect(result.exempt).toBe(1)
  })

  it('refuses to measure text on an image and lists it instead', async () => {
    page((frame) => {
      const hero: Record<string, unknown> = {
        id: 'hero', type: 'FRAME', name: 'Hero', visible: true, opacity: 1,
        fills: [{ type: 'IMAGE', visible: true }], parent: frame,
      }
      hero.children = [text('over', 'Spring', { r: 0.8, g: 0.8, b: 0.8 }, 12, hero)]
      return [hero]
    })
    const result = await run()
    expect(result.issues).toHaveLength(0)
    expect(result.unmeasurable).toEqual([
      { nodeId: 'over', name: 'over', text: 'Spring', reason: 'sits on an image fill' },
    ])
  })

  it('walks the first instance of a component and skips the repeats', async () => {
    const main = { id: 'main' }
    page((frame) => ['i1', 'i2', 'i3'].map((id) => {
      const inst: Record<string, unknown> = {
        id, type: 'INSTANCE', name: id, visible: true, opacity: 1, fills: [],
        parent: frame, getMainComponentAsync: async () => main, componentProperties: {},
      }
      inst.children = [text(`${id}-label`, 'faint', { r: 0.8, g: 0.8, b: 0.8 }, 12, inst)]
      return inst
    }))
    const result = await run()
    expect(result.instancesSkipped).toBe(2)
    expect(result.textNodes).toBe(1)
  })

  it('walks every instance when dedupe is turned off', async () => {
    const main = { id: 'main' }
    page((frame) => ['i1', 'i2'].map((id) => {
      const inst: Record<string, unknown> = {
        id, type: 'INSTANCE', name: id, visible: true, opacity: 1, fills: [],
        parent: frame, getMainComponentAsync: async () => main, componentProperties: {},
      }
      inst.children = [text(`${id}-label`, 'faint', { r: 0.8, g: 0.8, b: 0.8 }, 12, inst)]
      return inst
    }))
    const result = await run('page', { dedupeInstances: false })
    expect(result.instancesSkipped).toBe(0)
    expect(result.textNodes).toBe(2)
  })
})

describe('a11y:select-all', () => {
  it('selects every layer that shares the finding', async () => {
    const nodes: Record<string, { id: string; type: string }> = { a: { id: 'a', type: 'TEXT' }, b: { id: 'b', type: 'TEXT' } }
    const figma = installFigmaMock({
      getNodeByIdAsync: vi.fn(async (id: string) => nodes[id] ?? null) as unknown as PluginAPI['getNodeByIdAsync'],
    })
    const result = await (handlers[MSG.selectAll] as unknown as (p: unknown, c: unknown) => Promise<{ selected: number }>)(
      { nodeIds: ['a', 'b', 'gone'] }, { emit: vi.fn() },
    )
    expect(result.selected).toBe(2)
    expect(figma.currentPage.selection).toHaveLength(2)
  })

  it('throws when none of the layers survive', async () => {
    installFigmaMock()
    await expect(
      (handlers[MSG.selectAll] as unknown as (p: unknown, c: unknown) => Promise<unknown>)({ nodeIds: ['x'] }, { emit: vi.fn() }),
    ).rejects.toThrow(/still exist/)
  })
})

/** Roadmap #2 and #3: the finding talks in tokens, and judges every brand mode. */
describe('a11y:scan token awareness', () => {
  const BRAND_MODES = [
    { modeId: 'm1', name: 'Bridge' },
    { modeId: 'm2', name: 'Ikea' },
  ]

  /** A Brand collection with a muted grey (fails on white) and a dark ink (passes). */
  function withPalette(overrides: Record<string, unknown> = {}) {
    const variables: Record<string, unknown> = {
      'v:muted': {
        id: 'v:muted', name: 'Brand/Text/Muted', resolvedType: 'COLOR', variableCollectionId: 'c1',
        valuesByMode: { m1: { r: 0.8, g: 0.8, b: 0.8 }, m2: { r: 0.1, g: 0.1, b: 0.1 } },
      },
      'v:ink': {
        id: 'v:ink', name: 'Brand/Text/Primary', resolvedType: 'COLOR', variableCollectionId: 'c1',
        valuesByMode: { m1: { r: 0.1, g: 0.1, b: 0.1 }, m2: { r: 0.1, g: 0.1, b: 0.1 } },
      },
      'v:canvas': {
        id: 'v:canvas', name: 'Brand/Surface/Canvas', resolvedType: 'COLOR', variableCollectionId: 'c1',
        valuesByMode: { m1: { r: 1, g: 1, b: 1 }, m2: { r: 1, g: 1, b: 1 } },
      },
    }
    const frame: Record<string, unknown> = {
      id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1,
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }],
      boundVariables: { fills: [{ id: 'v:canvas' }] },
      parent: { type: 'PAGE' },
    }
    const label = text('label', 'faint', { r: 0.8, g: 0.8, b: 0.8 }, 12, frame)
    ;(label as Record<string, unknown>).boundVariables = { fills: [{ id: 'v:muted' }] }
    frame.children = [label]

    installFigmaMock({
      currentPage: { selection: [], children: [frame] } as unknown as PageNode,
      variables: {
        getLocalVariableCollectionsAsync: vi.fn(async () => [
          { id: 'c1', name: 'Brand UI', modes: BRAND_MODES, defaultModeId: 'm1', variableIds: Object.keys(variables) },
        ]),
        getVariableByIdAsync: vi.fn(async (id: string) => variables[id] ?? null),
        getVariableCollectionByIdAsync: vi.fn(async () => ({ id: 'c1', defaultModeId: 'm1' })),
      } as unknown as PluginAPI['variables'],
      ...overrides,
    })
  }

  const run = () =>
    (handlers[MSG.scan] as unknown as (p: unknown, c: { emit: () => void }) => Promise<ScanResult>)(
      { scope: 'page' }, { emit: vi.fn() },
    )

  it('names the variables behind both sides of the pair', async () => {
    withPalette()
    const issue = (await run()).issues[0]
    expect(issue?.fgToken).toEqual({ id: 'v:muted', name: 'Brand/Text/Muted', mode: 'Bridge' })
    expect(issue?.bgToken).toEqual({ id: 'v:canvas', name: 'Brand/Surface/Canvas', mode: 'Bridge' })
  })

  it('judges the same pair in every brand mode', async () => {
    withPalette()
    const issue = (await run()).issues[0]
    expect(issue?.brandModes?.map((m) => [m.brand, m.pass])).toEqual([['Bridge', false], ['Ikea', true]])
  })

  it('suggests the nearest token that passes, not a raw hex', async () => {
    withPalette()
    const issue = (await run()).issues[0]
    expect(issue?.fix?.tokenName).toBe('Brand/Text/Primary')
    expect(issue?.fix?.tokenId).toBe('v:ink')
    expect(issue?.fix?.ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('names tokens in a product file that gets Brand UI from its library', async () => {
    withPalette()
    const local = figma.variables
    Object.assign(figma, {
      variables: {
        ...local,
        getLocalVariableCollectionsAsync: vi.fn(async () => []),
        // Importing returns the variable the file already holds, so ids match the layers' bindings.
        importVariableByKeyAsync: vi.fn(async (key: string) => local.getVariableByIdAsync(key)),
        getVariableCollectionByIdAsync: vi.fn(async () => ({ id: 'c1', name: 'Brand UI', modes: BRAND_MODES, defaultModeId: 'm1' })),
      },
      teamLibrary: {
        getAvailableLibraryVariableCollectionsAsync: vi.fn(async () => [{ key: 'brand-ui', name: 'Brand UI', libraryName: 'Plugin UI' }]),
        getVariablesInLibraryCollectionAsync: vi.fn(async () => ['v:muted', 'v:ink', 'v:canvas'].map((key) => ({ key, name: key, resolvedType: 'COLOR' }))),
      },
    })
    const issue = (await run()).issues[0]
    expect(issue?.fgToken).toEqual({ id: 'v:muted', name: 'Brand/Text/Muted', mode: 'Bridge' })
    expect(issue?.fix?.tokenName).toBe('Brand/Text/Primary')
  })

  it('still reports the finding when the file has no Brand collection', async () => {
    withPalette({
      variables: {
        getLocalVariableCollectionsAsync: vi.fn(async () => []),
        getVariableByIdAsync: vi.fn(async () => null),
        getVariableCollectionByIdAsync: vi.fn(async () => null),
      } as unknown as PluginAPI['variables'],
    })
    const issue = (await run()).issues[0]
    expect(issue?.level).toBe('fail')
    expect(issue?.fgToken).toBeUndefined()
    expect(issue?.fix).toBeUndefined()
    expect(issue?.brandModes).toBeUndefined()
  })
})

describe('a11y:apply-fix', () => {
  it('rebinds the paint on every layer that shares the finding', async () => {
    const nodes: Record<string, Record<string, unknown>> = {
      a: { id: 'a', type: 'TEXT', fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] },
      b: { id: 'b', type: 'TEXT', fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] },
    }
    const bound = { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { id: 'v:ink' } } }
    installFigmaMock({
      getNodeByIdAsync: vi.fn(async (id: string) => nodes[id] ?? null) as unknown as PluginAPI['getNodeByIdAsync'],
      variables: {
        getVariableByIdAsync: vi.fn(async () => ({ id: 'v:ink' })),
        setBoundVariableForPaint: vi.fn(() => bound),
      } as unknown as PluginAPI['variables'],
    })
    const result = await (handlers[MSG.applyFix] as unknown as (p: unknown, c: unknown) => Promise<{ applied: number }>)(
      { nodeIds: ['a', 'b'], variableId: 'v:ink' }, { emit: vi.fn() },
    )
    expect(result.applied).toBe(2)
    expect(nodes.a!.fills).toEqual([bound])
  })

  it('refuses when the variable is gone', async () => {
    installFigmaMock({
      variables: { getVariableByIdAsync: vi.fn(async () => null) } as unknown as PluginAPI['variables'],
    })
    await expect(
      (handlers[MSG.applyFix] as unknown as (p: unknown, c: unknown) => Promise<unknown>)(
        { nodeIds: ['a'], variableId: 'gone' }, { emit: vi.fn() },
      ),
    ).rejects.toThrow(/no longer exists/)
  })
})

/** Roadmap #4: the two criteria that make the coverage credible. */
describe('a11y:scan — 1.4.11 and 2.5.8', () => {
  const run = () =>
    (handlers[MSG.scan] as unknown as (p: unknown, c: { emit: () => void }) => Promise<ScanResult>)(
      { scope: 'page' }, { emit: vi.fn() },
    )

  function page(children: (parent: Record<string, unknown>) => Record<string, unknown>[]) {
    const frame: Record<string, unknown> = {
      id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1,
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }], parent: { type: 'PAGE' },
    }
    frame.children = children(frame)
    installFigmaMock({ currentPage: { selection: [], children: [frame] } as unknown as PageNode })
  }

  const bordered = (id: string, name: string, grey: number, parent: Record<string, unknown>) => ({
    id, name, type: 'RECTANGLE', visible: true, opacity: 1, fills: [], parent,
    strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: grey, g: grey, b: grey } }],
    strokeWeight: 1,
  })

  it('flags a border that cannot reach 3:1 against its backdrop', async () => {
    page((frame) => [bordered('b1', 'Input border', 0.9, frame)])
    const result = await run()
    expect(result.nonText).toHaveLength(1)
    expect(result.nonText[0]?.ratio).toBeLessThan(3)
    expect(result.nonText[0]?.name).toBe('Input border')
  })

  it('leaves a border that reaches 3:1 alone', async () => {
    page((frame) => [bordered('b1', 'Input border', 0.2, frame)])
    expect((await run()).nonText).toHaveLength(0)
  })

  it('exempts dividers, which the criterion treats as decoration', async () => {
    page((frame) => [bordered('d1', 'Divider', 0.9, frame)])
    expect((await run()).nonText).toHaveLength(0)
  })

  it('groups repeated borders into one finding', async () => {
    page((frame) => [bordered('b1', 'Input border', 0.9, frame), bordered('b2', 'Input border', 0.9, frame)])
    const result = await run()
    expect(result.nonText).toHaveLength(1)
    expect(result.nonText[0]?.occurrences).toBe(2)
  })

  it('flags a prototyped target under 24px, and says the reaction proved it', async () => {
    // Packed next to another target, so the spacing exception does not apply.
    page((frame) => [{
      id: 'x', name: 'Close', type: 'FRAME', visible: true, opacity: 1, fills: [], parent: frame,
      reactions: [{ action: { type: 'NODE' } }], absoluteBoundingBox: { x: 0, y: 0, width: 16, height: 16 },
      children: [],
    }, {
      id: 'nb', name: 'Neighbour', type: 'FRAME', visible: true, opacity: 1, fills: [], parent: frame,
      reactions: [{ action: { type: 'NODE' } }], absoluteBoundingBox: { x: 18, y: 0, width: 16, height: 16 }, children: [],
    }])
    const result = await run()
    expect(result.targets).toHaveLength(1)
    expect(result.targets[0]).toMatchObject({ width: 16, height: 16, required: 24, evidence: 'reaction', occurrences: 2 })
  })

  it('falls back to the component name when nothing was prototyped', async () => {
    page((frame) => [{
      id: 'x', name: 'Icon button', type: 'INSTANCE', visible: true, opacity: 1, fills: [], parent: frame,
      componentProperties: {}, absoluteBoundingBox: { x: 0, y: 0, width: 20, height: 20 }, children: [],
    }, {
      id: 'nb', name: 'Neighbour', type: 'FRAME', visible: true, opacity: 1, fills: [], parent: frame,
      reactions: [{ action: { type: 'NODE' } }], absoluteBoundingBox: { x: 18, y: 0, width: 16, height: 16 }, children: [],
    }])
    expect((await run()).targets.find((t) => t.name === 'Icon button')?.evidence).toBe('control')
  })

  it('ignores an ordinary layer that is merely small', async () => {
    page((frame) => [{
      id: 'x', name: 'Caption underline', type: 'RECTANGLE', visible: true, opacity: 1, fills: [], parent: frame,
      absoluteBoundingBox: { x: 0, y: 0, width: 8, height: 2 },
    }])
    expect((await run()).targets).toHaveLength(0)
  })

  it('measures the smaller side: a wide thin control still fails', async () => {
    page((frame) => [{
      id: 'x', name: 'Tab', type: 'INSTANCE', visible: true, opacity: 1, fills: [], parent: frame,
      componentProperties: {}, absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 18 }, children: [],
    }, {
      id: 'nb', name: 'Tab', type: 'INSTANCE', visible: true, opacity: 1, fills: [], parent: frame,
      componentProperties: {}, absoluteBoundingBox: { x: 0, y: 20, width: 200, height: 18 }, children: [],
    }])
    const result = await run()
    expect(result.targets[0]).toMatchObject({ width: 200, height: 18, required: 24 })
  })

  it('reports a target that clears AA but misses AAA against the 44px bar', async () => {
    page((frame) => [{
      id: 'x', name: 'Button', type: 'INSTANCE', visible: true, opacity: 1, fills: [], parent: frame,
      componentProperties: {}, absoluteBoundingBox: { x: 0, y: 0, width: 32, height: 32 }, children: [],
    }])
    expect((await run()).targets[0]?.required).toBe(44)
  })
})

/** Accuracy hardening before the 100-designer rollout. Each test is a class of
 * wrong answer the scanner used to give. */
describe('a11y:scan — hardening', () => {
  const run = (extra: Record<string, unknown> = {}) =>
    (handlers[MSG.scan] as unknown as (p: unknown, c: { emit: () => void }) => Promise<ScanResult>)(
      { scope: 'page', ...extra }, { emit: vi.fn() },
    )
  const faint = { r: 0.8, g: 0.8, b: 0.8 }
  const strong = { r: 0, g: 0, b: 0 }

  function page(children: (parent: Record<string, unknown>) => Record<string, unknown>[], overrides: Record<string, unknown> = {}) {
    const frame: Record<string, unknown> = {
      id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1,
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }], parent: { type: 'PAGE' },
    }
    frame.children = children(frame)
    installFigmaMock({ currentPage: { selection: [], children: [frame] } as unknown as PageNode, ...overrides })
    return frame
  }

  it('does not scan inside a hidden frame, whose children still say visible=true', async () => {
    page((frame) => {
      const hidden: Record<string, unknown> = { id: 'h', type: 'FRAME', name: 'Hidden', visible: false, opacity: 1, fills: [], parent: frame }
      hidden.children = [text('ghost', 'faint', faint, 12, hidden)]
      return [hidden]
    })
    expect((await run()).textNodes).toBe(0)
  })

  it('skips whitespace-only text', async () => {
    page((frame) => [text('sp', '   ', faint, 12, frame)])
    expect((await run()).issues).toHaveLength(0)
  })

  it('judges each styled run on its own — a faint link inside strong body copy is found', async () => {
    page((frame) => {
      const t = text('para', 'Read the terms', strong, 14, frame) as Record<string, unknown>
      t.fills = (globalThis as unknown as { figma: PluginAPI }).figma.mixed
      t.getStyledTextSegments = () => [
        { characters: 'Read the ', fills: [{ type: 'SOLID', color: strong }], fontSize: 14, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400 },
        { characters: 'terms', fills: [{ type: 'SOLID', color: faint }], fontSize: 14, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400 },
      ]
      return [t]
    })
    const result = await run()
    expect(result.unmeasurable).toHaveLength(0)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]?.text).toBe('terms')
  })

  it('counts a node once even when two of its runs share a style', async () => {
    page((frame) => {
      const t = text('para', 'a b', faint, 12, frame) as Record<string, unknown>
      t.getStyledTextSegments = () => [
        { characters: 'a ', fills: [{ type: 'SOLID', color: faint }], fontSize: 12, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400 },
        { characters: 'b', fills: [{ type: 'SOLID', color: faint }], fontSize: 12, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400 },
      ]
      return [t]
    })
    expect((await run()).issues[0]?.occurrences).toBe(1)
  })

  it('applies an ancestor group\'s opacity to the text', async () => {
    page((frame) => {
      const faded: Record<string, unknown> = { id: 'g', type: 'FRAME', name: 'Faded', visible: true, opacity: 0.4, fills: [], parent: frame }
      faded.children = [text('label', 'Strong ink', strong, 14, faded)]
      return [faded]
    })
    const result = await run()
    // Black at 40% over white is grey, and grey fails AA.
    expect(result.issues[0]?.level).toBe('fail')
  })

  it('flags the finding as assumed when nothing opaque was behind the text', async () => {
    page((frame) => {
      ;(frame as Record<string, unknown>).fills = []
      return [text('t', 'faint', faint, 12, frame)]
    })
    expect((await run()).issues[0]?.assumedBackground).toBe(true)
  })

  it('still walks an instance that has overrides, even when its component was seen', async () => {
    const main = { id: 'main' }
    page((frame) => ['i1', 'i2'].map((id, i) => {
      const inst: Record<string, unknown> = {
        id, type: 'INSTANCE', name: id, visible: true, opacity: 1, fills: [], parent: frame,
        getMainComponentAsync: async () => main, componentProperties: {},
        overrides: i === 1 ? [{ id: `${id}-label`, overriddenFields: ['fills'] }] : [],
      }
      inst.children = [text(`${id}-label`, 'faint', faint, 12, inst)]
      return inst
    }))
    const result = await run()
    expect(result.instancesSkipped).toBe(0)
    expect(result.textNodes).toBe(2)
  })

  it('does not treat semibold as bold for the large-text exception', async () => {
    // 20px at 3.5:1: passes only if it counts as "large" — which needs 700.
    page((frame) => {
      const t = text('h', 'Heading', { r: 0.55, g: 0.55, b: 0.55 }, 20, frame) as Record<string, unknown>
      t.fontWeight = 600
      t.fontName = { family: 'Inter', style: 'Semi Bold' }
      return [t]
    })
    expect((await run()).issues[0]?.level).toBe('fail')
  })

  it('1.4.11: a faint stroke on a strongly filled control is not a finding — the fill is the boundary', async () => {
    page((frame) => [{
      id: 'b', name: 'Button', type: 'RECTANGLE', visible: true, opacity: 1, parent: frame,
      fills: [{ type: 'SOLID', visible: true, color: strong }],
      strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.95, g: 0.95, b: 0.95 } }], strokeWeight: 1,
    }])
    expect((await run()).nonText).toHaveLength(0)
  })

  it('2.5.8: the icon inside a button is not a second target', async () => {
    page((frame) => {
      const button: Record<string, unknown> = {
        id: 'btn', name: 'Button', type: 'INSTANCE', visible: true, opacity: 1, fills: [], parent: frame,
        componentProperties: {}, absoluteBoundingBox: { x: 0, y: 0, width: 48, height: 48 },
      }
      button.children = [{
        id: 'ico', name: 'Icon button', type: 'INSTANCE', visible: true, opacity: 1, fills: [], parent: button,
        componentProperties: {}, absoluteBoundingBox: { x: 16, y: 16, width: 16, height: 16 }, children: [],
      }]
      return [button]
    })
    expect((await run()).targets).toHaveLength(0)
  })

  it('2.5.8: an undersized target with clear space around it passes on the spacing exception', async () => {
    page((frame) => [{
      id: 'x', name: 'Close', type: 'FRAME', visible: true, opacity: 1, fills: [], parent: frame,
      reactions: [{ action: { type: 'NODE' } }], absoluteBoundingBox: { x: 100, y: 100, width: 16, height: 16 }, children: [],
    }])
    expect((await run()).targets).toHaveLength(0)
  })

  it('2.5.8: the same target packed against a neighbour is still a finding', async () => {
    page((frame) => ['a', 'b'].map((id, i) => ({
      id, name: 'Close', type: 'FRAME', visible: true, opacity: 1, fills: [], parent: frame,
      reactions: [{ action: { type: 'NODE' } }], absoluteBoundingBox: { x: 100 + i * 18, y: 100, width: 16, height: 16 }, children: [],
    })))
    expect((await run()).targets[0]?.occurrences).toBe(2)
  })

  it('suggests only text-scoped tokens, never a surface colour that happens to pass', async () => {
    const variables: Record<string, unknown> = {
      'v:surface': { id: 'v:surface', name: 'Brand/Surface/Ink', resolvedType: 'COLOR', variableCollectionId: 'c1', scopes: ['FRAME_FILL'], valuesByMode: { m1: strong } },
      'v:text': { id: 'v:text', name: 'Brand/Text/Primary', resolvedType: 'COLOR', variableCollectionId: 'c1', scopes: ['TEXT_FILL'], valuesByMode: { m1: { r: 0.15, g: 0.15, b: 0.15 } } },
    }
    page((frame) => [text('t', 'faint', faint, 12, frame)], {
      variables: {
        getLocalVariableCollectionsAsync: vi.fn(async () => [{ id: 'c1', name: 'Brand UI', modes: [{ modeId: 'm1', name: 'Bridge' }], defaultModeId: 'm1', variableIds: Object.keys(variables) }]),
        getVariableByIdAsync: vi.fn(async (id: string) => variables[id] ?? null),
        getVariableCollectionByIdAsync: vi.fn(async () => ({ id: 'c1', defaultModeId: 'm1' })),
      } as unknown as PluginAPI['variables'],
    })
    // Surface/Ink is the closer colour and passes, but it is not for text.
    expect((await run()).issues[0]?.fix?.tokenName).toBe('Brand/Text/Primary')
  })
})
