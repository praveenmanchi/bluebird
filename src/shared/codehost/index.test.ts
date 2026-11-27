import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_INTEGRATIONS, mcpTarget } from '@shared/integrations'
import { DATA_CENTER_UNSUPPORTED, codeHostConfig, createCodeHost, isProblem, mcpCodeHostConfig } from './index'
import type { CodeHostConfig, HostFetch } from './types'

const github = (over: Partial<typeof DEFAULT_INTEGRATIONS.github> = {}) => ({ ...DEFAULT_INTEGRATIONS.github, repo: 'acme/design-tokens', apiKey: 'tok', ...over })

describe('codeHostConfig', () => {
  it('keeps GitHub as it was, adding the web address', () => {
    expect(codeHostConfig(github())).toEqual({ kind: 'github', api: 'https://api.github.com', web: 'https://github.com', email: '', token: 'tok', repo: 'acme/design-tokens', branch: 'main', tokenPath: 'tokens.json' })
    expect(codeHostConfig(github({ baseUrl: 'https://acme.ghe.com' }))).toMatchObject({ api: 'https://api.acme.ghe.com', web: 'https://acme.ghe.com' })
  })

  it('points Bitbucket at its API with the Atlassian email', () => {
    expect(codeHostConfig(github({ host: 'bitbucket', email: ' maria@acme.com ' }))).toEqual({ kind: 'bitbucket', api: 'https://api.bitbucket.org/2.0', web: 'https://bitbucket.org', email: 'maria@acme.com', token: 'tok', repo: 'acme/design-tokens', branch: 'main', tokenPath: 'tokens.json' })
  })

  it('sends a Bitbucket sign-in token as Bearer, ignoring an email left over from token mode', () => {
    expect(codeHostConfig(github({ host: 'bitbucket', method: 'signin', email: 'maria@acme.com' }))).toMatchObject({ kind: 'bitbucket', email: '' })
  })

  it('needs a repository and a token on either host', () => {
    const missing = codeHostConfig(github({ host: 'bitbucket', repo: '', apiKey: '' }))
    expect(isProblem(missing) && missing.fields).toEqual(['Repository', 'Access token'])
  })
})

describe('mcpCodeHostConfig', () => {
  it('uses each scenario’s own host; the shared address is GitHub Enterprise only', () => {
    const mcp = { ...DEFAULT_INTEGRATIONS.mcp, screenRepo: 'acme/web', screenToken: 't', screenHost: 'bitbucket', screenEmail: 'maria@acme.com', componentRepo: 'acme/ds', componentToken: 'g' }
    expect(mcpCodeHostConfig(mcpTarget(mcp, 'screen'), 'https://github.acme.com')).toMatchObject({ kind: 'bitbucket', api: 'https://api.bitbucket.org/2.0', email: 'maria@acme.com', repo: 'acme/web' })
    expect(mcpCodeHostConfig(mcpTarget(mcp, 'component'), 'https://github.acme.com')).toMatchObject({ kind: 'github', api: 'https://github.acme.com/api/v3', web: 'https://github.acme.com' })
  })
})

describe('createCodeHost', () => {
  const fetch: HostFetch = vi.fn(async () => ({ status: 200, text: async () => '{}' }))
  const base: CodeHostConfig = { kind: 'github', api: 'https://api.github.com', web: 'https://github.com', email: '', token: 't', repo: 'a/b', branch: 'main', tokenPath: '' }

  it('picks the adapter for the host', () => {
    expect(createCodeHost(base, fetch)).toMatchObject({ kind: 'github', label: 'GitHub', ciName: 'GitHub Actions' })
    expect(createCodeHost({ ...base, kind: 'bitbucket', api: 'https://api.bitbucket.org/2.0' }, fetch)).toMatchObject({ kind: 'bitbucket', label: 'Bitbucket', ciName: 'Bitbucket Pipelines' })
  })

  it('refuses Bitbucket Data Center with a clear message, without calling it', async () => {
    const dc = createCodeHost({ ...base, kind: 'bitbucket', api: 'https://bitbucket.acme.internal/rest/api/1.0' }, fetch)
    await expect(dc.whoAmI()).rejects.toThrow(DATA_CENTER_UNSUPPORTED)
    await expect(dc.commitFiles({ parent: 'x', message: 'm', files: [], branch: 'b', create: true })).rejects.toThrow('Bitbucket Cloud for now')
    expect(fetch).not.toHaveBeenCalled()
  })
})
