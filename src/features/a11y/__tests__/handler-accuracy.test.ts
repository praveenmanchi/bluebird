// The accuracy audit of 2026-11-12: cases where the scan missed a real failure
// or reported one that was not there. Each test is the reproduction of one.
import { describe, it, expect, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers } from '../sandbox/handler'
import { MSG, type ScanResult } from '../messages'
import { contrastIgnoreKey } from '../ignore'

type N = Record<string, unknown>
type Colour = { r: number; g: number; b: number }
const WHITE: Colour = { r: 1, g: 1, b: 1 }
const FAINT: Colour = { r: 0.9, g: 0.9, b: 0.9 }
const BLUE: Colour = { r: 0, g: 0.2, b: 0.8 }
const solid = (color: Colour) => [{ type: 'SOLID', visible: true, opacity: 1, color }]

function text(id: string, color: Colour, parent: N, box?: N, name = id): N {
  return { id, type: 'TEXT', name, visible: true, characters: 'Label', fontSize: 14, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400,
    opacity: 1, fills: solid(color), parent, absoluteBoundingBox: box }
}

function instance(id: string, name: string, main: string, parent: N, extra: N = {}): N {
  return { id, type: 'INSTANCE', name, visible: true, opacity: 1, fills: [], parent, children: [], overrides: [], componentProperties: {},
    getMainComponentAsync: async () => ({ id: main, name, parent: null }), ...extra }
}

function page(build: (frame: N) => N[], name = 'Screen'): void {
  const frame: N = { id: 'f', type: 'FRAME', name, visible: true, opacity: 1, fills: solid(WHITE), parent: { type: 'PAGE' }, absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 400 } }
  frame.children = build(frame)
  installFigmaMock({ currentPage: { selection: [], children: [frame] } as unknown as PageNode })
}

const run = (extra: N = {}) =>
  (handlers[MSG.scan] as unknown as (p: unknown, c: { emit: () => void }) => Promise<ScanResult>)({ scope: 'page', ...extra }, { emit: vi.fn() })

describe('a11y:scan accuracy audit', () => {
  it('checks the same component again when it sits on a different surface', async () => {
    page((frame) => ['light', 'dark', 'dark-again'].map((id) => {
      const surface: N = { id: `s-${id}`, type: 'FRAME', name: 'Surface', visible: true, opacity: 1, fills: solid(id === 'light' ? WHITE : { r: 0.05, g: 0.05, b: 0.05 }), parent: frame }
      const inst = instance(`i-${id}`, 'Ghost label', 'main-ghost', surface)
      inst.children = [text(`t-${id}`, { r: 0.1, g: 0.1, b: 0.1 }, inst)]
      surface.children = [inst]
      return surface
    }))
    const result = await run()
    // Dark text passes on white and fails on the dark surface; the second dark copy is the only true repeat.
    expect(result.issues.map((i) => [i.nodeId, i.level])).toEqual([['t-dark', 'fail']])
    expect(result.instancesSkipped).toBe(1)
  })

  it('checks the enabled side of a Disabled property, and exempts the disabled side', async () => {
    page((frame) => ['False', 'True'].map((value) => {
      const button = instance(`b-${value}`, 'Button', `main-${value}`, frame, { componentProperties: { Disabled: { type: 'VARIANT', value } } })
      button.children = [text(`t-${value}`, FAINT, button)]
      return button
    }))
    const result = await run()
    expect(result.issues.map((i) => i.nodeId)).toEqual(['t-False'])
    expect(result.exempt).toBe(1)
  })

  it('reads a boolean Disabled property the same way', async () => {
    page((frame) => {
      const button = instance('b', 'Button', 'main-b', frame, { componentProperties: { 'Disabled#12:3': { type: 'BOOLEAN', value: true } } })
      button.children = [text('t', FAINT, button)]
      return [button]
    })
    expect((await run()).exempt).toBe(1)
  })

  it('does not exempt components merely placed in a frame named for a state', async () => {
    page((frame) => {
      const button = instance('b', 'Button', 'main-b', frame)
      button.children = [text('t', FAINT, button)]
      return [button]
    }, 'Disabled states')
    const result = await run()
    expect(result.exempt).toBe(0)
    expect(result.issues).toHaveLength(1)
  })

  it('still exempts a component whose own name says it is disabled', async () => {
    page((frame) => {
      const button = instance('b', 'Button / disabled', 'main-b', frame)
      button.children = [text('t', FAINT, button)]
      return [button]
    })
    expect((await run()).exempt).toBe(1)
  })

  it('measures the controls inside a group, not the group', async () => {
    page((frame) => {
      const group = instance('grp', 'Button group', 'm-grp', frame, { absoluteBoundingBox: { x: 0, y: 0, width: 52, height: 16 } })
      group.children = [0, 18, 36].map((x, i) => instance(`b${i}`, 'Icon button', 'm-btn', group, { overrides: [{}], absoluteBoundingBox: { x, y: 0, width: 16, height: 16 } }))
      return [group]
    })
    const result = await run()
    expect(result.targets).toHaveLength(1)
    expect(result.targets[0]).toMatchObject({ name: 'Icon button', width: 16, height: 16, required: 24, nodeIds: ['b0', 'b1', 'b2'] })
  })

  it('measures text on a round shape against the shape, not what lies behind it', async () => {
    page((frame) => [
      { id: 'dot', type: 'ELLIPSE', name: 'Avatar', visible: true, opacity: 1, fills: solid(BLUE), parent: frame, absoluteBoundingBox: { x: 10, y: 10, width: 40, height: 40 } },
      text('initials', WHITE, frame, { x: 20, y: 22, width: 20, height: 16 }),
    ])
    // White on that blue is 8.95:1 — it passes AAA, so there is nothing to report.
    expect((await run()).issues).toHaveLength(0)
  })

  it('lists text on an arbitrary vector shape as unmeasurable instead of guessing', async () => {
    page((frame) => [
      { id: 'blob', type: 'VECTOR', name: 'Badge shape', visible: true, opacity: 1, fills: solid(BLUE), parent: frame, absoluteBoundingBox: { x: 10, y: 10, width: 40, height: 40 } },
      text('count', WHITE, frame, { x: 20, y: 22, width: 20, height: 16 }),
    ])
    const result = await run()
    expect(result.issues).toHaveLength(0)
    expect(result.unmeasurable).toEqual([expect.objectContaining({ nodeId: 'count', reason: 'sits on a vector shape' })])
  })

  it('1.4.11: leaves a plain container outline alone and flags a field border', async () => {
    page((frame) => [
      { id: 'card', type: 'FRAME', name: 'Card', visible: true, opacity: 1, fills: solid(WHITE), strokes: solid(FAINT), strokeWeight: 1, parent: frame, children: [] },
      instance('input', 'Input', 'm-input', frame, { fills: solid(WHITE), strokes: solid(FAINT), strokeWeight: 1 }),
    ])
    expect((await run()).nonText.map((n) => n.nodeIds)).toEqual([['input']])
  })

  it('1.4.11: flags a faint container stroke inside a control component', async () => {
    page((frame) => {
      const field = instance('field', 'Text field', 'm-field', frame)
      field.children = [{ id: 'box', type: 'FRAME', name: 'Container', visible: true, opacity: 1, fills: solid(WHITE), strokes: solid(FAINT), strokeWeight: 1, parent: field, children: [] }]
      return [field]
    })
    expect((await run()).nonText.map((n) => n.nodeIds)).toEqual([['box']])
  })

  it('1.4.11: exempts the border of an inactive control', async () => {
    page((frame) => [
      instance('input', 'Input', 'm-input', frame, { fills: solid(WHITE), strokes: solid(FAINT), strokeWeight: 1, componentProperties: { State: { type: 'VARIANT', value: 'Disabled' } } }),
    ])
    expect((await run()).nonText).toHaveLength(0)
  })

  /** Brand UI with a tier-1 ink that differs per brand, a tier-2 text token aliasing it, and a
   *  single-mode Semantics collection the layers are actually bound to. */
  function withSemantics(): void {
    const variables: Record<string, N> = {
      'b:ink': { id: 'b:ink', name: 'Tier1/Ink', resolvedType: 'COLOR', variableCollectionId: 'brand', valuesByMode: { m1: FAINT, m2: { r: 0.1, g: 0.1, b: 0.1 } } },
      'b:text': { id: 'b:text', name: 'Tier2/Text', resolvedType: 'COLOR', variableCollectionId: 'brand', valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'b:ink' }, m2: { type: 'VARIABLE_ALIAS', id: 'b:ink' } } },
      'b:canvas': { id: 'b:canvas', name: 'Tier2/Canvas', resolvedType: 'COLOR', variableCollectionId: 'brand', valuesByMode: { m1: WHITE, m2: WHITE } },
      's:text': { id: 's:text', name: 'Semantic/Text/Body', resolvedType: 'COLOR', variableCollectionId: 'sem', valuesByMode: { s1: { type: 'VARIABLE_ALIAS', id: 'b:text' } } },
      's:surface': { id: 's:surface', name: 'Semantic/Surface', resolvedType: 'COLOR', variableCollectionId: 'sem', valuesByMode: { s1: { type: 'VARIABLE_ALIAS', id: 'b:canvas' } } },
    }
    const frame: N = { id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1, fills: solid(WHITE), boundVariables: { fills: [{ id: 's:surface' }] }, parent: { type: 'PAGE' } }
    frame.children = [{ ...text('label', FAINT, frame), boundVariables: { fills: [{ id: 's:text' }] } }]
    installFigmaMock({
      currentPage: { selection: [], children: [frame] } as unknown as PageNode,
      variables: {
        getLocalVariableCollectionsAsync: vi.fn(async () => [
          { id: 'brand', name: 'Brand UI', modes: [{ modeId: 'm1', name: 'Bridge' }, { modeId: 'm2', name: 'Ikea' }], defaultModeId: 'm1', variableIds: ['b:ink', 'b:text', 'b:canvas'] },
        ]),
        getVariableByIdAsync: vi.fn(async (id: string) => variables[id] ?? null),
        getVariableCollectionByIdAsync: vi.fn(async (id: string) => (id === 'sem' ? { id, defaultModeId: 's1' } : { id, defaultModeId: 'm1' })),
      } as unknown as PluginAPI['variables'],
    })
  }

  it('names the semantic token a layer is bound to and judges it in every brand mode', async () => {
    withSemantics()
    const issue = (await run()).issues[0]
    expect(issue?.fgToken).toMatchObject({ id: 's:text', name: 'Semantic/Text/Body' })
    expect(issue?.bgToken).toMatchObject({ id: 's:surface', name: 'Semantic/Surface' })
    // The tier-2 alias is read in each brand's own mode: faint in Bridge, dark ink in Ikea.
    expect(issue?.brandModes?.map((m) => [m.brand, m.pass])).toEqual([['Bridge', false], ['Ikea', true]])
  })

  it('reads a text colour token from the paint, where a real Figma file records it', async () => {
    const variables: Record<string, N> = {
      'b:hint': { id: 'b:hint', name: 'input/fg/placeholder', resolvedType: 'COLOR', variableCollectionId: 'brand', valuesByMode: { m1: FAINT, m2: { r: 0.1, g: 0.1, b: 0.1 } } },
      'b:canvas': { id: 'b:canvas', name: 'input/bg/default', resolvedType: 'COLOR', variableCollectionId: 'brand', valuesByMode: { m1: WHITE, m2: WHITE } },
    }
    const frame: N = { id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1, fills: solid(WHITE), boundVariables: { fills: [{ id: 'b:canvas' }] }, parent: { type: 'PAGE' } }
    // As Figma returns a styled segment: the binding sits on the paint, and `boundVariables` holds no fills.
    const paint = { type: 'SOLID', visible: true, opacity: 1, color: FAINT, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'b:hint' } } }
    const label: N = { ...text('label', FAINT, frame), fills: [paint], boundVariables: {} }
    label.getStyledTextSegments = () => [{ characters: 'Label', fills: [paint], fontSize: 14, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, boundVariables: {} }]
    frame.children = [label]
    installFigmaMock({
      currentPage: { selection: [], children: [frame] } as unknown as PageNode,
      variables: {
        getLocalVariableCollectionsAsync: vi.fn(async () => [
          { id: 'brand', name: 'Brand UI', modes: [{ modeId: 'm1', name: 'Bridge' }, { modeId: 'm2', name: 'Ikea' }], defaultModeId: 'm1', variableIds: ['b:hint', 'b:canvas'] },
        ]),
        getVariableByIdAsync: vi.fn(async (id: string) => variables[id] ?? null),
        getVariableCollectionByIdAsync: vi.fn(async (id: string) => ({ id, defaultModeId: 'm1' })),
      } as unknown as PluginAPI['variables'],
    })
    const issue = (await run()).issues[0]
    expect(issue?.fgToken).toMatchObject({ id: 'b:hint', name: 'input/fg/placeholder' })
    expect(issue?.brandModes?.map((m) => [m.brand, m.pass])).toEqual([['Bridge', false], ['Ikea', true]])
  })

  const gradient = (stops: readonly { c: Colour; a?: number; at: number }[]) => [{
    type: 'GRADIENT_LINEAR', visible: true, opacity: 1,
    gradientStops: stops.map((s) => ({ position: s.at, color: { ...s.c, a: s.a ?? 1 } })),
  }]

  it('measures text on an opaque gradient at the worst point of it', async () => {
    page((frame) => {
      const hero: N = { id: 'hero', type: 'FRAME', name: 'Hero', visible: true, opacity: 1, parent: frame,
        fills: gradient([{ c: { r: 0, g: 0, b: 0 }, at: 0 }, { c: WHITE, at: 1 }]) }
      hero.children = [text('over', { r: 0.45, g: 0.45, b: 0.45 }, hero)]
      return [hero]
    })
    const r = await run()
    expect(r.unmeasurable).toEqual([])
    expect(r.issues).toHaveLength(1)
    // Mid grey reaches 4.76:1 at the white end and only 4.42:1 at the black one, so the black end decides.
    expect(r.issues[0]).toMatchObject({ background: '#000000', gradientBackground: true, level: 'fail' })
    expect(r.issues[0]?.ratio).toBeCloseTo(4.42, 1)
  })

  it('says nothing when every point of the gradient passes', async () => {
    page((frame) => {
      const hero: N = { id: 'hero', type: 'FRAME', name: 'Hero', visible: true, opacity: 1, parent: frame,
        fills: gradient([{ c: { r: 0, g: 0, b: 0 }, at: 0 }, { c: { r: 0.15, g: 0.15, b: 0.15 }, at: 1 }]) }
      hero.children = [text('over', WHITE, hero)]
      return [hero]
    })
    expect((await run()).issues).toHaveLength(0)
  })

  it('still refuses a gradient with transparency in it', async () => {
    page((frame) => {
      const hero: N = { id: 'hero', type: 'FRAME', name: 'Hero', visible: true, opacity: 1, parent: frame,
        fills: gradient([{ c: { r: 0, g: 0, b: 0 }, a: 0.2, at: 0 }, { c: WHITE, at: 1 }]) }
      hero.children = [text('over', FAINT, hero)]
      return [hero]
    })
    const r = await run()
    expect(r.issues).toHaveLength(0)
    expect(r.unmeasurable).toEqual([expect.objectContaining({ reason: 'sits on a gradient fill' })])
  })

  it('names the layers it left out as exempt, so the count can be checked', async () => {
    page((frame) => {
      const button = instance('b', 'Button / disabled', 'm-b', frame)
      button.children = [text('t', FAINT, button)]
      return [button, text('mark', FAINT, frame, undefined, 'Wordmark')]
    })
    const r = await run()
    expect(r.exempt).toBe(2)
    expect(r.exemptLayers).toEqual([
      { nodeId: 't', name: 't', reason: 'inactive' },
      { nodeId: 'mark', name: 'Wordmark', reason: 'logotype' },
    ])
  })

  it('marks a finding someone corrected, keeps it out of the inventory, and restores it', async () => {
    const build = () => page((frame) => [text('t', FAINT, frame)])
    build()
    const first = await run()
    const key = contrastIgnoreKey(first.issues[0]!)
    expect(first.issues[0]?.ignored).toBeUndefined()

    await (handlers[MSG.ignore] as unknown as (p: unknown, c: unknown) => Promise<{ at: string }>)({ key }, { emit: vi.fn() })
    const after = await run()
    expect(after.issues[0]?.ignored?.at).toMatch(/^\d{4}-/)

    await (handlers[MSG.unignore] as unknown as (p: unknown, c: unknown) => Promise<{ restored: number }>)({ key }, { emit: vi.fn() })
    expect((await run()).issues[0]?.ignored).toBeUndefined()
  })

  it('1.4.11: measures the focus ring drawn in a Focus variant', async () => {
    const ring = (grey: number): N => ({ id: `r${grey}`, type: 'RECTANGLE', name: 'Focus ring', visible: true, opacity: 1, fills: [], parent: null,
      strokes: solid({ r: grey, g: grey, b: grey }), strokeWeight: 2 })
    page((frame) => {
      const focused = instance('btn', 'Button', 'm-btn', frame, { fills: solid(WHITE), componentProperties: { State: { type: 'VARIANT', value: 'Focus' } } })
      const faint = ring(0.9)
      faint.parent = focused
      focused.children = [faint]
      return [focused]
    })
    const r = await run()
    // The ring is inside a control component, so it is a boundary 1.4.11 covers.
    expect(r.nonText).toHaveLength(1)
    expect(r.nonText[0]).toMatchObject({ name: 'Focus ring', evidence: 'component' })
  })

  it('1.4.11: leaves a focus ring that already reaches 3:1 alone', async () => {
    page((frame) => {
      const focused = instance('btn', 'Button', 'm-btn', frame, { fills: solid(WHITE), componentProperties: { State: { type: 'VARIANT', value: 'Focus' } } })
      const strong: N = { id: 'r', type: 'RECTANGLE', name: 'Focus ring', visible: true, opacity: 1, fills: [], parent: focused,
        strokes: solid({ r: 0.1, g: 0.1, b: 0.1 }), strokeWeight: 2 }
      focused.children = [strong]
      return [focused]
    })
    expect((await run()).nonText).toHaveLength(0)
  })
})
