import { describe, expect, it } from 'vitest'
import { configFromSettings, isProblem } from '@shared/github/client'
import { DEFAULT_INTEGRATIONS, normalizeIntegration } from './schema'
import { githubHost, hostOf, jiraHost, normalizeGithubAddress, normalizeJiraAddress, repoFromLink, tokenHelpUrl } from './hosts'

describe('githubHost', () => {
  it('tells github.com, data-residency tenants and Enterprise Server apart', () => {
    expect(githubHost('')).toMatchObject({ flavor: 'github.com', api: 'https://api.github.com' })
    expect(githubHost('https://github.com')).toMatchObject({ flavor: 'github.com' })
    expect(githubHost('https://acme.ghe.com')).toMatchObject({ flavor: 'ghe.com', label: 'GitHub Enterprise Cloud', api: 'https://api.acme.ghe.com' })
    expect(githubHost('https://github.acme.com/')).toMatchObject({ flavor: 'server', label: 'GitHub Enterprise Server', web: 'https://github.acme.com', api: 'https://github.acme.com/api/v3' })
  })

  it('sends a ghe.com tenant’s token to its own API host, not /api/v3', () => {
    const config = configFromSettings({ ...DEFAULT_INTEGRATIONS.github, apiKey: 'tok', repo: 'acme/tokens', baseUrl: 'https://acme.ghe.com' })
    expect(!isProblem(config) && config.api).toBe('https://api.acme.ghe.com')
  })
})

describe('addresses', () => {
  it('keeps only the host of what was pasted, and drops github.com', () => {
    expect(hostOf('https://user@GitHub.Acme.com:8443/org/repo?x#y')).toBe('github.acme.com:8443')
    expect(normalizeGithubAddress('github.acme.com/acme/tokens')).toBe('https://github.acme.com')
    expect(normalizeGithubAddress('https://github.com/acme/tokens')).toBe('')
    expect(normalizeGithubAddress('http://localhost:3000')).toBe('http://localhost:3000')
    expect(normalizeJiraAddress('acme.atlassian.net/jira/software/projects/DS')).toBe('https://acme.atlassian.net')
    expect(normalizeJiraAddress('')).toBe('')
  })

  it('reads owner/repo from a repository link and ignores anything else', () => {
    expect(repoFromLink('https://github.acme.com/acme/design-tokens.git')).toBe('acme/design-tokens')
    expect(repoFromLink('github.com/acme/tokens/tree/main')).toBe('acme/tokens')
    expect(repoFromLink('github.acme.com')).toBeNull()
    expect(repoFromLink('github.acme.com/../..')).toBeNull()
  })

  it('fills an empty repository from a pasted link when the GitHub section is normalized', () => {
    const out = normalizeIntegration({ ...DEFAULT_INTEGRATIONS.github, baseUrl: ' github.acme.com/acme/tokens ' }, 'github')
    expect(out).toMatchObject({ baseUrl: 'https://github.acme.com', repo: 'acme/tokens' })
    const kept = normalizeIntegration({ ...DEFAULT_INTEGRATIONS.github, baseUrl: 'github.acme.com/acme/tokens', repo: 'acme/other' }, 'github')
    expect(kept.repo).toBe('acme/other')
  })

  it('works out Jira Cloud or Data Center from either stored field', () => {
    expect(jiraHost('', '')).toBeNull()
    expect(jiraHost('https://acme.atlassian.net', '')).toMatchObject({ flavor: 'cloud', label: 'Jira Cloud' })
    expect(jiraHost('', 'https://jira.acme.internal')).toMatchObject({ flavor: 'datacenter', site: 'https://jira.acme.internal' })
    expect(jiraHost('', 'https://acme.atlassian.net')).toMatchObject({ flavor: 'cloud' })
  })

  it('links to the page where each kind of token is made', () => {
    expect(tokenHelpUrl('github', 'https://github.acme.com/')).toBe('https://github.acme.com/settings/tokens')
    expect(tokenHelpUrl('jira', 'https://acme.atlassian.net', 'cloud')).toContain('id.atlassian.com')
    expect(tokenHelpUrl('jira', 'https://jira.acme.internal', 'datacenter')).toBe('https://jira.acme.internal/secure/ViewProfile.jspa')
  })
})
