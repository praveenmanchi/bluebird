// @vitest-environment node
// The broker contract the plugin speaks (src/shared/integrations/signin.ts), end to end against
// the fake provider, plus the ways it must refuse.
import { describe, it, expect, vi } from 'vitest'
import { createConnect, type ConnectConfig } from '../../tools/connect/app'
import { confirmCode } from '../../tools/connect/browser'
import { memoryStore } from '../../tools/connect/store'
import { fakeProvider } from '../../tools/connect/providers/fake'
import { githubProvider } from '../../tools/connect/providers/github'
import { ProviderError, type Provider } from '../../tools/connect/providers/types'
import type { Upstream } from '../../tools/jira-proxy/proxy'
import { pollSignIn, requestKeys, startUrl } from '../../src/shared/integrations/signin'

const BASE = 'http://connect.test'
const SECRET = 's'.repeat(43)
const FORM = { 'content-type': 'application/x-www-form-urlencoded' }
/** What the plugin sends on every broker call (signin.ts). */
const PLUGIN = { 'x-connect-client': 'bluebird' }

interface Keys { read: string; write: string; code: string }
/** Every code the broker hands out, by write key: what the person reads off Figma and types in. */
const codes = new Map<string, string>()
type Call = (path: string, init?: RequestInit & { ip?: string }) => Promise<Response>

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
  /** Exactly what the caller sends. */
  const raw: Call = async (path, init = {}) => {
    const res = await handle(new Request(`${BASE}${path.replace(BASE, '')}`, { ...init, headers: { 'cf-connecting-ip': init.ip ?? '10.0.0.1', ...init.headers as Record<string, string> } }))
    if (res.status === 200 && /\/auth\/\w+\/keys$/.test(path)) {
      const k = await res.clone().json() as Keys
      codes.set(k.write, k.code)
    }
    return res
  }
  /** As the plugin calls: with its header unless the test overrides it. */
  const call: Call = (path, init = {}) => raw(path, { ...init, headers: { ...PLUGIN, ...init.headers as Record<string, string> } })
  const advance = (ms: number) => { now += ms }
  const keys = async (service = 'github'): Promise<Keys> => (await call(`/auth/${service}/keys`, { method: 'POST' })).json() as Promise<Keys>
  return { call, raw, store, advance, keys }
}

/** A browser: the same calls, keeping the cookie the broker sets. */
function browser(call: Call): Call {
  let cookie = ''
  return async (path, init = {}) => {
    const res = await call(path, { ...init, headers: { ...(cookie ? { cookie } : {}), ...(init.headers as Record<string, string> | undefined) } })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]!
    return res
  }
}

const poll = (call: Call, read: string) => call('/auth/poll', { headers: { 'x-connect-read': read } })
const location = (res: Response): URL => new URL(res.headers.get('location')!)
const pathOf = (url: URL): string => `${url.pathname}${url.search}`

/** The confirm page's form: where it posts and the nonce it carries. */
async function confirmForm(res: Response): Promise<{ action: string; nonce: string; html: string }> {
  const html = await res.text()
  const action = /<form method="post" action="([^"]+)"/.exec(html)?.[1] ?? ''
  const nonce = /name="nonce" value="([^"]+)"/.exec(html)?.[1] ?? ''
  return { action: action.replace(/&amp;/g, '&'), nonce, html }
}

const post = (b: Call, action: string, nonce: string, decision: 'confirm' | 'deny', code = '') =>
  b(action, { method: 'POST', headers: FORM, body: `nonce=${nonce}&decision=${decision}&code=${encodeURIComponent(code)}` })

/** The code Figma shows for the sign-in this start link begins. */
const codeFor = (start: string): string => codes.get(new URL(start, BASE).searchParams.get('write') ?? '') ?? ''

/** start → confirm page → type the code → Continue → the provider's consent page URL. */
async function toConsent(b: Call, start: string): Promise<URL> {
  const page = await b(start)
  expect(page.status).toBe(200)
  const { action, nonce } = await confirmForm(page)
  const confirmed = await post(b, action, nonce, 'confirm', codeFor(start))
  expect(confirmed.status).toBe(303)
  return location(confirmed)
}

/** The provider's consent page answers, and sends the browser to the callback URL. */
async function decide(b: Call, consent: URL, decision: 'approve' | 'deny'): Promise<URL> {
  const answer = new URL(consent)
  answer.searchParams.set('decision', decision)
  const res = await b(pathOf(answer))
  expect(res.status).toBe(302)
  return location(res)
}

/** The whole browser part: confirm, approve, land on the callback. */
async function browserApproves(b: Call, start: string): Promise<Response> {
  return b(pathOf(await decide(b, await toConsent(b, start), 'approve')))
}

/** The plugin's own fetch calls, passed through untouched, so the test proves what signin.ts sends. */
const asPluginFetch = (raw: Call) =>
  (async (url: string, init: { method: string; headers?: Record<string, string> }) => raw(url, { method: init.method, headers: init.headers })) as never

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
    const { call, raw } = setup()
    const fetch = asPluginFetch(raw)
    const keys = await requestKeys(BASE, 'github', { fetch })
    const done = await browserApproves(browser(call), startUrl(BASE, 'github', 'github.com', keys.write))
    expect(done.status).toBe(200)
    expect(await done.text()).toContain('go back to Figma')
    const result = await pollSignIn(BASE, keys.read, { fetch, sleep: async () => {} })
    expect(result.accessToken).toMatch(/^fake-github-/)
    expect(result.account).toBe('@fake-user')
    expect(Date.parse(result.expiresAt)).toBeGreaterThan(0)
  })

  it('polls 202 while waiting, then hands the token over exactly once', async () => {
    const { call, keys } = setup()
    const k = await keys()
    expect((await poll(call, k.read)).status).toBe(202)
    await browserApproves(browser(call), startUrl(BASE, 'github', 'github.com', k.write))
    expect((await poll(call, k.read)).status).toBe(200)
    expect((await poll(call, k.read)).status).toBe(404)
  })

  it('stores the token encrypted, never in plain text', async () => {
    const { call, store, keys } = setup()
    const putSpy = vi.spyOn(store, 'put')
    const k = await keys('jira')
    await browserApproves(browser(call), startUrl(BASE, 'jira', 'acme.atlassian.net', k.write))
    for (const [, value] of putSpy.mock.calls) expect(value).not.toMatch(/fake-jira-/)
  })

  it('tells the plugin when the person denies access at the provider', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const b = browser(call)
    const page = await b(pathOf(await decide(b, await toConsent(b, startUrl(BASE, 'github', 'github.com', k.write)), 'deny')))
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('cancelled')
    expect((await poll(call, k.read)).status).toBe(403)
  })

  it('expires keys after 10 minutes', async () => {
    const { call, advance, keys } = setup()
    const k = await keys()
    advance(10 * 60_000)
    expect((await poll(call, k.read)).status).toBe(404)
    expect((await call(startUrl(BASE, 'github', 'github.com', k.write))).status).toBe(400)
  })

  it('logs the provider’s safe error code, never its message', async () => {
    const log = vi.fn()
    const broken: Provider = { ...fakeProvider(BASE, 'github'), exchange: async () => { throw new ProviderError('bad_verification_code') } }
    const { call, keys } = setup({ providers: { github: broken }, log })
    const k = await keys()
    await browserApproves(browser(call), startUrl(BASE, 'github', 'github.com', k.write))
    expect(log).toHaveBeenCalledWith('github code exchange failed (bad_verification_code)')
  })

  it('reports a provider failure to the person and the plugin', async () => {
    const broken: Provider = { ...fakeProvider(BASE, 'github'), exchange: async () => { throw new Error('upstream 500') } }
    const { call, keys } = setup({ providers: { github: broken } })
    const k = await keys()
    const page = await browserApproves(browser(call), startUrl(BASE, 'github', 'github.com', k.write))
    expect(page.status).toBe(502)
    expect(await page.text()).not.toContain('upstream 500')
    expect((await poll(call, k.read)).status).toBe(502)
  })
})

describe('confirm code', () => {
  it('gives the plugin a short code derived from the read key', async () => {
    const { keys } = setup()
    const k = await keys()
    expect(k.code).toMatch(/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/)
    expect(k.code).toBe(await confirmCode(k.read))
    expect(await confirmCode('x'.repeat(43))).not.toBe(k.code)
  })

  it('asks for the code Figma shows, never shows it, and names the site before going to the provider', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const res = await browser(call)(startUrl(BASE, 'github', 'github.com', k.write))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    const cookie = res.headers.get('set-cookie')!
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
    const { html } = await confirmForm(res)
    expect(html).not.toContain(k.code)
    expect(html).toContain('Type the code Bluebird is showing in Figma')
    expect(html).toContain('<strong>github.com</strong>')
    expect(html).toMatch(/<input class="code" name="code"/)
  })

  it('accepts the code in any case, with or without the dash', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const b = browser(call)
    const { action, nonce } = await confirmForm(await b(startUrl(BASE, 'github', 'github.com', k.write)))
    expect((await post(b, action, nonce, 'confirm', ` ${k.code.replace('-', '').toLowerCase()} `)).status).toBe(303)
  })

  it('stops someone who was sent the link: no code, no sign-in, and three wrong tries end it', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const victim = browser(call)
    const { action, nonce } = await confirmForm(await victim(startUrl(BASE, 'github', 'github.com', k.write)))
    const first = await post(victim, action, nonce, 'confirm', '')
    expect(first.status).toBe(400)
    expect(first.headers.get('location')).toBeNull()
    expect(await first.text()).toContain('2 tries left')
    const second = await post(victim, action, nonce, 'confirm', 'AAA-AAA')
    expect(await second.text()).toContain('1 try left')
    expect((await poll(call, k.read)).status).toBe(202)
    const third = await post(victim, action, nonce, 'confirm', 'BBB-BBB')
    expect(third.status).toBe(400)
    expect(await third.text()).toContain('Too many wrong codes')
    // Over: even the right code is refused now, and the plugin hears the sign-in was cancelled.
    expect((await post(victim, action, nonce, 'confirm', k.code)).status).toBe(400)
    expect((await poll(call, k.read)).status).toBe(403)
  })

  it('still lets the right code through after a wrong try', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const b = browser(call)
    const { action, nonce } = await confirmForm(await b(startUrl(BASE, 'github', 'github.com', k.write)))
    expect((await post(b, action, nonce, 'confirm', 'ZZZ-ZZZ')).status).toBe(400)
    expect((await post(b, action, nonce, 'confirm', k.code)).status).toBe(303)
  })

  it('lets the person stop a sign-in they did not start', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const b = browser(call)
    const { action, nonce } = await confirmForm(await b(startUrl(BASE, 'github', 'github.com', k.write)))
    const page = await post(b, action, nonce, 'deny')
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('Nothing was connected')
    expect((await poll(call, k.read)).status).toBe(403)
  })

  it('refuses a Confirm posted without the browser cookie (another site, or another browser)', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const { action, nonce } = await confirmForm(await browser(call)(startUrl(BASE, 'github', 'github.com', k.write)))
    expect((await post(call, action, nonce, 'confirm', k.code)).status).toBe(400)
    expect((await post(browser(call), action, nonce, 'confirm', k.code)).status).toBe(400)
    // Still waiting: the real browser can carry on.
    expect((await poll(call, k.read)).status).toBe(202)
  })

  it('finishes only in the browser that confirmed', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const victim = browser(call)
    const callback = await decide(victim, await toConsent(victim, startUrl(BASE, 'github', 'github.com', k.write)), 'approve')
    expect((await browser(call)(pathOf(callback))).status).toBe(400)
    expect((await poll(call, k.read)).status).toBe(202)
    expect((await victim(pathOf(callback))).status).toBe(200)
  })

  it('keeps one cookie per browser, so two sign-ins at once both finish', async () => {
    const { call, keys } = setup()
    const b = browser(call)
    const [one, two] = [await keys(), await keys('jira')]
    const consentOne = await toConsent(b, startUrl(BASE, 'github', 'github.com', one.write))
    const consentTwo = await toConsent(b, startUrl(BASE, 'jira', 'acme.atlassian.net', two.write))
    expect((await b(pathOf(await decide(b, consentOne, 'approve')))).status).toBe(200)
    expect((await b(pathOf(await decide(b, consentTwo, 'approve')))).status).toBe(200)
  })

  it('uses a confirm nonce once', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const b = browser(call)
    const { action, nonce } = await confirmForm(await b(startUrl(BASE, 'github', 'github.com', k.write)))
    expect((await post(b, action, nonce, 'confirm', k.code)).status).toBe(303)
    expect((await post(b, action, nonce, 'confirm', k.code)).status).toBe(400)
  })

  it('refuses GET on confirm and malformed nonces', async () => {
    const { call } = setup()
    expect((await call('/auth/github/confirm')).status).toBe(405)
    expect((await post(call, '/auth/github/confirm', 'bad', 'confirm')).status).toBe(400)
  })

  it('lets the confirm form post on to its provider and nowhere else', async () => {
    const { call, keys } = setup({ providers: { github: githubProvider({ clientId: 'Iv23li', clientSecret: 's', slug: 'bluebird' }) } })
    const k = await keys()
    const res = await browser(call)(startUrl(BASE, 'github', 'github.com', k.write))
    expect(res.headers.get('content-security-policy')).toMatch(/form-action 'self' https:\/\/github\.com;/)
  })

  it('uses a __Host- Secure cookie when served over https', async () => {
    const handle = createConnect({
      publicUrl: 'https://connect.example', encryptionKey: SECRET, stateKey: 'k'.repeat(43), store: memoryStore(),
      providers: { github: fakeProvider('https://connect.example', 'github') }, version: 'test',
    })
    const k = await (await handle(new Request('https://connect.example/auth/github/keys', { method: 'POST', headers: PLUGIN }))).json() as Keys
    const res = await handle(new Request(startUrl('https://connect.example', 'github', 'github.com', k.write)))
    expect(res.headers.get('set-cookie')).toMatch(/^__Host-bb_connect=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/)
  })
})

describe('records', () => {
  it('a finished sign-in cannot be revived once the plugin has taken it', async () => {
    const { call, keys } = setup()
    const k = await keys()
    expect((await browserApproves(browser(call), startUrl(BASE, 'github', 'github.com', k.write))).status).toBe(200)
    expect((await poll(call, k.read)).status).toBe(200)
    expect((await poll(call, k.read)).status).toBe(404)
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

describe('install link', () => {
  it('sends an admin to the provider’s install page', async () => {
    const withInstall: Provider = { ...fakeProvider(BASE, 'github'), installUrl: 'https://github.com/apps/bluebird-design/installations/new' }
    const { call } = setup({ providers: { github: withInstall } })
    const res = await call('/auth/github/install')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://github.com/apps/bluebird-design/installations/new')
  })

  it('says so when the provider has no install step', async () => {
    const { call } = setup()
    const res = await call('/auth/github/install')
    expect(res.status).toBe(404)
    expect(await res.text()).toContain('nothing to install')
  })

  it('answers GET only', async () => {
    const { call } = setup()
    expect((await call('/auth/github/install', { method: 'POST' })).status).toBe(405)
  })
})

describe('Jira Cloud relay', () => {
  const upstreamOk = () => vi.fn<Upstream>(async () => ({ status: 200, headers: { get: () => 'application/json' }, text: async () => '{"accountId":"5b10"}' }))
  const jira = (call: Call, path: string, init: RequestInit = {}) =>
    call(path, { ...init, headers: { 'x-jira-target': 'https://acme.atlassian.net', authorization: 'Basic bWFyaWE6dG9r', ...init.headers as Record<string, string> } })

  it('forwards Jira REST calls to the Atlassian site, like the local Jira proxy', async () => {
    const upstream = upstreamOk()
    const { raw } = setup({ jiraRelay: { extraHosts: [], upstream } })
    const res = await jira(raw, '/rest/api/3/myself', { headers: { origin: 'null' } })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"accountId":"5b10"}')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    const [url, init] = upstream.mock.calls[0]!
    expect(url).toBe('https://acme.atlassian.net/rest/api/3/myself')
    expect(init.headers.authorization).toBe('Basic bWFyaWE6dG9r')
    expect(init.redirect).toBe('manual')
  })

  it('forwards bodies on writes', async () => {
    const upstream = upstreamOk()
    const { raw } = setup({ jiraRelay: { extraHosts: [], upstream } })
    await jira(raw, '/rest/api/3/issue/ABC-1/comment', { method: 'POST', body: '{"body":"hi"}', headers: { 'content-type': 'application/json' } })
    expect(upstream.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: '{"body":"hi"}' })
  })

  it('only forwards to Atlassian Cloud (or hosts the gateway lists)', async () => {
    const upstream = upstreamOk()
    const { raw } = setup({ jiraRelay: { extraHosts: [], upstream } })
    expect((await jira(raw, '/rest/api/3/myself', { headers: { 'x-jira-target': 'https://evil.example' } })).status).toBe(400)
    expect((await jira(raw, '/rest/api/3/myself', { headers: { 'x-jira-target': 'http://acme.atlassian.net' } })).status).toBe(400)
    // Dot segments (plain or %2e) are collapsed by the URL parser before routing, so they never reach the relay;
    // an encoded slash does, and the relay refuses it.
    expect((await jira(raw, '/rest/../secure', {})).status).toBe(404)
    expect((await jira(raw, '/rest/api/x%2f..%2fsecure', {})).status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
    const gateway = setup({ jiraRelay: { extraHosts: ['jira.acme.internal'], upstream } })
    expect((await jira(gateway.raw, '/rest/api/2/myself', { headers: { 'x-jira-target': 'https://jira.acme.internal' } })).status).toBe(200)
  })

  it('refuses web pages, answers Figma and the preflight', async () => {
    const { raw } = setup({ jiraRelay: { extraHosts: [], upstream: upstreamOk() } })
    expect((await jira(raw, '/rest/api/3/myself', { headers: { origin: 'https://evil.example' } })).status).toBe(403)
    const pre = await raw('/rest/api/3/myself', { method: 'OPTIONS' })
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-headers')).toContain('x-jira-target')
  })

  it('is off unless the host turns it on', async () => {
    const { raw } = setup()
    expect((await jira(raw, '/rest/api/3/myself')).status).toBe(404)
  })

  it('rate-limits per IP', async () => {
    const { raw } = setup({ jiraRelay: { extraHosts: [], upstream: upstreamOk() } })
    let last = 0
    for (let i = 0; i < 601; i += 1) last = (await jira(raw, '/rest/api/3/myself', { ip: '10.7.7.7' } as RequestInit)).status
    expect(last).toBe(429)
  })
})

describe('Jira Cloud sign-in', () => {
  it('hands the plugin the site’s cloudId with the token', async () => {
    const withSite: Provider = {
      ...fakeProvider(BASE, 'jira'),
      exchange: async () => ({ accessToken: 'atl', account: 'Maria Rossi', expiresAt: '', site: { cloudId: 'cloud-acme', url: 'https://acme.atlassian.net' } }),
    }
    const { call, keys } = setup({ providers: { jira: withSite } })
    const k = await keys('jira')
    await browserApproves(browser(call), startUrl(BASE, 'jira', 'acme.atlassian.net', k.write))
    expect(await (await poll(call, k.read)).json()).toEqual({ accessToken: 'atl', account: 'Maria Rossi', expiresAt: '', site: { cloudId: 'cloud-acme', url: 'https://acme.atlassian.net' } })
  })
})

describe('who may call', () => {
  it('takes the read key from a header only, so it never sits in a URL or access log', async () => {
    const { call, keys } = setup()
    const k = await keys()
    expect((await call(`/auth/poll?read=${k.read}`)).status).toBe(400)
    expect((await poll(call, k.read)).status).toBe(202)
  })

  it('refuses keys and poll without the plugin’s header (a plain form or image request)', async () => {
    const { call, keys } = setup()
    const k = await keys()
    expect((await call('/auth/github/keys', { method: 'POST', headers: { 'x-connect-client': '' } })).status).toBe(403)
    expect((await call('/auth/poll', { headers: { 'x-connect-client': 'other', 'x-connect-read': k.read } })).status).toBe(403)
  })

  it('accepts Figma’s null origin and refuses web pages', async () => {
    const { call } = setup()
    expect((await call('/auth/github/keys', { method: 'POST', headers: { origin: 'null' } })).status).toBe(200)
    const evil = await call('/auth/github/keys', { method: 'POST', headers: { origin: 'https://evil.example' } })
    expect(evil.status).toBe(403)
    expect(evil.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('lets a host allow more origins, e.g. the local dev harness', async () => {
    const { call } = setup({ allowOrigin: (o) => o === 'null' || o === 'http://localhost:5173' })
    expect((await call('/auth/github/keys', { method: 'POST', headers: { origin: 'http://localhost:5173' } })).status).toBe(200)
  })

  it('lists the plugin headers in the preflight answer', async () => {
    const { call } = setup()
    const allowed = (await call('/auth/poll', { method: 'OPTIONS' })).headers.get('access-control-allow-headers')
    expect(allowed).toContain('x-connect-client')
    expect(allowed).toContain('x-connect-read')
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
    const { call, keys } = setup()
    const k = await keys()
    expect((await call(startUrl(BASE, 'jira', 'acme.atlassian.net', k.write))).status).toBe(400)
    const k2 = await keys()
    expect((await call(startUrl(BASE, 'github', 'github.com', k2.write))).status).toBe(200)
    expect((await call(startUrl(BASE, 'github', 'github.com', k2.write))).status).toBe(400)
  })

  it('refuses a host the provider does not accept', async () => {
    const { call, keys } = setup()
    const k = await keys()
    expect((await call(`/auth/github/start?host=${encodeURIComponent('bad host/<x>')}&write=${k.write}`)).status).toBe(400)
  })

  it('refuses a forged or replayed state', async () => {
    const { call, keys } = setup()
    expect((await call('/auth/github/callback?code=x&state=forged.sig')).status).toBe(400)
    const k = await keys()
    const b = browser(call)
    const callback = pathOf(await decide(b, await toConsent(b, startUrl(BASE, 'github', 'github.com', k.write)), 'approve'))
    expect((await b(callback)).status).toBe(200)
    expect((await b(callback)).status).toBe(400)
  })

  it('refuses a state minted for another service', async () => {
    const { call, keys } = setup()
    const k = await keys()
    const b = browser(call)
    const callback = await decide(b, await toConsent(b, startUrl(BASE, 'github', 'github.com', k.write)), 'approve')
    expect((await b(`/auth/jira/callback${callback.search}`)).status).toBe(400)
  })

  it('refuses malformed read keys', async () => {
    const { call } = setup()
    expect((await poll(call, 'bad')).status).toBe(400)
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
