// Exercises the in-Figma extractor against a tiny fake `figma` global.
import { describe, it, expect, beforeEach } from 'vitest'
import { extractTokens, extractComponents, extractIcons, iconKey, type ExtractManifest } from './extract'
import { installFigmaMock } from '../../../tests/mocks/figma'

const manifest: ExtractManifest = {
  fileKey: 'KEY',
  componentsPage: { id: 'page', name: 'Components' },
  collections: { primitives: 'Prim', semantics: 'Sem', brand: 'Brand' },
  componentSets: [{ code: 'Button', figma: 'Button', id: 'set1' }],
  iconSet: { id: 'icons', name: 'Tab Icons', variantProperty: 'Tab Icon' },
}

const variables = [
  { id: 'v1', name: 'color/blue', resolvedType: 'COLOR', variableCollectionId: 'c1', valuesByMode: { p: { r: 0, g: 0, b: 1, a: 1 } } },
  { id: 'v2', name: 'surface/accent', resolvedType: 'COLOR', variableCollectionId: 'c2', valuesByMode: { s: { type: 'VARIABLE_ALIAS', id: 'v1' } } },
  { id: 'v3', name: 'button/bg', resolvedType: 'COLOR', variableCollectionId: 'c3', valuesByMode: { b1: { type: 'VARIABLE_ALIAS', id: 'v2' }, b2: { r: 1, g: 0, b: 0, a: 0.5 } } },
  { id: 'v4', name: 'button/height', resolvedType: 'FLOAT', variableCollectionId: 'c3', valuesByMode: { b1: 32, b2: 32 } },
]
const collections = [
  { id: 'c1', name: 'Prim', modes: [{ modeId: 'p', name: 'Value' }], defaultModeId: 'p', variableIds: ['v1'] },
  { id: 'c2', name: 'Sem', modes: [{ modeId: 's', name: 'Value' }], defaultModeId: 's', variableIds: ['v2'] },
  { id: 'c3', name: 'Brand', modes: [{ modeId: 'b1', name: 'Bridge' }, { modeId: 'b2', name: 'Ikea' }], defaultModeId: 'b1', variableIds: ['v3', 'v4'] },
]

const label = { type: 'TEXT', name: 'Label', characters: 'Button', visible: true, opacity: 1, width: 40, height: 11, fontSize: 11, fontName: { family: 'Noto Sans', style: 'Regular' }, boundVariables: { fontSize: { id: 'v4' } }, fills: [{ type: 'SOLID', boundVariables: { color: { id: 'v3' } } }] }
const variant = {
  id: 'var1', type: 'COMPONENT', name: 'Type=Primary, State=Disabled', visible: true, opacity: 0.55, width: 87, height: 32,
  fills: [{ type: 'SOLID', boundVariables: { color: { id: 'v3' } } }], strokes: [{ type: 'SOLID' }], strokeWeight: 1, cornerRadius: 6,
  layoutMode: 'HORIZONTAL', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'FIXED',
  itemSpacing: 6, paddingLeft: 13, paddingRight: 13, paddingTop: 0, paddingBottom: 0,
  boundVariables: { height: { id: 'v4' }, itemSpacing: undefined },
  componentPropertyDefinitions: {}, componentPropertyReferences: null,
  children: [label],
  findAll: () => [label],
}
const set = { id: 'set1', type: 'COMPONENT_SET', name: 'Button', description: 'desc', children: [variant], componentPropertyDefinitions: { 'Label#1:2': { type: 'TEXT', defaultValue: 'Button' }, Type: { type: 'VARIANT', variantOptions: ['Primary'], defaultValue: 'Primary' } }, findAll: () => [variant, label] }
const icon = { id: 'i1', name: 'Tab Icon=Dropdown- down', exportAsync: async () => '<svg viewBox="0 0 24 24"><path fill="#F5F5F5"/></svg>' }
const iconSet = { id: 'icons', type: 'COMPONENT_SET', name: 'Tab Icons', children: [icon] }
const page = { id: 'page', type: 'PAGE', name: 'Components', children: [{ type: 'SECTION', name: '⚛ Atoms', children: [set] }] }

beforeEach(() => {
  installFigmaMock({
    root: { name: 'Plugin UI' },
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => variables,
    },
    getNodeByIdAsync: async (id: string) => ({ set1: set, icons: iconSet, page }[id] ?? null),
    setCurrentPageAsync: async () => undefined,
  } as unknown as Partial<PluginAPI>)
})

describe('extractTokens', () => {
  it('follows aliases across collections and records first-hop aliases', async () => {
    const snap = await extractTokens(manifest)
    expect(snap.collections.map((c) => c.key)).toEqual(['primitives', 'semantics', 'brand'])
    const brand = snap.collections[2]!
    expect(brand.modes).toEqual(['Bridge', 'Ikea'])
    expect(brand.variables[0]).toEqual({ name: 'button/bg', type: 'COLOR', values: { Bridge: '#0000ff', Ikea: '#ff000080' }, aliases: { Bridge: 'Sem/surface/accent' } })
    expect(snap.collections[1]!.variables[0]!.aliases).toEqual({ Value: 'Prim/color/blue' })
  })
})

describe('extractComponents', () => {
  it('records bound vs raw properties per node and a coverage row', async () => {
    const snap = await extractComponents(manifest)
    const v = snap.sets[0]!.variants[0]!
    expect(v.props).toEqual({ Type: 'Primary', State: 'Disabled' })
    expect(v.nodes[0]!.b).toMatchObject({ fill: 'button/bg', height: 'button/height' })
    expect(v.nodes[0]!.r).toMatchObject({ stroke: 'RAW', strokeWeight: 1, radius: 6, itemSpacing: 6, opacity: 0.55 })
    expect(v.nodes[1]!.b).toMatchObject({ fill: 'button/bg', fontSize: 'button/height' })
    expect(snap.sets[0]!.props).toEqual({ Label: { type: 'TEXT', default: 'Button' }, Type: { type: 'VARIANT', options: ['Primary'], default: 'Primary' } })
    expect(snap.coverage).toEqual([{ section: 'Atoms', type: 'COMPONENT_SET', name: 'Button', id: 'set1', variants: 1, coverage: expect.any(Number) }])
  })
})

describe('extractIcons', () => {
  it('exports every variant keyed by kebab-cased name', async () => {
    const snap = await extractIcons(manifest)
    expect(Object.keys(snap.icons)).toEqual(['dropdown-down'])
    expect(iconKey('Tab Icon=Variable Mapper', 'Tab Icon')).toBe('variable-mapper')
  })
})
