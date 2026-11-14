import { describe, it, expect } from 'vitest'
import { buildSettingsFile, parseSettingsObject, serializeSettingsFile, DEFAULT_INTEGRATIONS, MAX_SETTINGS_FILE_BYTES, type IntegrationSettings, type ParsedSettingsFile } from '@shared/integrations'
import { appliedMessage, describeFields, exportRows, fileMeta, readSettingsFile, sectionTitle, summarizeImport } from './settingsFileView'

const LEAD: IntegrationSettings = {
  ...DEFAULT_INTEGRATIONS,
  github: { ...DEFAULT_INTEGRATIONS.github, apiKey: 'ghp_team', repo: 'acme/design-tokens' },
  storybook: { ...DEFAULT_INTEGRATIONS.storybook, baseUrl: 'https://ds.acme.com/storybook' },
  dualFile: { ...DEFAULT_INTEGRATIONS.dualFile, token: 'figd_mine', files: [{ name: 'Core', id: 'AbC123', role: 'Variables + Components' }] },
  ai: { ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'sk-ant-team' },
}
const ALL = Object.keys(DEFAULT_INTEGRATIONS) as (keyof IntegrationSettings)[]
const exported = (includeKeys: boolean): ParsedSettingsFile => {
  const result = parseSettingsObject(JSON.parse(serializeSettingsFile(buildSettingsFile(LEAD, { sections: ['github', 'storybook', 'dualFile', 'ai'], includeKeys, brand: 'Bridge', now: new Date('2026-11-13T10:00:00Z') }))))
  if (!result.ok) throw new Error(result.message)
  return result.file
}

describe('describeFields', () => {
  it('lists the filled-in fields by their short Settings labels', () => {
    expect(describeFields('github', LEAD.github as never)).toBe('API key, Repository, Branch and 1 more')
    expect(describeFields('storybook', { baseUrl: 'https://x', linksEnabled: true })).toBe('Base URL')
    expect(describeFields('jira', { enabled: true })).toBe('Switches only')
    expect(sectionTitle('mcp')).toBe('MCP + code sync')
  })
})

describe('exportRows', () => {
  it('offers the sections that have something to share', () => {
    const rows = exportRows(LEAD, true)
    expect(rows.map((r) => r.id)).toEqual(['github', 'storage', 'notifications', 'storybook', 'zeroheight', 'dualFile', 'ai', 'mcp', 'jira'])
    const by = Object.fromEntries(rows.map((r) => [r.id, r]))
    expect(by.github).toMatchObject({ available: true, detail: 'API key, Repository, Branch and 1 more' })
    expect(by.zeroheight).toMatchObject({ available: false, detail: 'Not configured yet' })
    expect(by.jira).toMatchObject({ available: false, detail: 'Turned off' })
    expect(by.dualFile?.detail).not.toContain('API key')
  })

  it('stops listing keys once they are left out', () => {
    expect(exportRows(LEAD, false).find((r) => r.id === 'github')?.detail).toBe('Repository, Branch and Token storage location')
  })
})

describe('summarizeImport', () => {
  it('marks sections ready when the file carries their keys, and Dual File as waiting for a token', () => {
    const summary = summarizeImport(exported(true), DEFAULT_INTEGRATIONS, false)
    expect(summary).toMatchObject({ ready: 3, needsKey: 1, skipped: 0 })
    expect(summary.rows.map((r) => [r.id, r.status])).toEqual([['github', 'pass'], ['storybook', 'pass'], ['dualFile', 'warning'], ['ai', 'pass']])
    expect(summary.rows[2]?.detail).toContain('Needs your own Figma access token')
    expect(appliedMessage(summary, 'bridge-settings.json')).toBe('4 sections were set up from bridge-settings.json. 1 still needs a key from you.')
  })

  it('asks for keys when the file was exported without them', () => {
    const summary = summarizeImport(exported(false), DEFAULT_INTEGRATIONS, false)
    expect(summary.rows.filter((r) => r.status === 'warning').map((r) => r.id)).toEqual(['github', 'dualFile', 'ai'])
  })

  it('counts a Dual File section as ready when the person already has a token', () => {
    const mine = { ...DEFAULT_INTEGRATIONS, dualFile: { ...DEFAULT_INTEGRATIONS.dualFile, token: 'figd_me' } }
    expect(summarizeImport(exported(true), mine, false).needsKey).toBe(0)
  })

  it('reports sections the file has but that were left out', () => {
    const file: ParsedSettingsFile = { ...exported(true), skipped: [{ id: 'mcp', reason: 'Use the owner/repository format' }] }
    const summary = summarizeImport(file, DEFAULT_INTEGRATIONS, false)
    expect(summary.skipped).toBe(1)
    expect(summary.rows.find((r) => r.id === 'mcp')).toMatchObject({ status: 'fail', detail: 'Left out: Use the owner/repository format' })
    expect(appliedMessage(summary, 'f.json')).toContain('1 section was left out.')
  })
})

describe('fileMeta', () => {
  it('summarises where the file came from', () => {
    expect(fileMeta(exported(true))).toBe('Exported on 13 Nov 2026 · Bridge · 4 sections · API keys included')
    expect(fileMeta({ exportedAt: null, brand: null, includesKeys: false, sections: { github: {} }, skipped: [] })).toBe('1 section · no API keys')
  })
})

describe('readSettingsFile', () => {
  const file = (text: string, size = text.length) => ({ name: 'f.json', size, text: async () => text })

  it('parses a picked file and keeps the raw JSON for the store', async () => {
    const text = serializeSettingsFile(buildSettingsFile(LEAD, { sections: ALL, includeKeys: true }))
    const chosen = await readSettingsFile(file(text))
    expect(chosen.result.ok).toBe(true)
    expect(chosen.raw).toEqual(JSON.parse(text))
  })

  it('explains a file that is too large, unreadable or not a settings file', async () => {
    expect((await readSettingsFile(file('{}', MAX_SETTINGS_FILE_BYTES + 1))).result).toMatchObject({ ok: false, message: expect.stringContaining('too large') })
    expect((await readSettingsFile({ name: 'f.json', size: 2, text: async () => { throw new Error('gone') } })).result).toMatchObject({ ok: false, message: expect.stringContaining('couldn’t be read') })
    const notes = await readSettingsFile(file('{"notes":1}'))
    expect(notes).toMatchObject({ raw: null, result: { ok: false } })
  })
})
