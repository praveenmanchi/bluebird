// @vitest-environment node
// The GitHub App provider against a fake github.com: authorize URL, code swap with PKCE,
// the account lookup, and every way GitHub says no.
import { describe, it, expect, vi } from 'vitest'
import { githubProvider, githubConfigFromEnv, type ProviderFetch } from '../../tools/connect/providers/github'
import { ProviderError } from '../../tools/connect/providers/types'

const APP = { clientId: 'Iv23liAbc', clientSecret: 'shh-secret', slug: 'bluebird-design' }
const NOW = Date.parse('2026-11-27T12:00:00Z')
const INPUT = { host: 'github.com', code: 'abc123', redirectUri: 'https://connect.test/auth/github/callback', codeVerifier: 'v'.repeat(43) }

interface Seen { url: string; method: string; headers: Record<string, string>; body?: string }

function fakeGithub(token: unknown, user: unknown = { login: 'maria-r' }, userStatus = 200) {
  const seen: Seen[] = []
  const fetch: ProviderFetch = vi.fn(async (url, init) => {
    seen.push({ url, method: init.method, headers: init.headers, body: init.body })
    const body = url.endsWith('/login/oauth/access_token') ? token : user
    const status = url.endsWith('/user') ? userStatus : 200
    return { status, json: async () => body }
  })
  return { fetch, seen }
}

describe('githubProvider', () => {
  it('accepts github.com only', () => {
    const gh = githubProvider(APP)
    expect(gh.acceptsHost('github.com')).toBe(true)
    for (const host of ['', 'evil.com', 'github.com.evil.com', 'api.github.com', 'acme.ghe.com', 'github.acme.com', 'github.com:8443']) {
      expect(gh.acceptsHost(host)).toBe(false)
    }
  })

  it('sends the person to GitHub with state, redirect and an S256 challenge', () => {
    const url = new URL(githubProvider(APP).authorizeUrl({ host: 'github.com', state: 'st.sig', redirectUri: INPUT.redirectUri, codeChallenge: 'chal' }))
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: APP.clientId, redirect_uri: INPUT.redirectUri, state: 'st.sig', code_challenge: 'chal', code_challenge_method: 'S256', allow_signup: 'false',
    })
  })

  it('swaps the code with the secret and verifier, then reads the login', async () => {
    const { fetch, seen } = fakeGithub({ access_token: 'ghu_user', refresh_token: 'ghr_refresh', expires_in: 28800, token_type: 'bearer' })
    const tokens = await githubProvider(APP, { fetch, now: () => NOW }).exchange(INPUT)
    expect(tokens).toEqual({ accessToken: 'ghu_user', refreshToken: 'ghr_refresh', account: '@maria-r', expiresAt: '2026-11-27T20:00:00.000Z' })
    const [swap, user] = seen
    expect(swap!.url).toBe('https://github.com/login/oauth/access_token')
    expect(swap!.method).toBe('POST')
    expect(swap!.headers.accept).toBe('application/json')
    expect(Object.fromEntries(new URLSearchParams(swap!.body))).toEqual({
      client_id: APP.clientId, client_secret: APP.clientSecret, code: 'abc123', redirect_uri: INPUT.redirectUri, code_verifier: INPUT.codeVerifier,
    })
    expect(user!.url).toBe('https://api.github.com/user')
    expect(user!.headers.authorization).toBe('Bearer ghu_user')
    expect(user!.headers['user-agent']).toMatch(/bluebird/i)
  })

  it('leaves expiresAt empty when the app has token expiry turned off', async () => {
    const { fetch } = fakeGithub({ access_token: 'ghu_user', token_type: 'bearer' })
    expect((await githubProvider(APP, { fetch, now: () => NOW }).exchange(INPUT)).expiresAt).toBe('')
  })

  it('turns GitHub’s 200-with-error answer into a ProviderError with a safe code', async () => {
    const { fetch } = fakeGithub({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' })
    const failure = githubProvider(APP, { fetch }).exchange(INPUT)
    await expect(failure).rejects.toBeInstanceOf(ProviderError)
    await expect(failure).rejects.toMatchObject({ code: 'bad_verification_code' })
  })

  it('never puts provider text into the error code', async () => {
    const { fetch } = fakeGithub({ error: 'ghu_LEAKED <script>' })
    await expect(githubProvider(APP, { fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'unknown' })
  })

  it('fails when the account lookup fails or answers nonsense', async () => {
    const token = { access_token: 'ghu_user' }
    await expect(githubProvider(APP, { fetch: fakeGithub(token, {}, 401).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'user_401' })
    await expect(githubProvider(APP, { fetch: fakeGithub(token, { login: 42 }).fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'bad_user' })
  })

  it('refuses to send the secret for a host it does not accept', async () => {
    const { fetch } = fakeGithub({ access_token: 'x' })
    await expect(githubProvider(APP, { fetch }).exchange({ ...INPUT, host: 'evil.com' })).rejects.toMatchObject({ code: 'host' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps a network failure to a ProviderError', async () => {
    const fetch: ProviderFetch = async () => { throw new TypeError('fetch failed') }
    await expect(githubProvider(APP, { fetch }).exchange(INPUT)).rejects.toMatchObject({ code: 'network' })
  })

  it('links to installing the app on an organisation', () => {
    expect(githubProvider(APP).installUrl).toBe('https://github.com/apps/bluebird-design/installations/new')
    expect(githubProvider({ ...APP, slug: '' }).installUrl).toBeUndefined()
  })
})

describe('githubConfigFromEnv', () => {
  it('is null until both id and secret are set', () => {
    expect(githubConfigFromEnv({})).toBeNull()
    expect(githubConfigFromEnv({ GITHUB_APP_CLIENT_ID: 'Iv23li' })).toBeNull()
    expect(githubConfigFromEnv({ GITHUB_APP_CLIENT_ID: 'Iv23li', GITHUB_APP_CLIENT_SECRET: 's', GITHUB_APP_SLUG: 'bb' })).toEqual({ clientId: 'Iv23li', clientSecret: 's', slug: 'bb' })
  })

  it('refuses an id or slug that could break the URLs it goes into', () => {
    expect(() => githubConfigFromEnv({ GITHUB_APP_CLIENT_ID: 'a&b=c', GITHUB_APP_CLIENT_SECRET: 's' })).toThrow(/GITHUB_APP_CLIENT_ID/)
    expect(() => githubConfigFromEnv({ GITHUB_APP_CLIENT_ID: 'Iv23li', GITHUB_APP_CLIENT_SECRET: 's', GITHUB_APP_SLUG: '../x' })).toThrow(/GITHUB_APP_SLUG/)
  })
})
