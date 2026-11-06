import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyBrandPatch, ConfigPatchError, formatConfig } from '../../tools/dev-config/config-api'
import { ConfigError } from '../../src/shared/config/load'

// jsdom gives import.meta.url an http: scheme; vitest runs from the repo root.
const CONFIG = resolve(process.cwd(), 'plugin.config.json')
const raw = () => JSON.parse(readFileSync(CONFIG, 'utf8')) as {
  brand: { brands: Record<string, Record<string, unknown>> }
} & Record<string, unknown>

describe('applyBrandPatch', () => {
  it('writes tabs and managed sections for one brand and keeps everything else', () => {
    const before = raw()
    const next = applyBrandPatch(before, { ikea: { tabs: [{ id: 'jira', enabled: true }, { id: 'a11y', enabled: false }], integrations: { github: { repo: 'ikea/tokens' } } } })
    expect(next.brand.brands.ikea).toMatchObject({ label: 'Ikea', accessCodeHash: before.brand.brands.ikea!.accessCodeHash, tabs: [{ id: 'jira', enabled: true }, { id: 'a11y', enabled: false }], integrations: { github: { repo: 'ikea/tokens' } } })
    expect(next.brand.brands.bridge).toEqual(before.brand.brands.bridge)
    expect(next.tabs).toEqual(before.tabs)
    expect(before.brand.brands.ikea!.tabs).toBeUndefined()
  })

  it('clears an override with null and drops sections left empty', () => {
    const once = applyBrandPatch(raw(), { disney: { tabs: [{ id: 'mcp', enabled: true }], integrations: { storybook: { baseUrl: 'https://sb.example.com' } } } })
    const cleared = applyBrandPatch(once, { disney: { tabs: null, integrations: { storybook: {} } } })
    expect(cleared.brand.brands.disney).not.toHaveProperty('tabs')
    expect(cleared.brand.brands.disney).not.toHaveProperty('integrations')
  })

  it('writes and clears a brand’s persona features, and refuses ones the config doesn’t have', () => {
    const once = applyBrandPatch(raw(), { ikea: { personas: { content: ['a11y', 'jira'] } } })
    expect(once.brand.brands.ikea).toMatchObject({ personas: { content: ['a11y', 'jira'] } })
    expect(applyBrandPatch(once, { ikea: { personas: null } }).brand.brands.ikea).not.toHaveProperty('personas')
    expect(() => applyBrandPatch(raw(), { ikea: { personas: { content: 'all' } } })).toThrow(/malformed/)
    expect(() => applyBrandPatch(raw(), { ikea: { personas: { ghost: ['a11y'] } } })).toThrow(ConfigError)
  })

  it('refuses an unknown brand, a malformed patch, a key and a tab the config doesn’t have', () => {
    expect(() => applyBrandPatch(raw(), { nope: { tabs: null } })).toThrow(ConfigPatchError)
    expect(() => applyBrandPatch(raw(), { ikea: { tabs: 'all' } })).toThrow(/malformed/)
    expect(() => applyBrandPatch(raw(), { ikea: { integrations: { github: { apiKey: 'ghp_x' } } } })).toThrow(/keys and tokens/)
    expect(() => applyBrandPatch(raw(), { ikea: { tabs: [{ id: 'ghost', enabled: true }] } })).toThrow(ConfigError)
    expect(() => applyBrandPatch({}, {})).toThrow(/no brand.brands/)
    expect(() => applyBrandPatch(raw(), { constructor: { tabs: null } })).toThrow(ConfigPatchError)
  })

  it('formats like the hand-edited file', () => {
    expect(formatConfig({ a: 1 })).toBe('{\n  "a": 1\n}\n')
    expect(formatConfig(raw())).toBe(readFileSync(CONFIG, 'utf8'))
  })
})
