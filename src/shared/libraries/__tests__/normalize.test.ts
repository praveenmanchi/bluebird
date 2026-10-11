import { describe, it, expect } from 'vitest'
import { colorHex, toComponents, toVariables } from '../normalize'
import { COMPONENT_SETS, COMPONENTS, VARIABLES } from './fixtures'

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
