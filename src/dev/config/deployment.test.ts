import { describe, it, expect } from 'vitest'
import { loadConfig } from '@shared/config'
import { hashAccessCode } from '@shared/session'
import { deployDraftFrom, deployLabel, deployPatchFor, packageCommand, pluginIdError, withBrand } from './deployment'

const config = (deploy?: unknown) => loadConfig({
  brand: { active: 'ikea', brands: {
    ikea: { label: 'Ikea', accessCodeHash: hashAccessCode('IKEA'), source: { collection: 'Brand UI', mode: 'Ikea' } },
    gap: { label: 'Gap Inc.', accessCodeHash: hashAccessCode('GAP'), source: { collection: 'Brand UI', mode: 'Gap' }, figmaPlugin: { id: '1234567890123', name: 'Gap Studio' } },
  } },
  activePersona: 'p', personas: { p: { label: 'P', tabs: [] } }, tabs: {},
  ...(deploy ? { deploy } : {}),
})

describe('deployment draft', () => {
  it('starts from the config: multi-brand on the first brand, or the locked brand with its plugin', () => {
    expect(deployDraftFrom(config())).toEqual({ mode: 'multi', brand: 'ikea', pluginId: '', pluginName: '' })
    expect(deployDraftFrom(config({ mode: 'single', brand: 'gap' }))).toEqual({ mode: 'single', brand: 'gap', pluginId: '1234567890123', pluginName: 'Gap Studio' })
  })

  it('brings the picked brand’s own plugin id and name along', () => {
    const draft = deployDraftFrom(config())
    expect(withBrand(config(), { ...draft, mode: 'single' }, 'gap')).toEqual({ mode: 'single', brand: 'gap', pluginId: '1234567890123', pluginName: 'Gap Studio' })
    expect(withBrand(config(), { ...draft, mode: 'single', pluginId: '99' }, 'ikea')).toMatchObject({ pluginId: '' })
  })

  it('turns into the dev server patch', () => {
    expect(deployPatchFor({ mode: 'multi', brand: 'gap', pluginId: '1', pluginName: '' })).toEqual({ deploy: { mode: 'multi' } })
    expect(deployPatchFor({ mode: 'single', brand: 'gap', pluginId: ' 1234567890123 ', pluginName: '' })).toEqual({ deploy: { mode: 'single', brand: 'gap' }, figmaPlugin: { gap: { id: '1234567890123' } } })
    expect(deployPatchFor({ mode: 'single', brand: 'gap', pluginId: '', pluginName: '' })).toEqual({ deploy: { mode: 'single', brand: 'gap' }, figmaPlugin: { gap: null } })
  })

  it('labels the header button and the terminal command', () => {
    expect(deployLabel(config())).toBe('Multi-brand')
    expect(deployLabel(config({ mode: 'single', brand: 'gap' }))).toBe('Gap Inc. only')
    expect(packageCommand({ mode: 'single', brand: 'gap', pluginId: '', pluginName: '' })).toBe('BB_DEPLOY=gap npm run package')
    expect(packageCommand({ mode: 'multi', brand: 'gap', pluginId: '', pluginName: '' })).toBe('npm run package')
  })

  it('accepts an empty or numeric plugin id only', () => {
    expect(pluginIdError('')).toBeNull()
    expect(pluginIdError(' 1686669081925353511 ')).toBeNull()
    expect(pluginIdError('my-plugin')).toMatch(/long number/)
  })
})
