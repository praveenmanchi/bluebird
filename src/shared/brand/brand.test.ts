import { describe, it, expect, beforeEach } from 'vitest'
import { tokenKeyFromVariableName, mergeTokens, toCssVariables } from './tokens'
import { applyTokens } from './apply'
import { resolveBrandTokens, toCssValue } from './resolve'
import { installFigmaMock } from '../../../tests/mocks/figma'

describe('token naming', () => {
  it('maps Figma variable names to css-safe keys', () => {
    expect(tokenKeyFromVariableName('color/brand')).toBe('color-brand')
    expect(tokenKeyFromVariableName('Color / Brand Hover')).toBe('color-brand-hover')
    expect(tokenKeyFromVariableName('radius.md')).toBe('radius-md')
  })
  it('lets resolved tokens override fallback ones', () => {
    expect(mergeTokens({ a: '1', b: '2' }, { b: '3' })).toEqual({ a: '1', b: '3' })
  })
  it('prefixes css variables and applies them to an element', () => {
    expect(toCssVariables({ 'color-brand': '#fff' })).toEqual({ '--bb-color-brand': '#fff' })
    const el = document.createElement('div')
    applyTokens({ 'radius-md': '4px' }, el)
    expect(el.style.getPropertyValue('--bb-radius-md')).toBe('4px')
  })
})

describe('toCssValue', () => {
  it('formats each variable type', () => {
    expect(toCssValue({ r: 1, g: 0, b: 0, a: 1 }, 'COLOR')).toBe('#ff0000')
    expect(toCssValue(8, 'FLOAT')).toBe('8px')
    expect(toCssValue(600, 'FLOAT', 'button/primary/font/weight')).toBe('600')
    expect(toCssValue('Noto Sans', 'STRING', 'font/family-ui')).toBe('"Noto Sans"')
    expect(toCssValue('Inter', 'STRING')).toBe('Inter')
    expect(toCssValue(true, 'BOOLEAN')).toBe('true')
    expect(toCssValue(undefined, 'COLOR')).toBeNull()
    expect(toCssValue('x', 'FLOAT')).toBeNull()
  })
})

describe('resolveBrandTokens', () => {
  const source = { id: 'bluebird', collection: 'Brand', mode: 'Bridge', fallbackTokens: { 'color-brand': '#0066ff' } }

  beforeEach(() => { installFigmaMock() })

  it('falls back when the collection is missing', async () => {
    const result = await resolveBrandTokens(source)
    expect(result.source).toBe('fallback')
    expect(result.note).toMatch(/collection "Brand" not found in this file or its enabled libraries/)
    expect(result.tokens).toEqual(source.fallbackTokens)
  })

  it('falls back when the mode is missing', async () => {
    installFigmaMock({
      variables: {
        getLocalVariableCollectionsAsync: async () => [{ name: 'Brand', modes: [{ name: 'Other', modeId: 'm1' }], variableIds: [] }],
        getVariableByIdAsync: async () => null,
      } as unknown as PluginAPI['variables'],
    })
    const result = await resolveBrandTokens(source)
    expect(result.source).toBe('fallback')
    expect(result.note).toMatch(/Mode "Bridge" not found/)
  })

  it('resolves values, follows aliases, and merges over fallback', async () => {
    const vars: Record<string, unknown> = {
      v1: { name: 'color/brand', resolvedType: 'COLOR', valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'v2' } } },
      v2: { name: 'primitive/blue', resolvedType: 'COLOR', valuesByMode: { m1: { r: 1, g: 0, b: 0, a: 1 } } },
      v3: { name: 'radius/md', resolvedType: 'FLOAT', valuesByMode: { m1: 12 } },
    }
    installFigmaMock({
      variables: {
        getLocalVariableCollectionsAsync: async () => [{ name: 'Brand', modes: [{ name: 'Bridge', modeId: 'm1' }], variableIds: ['v1', 'v3'] }],
        getVariableByIdAsync: async (id: string) => vars[id] ?? null,
      } as unknown as PluginAPI['variables'],
    })
    const result = await resolveBrandTokens(source)
    expect(result.source).toBe('figma')
    expect(result.tokens).toEqual({ 'color-brand': '#ff0000', 'radius-md': '12px' })
  })

  it('resolves from an enabled library when the file has no local copy', async () => {
    installFigmaMock({
      variables: {
        getLocalVariableCollectionsAsync: async () => [],
        getVariableByIdAsync: async () => null,
        importVariableByKeyAsync: async () => ({ id: 'r1', name: 'color/brand', resolvedType: 'COLOR', variableCollectionId: 'rc', valuesByMode: { m1: { r: 0, g: 0, b: 1, a: 1 } } }),
        getVariableCollectionByIdAsync: async () => ({ id: 'rc', name: 'Brand', modes: [{ name: 'Bridge', modeId: 'm1' }] }),
      } as unknown as PluginAPI['variables'],
      teamLibrary: {
        getAvailableLibraryVariableCollectionsAsync: async () => [{ key: 'k', name: 'Brand', libraryName: 'Plugin UI' }],
        getVariablesInLibraryCollectionAsync: async () => [{ key: 'r1', name: 'color/brand', resolvedType: 'COLOR' }],
      } as unknown as PluginAPI['teamLibrary'],
    })
    const result = await resolveBrandTokens(source)
    expect(result.source).toBe('figma')
    expect(result.tokens).toEqual({ 'color-brand': '#0000ff' })
  })

  it('falls back with the reason when the library request fails', async () => {
    installFigmaMock({
      teamLibrary: { getAvailableLibraryVariableCollectionsAsync: async () => { throw new Error('offline') } } as unknown as PluginAPI['teamLibrary'],
    })
    const result = await resolveBrandTokens(source)
    expect(result.source).toBe('fallback')
    expect(result.note).toBe('Could not read the "Brand" library collection (offline). Using fallback tokens.')
  })
})
