import { describe, it, expect } from 'vitest'
import { loadConfig, resolvePersonas, brandTabRows, singleBrand, ConfigError } from './load'

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

describe('brand persona features', () => {
  it('gives a persona this brand’s tabs and leaves other brands and unlisted personas on the defaults', () => {
    const config = loadConfig(withBrand({ personas: { 'design-system': ['a11y', 'jira'] } }))
    const ids = (brand?: string) => Object.fromEntries(resolvePersonas(config, brand).map((p) => [p.id, p.tabs.map((t) => t.id)]))
    expect(ids('bluebird')).toEqual({ 'product-designer': ['a11y', 'jira', 'mcp'], 'design-system': ['a11y', 'jira'] })
    expect(ids()).toEqual({ 'product-designer': ['a11y', 'jira', 'mcp'], 'design-system': ['mcp'] })
  })

  it('drops a persona the brand gives nothing, so the picker doesn’t offer it', () => {
    const config = loadConfig(withBrand({ personas: { 'design-system': [] } }))
    expect(resolvePersonas(config, 'bluebird').map((p) => p.id)).toEqual(['product-designer'])
  })

  it('still applies the brand’s tab order and hidden tabs on top', () => {
    const config = loadConfig(withBrand({ personas: { 'design-system': ['a11y', 'jira', 'mcp'] }, tabs: [{ id: 'mcp', enabled: true }, { id: 'jira', enabled: false }] }))
    expect(resolvePersonas(config, 'bluebird').find((p) => p.id === 'design-system')?.tabs.map((t) => t.id)).toEqual(['mcp', 'a11y'])
  })

  it('rejects unknown personas, unknown tabs and repeats', () => {
    expect(() => loadConfig(withBrand({ personas: { ghost: ['a11y'] } }))).toThrow(/brand "bluebird" sets unknown persona "ghost"/)
    expect(() => loadConfig(withBrand({ personas: { 'design-system': ['ghost'] } }))).toThrow(/brand "bluebird" gives persona "design-system" unknown tab "ghost"/)
    expect(() => loadConfig(withBrand({ personas: { 'design-system': ['mcp', 'mcp'] } }))).toThrow(/persona "design-system" a tab more than once/)
  })

  it('rejects a brand that leaves every persona empty', () => {
    expect(() => loadConfig(withBrand({ personas: { 'product-designer': [], 'design-system': [] } }))).toThrow(/hides every tab/)
  })

  it('shows the brand’s personas per tab on the configuration page, without personas that are off', () => {
    const spare = { ...withBrand({ personas: { 'design-system': ['a11y'] } }) }
    const config = loadConfig({ ...spare, personas: { ...spare.personas, spare: { label: 'Spare', enabled: false, tabs: ['a11y'] } } })
    const rows = new Map(brandTabRows(config, 'bluebird').map((r) => [r.id, r.personas]))
    expect(rows.get('a11y')).toEqual(['Product Designer', 'Design System'])
    expect(rows.get('mcp')).toEqual(['Product Designer'])
  })
})

describe('turning a persona off', () => {
  const twoPersonas = { ...valid, personas: { ...valid.personas, spare: { label: 'Spare', enabled: false, tabs: ['a11y'] } } }

  it('keeps it in the config but out of the resolved personas', () => {
    const config = loadConfig(twoPersonas)
    expect(config.personas.spare?.enabled).toBe(false)
    expect(resolvePersonas(config).map((p) => p.id)).not.toContain('spare')
  })

  it('refuses a default persona that is turned off', () => {
    expect(() => loadConfig({ ...twoPersonas, activePersona: 'spare' })).toThrow('activePersona "spare" is turned off')
  })
})

describe('deploy', () => {
  const noHash = { ...valid, brand: { ...valid.brand, brands: { bluebird: { label: 'Bluebird', source: { collection: 'Brand', mode: 'Bluebird' } } } } }

  it('defaults to multi-brand, where every brand needs an access code', () => {
    expect(loadConfig(valid).deploy).toEqual({ mode: 'multi' })
    expect(singleBrand(loadConfig(valid))).toBeNull()
    expect(() => loadConfig(noHash)).toThrow('brand "bluebird" has no accessCodeHash')
  })

  it('locks a single-brand config to its brand, with or without an access code', () => {
    const config = loadConfig({ ...noHash, deploy: { mode: 'single', brand: 'bluebird' } })
    expect(singleBrand(config)).toBe('bluebird')
  })

  it('refuses a single-brand config that names no brand or an unknown one', () => {
    expect(() => loadConfig({ ...valid, deploy: { mode: 'single' } })).toThrow('deploy.brand is not set')
    expect(() => loadConfig({ ...valid, deploy: { mode: 'single', brand: 'nope' } })).toThrow('deploy.brand "nope" is not defined')
    expect(() => loadConfig({ ...valid, deploy: { mode: 'solo' } })).toThrow(ConfigError)
  })

  it('checks a brand’s Figma plugin id is a plugin id', () => {
    const withPlugin = (id: string) => ({ ...valid, brand: { ...valid.brand, brands: { bluebird: { ...valid.brand.brands.bluebird, figmaPlugin: { id, name: 'Studio' } } } } })
    expect(loadConfig(withPlugin('1686669081925353511')).brand.brands.bluebird?.figmaPlugin).toEqual({ id: '1686669081925353511', name: 'Studio' })
    expect(() => loadConfig(withPlugin('abc'))).toThrow(ConfigError)
  })
})
