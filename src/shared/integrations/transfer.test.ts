import { describe, it, expect } from 'vitest'
import { dualFileWith } from './testing'
import { DEFAULT_INTEGRATIONS, type IntegrationSettings } from './schema'
import {
  applySettingsFile, blockingErrors, buildSettingsFile, parseSettingsFile, parseSettingsObject, serializeSettingsFile, settingsFileName,
  MAX_SETTINGS_FILE_BYTES, NOT_A_SETTINGS_FILE, SETTINGS_FILE_KIND,
} from './transfer'

const CONFIGURED: IntegrationSettings = {
  ...DEFAULT_INTEGRATIONS,
  github: { ...DEFAULT_INTEGRATIONS.github, apiKey: 'ghp_team', repo: 'acme/design-tokens' },
  notifications: { designSystemWebhook: 'https://prod.logic.azure.com/workflows/a?sig=1', devTeamWebhook: '', outlookWebhook: '', emails: 'ds@acme.com' },
  storybook: { ...DEFAULT_INTEGRATIONS.storybook, baseUrl: 'https://ds.acme.com/storybook' },
  dualFile: dualFileWith([{ id: 'AbC123', name: 'Core' }, { id: 'Zz9', role: 'Components' }], 'figd_mine'),
  ai: { ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'sk-ant-team', instructions: 'Use sentence case.' },
}
const ALL = Object.keys(DEFAULT_INTEGRATIONS) as (keyof IntegrationSettings)[]
const NOW = new Date('2026-11-13T10:00:00.000Z')

describe('buildSettingsFile', () => {
  it('never writes a sign-in, even with keys included', () => {
    const signedIn: IntegrationSettings = {
      ...CONFIGURED,
      github: { ...CONFIGURED.github, method: 'signin', apiKey: 'gho_maria', signinAccount: '@maria-r', signinExpires: '2026-12-01T00:00:00Z', gatewayUrl: 'https://gw.acme.internal' },
    }
    const github = buildSettingsFile(signedIn, { sections: ALL, includeKeys: true, now: NOW }).sections.github!
    expect(github).not.toHaveProperty('apiKey')
    expect(github).not.toHaveProperty('signinAccount')
    expect(github).not.toHaveProperty('signinExpires')
    // How the team connects, and where its gateway is, are shared.
    expect(github).toMatchObject({ method: 'signin', gatewayUrl: 'https://gw.acme.internal' })
  })

  it('includes the shared keys but never a personal Figma token', () => {
    const file = buildSettingsFile(CONFIGURED, { sections: ALL, includeKeys: true, brand: 'Bridge', now: NOW })
    expect(file).toMatchObject({ kind: SETTINGS_FILE_KIND, version: 1, exportedAt: NOW.toISOString(), brand: 'Bridge', includesKeys: true })
    expect(file.sections.github).toMatchObject({ apiKey: 'ghp_team', repo: 'acme/design-tokens' })
    expect(file.sections.ai).toMatchObject({ claudeKey: 'sk-ant-team' })
    expect(file.sections.dualFile).not.toHaveProperty('token')
    expect(file.sections.dualFile).toMatchObject({ files: [{ name: 'Core', id: 'AbC123', role: 'Variables + Components' }, { name: 'File 2', id: 'Zz9', role: 'Components' }] })
    expect(serializeSettingsFile(file)).not.toContain('figd_')
  })

  it('leaves every key and signed webhook out when keys are off', () => {
    const text = serializeSettingsFile(buildSettingsFile(CONFIGURED, { sections: ALL, includeKeys: false, now: NOW }))
    for (const secret of ['ghp_team', 'sk-ant-team', 'figd_', 'sig=1']) expect(text).not.toContain(secret)
    expect(JSON.parse(text).sections.notifications).toEqual({ emails: 'ds@acme.com' })
    expect(JSON.parse(text).sections.github.repo).toBe('acme/design-tokens')
  })

  it('writes only the chosen sections', () => {
    const file = buildSettingsFile(CONFIGURED, { sections: ['storybook'], includeKeys: true, now: NOW })
    expect(Object.keys(file.sections)).toEqual(['storybook'])
  })
})

describe('settingsFileName', () => {
  it('names the file after the brand', () => {
    expect(settingsFileName('bridge')).toBe('bridge-settings.json')
    expect(settingsFileName('../Gap Inc')).toBe('gap-inc-settings.json')
    expect(settingsFileName(null)).toBe('design-studio-settings.json')
  })
})

describe('parseSettingsFile', () => {
  const exported = (includeKeys = true) => serializeSettingsFile(buildSettingsFile(CONFIGURED, { sections: ALL, includeKeys, brand: 'Bridge', now: NOW }))

  it('reads back what was exported', () => {
    const result = parseSettingsFile(exported())
    if (!result.ok) throw new Error(result.message)
    expect(result.file).toMatchObject({ brand: 'Bridge', includesKeys: true, exportedAt: NOW.toISOString(), skipped: [] })
    expect(result.file.sections.github).toMatchObject({ apiKey: 'ghp_team', repo: 'acme/design-tokens' })
    expect(result.file.sections.dualFile).toMatchObject({ files: [expect.objectContaining({ id: 'AbC123' }), expect.objectContaining({ id: 'Zz9' })] })
  })

  it('rejects anything that is not a settings file', () => {
    expect(parseSettingsFile('not json')).toEqual({ ok: false, message: 'The file isn’t valid JSON, so nothing was changed.' })
    expect(parseSettingsFile('{"notes":"hello"}')).toEqual({ ok: false, message: NOT_A_SETTINGS_FILE })
    expect(parseSettingsFile('[]')).toEqual({ ok: false, message: NOT_A_SETTINGS_FILE })
    expect(parseSettingsFile(' '.repeat(MAX_SETTINGS_FILE_BYTES + 1)).ok).toBe(false)
    expect(parseSettingsObject({ kind: SETTINGS_FILE_KIND, version: 1, sections: {} }).ok).toBe(false)
    expect(parseSettingsObject({ kind: SETTINGS_FILE_KIND, version: 2, sections: { github: {} } })).toMatchObject({ ok: false, message: expect.stringContaining('newer version') })
  })

  it('skips a section whose values break a field rule, and keeps the rest', () => {
    const result = parseSettingsObject({
      kind: SETTINGS_FILE_KIND, version: 1,
      sections: { github: { repo: 'acme/tokens', baseUrl: 'http://evil.example.com' }, storybook: { baseUrl: 'https://ds.acme.com' }, jira: 'nope', mcp: { componentRepo: 12 } },
    })
    if (!result.ok) throw new Error(result.message)
    expect(Object.keys(result.file.sections)).toEqual(['storybook'])
    expect(result.file.skipped.map((s) => s.id)).toEqual(['github', 'mcp', 'jira'])
    expect(result.file.skipped[0]?.reason).toContain('https://')
  })

  it('reads an MCP section exported before one repository per scenario: it becomes the Component repository', () => {
    const result = parseSettingsObject({ kind: SETTINGS_FILE_KIND, version: 1, sections: { mcp: { enabled: true, repo: 'acme/storybook', baseBranch: 'develop', token: 'ghp_secret' } } })
    if (!result.ok) throw new Error(result.message)
    expect(result.file.skipped).toEqual([])
    // The repository token is a team key (like GitHub's), so a file exported with keys still carries it.
    expect(result.file.sections.mcp).toMatchObject({ componentRepo: 'acme/storybook', componentBranch: 'develop', componentToken: 'ghp_secret' })
    expect(result.file.sections.mcp).not.toHaveProperty('repo')
  })

  it('drops unknown fields, unknown sections and any personal token in the file', () => {
    const result = parseSettingsObject({
      kind: SETTINGS_FILE_KIND, version: 1,
      sections: { dualFile: { token: 'figd_theirs', __proto__: { x: 1 }, extra: true, files: [{ name: 'Core', id: 'AbC123', role: 'Variables' }] }, madeUp: { a: 1 } },
    })
    if (!result.ok) throw new Error(result.message)
    expect(result.file.sections).toEqual({ dualFile: { files: [{ name: 'Core', id: 'AbC123', role: 'Variables' }] } })
  })

  it('reads a file exported before one token + named files: File 1 / File 2 / extra files become the list, keys stay out', () => {
    const result = parseSettingsObject({
      kind: SETTINGS_FILE_KIND, version: 1,
      sections: { dualFile: { enabled: true, file1Id: 'AbC123', file1Role: 'Variables', file2Id: 'Cmp9', file2Role: 'Components', extraFiles: [{ id: 'Ico1', role: 'Components', key: '' }] } },
    })
    if (!result.ok) throw new Error(result.message)
    expect(result.file.sections.dualFile).toEqual({ enabled: true, files: [
      { name: 'File 1', id: 'AbC123', role: 'Variables' }, { name: 'File 2', id: 'Cmp9', role: 'Components' }, { name: 'File 3', id: 'Ico1', role: 'Components' },
    ] })
  })
})

describe('blockingErrors', () => {
  it('lets Dual File files through without the token, but not a malformed ID', () => {
    expect(blockingErrors('dualFile', dualFileWith(['AbC123']))).toEqual([])
    expect(blockingErrors('dualFile', dualFileWith(['not an id']))).toHaveLength(1)
  })
})

describe('applySettingsFile', () => {
  const mine: IntegrationSettings = {
    ...DEFAULT_INTEGRATIONS,
    github: { ...DEFAULT_INTEGRATIONS.github, repo: 'me/fork', branch: 'develop' },
    dualFile: dualFileWith(['Zz9'], 'figd_mine'),
    jira: { ...DEFAULT_INTEGRATIONS.jira, projectKey: 'DS' },
  }
  const sections = {
    github: { apiKey: 'ghp_team', repo: 'acme/design-tokens', branch: 'main', diffComparison: false },
    dualFile: { files: [{ name: 'Core', id: 'AbC123', role: 'Variables' }, { name: 'Icons', id: 'New1', role: 'Components' }] },
  }

  it('replaces what the file contains and leaves other sections alone', () => {
    const next = applySettingsFile(mine, sections, { keepExisting: false })
    expect(next.github).toMatchObject({ apiKey: 'ghp_team', repo: 'acme/design-tokens', branch: 'main', diffComparison: false, tokenPath: 'tokens.json' })
    expect(next.jira).toEqual(mine.jira)
    expect(mine.github.repo).toBe('me/fork')
  })

  it('takes the team’s files and keeps the person’s own Figma token', () => {
    const next = applySettingsFile(mine, sections, { keepExisting: false })
    expect(next.dualFile).toEqual({ enabled: true, token: 'figd_mine', files: sections.dualFile.files })
  })

  it('fills a Dual File list that has no file yet, even when keeping existing values', () => {
    const empty = { ...mine, dualFile: DEFAULT_INTEGRATIONS.dualFile }
    expect(applySettingsFile(empty, sections, { keepExisting: true }).dualFile.files).toEqual(sections.dualFile.files)
  })

  it('only fills empty or default fields when keeping existing values', () => {
    const next = applySettingsFile(mine, sections, { keepExisting: true })
    expect(next.github).toMatchObject({ apiKey: 'ghp_team', repo: 'me/fork', branch: 'develop', diffComparison: false })
    expect(next.dualFile.files).toEqual(mine.dualFile.files)
  })

  it('never changes a field the brand manages', () => {
    const next = applySettingsFile(mine, sections, { keepExisting: false, locked: { github: ['repo'] } })
    expect(next.github).toMatchObject({ repo: 'me/fork', apiKey: 'ghp_team' })
  })
})
