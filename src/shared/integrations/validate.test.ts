import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from './schema'
import { validateIntegration } from './validate'

describe('validateIntegration', () => {
  it('accepts empty optional fields', () => {
    for (const id of Object.keys(DEFAULT_INTEGRATIONS) as (keyof typeof DEFAULT_INTEGRATIONS)[]) {
      expect(validateIntegration(id, DEFAULT_INTEGRATIONS[id])).toEqual({})
    }
  })

  it('checks URLs, owner/repo and email lists', () => {
    expect(validateIntegration('github', { ...DEFAULT_INTEGRATIONS.github, repo: 'gap-inc/design-tokens', baseUrl: 'https://github.company.com' })).toEqual({})
    expect(validateIntegration('github', { ...DEFAULT_INTEGRATIONS.github, repo: 'design-tokens', baseUrl: 'github.company.com' })).toEqual({
      repo: expect.stringContaining('owner/repository'),
      baseUrl: expect.stringContaining('https://'),
    })
    expect(validateIntegration('notifications', { ...DEFAULT_INTEGRATIONS.notifications, emails: 'a@x.com, b@y.org' })).toEqual({})
    expect(validateIntegration('notifications', { ...DEFAULT_INTEGRATIONS.notifications, emails: 'a@x.com; b' }).emails).toBeDefined()
  })

  it('checks the Storybook template, Figma file IDs, the MCP output format and branch template, and the Jira key', () => {
    expect(validateIntegration('storybook', { ...DEFAULT_INTEGRATIONS.storybook, storyPathTemplate: '?path=/story/x' }).storyPathTemplate).toMatch('{slug}')
    expect(validateIntegration('dualFile', { ...DEFAULT_INTEGRATIONS.dualFile, file1Id: 'https://figma.com/design/abc', file1Key: 'k' }).file1Id).toBeDefined()
    expect(validateIntegration('dualFile', { ...DEFAULT_INTEGRATIONS.dualFile, file1Id: 'JPZ7koqomjcjczGQuhIMVH', file1Key: 'k' })).toEqual({})
    expect(validateIntegration('mcp', { ...DEFAULT_INTEGRATIONS.mcp, outputFormat: 'yaml', branchTemplate: 'ds/token update' })).toEqual({
      outputFormat: expect.stringContaining('style-dictionary'),
      branchTemplate: expect.stringContaining('spaces'),
    })
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, projectKey: 'ds' }).projectKey).toBeDefined()
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, projectKey: 'DS', email: 'user@company.com', siteUrl: 'https://team.atlassian.net' })).toEqual({})
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, proxyUrl: 'http://localhost:8787' })).toEqual({})
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, proxyUrl: 'http://proxy.acme.com' }).proxyUrl).toBeDefined()
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, proxyUrl: 'https://proxy.acme.com' }).proxyUrl).toBeDefined()
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, siteUrl: 'https://evil.example.com' }).siteUrl).toBeDefined()
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, siteUrl: 'http://team.atlassian.net' }).siteUrl).toBeDefined()
  })

  it('requires https (http only on localhost), no credentials, and no dot-only repo segments', () => {
    const gh = DEFAULT_INTEGRATIONS.github
    expect(validateIntegration('github', { ...gh, baseUrl: 'http://github.company.com' }).baseUrl).toBeDefined()
    expect(validateIntegration('github', { ...gh, baseUrl: 'https://user:pw@github.company.com' }).baseUrl).toBeDefined()
    expect(validateIntegration('github', { ...gh, baseUrl: 'http://localhost:3000' })).toEqual({})
    expect(validateIntegration('github', { ...gh, repo: '../..' }).repo).toBeDefined()
    expect(validateIntegration('github', { ...gh, repo: 'gap-inc/..' }).repo).toBeDefined()
    expect(validateIntegration('github', { ...gh, repo: 'gap-inc/.github' })).toEqual({})
  })

  it('pairs each Dual File ID with a key, lets File 2 borrow File 1’s key, and refuses one file in both slots', () => {
    const df = { ...DEFAULT_INTEGRATIONS.dualFile }
    expect(validateIntegration('dualFile', { ...df, file1Id: 'AAA' }).file1Key).toBeDefined()
    expect(validateIntegration('dualFile', { ...df, file1Key: 'k' }).file1Id).toBeDefined()
    expect(validateIntegration('dualFile', { ...df, file2Id: 'BBB' }).file2Key).toBeDefined()
    expect(validateIntegration('dualFile', { ...df, file1Id: 'AAA', file1Key: 'k', file2Id: 'BBB' })).toEqual({})
    expect(validateIntegration('dualFile', { ...df, file2Key: 'k' }).file2Id).toBeDefined()
    expect(validateIntegration('dualFile', { ...df, file1Id: 'AAA', file1Key: 'k', file2Id: 'AAA' }).file2Id).toContain('Variables + Components')
    expect(validateIntegration('dualFile', { ...df, file1Role: 'Icons' }).file1Role).toContain('Variables + Components')
    expect(validateIntegration('dualFile', { ...df, file1Id: 'AAA', file1Key: 'figd_ab c' }).file1Key).toContain('Paste it again')
    expect(validateIntegration('dualFile', { ...df, file1Id: 'AAA', file1Key: 'figd_“x”' }).file1Key).toBeDefined()
    const extra = (rows: { id: string; key: string; role: string }[]) => validateIntegration('dualFile', { ...df, file1Id: 'AAA', file1Key: 'k', extraFiles: rows })
    expect(extra([{ id: 'CCC', key: '', role: 'Components' }])).toEqual({})
    expect(extra([{ id: 'https://x', key: 't', role: 'Components' }])['extraFiles.0.id']).toContain('figma.com/design')
    expect(extra([{ id: '', key: 't', role: 'Components' }])['extraFiles.0.id']).toContain('File 3')
    expect(extra([{ id: 'AAA', key: '', role: 'Components' }])['extraFiles.0.id']).toContain('already listed')
    expect(extra([{ id: 'CCC', key: '', role: 'Icons' }])['extraFiles.0.role']).toContain('Variables + Components')
    expect(validateIntegration('dualFile', { ...df, extraFiles: [{ id: 'CCC', key: '', role: 'Components' }] })['extraFiles.0.key']).toContain('File 3')
  })

  it('only accepts the offered models', () => {
    expect(validateIntegration('ai', { ...DEFAULT_INTEGRATIONS.ai, openaiModel: 'gpt-2' }).openaiModel).toContain('gpt-4o')
    expect(validateIntegration('ai', { ...DEFAULT_INTEGRATIONS.ai, provider: 'Mistral' }).provider).toContain('Claude, OpenAI, Gemini')
  })
})
