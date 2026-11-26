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

  it('checks the Storybook template, Figma file IDs and the Jira key', () => {
    expect(validateIntegration('storybook', { ...DEFAULT_INTEGRATIONS.storybook, storyPathTemplate: '?path=/story/x' }).storyPathTemplate).toMatch('{slug}')
    expect(validateIntegration('dualFile', dualFileWith(['https://figma.com/design/abc'], 'k'))['files.0.id']).toBeDefined()
    expect(validateIntegration('dualFile', dualFileWith(['JPZ7koqomjcjczGQuhIMVH'], 'k'))).toEqual({})
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, projectKey: 'ds' }).projectKey).toBeDefined()
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, projectKey: 'DS', email: 'user@company.com', siteUrl: 'https://team.atlassian.net' })).toEqual({})
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, proxyUrl: 'http://localhost:8787' })).toEqual({})
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, proxyUrl: 'http://proxy.acme.com' }).proxyUrl).toBeDefined()
    // The company gateway is any https address.
    expect(validateIntegration('jira', { ...DEFAULT_INTEGRATIONS.jira, proxyUrl: 'https://bluebird-gateway.acme.com' })).toEqual({})
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

  it('checks each MCP scenario’s repository, token, branch, folder and choices on its own keys', () => {
    const mcp = DEFAULT_INTEGRATIONS.mcp
    expect(validateIntegration('mcp', {
      ...mcp,
      componentRepo: 'acme/design-system', componentToken: 'ghp_c', componentBranch: 'release/2026', componentFramework: 'Vue + TypeScript', componentFolder: 'packages/ui/src',
      screenRepo: 'acme/web', screenToken: 'ghp_s', screenFolder: 'src/pages', screenPackage: '@acme/ui',
      libraryRepo: 'acme/app', libraryToken: 'ghp_l', libraryPullRequests: 'One for all screens',
      enterpriseUrl: 'https://github.acme.com',
    })).toEqual({})
    expect(validateIntegration('mcp', { ...mcp, componentRepo: 'design-system', componentToken: 'ghp ab', componentBranch: 'my branch', componentFramework: 'Svelte', componentFolder: '../outside' })).toEqual({
      componentRepo: expect.stringContaining('owner/repository'),
      componentToken: expect.stringContaining('GitHub token'),
      componentBranch: expect.stringContaining('spaces'),
      componentFramework: expect.stringContaining('React + TypeScript'),
      componentFolder: expect.stringContaining('folder inside the repository'),
    })
    expect(validateIntegration('mcp', { ...mcp, screenRepo: 'acme/..', screenToken: 'ghp_“x”', screenBranch: 'a b', screenFramework: 'jQuery', screenFolder: '/src/pages', screenPackage: 'Acme UI' })).toEqual({
      screenRepo: expect.any(String), screenToken: expect.any(String), screenBranch: expect.any(String),
      screenFramework: expect.any(String), screenFolder: expect.any(String), screenPackage: expect.stringContaining('@acme/ui'),
    })
    expect(validateIntegration('mcp', { ...mcp, libraryRepo: 'acme', libraryToken: 'a\nb', libraryBranch: 'x y', libraryPullRequests: 'Two', enterpriseUrl: 'http://github.acme.com' })).toEqual({
      libraryRepo: expect.any(String), libraryToken: expect.any(String), libraryBranch: expect.any(String),
      libraryPullRequests: expect.stringContaining('One per screen'), enterpriseUrl: expect.stringContaining('https://'),
    })
  })

  it('accepts scoped and plain npm package names, and folders with dots, and nothing that leaves the repository', () => {
    const v = (patch: Partial<typeof DEFAULT_INTEGRATIONS.mcp>) => validateIntegration('mcp', { ...DEFAULT_INTEGRATIONS.mcp, ...patch })
    expect(v({ screenPackage: 'acme-ui' })).toEqual({})
    expect(v({ screenPackage: '@acme/ui.core' })).toEqual({})
    expect(v({ screenPackage: '@acme/' }).screenPackage).toBeDefined()
    expect(v({ screenPackage: '../ui' }).screenPackage).toBeDefined()
    expect(v({ screenFolder: '.storybook/pages' })).toEqual({})
    expect(v({ screenFolder: 'src/../../etc' }).screenFolder).toBeDefined()
    expect(v({ componentFolder: 'src/components/' }).componentFolder).toBeDefined()
  })

  it('only accepts the offered models', () => {
    expect(validateIntegration('ai', { ...DEFAULT_INTEGRATIONS.ai, openaiModel: 'gpt-2' }).openaiModel).toContain('gpt-4o')
    expect(validateIntegration('ai', { ...DEFAULT_INTEGRATIONS.ai, provider: 'Mistral' }).provider).toContain('Claude, OpenAI, Gemini')
  })
})
