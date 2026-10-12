import { describe, it, expect } from 'vitest'
import { loadConfig, resolvePersonas, brandTabRows, ConfigError } from './load'

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

const twoTabs = {
  ...valid,
  personas: { 'product-designer': { label: 'Product Designer', tabs: ['a11y', 'jira', 'mcp'] }, 'design-system': { label: 'Design System', tabs: ['mcp'] } },
  tabs: { a11y: { label: 'Accessibility' }, jira: { label: 'Jira' }, mcp: { label: 'MCP' }, off: { enabled: false, label: 'Disabled' } },
}
const withBrand = (extra: object) => ({ ...twoTabs, brand: { active: 'bluebird', brands: { bluebird: { ...valid.brand.brands.bluebird, ...extra } } } })

describe('brand overrides', () => {
  it('reorders and hides tabs for that brand only; unlisted tabs follow in persona order', () => {
    const config = loadConfig(withBrand({ tabs: [{ id: 'mcp', enabled: true }, { id: 'jira', enabled: false }] }))
    expect(resolvePersonas(config, 'bluebird')[0]?.tabs.map((t) => t.id)).toEqual(['mcp', 'a11y'])
    expect(resolvePersonas(config)[0]?.tabs.map((t) => t.id)).toEqual(['a11y', 'jira', 'mcp'])
  })

  it('drops a persona whose tabs this brand turns off', () => {
    const config = loadConfig(withBrand({ tabs: [{ id: 'mcp', enabled: false }] }))
    expect(resolvePersonas(config, 'bluebird').map((p) => p.id)).toEqual(['product-designer'])
  })

  it('keeps a globally disabled tab off whatever the brand says', () => {
    const config = loadConfig(withBrand({ tabs: [{ id: 'off', enabled: true }] }))
    expect(resolvePersonas(config, 'bluebird')[0]?.tabs.map((t) => t.id)).not.toContain('off')
  })

  it('rejects a brand that hides every tab', () => {
    expect(() => loadConfig(withBrand({ tabs: [{ id: 'a11y', enabled: false }, { id: 'jira', enabled: false }, { id: 'mcp', enabled: false }] }))).toThrow(/hides every tab/)
  })

  it('treats Power Automate webhook URLs as secrets', () => {
    expect(() => loadConfig(withBrand({ integrations: { notifications: { designSystemWebhook: 'https://prod.logic.azure.com/x?sig=abc' } } }))).toThrow(/notifications\.designSystemWebhook/)
  })

  it('rejects unknown or repeated tabs in a brand list', () => {
    expect(() => loadConfig(withBrand({ tabs: [{ id: 'ghost', enabled: true }] }))).toThrow(/brand "bluebird" lists unknown tab "ghost"/)
    expect(() => loadConfig(withBrand({ tabs: [{ id: 'mcp', enabled: true }, { id: 'mcp', enabled: false }] }))).toThrow(/more than once/)
  })

  it('accepts managed Settings without keys and rejects keys, tokens and unknown sections', () => {
    expect(loadConfig(withBrand({ integrations: { github: { repo: 'org/tokens', branch: 'main' } } })).brand.brands.bluebird?.integrations?.github?.repo).toBe('org/tokens')
    expect(() => loadConfig(withBrand({ integrations: { github: { apiKey: 'ghp_secret' } } }))).toThrow(/integrations\.github\.apiKey: keys and tokens are entered in the plugin/)
    expect(() => loadConfig(withBrand({ integrations: { slack: {} } }))).toThrow(ConfigError)
  })

  it('lists every tab in the brand order for the configuration page, with availability and personas', () => {
    const rows = brandTabRows(loadConfig(withBrand({ tabs: [{ id: 'mcp', enabled: false }] })), 'bluebird')
    expect(rows.map((r) => [r.id, r.enabled, r.available])).toEqual([['mcp', false, true], ['a11y', true, true], ['jira', true, true], ['off', true, false]])
    expect(rows[0]?.personas).toEqual(['Product Designer', 'Design System'])
  })
})

