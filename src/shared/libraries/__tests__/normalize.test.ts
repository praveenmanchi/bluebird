import { describe, it, expect } from 'vitest'
import { colorHex, fontStyleName, toComponents, toStyles, toVariables } from '../normalize'
import { COMPONENT_SETS, COMPONENTS, STYLE_NODES, STYLES, VARIABLES } from './fixtures'

describe('toVariables', () => {
  const { variables, collections } = toVariables(VARIABLES, 'F1')
  const byName = (n: string) => variables.find((v) => v.name === n)!

  it('keeps local variables only, with collection, key and file', () => {
    expect(variables.map((v) => v.name).sort()).toEqual(['blue/600', 'space/inset-md', 'surface/accent', 'text/link', 'yellow/400'])
    expect(byName('surface/accent')).toMatchObject({ key: 'kaccent', collection: 'Brand UI', type: 'COLOR', description: 'Primary actions', scopes: ['ALL_FILLS'], fileKey: 'F1' })
    expect(collections).toEqual([
      { name: 'Primitives', modes: ['Value'], variables: 2, fileKey: 'F1' },
      { name: 'Brand UI', modes: ['Bridge', 'Ikea'], variables: 3, fileKey: 'F1' },
    ])
  })

  it('resolves aliases per mode into hex, naming the first hop', () => {
    expect(byName('surface/accent').values).toEqual([
      { mode: 'Bridge', value: '#0066FF', aliasOf: 'blue/600' },
      { mode: 'Ikea', value: '#FFCC0080', aliasOf: 'yellow/400' },
    ])
  })

  it('rounds numbers and admits an alias it cannot follow', () => {
    expect(byName('space/inset-md').values.map((v) => v.value)).toEqual(['12', '12.5'])
    expect(byName('text/link').values[0]).toEqual({ mode: 'Bridge', value: 'another library' })
  })

  it('shows an alias into an imported variable, or a missing mode, as another library', () => {
    const res = structuredClone(VARIABLES)
    res.meta.variables['v:accent']!.valuesByMode = { b1: { type: 'VARIABLE_ALIAS', id: 'v:remote' } }
    const accent = toVariables(res, 'F').variables.find((v) => v.name === 'surface/accent')!
    expect(accent.values.map((m) => m.value)).toEqual(['another library', 'another library'])
  })

  it('groups variants by the older containingStateGroup field too', () => {
    const comps = { meta: { components: COMPONENTS.meta.components.map((c) => ({ ...c, containing_frame: c.containing_frame && { ...c.containing_frame, containingComponentSet: undefined, containingStateGroup: c.containing_frame.containingComponentSet } })) } }
    expect(toComponents(comps, COMPONENT_SETS, 'F')[0]!.variants).toBe(2)
  })

  it('formats colours', () => {
    expect(colorHex({ r: 1, g: 1, b: 1 })).toBe('#FFFFFF')
    expect(colorHex({ r: 0, g: 0, b: 0, a: 0 })).toBe('#00000000')
  })
})

describe('toComponents', () => {
  it('groups variants under their set and keeps plain components', () => {
    const out = toComponents(COMPONENTS, COMPONENT_SETS, 'F2')
    expect(out).toEqual([
      { key: 'kbtn', nodeId: '10:1', name: 'Button', kind: 'set', description: 'Primary call to action', location: 'Components › Atoms', variants: 2, keys: ['kbtn', 'kbtn-primary', 'kbtn-secondary'], fileKey: 'F2' },
      { key: 'kdivider', nodeId: '20:1', name: 'Divider', kind: 'component', description: 'Hairline separator', location: 'Components › Atoms', variants: 1, keys: ['kdivider'], fileKey: 'F2' },
    ])
  })
})

describe('toStyles', () => {
  it('keeps text and fill styles with their node values, drops effects and grids, and names font styles', () => {
    const styles = toStyles(STYLES, STYLE_NODES, 'F')
    expect(styles.map((s) => s.name)).toEqual(['brand/accent', 'Heading/H1'])
    expect(styles[1]).toEqual({ kind: 'text', key: 'kh1', nodeId: '30:1', name: 'Heading/H1', description: 'Page titles', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontWeight: 600, fontSize: 24, lineHeight: 32, letterSpacing: -0.5, fileKey: 'F' })
    expect(styles[0]).toEqual({ kind: 'color', key: 'kaccent-style', nodeId: '30:2', name: 'brand/accent', description: '', hex: '#0066FF', fileKey: 'F' })
    expect(toStyles(STYLES, { nodes: {} }, 'F')[1]).toMatchObject({ kind: 'text', fontFamily: '', fontSize: 0, lineHeight: null })
    expect(fontStyleName(undefined, 700)).toBe('Bold')
    expect(fontStyleName('Noto Sans-ExtraBoldItalic', 800)).toBe('Extra Bold Italic')
  })
})
