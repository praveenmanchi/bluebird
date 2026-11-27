// @vitest-environment node
// Sign in with Bitbucket Cloud (OAuth consumer) against a fake bitbucket.org / api.bitbucket.org.
import { describe, it, expect, vi } from 'vitest'
import { bitbucketProvider, bitbucketConfigFromEnv } from '../../tools/connect/providers/bitbucket'
import type { ProviderFetch } from '../../tools/connect/providers/http'

const APP = { clientId: 'KeyAbc123', clientSecret: 'shh' }
const NOW = Date.parse('2026-11-27T12:00:00Z')
const INPUT = { host: 'bitbucket.org', code: 'code-1', redirectUri: 'https://connect.test/auth/bitbucket/callback', codeVerifier: 'v'.repeat(43) }

interface Seen { url: string; method: string; headers: Record<string, string>; body?: string }

function fakeBitbucket(replies: { token?: unknown; tokenStatus?: number; user?: unknown; userStatus?: number } = {}) {
  const seen: Seen[] = []
  const fetch: ProviderFetch = vi.fn(async (url, init) => {
    seen.push({ url, method: init.method, headers: init.headers, body: init.body })
    if (url === 'https://bitbucket.org/site/oauth2/access_token') {
      return { status: replies.tokenStatus ?? 200, json: async () => replies.token ?? { access_token: 'bb_token', refresh_token: 'bb_refresh', expires_in: 7200, token_type: 'bearer', scopes: 'repository:write pullrequest:write' } }
    }
    if (url === 'https://api.bitbucket.org/2.0/user') return { status: replies.userStatus ?? 200, json: async () => replies.user ?? { display_name: 'Maria Rossi', nickname: 'maria', account_id: '557058:abc' } }
    throw new Error(`unexpected ${url}`)
  })
  return { fetch, seen }
}

describe('bitbucketProvider', () => {
  it('accepts bitbucket.org only', () => {
    const bb = bitbucketProvider(APP)
    expect(bb.acceptsHost('bitbucket.org')).toBe(true)
    for (const host of ['', 'api.bitbucket.org', 'bitbucket.org.evil.com', 'bitbucket.acme.com', 'evil.com']) expect(bb.acceptsHost(host)).toBe(false)
  })

  it('sends the person to Bitbucket with the client id and state (scopes live on the consumer)', () => {
    const url = new URL(bitbucketProvider(APP).authorizeUrl({ host: INPUT.host, state: 'st.sig', redirectUri: INPUT.redirectUri, codeChallenge: 'chal' }))
    expect(url.origin + url.pathname).toBe('https://bitbucket.org/site/oauth2/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_id: APP.clientId, response_type: 'code', state: 'st.sig' })
  })

  it('swaps the code with Basic client credentials and a form body, then names the person', async () => {
    const { fetch, seen } = fakeBitbucket()
    const tokens = await bitbucketProvider(APP, { fetch, now: () => NOW }).exchange(INPUT)
    expect(tokens).toEqual({ accessToken: 'bb_token', refreshToken: 'bb_refresh', account: 'Maria Rossi', expiresAt: '2026-11-27T14:00:00.000Z' })
    const swap = seen[0]!
    expect(swap.method).toBe('POST')
    expect(swap.headers.authorization).toBe(`Basic ${btoa(`${APP.clientId}:${APP.clientSecret}`)}`)
    expect(swap.headers['content-type']).toBe('application/x-www-form-urlencoded')
    expect(Object.fromEntries(new URLSearchParams(swap.body))).toEqual({ grant_type: 'authorization_code', code: 'code-1' })
    expect(swap.body).not.toContain(APP.clientSecret)
    expect(seen[1]!.headers.authorization).toBe('Bearer bb_token')
  })

  it('falls back to the nickname', async () => {
    expect((await bitbucketProvider(APP, { fetch: fakeBitbucket({ user: { nickname: 'maria' } }).fetch }).exchange(INPUT)).account).toBe('maria')
  })

  it('maps Bitbucket’s refusals to safe codes', async () => {
    await expect(bitbucketProvider(APP, { fetch: fakeBitbucket({ tokenStatus: 400, token: { error: 'invalid_grant', error_description: 'The code is invalid' } }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'invalid_grant' })
    await expect(bitbucketProvider(APP, { fetch: fakeBitbucket({ userStatus: 401 }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'user_401' })
    await expect(bitbucketProvider(APP, { fetch: fakeBitbucket({ user: {} }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'bad_user' })
  })

  it('refuses to send the secret for a host it does not accept', async () => {
    const { fetch } = fakeBitbucket()
    await expect(bitbucketProvider(APP, { fetch }).exchange({ ...INPUT, host: 'evil.com' })).rejects.toMatchObject({ code: 'host' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('bitbucketConfigFromEnv', () => {
  it('is null until key and secret are set, and checks the key', () => {
    expect(bitbucketConfigFromEnv({})).toBeNull()
    expect(bitbucketConfigFromEnv({ BITBUCKET_CLIENT_ID: 'Key1', BITBUCKET_CLIENT_SECRET: 's' })).toEqual({ clientId: 'Key1', clientSecret: 's' })
    expect(() => bitbucketConfigFromEnv({ BITBUCKET_CLIENT_ID: 'a b', BITBUCKET_CLIENT_SECRET: 's' })).toThrow(/BITBUCKET_CLIENT_ID/)
  })
})
