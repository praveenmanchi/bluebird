import { describe, it, expect } from 'vitest'
import { dualFileWith } from './testing'
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
    expect(validateIntegration('dualFile', dualFileWith(['https://figma.com/design/abc'], 'k'))['files.0.id']).toBeDefined()
    expect(validateIntegration('dualFile', dualFileWith(['JPZ7koqomjcjczGQuhIMVH'], 'k'))).toEqual({})
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

  it('needs the one token for listed files, a file for the token, and refuses empty added rows, duplicates and unknown roles', () => {
    const v = (files: Parameters<typeof dualFileWith>[0], token = '') => validateIntegration('dualFile', dualFileWith(files, token))
    expect(v([''])).toEqual({})
    expect(v(['AAA']).token).toContain('access token')
    expect(v([''], 'k')['files.0.id']).toContain('clear the token')
    expect(v(['AAA', 'BBB', { id: 'CCC', role: 'Components' }], 'k')).toEqual({})
    expect(v(['AAA', { name: 'Icons', id: '' }], 'k')['files.1.id']).toBe('Add Icons’s URL, or remove it')
    expect(v(['AAA', 'AAA'], 'k')['files.1.id']).toContain('already listed')
    expect(v([{ id: 'AAA', role: 'Icons' }], 'k')['files.0.role']).toContain('Variables + Components')
    expect(v(['https://x'], 'k')['files.0.id']).toContain('figma.com/design')
    expect(v([{ id: 'AAA', name: 'x'.repeat(61) }], 'k')['files.0.name']).toContain('60')
    expect(v(['AAA'], 'figd_ab c').token).toContain('Paste it again')
    expect(v(['AAA', 'BBB', 'CCC', 'DDD'], 'k').files).toContain('Up to 3')
  })

  it('only accepts the offered models', () => {
    expect(validateIntegration('ai', { ...DEFAULT_INTEGRATIONS.ai, openaiModel: 'gpt-2' }).openaiModel).toContain('gpt-4o')
    expect(validateIntegration('ai', { ...DEFAULT_INTEGRATIONS.ai, provider: 'Mistral' }).provider).toContain('Claude, OpenAI, Gemini')
  })
})
