// The REST extractor must describe a file exactly as the Plugin API extractor does. These pin the
// REST → Plugin-API translations, discovery/reconciliation and the pull's argument parsing.
import { describe, it, expect } from 'vitest'
import { mixedStrokeWeight, mixedText, pluginBindings, restFontStyle, styleKind, unrotatedSize } from '../../scripts/figma-rest/normalize'
import { coverageOf, discoverSets, reconcile } from '../../scripts/figma-rest/discover'
import { describeSet, type DescribeContext } from '../../scripts/figma-rest/describe'
import { restTokens } from '../../scripts/figma-rest/variables'
import { withVersion } from '../../scripts/figma-rest/http'
import { parseArgs } from '../../scripts/figma-pull'
import type { RestNode } from '../../scripts/figma-rest/types'

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id })
const box = (width: number, height: number) => ({ width, height })

describe('pluginBindings', () => {
  it('flattens REST-nested bindings to the Plugin API keys', () => {
    const out = pluginBindings({
      itemSpacing: alias('v:gap'),
      size: { x: alias('v:w'), y: alias('v:h') },
      rectangleCornerRadii: { RECTANGLE_TOP_LEFT_CORNER_RADIUS: alias('v:r'), RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS: alias('v:r') },
      individualStrokeWeights: { BORDER_TOP_WEIGHT: alias('v:s') },
    })
    expect(out).toMatchObject({ itemSpacing: { id: 'v:gap' }, width: { id: 'v:w' }, height: { id: 'v:h' }, topLeftRadius: { id: 'v:r' }, bottomRightRadius: { id: 'v:r' }, strokeTopWeight: { id: 'v:s' } })
    // The Plugin API reports per-side bindings, not a bound `strokeWeight`; neither does REST.
    expect(out.strokeWeight).toBeUndefined()
  })

  it('is empty for a node with no bindings', () => {
    expect(pluginBindings(undefined)).toEqual({})
  })
})

describe('mixed values (figma.mixed in the Plugin API)', () => {
  const text = (over: Partial<RestNode>): RestNode => ({ id: '1', name: 't', type: 'TEXT', style: { fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 12 }, ...over })

  it('treats differing per-side stroke weights as mixed, equal ones as not', () => {
    expect(mixedStrokeWeight({ id: '1', name: 'f', type: 'FRAME', individualStrokeWeights: { top: 1, right: 0, bottom: 0, left: 0 } })).toBe(true)
    expect(mixedStrokeWeight({ id: '1', name: 'f', type: 'FRAME', individualStrokeWeights: { top: 1, right: 1, bottom: 1, left: 1 } })).toBe(false)
    expect(mixedStrokeWeight({ id: '1', name: 'f', type: 'FRAME' })).toBe(false)
  })

  it('flags a text run that overrides the base style, ignores unused or identical overrides', () => {
    expect(mixedText(text({ characterStyleOverrides: [0, 3], styleOverrideTable: { 3: { fontStyle: 'Bold' } } }), ['fontStyle'])).toBe(true)
    expect(mixedText(text({ characterStyleOverrides: [0], styleOverrideTable: { 3: { fontStyle: 'Bold' } } }), ['fontStyle'])).toBe(false)
    expect(mixedText(text({ characterStyleOverrides: [3], styleOverrideTable: { 3: { fontSize: 12 } } }), ['fontSize'])).toBe(false)
    expect(mixedText(text({ characterStyleOverrides: [3], styleOverrideTable: { 3: { fontSize: 10 } } }), ['fontStyle'])).toBe(false)
  })
})

describe('unrotatedSize', () => {
  it('swaps axes for a quarter turn, keeps them otherwise', () => {
    expect(unrotatedSize({ id: '1', name: 'f', type: 'FRAME', rotation: Math.PI / 2, absoluteBoundingBox: box(10, 40) })).toEqual([40, 10])
    expect(unrotatedSize({ id: '1', name: 'f', type: 'FRAME', rotation: -Math.PI / 2, absoluteBoundingBox: box(10, 40) })).toEqual([40, 10])
    expect(unrotatedSize({ id: '1', name: 'f', type: 'FRAME', absoluteBoundingBox: box(10, 40) })).toEqual([10, 40])
  })

  it('reports a LINE as length × 0 at any angle', () => {
    const [w, h] = unrotatedSize({ id: '1', name: 'l', type: 'LINE', rotation: -0.0023, absoluteBoundingBox: box(437, 0.995) })
    expect(w).toBeCloseTo(437, 0)
    expect(h).toBe(0)
    expect(unrotatedSize({ id: '1', name: 'l', type: 'LINE', rotation: Math.PI / 2, absoluteBoundingBox: box(0, 16) })).toEqual([16, 0])
  })
})

describe('restFontStyle', () => {
  it('prefers fontStyle, then the PostScript suffix, then the numeric weight', () => {
    expect(restFontStyle({ fontStyle: 'Semi Bold', fontPostScriptName: 'Inter-Bold', fontWeight: 700 })).toBe('Semi Bold')
    expect(restFontStyle({ fontPostScriptName: 'GapSans-Light' })).toBe('Light')
    expect(restFontStyle({ fontPostScriptName: null, fontWeight: 600 })).toBe('SemiBold')
    expect(restFontStyle({})).toBeUndefined()
  })
})

describe('styleKind', () => {
  it('maps REST style keys onto the four kinds extract.ts records', () => {
    expect(['fill', 'fills', 'text', 'stroke', 'strokes', 'effect', 'grid'].map(styleKind)).toEqual(['fill', 'fill', 'text', 'stroke', 'stroke', 'effect', undefined])
  })
})

describe('discovery', () => {
  const page: RestNode = {
    id: 'p', name: 'Components', type: 'CANVAS', children: [
      { id: 's1', name: 'Loose set', type: 'COMPONENT_SET', children: [{ id: 'v1', name: 'A=1', type: 'COMPONENT' }, { id: 'v2', name: 'A=2', type: 'COMPONENT' }] },
      { id: 'i1', name: 'An instance', type: 'INSTANCE' },
      { id: 'sec', name: '⚛️ Atoms', type: 'SECTION', children: [
        { id: 's2', name: 'Button ', type: 'COMPONENT_SET', children: [{ id: 'v3', name: 'T=P', type: 'COMPONENT' }] },
        { id: 'c1', name: 'Icon', type: 'COMPONENT' },
      ] },
    ],
  }

  it('lists sets at the top of the page and inside sections, not instances', () => {
    expect(discoverSets(page)).toEqual([
      { id: 's1', name: 'Loose set', type: 'COMPONENT_SET', section: null, variants: 2 },
      { id: 's2', name: 'Button', type: 'COMPONENT_SET', section: 'Atoms', variants: 1 },
      { id: 'c1', name: 'Icon', type: 'COMPONENT', section: 'Atoms', variants: 1 },
    ])
  })

  it('follows a set that moved by unique name, reports what is missing and unmapped', () => {
    const r = reconcile(
      [{ code: 'Button', figma: 'Button', id: 'old-id' }, { code: 'Gone', figma: 'Gone', id: 'gone-id' }, { code: 'Loose', figma: 'Loose set', id: 's1' }],
      new Set(['s1', 's2', 'c1']), discoverSets(page), ['c1'],
    )
    expect(r.moved).toEqual([{ code: 'Button', figma: 'Button', from: 'old-id', to: 's2' }])
    expect(r.missing.map((m) => m.code)).toEqual(['Gone'])
    expect(r.unmapped).toEqual([]) // s1 mapped, s2 claimed by the move, c1 claimed as e.g. the icon set
  })

  it('does not guess between two sets with the same name', () => {
    const twins = [{ id: 'a', name: 'Card', type: 'COMPONENT_SET', section: null, variants: 1 }, { id: 'b', name: 'Card', type: 'COMPONENT_SET', section: null, variants: 1 }]
    const r = reconcile([{ code: 'Card', figma: 'Card', id: 'old' }], new Set(['a', 'b']), twins)
    expect(r.moved).toEqual([])
    expect(r.missing.map((m) => m.code)).toEqual(['Card'])
  })

  it('counts coverage like extract.ts, including REST-nested radius bindings', () => {
    const top: RestNode = {
      id: 't', name: 'T', type: 'COMPONENT', cornerRadius: 4, boundVariables: { rectangleCornerRadii: { RECTANGLE_TOP_LEFT_CORNER_RADIUS: alias('v:r') } },
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('v:c') } }],
      children: [{ id: 'x', name: 'x', type: 'TEXT', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] }],
    }
    expect(coverageOf(top)).toEqual({ bound: 2, raw: 2 })
  })
})

describe('describeSet', () => {
  const ctx = (names: Record<string, string>): DescribeContext => ({
    nameOf: (b) => { const f = Array.isArray(b) ? b[0] : b; return f ? names[f.id] ?? `lib:${f.id}` : undefined },
    components: new Map([['v1', { key: 'vkey', name: 'State=On', componentSetId: 's' }], ['m1', { name: 'Glyph', componentSetId: 'gs' }]]),
    componentSets: new Map([['s', { key: 'skey', name: 'Toggle' }], ['gs', { name: 'Icons' }]]),
    styles: new Map([['st1', { name: 'Body/Small', styleType: 'TEXT' }]]),
  })

  it('records node ids, keys, main component ids, style names and bound sizes', () => {
    const doc: RestNode = {
      id: 's', name: 'Toggle', type: 'COMPONENT_SET', componentPropertyDefinitions: { 'State': { type: 'VARIANT', variantOptions: ['On'], defaultValue: 'On' }, 'Label#1:2': { type: 'TEXT', defaultValue: 'x' } },
      children: [{
        id: 'v1', name: 'State=On', type: 'COMPONENT', absoluteBoundingBox: box(40, 20), boundVariables: { size: { x: alias('v:w') } },
        children: [
          { id: 'n2', name: 'Label', type: 'TEXT', characters: 'On', styles: { text: 'st1' }, style: { fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 11 } },
          { id: 'n3', name: 'Icon', type: 'INSTANCE', componentId: 'm1', componentProperties: { 'Size#3:4': { value: 'S' } }, absoluteBoundingBox: box(16, 16) },
        ],
      }],
    }
    const set = describeSet(ctx({ 'v:w': 'toggle/width' }), 'Toggle', doc)
    expect(set).toMatchObject({ code: 'Toggle', id: 's', key: 'skey', props: { State: { type: 'VARIANT', options: ['On'] }, Label: { type: 'TEXT' } } })
    const [variant] = set.variants
    expect(variant).toMatchObject({ id: 'v1', key: 'vkey', props: { State: 'On' } })
    expect(variant!.nodes).toEqual([
      { id: 'v1', p: 'State=On', t: 'COMPONENT', b: { width: 'toggle/width' }, r: { size: [40, 20] } },
      { id: 'n2', p: 'State=On/Label', t: 'TEXT', b: {}, r: { text: 'On', fontSize: 11, font: 'Inter', style: 'Medium' }, st: { text: 'Body/Small' } },
      { id: 'n3', p: 'State=On/Icon', t: 'INSTANCE', b: {}, r: { size: [16, 16] }, i: 'Glyph <Icons>', mc: 'm1', cp: { Size: 'S' } },
    ])
  })
})

describe('restTokens', () => {
  it('prefers the local collection over a subscribed one with the same name, and keeps metadata', () => {
    const tokens = restTokens(
      { fileKey: 'f', componentsPage: { id: 'p', name: 'P' }, collections: { primitives: 'Colors', semantics: 'S', brand: 'B' }, componentSets: [], iconSet: { id: 'i', name: 'I', variantProperty: 'X' } },
      {
        byId: {
          'v:remote': { id: 'v:remote', name: 'red', remote: true, resolvedType: 'COLOR', variableCollectionId: 'c:remote', valuesByMode: { m0: { r: 1, g: 0, b: 0 } } },
          'v:local': { id: 'v:local', name: 'blue', key: 'k1', resolvedType: 'COLOR', variableCollectionId: 'c:local', valuesByMode: { m1: { r: 0, g: 0, b: 1 } }, scopes: ['ALL_FILLS'], codeSyntax: { WEB: 'var(--blue)' }, description: 'Brand blue' },
          'v:s': { id: 'v:s', name: 'accent', resolvedType: 'COLOR', variableCollectionId: 'c:s', valuesByMode: { m2: alias('v:local') } },
          'v:b': { id: 'v:b', name: 'x', resolvedType: 'FLOAT', variableCollectionId: 'c:b', valuesByMode: { m3: 4 } },
        },
        collections: [
          { id: 'c:remote', name: 'Colors', remote: true, modes: [{ modeId: 'm0', name: 'Default' }], defaultModeId: 'm0', variableIds: ['v:remote'] },
          { id: 'c:local', name: 'Colors', key: 'ck', modes: [{ modeId: 'm1', name: 'Default' }], defaultModeId: 'm1', variableIds: ['v:local'] },
          { id: 'c:s', name: 'S', modes: [{ modeId: 'm2', name: 'Default' }], defaultModeId: 'm2', variableIds: ['v:s'] },
          { id: 'c:b', name: 'B', modes: [{ modeId: 'm3', name: 'Default' }], defaultModeId: 'm3', variableIds: ['v:b'] },
        ],
      },
      '123',
    )
    expect(tokens.version).toBe('123')
    const [colors, semantics] = tokens.collections
    expect(colors).toMatchObject({ id: 'c:local', publishKey: 'ck', name: 'Colors' })
    expect(colors!.variables).toEqual([{ id: 'v:local', name: 'blue', type: 'COLOR', values: { Default: '#0000ff' }, publishKey: 'k1', description: 'Brand blue', scopes: ['ALL_FILLS'], codeSyntax: { WEB: 'var(--blue)' } }])
    expect(semantics!.variables[0]).toMatchObject({ values: { Default: '#0000ff' }, aliases: { Default: 'Colors/blue' } })
  })
})

describe('withVersion', () => {
  it('appends the version with the right separator, or leaves the path alone', () => {
    expect(withVersion('/files/k/nodes?ids=1', '9')).toBe('/files/k/nodes?ids=1&version=9')
    expect(withVersion('/files/k/nodes', '9')).toBe('/files/k/nodes?version=9')
    expect(withVersion('/files/k/nodes', undefined)).toBe('/files/k/nodes')
  })
})

describe('parseArgs', () => {
  it('defaults to the plugin backend; --tier and --version imply REST', () => {
    expect(parseArgs([])).toMatchObject({ backend: 'plugin', fixManifest: false })
    expect(parseArgs(['--rest'])).toMatchObject({ backend: 'rest' })
    expect(parseArgs(['--tier', 'professional'])).toMatchObject({ backend: 'rest', tier: 'professional' })
    expect(parseArgs(['--version', '42', '--fix-manifest'])).toMatchObject({ backend: 'rest', version: '42', fixManifest: true })
  })

  it('rejects an unknown tier', () => {
    expect(() => parseArgs(['--tier', 'gold'])).toThrow(/--tier must be one of/)
  })
})

describe('pruneToOverrides keeps what an instance overrides, including styles', () => {
  it('keeps st for a style override under either backend\'s field name, drops it otherwise', async () => {
    const { pruneToOverrides } = await import('../../src/shared/brand/extract')
    const entry = { id: 'I1;2', p: 'Card/Title', t: 'TEXT', b: { fill: 'x' }, r: { text: 'Hi' }, st: { text: 'Body/Small' } }
    expect(pruneToOverrides(entry, ['textStyleId']).st).toEqual({ text: 'Body/Small' })
    expect(pruneToOverrides(entry, ['inheritTextStyleId']).st).toEqual({ text: 'Body/Small' })
    const textOnly = pruneToOverrides(entry, ['characters'])
    expect(textOnly).toEqual({ id: 'I1;2', p: 'Card/Title', t: 'TEXT', b: {}, o: ['characters'], r: { text: 'Hi' } })
  })
})

describe('auto-layout defaults', () => {
  it('reports an omitted alignment as MIN, as the Plugin API does', () => {
    const ctx: DescribeContext = { nameOf: () => undefined, components: new Map(), componentSets: new Map(), styles: new Map() }
    const doc: RestNode = { id: 'c', name: 'C', type: 'COMPONENT', layoutMode: 'HORIZONTAL', counterAxisAlignItems: 'CENTER', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'FIXED', absoluteBoundingBox: box(10, 10) }
    expect(describeSet(ctx, 'C', doc).variants[0]!.nodes[0]!.r!.layout).toBe('HORIZONTAL MIN CENTER HUG FIXED')
  })
})
