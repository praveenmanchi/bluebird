import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { gitPill, mcpPill, uxaiPill } from './footerStatus'

describe('footer status pills', () => {
  it('Git needs the GitHub repository and API key', () => {
    const gh = DEFAULT_INTEGRATIONS.github
    expect(gitPill(gh)).toEqual({ label: 'Git', status: 'issue', title: 'Add the repository and API key in Settings › GitHub output configuration.' })
    expect(gitPill({ ...gh, repo: 'gap-inc/design-tokens', apiKey: 'ghp_test' })).toEqual({ label: 'Git', status: 'good', title: 'Commits to gap-inc/design-tokens (main). The key isn’t tested yet.' })
    expect(gitPill({ ...gh, repo: 'a/b', apiKey: 'k', baseUrl: 'https://github.acme.com' }).title).toContain('on github.acme.com')
    expect(gitPill(undefined).status).toBe('retry')
  })

  it('UX AI is good once a provider has a key, says what to add otherwise, and is off when switched off', () => {
    const ai = DEFAULT_INTEGRATIONS.ai
    expect(uxaiPill(ai)).toEqual({ label: 'UXAI', status: 'issue', title: expect.stringContaining('Add a Claude, OpenAI or Gemini API key') })
    expect(uxaiPill({ ...ai, claudeKey: 'sk-ant-test' })).toEqual({ label: 'UXAI', status: 'good', title: 'Answers with Claude (claude-opus-5-5). Use Test connection in Settings to check the key.' })
    expect(uxaiPill({ ...ai, provider: 'OpenAI', openaiKey: 'sk-proj-test' })).toMatchObject({ status: 'good', title: expect.stringContaining('Answers with OpenAI (gpt-5.5)') })
    expect(uxaiPill({ ...ai, openaiKey: 'sk-proj-test' })).toMatchObject({ status: 'issue', title: expect.stringContaining('Settings pick Claude but it has no key, so OpenAI (gpt-5.5) answers instead') })
    expect(uxaiPill({ ...ai, enabled: false, claudeKey: 'sk-ant-test' })).toMatchObject({ label: 'UXAI · off', status: 'issue' })
    expect(uxaiPill(undefined).status).toBe('retry')
  })

  it('MCP needs a repository and a token', () => {
    const mcp = DEFAULT_INTEGRATIONS.mcp
    expect(mcpPill(mcp)).toEqual({ label: 'MCP', status: 'issue', title: 'Add the repository and access token in Settings › MCP + code sync.' })
    expect(mcpPill({ ...mcp, repo: 'org/web', token: 'ghp_test' })).toEqual({ label: 'MCP', status: 'good', title: 'Pushes to org/web (main). The token isn’t tested yet.' })
    expect(mcpPill({ ...mcp, enabled: false })).toMatchObject({ label: 'MCP · off' })
  })
})
