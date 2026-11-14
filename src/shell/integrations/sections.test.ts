import { describe, it, expect } from 'vitest'
import { LOGOS } from '../../shared/ui/BrandLogo/generated.active'
import { SECTIONS } from './sections'

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
