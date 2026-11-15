import { describe, it, expect } from 'vitest'
import { LOGOS } from '../../shared/ui/BrandLogo/generated.active'
import { DEFAULT_INTEGRATIONS, MCP_SCENARIOS, MCP_SCENARIO_LABEL, SECRET_FIELDS } from '@shared/integrations'
import { SECTIONS, flatFields, sectionFieldKeys, type GroupSpec } from './sections'

const spec = (id: string) => SECTIONS.find((s) => s.id === id)!

describe('Settings sections', () => {
  it('gives every section a logo that ships in the plugin bundle', () => {
    for (const spec of SECTIONS) {
      expect(spec.logo, spec.id).toBeDefined()
      expect(LOGOS[spec.logo!], `${spec.id} → ${spec.logo}`).toBeDefined()
    }
  })
  it('uses the Figma "Settings brands" artwork for the sections added on 2026-11-14', () => {
    const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s.logo]))
    expect(byId).toMatchObject({ storage: 'database', dualFile: 'dual-file', ai: 'ai', mcp: 'mcp', jira: 'jira' })
  })
})

describe('sectionFieldKeys', () => {
  it('lists every stored key of each section once, the keys inside groups included', () => {
    for (const section of SECTIONS) {
      const keys = sectionFieldKeys(section)
      expect([...keys].sort(), section.id).toEqual(Object.keys(DEFAULT_INTEGRATIONS[section.id]).sort())
      expect(new Set(keys).size, section.id).toBe(keys.length)
    }
  })

  it('gives the MCP section its switch, then each scenario’s keys, then the shared Enterprise URL', () => {
    expect(sectionFieldKeys(spec('mcp'))).toEqual([
      'enabled',
      'componentRepo', 'componentBranch', 'componentToken', 'componentFramework', 'componentFolder',
      'screenRepo', 'screenBranch', 'screenToken', 'screenFramework', 'screenFolder', 'screenPackage',
      'libraryRepo', 'libraryBranch', 'libraryToken', 'libraryPullRequests',
      'enterpriseUrl',
    ])
  })
})

describe('MCP + code sync section', () => {
  const groups = spec('mcp').blocks.filter((block): block is GroupSpec => !Array.isArray(block) && (block as GroupSpec).kind === 'group')

  it('has one group per scenario, set up by its own repository and token', () => {
    expect(groups.map((g) => [g.id, g.title, g.requires])).toEqual(MCP_SCENARIOS.map((s) => [s, MCP_SCENARIO_LABEL[s], [`${s}Repo`, `${s}Token`]]))
    expect(spec('mcp').blocks.at(-1)).toMatchObject({ kind: 'text', key: 'enterpriseUrl' })
  })

  it('does not nest groups, and masks every token', () => {
    for (const group of groups) expect((group.blocks as readonly unknown[]).flat(2).map((f) => (f as { kind: string }).kind), group.id).not.toContain('group')
    const secret = flatFields(spec('mcp').blocks).flatMap((f) => (f.kind === 'text' && f.secret ? [f.key] : []))
    expect(secret).toEqual(SECRET_FIELDS.mcp)
  })
})
