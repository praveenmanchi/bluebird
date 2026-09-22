import { describe, it, expect } from 'vitest'
import { loadConfig, resolvePersonas, ConfigError } from './load'

const valid = {
  brand: { active: 'bluebird', brands: { bluebird: { label: 'Bluebird', accessCodeHash: 'a'.repeat(64), source: { collection: 'Brand', mode: 'Bluebird' }, fallbackTokens: { 'color-brand': '#0066ff' } } } },
  activePersona: 'product-designer',
  personas: {
    'product-designer': { label: 'Product Designer', tabs: ['a11y', 'off'] },
    'design-system': { label: 'Design System', tabs: [] },
  },
  tabs: {
    a11y: { enabled: true, label: 'Accessibility', icon: 'eye' },
    off: { enabled: false, label: 'Disabled' },
  },
}

describe('loadConfig', () => {
  it('accepts a valid config and applies defaults', () => {
    const config = loadConfig(valid)
    expect(config.window).toEqual({ width: 480, height: 640 })
    expect(config.tabs.off?.icon).toBe('circle')
  })

  it('rejects an unknown active brand', () => {
    expect(() => loadConfig({ ...valid, brand: { ...valid.brand, active: 'nope' } })).toThrow(ConfigError)
  })

  it('rejects two brands sharing an access code', () => {
    const dup = { ...valid, brand: { active: 'bluebird', brands: { bluebird: valid.brand.brands.bluebird, other: { ...valid.brand.brands.bluebird, label: 'Other' } } } }
    expect(() => loadConfig(dup)).toThrow(/share the same access code/)
  })

  it('rejects an unknown active persona', () => {
    expect(() => loadConfig({ ...valid, activePersona: 'ghost' })).toThrow(/activePersona "ghost"/)
  })

  it('rejects a persona referencing an unknown tab', () => {
    const bad = { ...valid, personas: { ...valid.personas, 'product-designer': { label: 'PD', tabs: ['missing'] } } }
    expect(() => loadConfig(bad)).toThrow(/unknown tab "missing"/)
  })

  it('rejects duplicate tabs in a persona', () => {
    const bad = { ...valid, personas: { ...valid.personas, 'product-designer': { label: 'PD', tabs: ['a11y', 'a11y'] } } }
    expect(() => loadConfig(bad)).toThrow(/more than once/)
  })

  it('rejects malformed ids and reports the path', () => {
    expect(() => loadConfig({ ...valid, tabs: { 'Bad Id': { label: 'x' } } })).toThrow(/tabs\.Bad Id/)
  })
})

describe('resolvePersonas', () => {
  it('drops disabled tabs and personas with no enabled tabs', () => {
    const personas = resolvePersonas(loadConfig(valid))
    expect(personas).toHaveLength(1)
    expect(personas[0]?.id).toBe('product-designer')
    expect(personas[0]?.tabs.map((t) => t.id)).toEqual(['a11y'])
  })
})
