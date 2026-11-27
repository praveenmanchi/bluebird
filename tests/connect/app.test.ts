// @vitest-environment node
// The broker contract the plugin speaks (src/shared/integrations/signin.ts), end to end against
// the fake provider, plus the ways it must refuse.
import { describe, it, expect, vi } from 'vitest'
import { createConnect, type ConnectConfig } from '../../tools/connect/app'
import { memoryStore } from '../../tools/connect/store'
import { fakeProvider } from '../../tools/connect/providers/fake'
import type { Provider } from '../../tools/connect/providers/types'
import { pollSignIn, requestKeys, startUrl } from '../../src/shared/integrations/signin'

const BASE = 'http://connect.test'
const SECRET = 's'.repeat(43)

function setup(overrides: Partial<ConnectConfig> = {}) {
  let now = 1_000_000
  const store = memoryStore(() => now)
  const handle = createConnect({
    publicUrl: BASE,
    encryptionKey: SECRET,
    stateKey: 'k'.repeat(43),
    store,
    providers: { github: fakeProvider(BASE, 'github'), jira: fakeProvider(BASE, 'jira') },
    now: () => now,
    version: 'test',
    ...overrides,
  })
  const call = (path: string, init: RequestInit & { ip?: string } = {}) =>
    handle(new Request(`${BASE}${path}`, { ...init, headers: { 'cf-connecting-ip': init.ip ?? '10.0.0.1', ...init.headers } }))
  const advance = (ms: number) => { now += ms }
  return { call, store, advance }
}

/** Follows the browser's part: start → fake consent → approve → callback. */
async function browserApproves(call: ReturnType<typeof setup>['call'], start: string): Promise<Response> {
  const toProvider = await call(start.replace(BASE, ''))
  expect(toProvider.status).toBe(302)
  const consent = new URL(toProvider.headers.get('location')!)
  const approve = new URL(consent)
  approve.searchParams.set('decision', 'approve')
  const toCallback = await call(`${approve.pathname}${approve.search}`)
  expect(toCallback.status).toBe(302)
  const callback = new URL(toCallback.headers.get('location')!)
  return call(`${callback.pathname}${callback.search}`)
}

const asPluginFetch = (call: ReturnType<typeof setup>['call']) =>
  (async (url: string, init: { method: string }) => call(url.replace(BASE, ''), { method: init.method })) as never

describe('health', () => {
  it('reports version and configured services, with CORS', async () => {
    const { call } = setup()
    const res = await call('/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(await res.json()).toEqual({ ok: true, service: 'bluebird-connect', version: 'test', services: ['github', 'jira'] })
  })

  it('answers preflight', async () => {
    const { call } = setup()
    const res = await call('/auth/github/keys', { method: 'OPTIONS' })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
  })

  it('404s unknown paths', async () => {
    const { call } = setup()
    expect((await call('/nope')).status).toBe(404)
  })
})

describe('sign-in flow', () => {
  it('works with the plugin client from keys to token', async () => {
    const { call } = setup()
    const fetch = asPluginFetch(call)
    const keys = await requestKeys(BASE, 'github', { fetch })
    const done = await browserApproves(call, startUrl(BASE, 'github', 'github.com', keys.write))
    expect(done.status).toBe(200)
    expect(await done.text()).toContain('go back to Figma')
    const result = await pollSignIn(BASE, keys.read, { fetch, sleep: async () => {} })
    expect(result.accessToken).toMatch(/^fake-github-/)
    expect(result.account).toBe('@fake-user')
    expect(Date.parse(result.expiresAt)).toBeGreaterThan(0)
  })

  it('polls 202 while waiting, then hands the token over exactly once', async () => {
    const { call } = setup()
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(202)
    await browserApproves(call, startUrl(BASE, 'github', 'github.com', keys.write))
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(200)
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(404)
  })

  it('stores the token encrypted, never in plain text', async () => {
    const { call, store } = setup()
    const putSpy = vi.spyOn(store, 'put')
    const keys = await (await call('/auth/jira/keys', { method: 'POST' })).json() as { read: string; write: string }
    await browserApproves(call, startUrl(BASE, 'jira', 'acme.atlassian.net', keys.write))
    for (const [, value] of putSpy.mock.calls) expect(value).not.toMatch(/fake-jira-/)
  })

  it('tells the plugin when the person denies access', async () => {
    const { call } = setup()
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    const toProvider = await call(startUrl(BASE, 'github', 'github.com', keys.write).replace(BASE, ''))
    const deny = new URL(toProvider.headers.get('location')!)
    deny.searchParams.set('decision', 'deny')
    const toCallback = new URL((await call(`${deny.pathname}${deny.search}`)).headers.get('location')!)
    const page = await call(`${toCallback.pathname}${toCallback.search}`)
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('cancelled')
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(403)
  })

  it('expires keys after 10 minutes', async () => {
    const { call, advance } = setup()
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    advance(10 * 60_000)
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(404)
    expect((await call(startUrl(BASE, 'github', 'github.com', keys.write).replace(BASE, ''))).status).toBe(400)
  })

  it('reports a provider failure to the person and the plugin', async () => {
    const broken: Provider = { ...fakeProvider(BASE, 'github'), exchange: async () => { throw new Error('upstream 500') } }
    const { call } = setup({ providers: { github: broken } })
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    const page = await browserApproves(call, startUrl(BASE, 'github', 'github.com', keys.write))
    expect(page.status).toBe(502)
    expect(await page.text()).not.toContain('upstream 500')
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(502)
  })
})

describe('records', () => {
  it('a finished sign-in cannot be revived once the plugin has taken it', async () => {
    const { call } = setup()
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    const toProvider = await call(startUrl(BASE, 'github', 'github.com', keys.write).replace(BASE, ''))
    const consent = new URL(toProvider.headers.get('location')!)
    const approve = new URL(consent); approve.searchParams.set('decision', 'approve')
    const ok = new URL((await call(`${approve.pathname}${approve.search}`)).headers.get('location')!)
    expect((await call(`${ok.pathname}${ok.search}`)).status).toBe(200)
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(200)
    // The record is gone: nothing may bring it back.
    expect((await call(`/auth/poll?read=${keys.read}`)).status).toBe(404)
  })

  it('ignores x-forwarded-for for rate limits', async () => {
    const { call } = setup()
    const statuses: number[] = []
    for (let i = 0; i < 21; i += 1) {
      statuses.push((await call('/auth/github/keys', { method: 'POST', ip: '10.1.1.1', headers: { 'x-forwarded-for': `10.2.0.${i}` } })).status)
    }
    expect(statuses.at(-1)).toBe(429)
  })
})

describe('refusals', () => {
  it('refuses services that are not configured', async () => {
    const { call } = setup()
    expect((await call('/auth/bitbucket/keys', { method: 'POST' })).status).toBe(404)
    expect((await call('/auth/evil/keys', { method: 'POST' })).status).toBe(404)
  })

  it('refuses GET on keys', async () => {
    const { call } = setup()
    expect((await call('/auth/github/keys')).status).toBe(405)
  })

  it('uses a write key once, and only for its own service', async () => {
    const { call } = setup()
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    expect((await call(startUrl(BASE, 'jira', 'acme.atlassian.net', keys.write).replace(BASE, ''))).status).toBe(400)
    const keys2 = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    expect((await call(startUrl(BASE, 'github', 'github.com', keys2.write).replace(BASE, ''))).status).toBe(302)
    expect((await call(startUrl(BASE, 'github', 'github.com', keys2.write).replace(BASE, ''))).status).toBe(400)
  })

  it('refuses a host the provider does not accept', async () => {
    const { call } = setup()
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    expect((await call(`/auth/github/start?host=${encodeURIComponent('bad host/<x>')}&write=${keys.write}`)).status).toBe(400)
  })

  it('refuses a forged or replayed state', async () => {
    const { call } = setup()
    expect((await call('/auth/github/callback?code=x&state=forged.sig')).status).toBe(400)
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    const toProvider = await call(startUrl(BASE, 'github', 'github.com', keys.write).replace(BASE, ''))
    const approve = new URL(toProvider.headers.get('location')!)
    approve.searchParams.set('decision', 'approve')
    const callback = new URL((await call(`${approve.pathname}${approve.search}`)).headers.get('location')!)
    expect((await call(`${callback.pathname}${callback.search}`)).status).toBe(200)
    expect((await call(`${callback.pathname}${callback.search}`)).status).toBe(400)
  })

  it('refuses a state minted for another service', async () => {
    const { call } = setup()
    const keys = await (await call('/auth/github/keys', { method: 'POST' })).json() as { read: string; write: string }
    const toProvider = await call(startUrl(BASE, 'github', 'github.com', keys.write).replace(BASE, ''))
    const approve = new URL(toProvider.headers.get('location')!)
    approve.searchParams.set('decision', 'approve')
    const callback = new URL((await call(`${approve.pathname}${approve.search}`)).headers.get('location')!)
    expect((await call(`/auth/jira/callback${callback.search}`)).status).toBe(400)
  })

  it('refuses malformed read keys', async () => {
    const { call } = setup()
    expect((await call('/auth/poll?read=bad')).status).toBe(400)
    expect((await call('/auth/poll')).status).toBe(400)
  })

  it('rate-limits key requests per IP', async () => {
    const { call } = setup()
    const statuses: number[] = []
    for (let i = 0; i < 25; i += 1) statuses.push((await call('/auth/github/keys', { method: 'POST', ip: '10.9.9.9' })).status)
    expect(statuses.filter((s) => s === 200)).toHaveLength(20)
    expect(statuses.at(-1)).toBe(429)
    expect((await call('/auth/github/keys', { method: 'POST', ip: '10.9.9.8' })).status).toBe(200)
  })

  it('does not serve the fake consent page unless the fake provider is configured', async () => {
    const { call } = setup({ providers: { github: { ...fakeProvider(BASE, 'github'), id: 'github', consentPage: undefined } } })
    expect((await call('/fake/authorize?state=x')).status).toBe(404)
  })

  it('escapes what it echoes into pages', async () => {
    const { call } = setup()
    const res = await call('/fake/authorize?state=%3Cscript%3E&redirect_uri=http%3A%2F%2Fconnect.test%2Fauth%2Fgithub%2Fcallback')
    expect(await res.text()).not.toContain('<script>')
  })
})
