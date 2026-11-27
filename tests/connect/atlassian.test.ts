// @vitest-environment node
// Sign in with Atlassian (Jira Cloud, OAuth 2.0 3LO) against a fake auth.atlassian.com / api.atlassian.com.
import { describe, it, expect, vi } from 'vitest'
import { atlassianProvider, atlassianConfigFromEnv, ATLASSIAN_SCOPES } from '../../tools/connect/providers/atlassian'
import type { ProviderFetch } from '../../tools/connect/providers/http'

const APP = { clientId: 'aBcD1234', clientSecret: 'shh' }
const NOW = Date.parse('2026-11-27T12:00:00Z')
const INPUT = { host: 'acme.atlassian.net', code: 'code-1', redirectUri: 'https://connect.test/auth/jira/callback', codeVerifier: 'v'.repeat(43) }
const SITES = [
  { id: 'cloud-other', url: 'https://other.atlassian.net', name: 'other', scopes: [] },
  { id: 'cloud-acme', url: 'https://acme.atlassian.net', name: 'acme', scopes: ['read:jira-work'] },
]

interface Seen { url: string; method: string; headers: Record<string, string>; body?: string }

function fakeAtlassian(replies: { token?: unknown; tokenStatus?: number; sites?: unknown; sitesStatus?: number; me?: unknown; meStatus?: number } = {}) {
  const seen: Seen[] = []
  const fetch: ProviderFetch = vi.fn(async (url, init) => {
    seen.push({ url, method: init.method, headers: init.headers, body: init.body })
    if (url === 'https://auth.atlassian.com/oauth/token') return { status: replies.tokenStatus ?? 200, json: async () => replies.token ?? { access_token: 'atl_token', refresh_token: 'atl_refresh', expires_in: 3600, scope: ATLASSIAN_SCOPES } }
    if (url === 'https://api.atlassian.com/oauth/token/accessible-resources') return { status: replies.sitesStatus ?? 200, json: async () => replies.sites ?? SITES }
    if (url === 'https://api.atlassian.com/me') return { status: replies.meStatus ?? 200, json: async () => replies.me ?? { account_id: '5b10', name: 'Maria Rossi', nickname: 'maria' } }
    throw new Error(`unexpected ${url}`)
  })
  return { fetch, seen }
}

describe('atlassianProvider', () => {
  it('accepts Jira Cloud sites only', () => {
    const atl = atlassianProvider(APP)
    expect(atl.acceptsHost('acme.atlassian.net')).toBe(true)
    expect(atl.acceptsHost('acme-eu.atlassian.net')).toBe(true)
    for (const host of ['', 'atlassian.net', 'evil.com', 'acme.atlassian.net.evil.com', 'a.b.atlassian.net', 'jira.acme.com', 'acme.atlassian.net:443', '-x.atlassian.net']) {
      expect(atl.acceptsHost(host)).toBe(false)
    }
  })

  it('asks for Jira work, the person’s identity and a refresh token, with consent', () => {
    const url = new URL(atlassianProvider(APP).authorizeUrl({ host: INPUT.host, state: 'st.sig', redirectUri: INPUT.redirectUri, codeChallenge: 'chal' }))
    expect(url.origin + url.pathname).toBe('https://auth.atlassian.com/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      audience: 'api.atlassian.com', client_id: APP.clientId, scope: ATLASSIAN_SCOPES, redirect_uri: INPUT.redirectUri, state: 'st.sig', response_type: 'code', prompt: 'consent',
    })
    expect(ATLASSIAN_SCOPES.split(' ')).toEqual(expect.arrayContaining(['read:jira-work', 'write:jira-work', 'read:jira-user', 'read:me']))
    expect(ATLASSIAN_SCOPES).not.toContain('offline_access')
  })

  it('swaps the code (JSON body), finds the site the person pasted, and names them', async () => {
    const { fetch, seen } = fakeAtlassian()
    const tokens = await atlassianProvider(APP, { fetch, now: () => NOW }).exchange(INPUT)
    expect(tokens).toEqual({
      accessToken: 'atl_token', refreshToken: 'atl_refresh', account: 'Maria Rossi', expiresAt: '2026-11-27T13:00:00.000Z',
      site: { cloudId: 'cloud-acme', url: 'https://acme.atlassian.net' },
    })
    const swap = seen[0]!
    expect(swap.method).toBe('POST')
    expect(swap.headers['content-type']).toBe('application/json')
    expect(JSON.parse(swap.body!)).toEqual({ grant_type: 'authorization_code', client_id: APP.clientId, client_secret: APP.clientSecret, code: 'code-1', redirect_uri: INPUT.redirectUri })
    expect(seen[1]!.headers.authorization).toBe('Bearer atl_token')
    expect(seen[2]!.headers.authorization).toBe('Bearer atl_token')
  })

  it('refuses when the token can’t reach the site the person pasted', async () => {
    const { fetch } = fakeAtlassian({ sites: [SITES[0]] })
    await expect(atlassianProvider(APP, { fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'site_not_granted' })
  })

  it('falls back to the nickname, then the account id', async () => {
    expect((await atlassianProvider(APP, { fetch: fakeAtlassian({ me: { account_id: '5b10', nickname: 'maria' } }).fetch }).exchange(INPUT)).account).toBe('maria')
    expect((await atlassianProvider(APP, { fetch: fakeAtlassian({ me: { account_id: '5b10' } }).fetch }).exchange(INPUT)).account).toBe('5b10')
  })

  it('maps Atlassian’s refusals to safe codes', async () => {
    await expect(atlassianProvider(APP, { fetch: fakeAtlassian({ tokenStatus: 403, token: { error: 'access_denied', error_description: 'Unauthorized' } }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'access_denied' })
    await expect(atlassianProvider(APP, { fetch: fakeAtlassian({ tokenStatus: 500, token: 'oops' }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'token_500' })
    await expect(atlassianProvider(APP, { fetch: fakeAtlassian({ sitesStatus: 401 }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'sites_401' })
    await expect(atlassianProvider(APP, { fetch: fakeAtlassian({ meStatus: 403 }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'user_403' })
  })

  it('refuses to send the secret for a host it does not accept', async () => {
    const { fetch } = fakeAtlassian()
    await expect(atlassianProvider(APP, { fetch }).exchange({ ...INPUT, host: 'evil.com' })).rejects.toMatchObject({ code: 'host' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('atlassianConfigFromEnv', () => {
  it('is null until both id and secret are set, and checks the id', () => {
    expect(atlassianConfigFromEnv({})).toBeNull()
    expect(atlassianConfigFromEnv({ ATLASSIAN_CLIENT_ID: 'abc' })).toBeNull()
    expect(atlassianConfigFromEnv({ ATLASSIAN_CLIENT_ID: 'abc', ATLASSIAN_CLIENT_SECRET: 's' })).toEqual({ clientId: 'abc', clientSecret: 's' })
    expect(() => atlassianConfigFromEnv({ ATLASSIAN_CLIENT_ID: 'a&b', ATLASSIAN_CLIENT_SECRET: 's' })).toThrow(/ATLASSIAN_CLIENT_ID/)
  })
})
