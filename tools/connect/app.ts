// Bluebird Connect: the sign-in broker the plugin talks to
// (src/shared/integrations/signin.ts; contract in docs/research/auth-server-roadmap.md §3.2).
// A plain Fetch API handler, so it runs unchanged on Cloudflare Workers,
// Vercel and Node (server.ts).
//
// Flow, with the records it keeps (all short-lived, see TTLs):
//   POST /auth/{service}/keys        w:<write> → {read, service}   r:<read> → pending   answers {read, write, code}
//   GET  /auth/{service}/start       takes w:<write>, keeps c:<nonce> → {read, host, browser}, shows the confirm page
//                                    with the code the plugin shows, and sets the browser cookie (browser.ts says why)
//   POST /auth/{service}/confirm     needs the code the plugin shows, typed in (3 tries); takes c:<nonce> (same browser only),
//                                    keeps s:<nonce> → {read, host, verifier, browser}, redirects to the provider;
//                                    Cancel, or a third wrong code, marks the sign-in denied
//   GET  /auth/{service}/callback    takes s:<nonce> (same browser only), swaps the code, r:<read> → sealed token (or denied / failed)
//   GET  /auth/{service}/install     redirects to the provider's install page (GitHub App on an organisation)
//   GET  /auth/poll                  read key in x-connect-read: 202 pending · 200 token (then deleted) · 403 denied ·
//                                    502 failed · 404 expired
//   POST /events/login               the plugin reports an access-code login (events.ts); 204, written to `analytics` if set
//   ANY  /rest/…                     Jira relay, when the host turns it on: the same contract as the local Jira proxy
//                                    (x-jira-target header), so the plugin's Jira "gateway" field can point here
// keys, poll, events and the relay want the x-connect-client header and Figma's `null` origin (or none).
// That stops plain cross-site forms and images, nothing more: any client can send both, and a web page
// can get a `null` origin from a sandboxed iframe. So it is not access control. keys and poll are safe
// by key entropy alone, a sign-in by the typed code and the browser cookie; a company gateway needs a
// network rule in front (roadmap §4).
import { createPseudonymizer, createSealer, createSigner, isKey, pkceChallenge, randomKey, type Sealer, type Signer } from './crypto'
import { parseLoginEvent, type Analytics } from './events'
import { browserCookie, browserHash, confirmCode } from './browser'
import { createLimiter } from './limits'
import { CORS_HEADERS as RELAY_CORS, forwardToJira, type Upstream } from '../jira-proxy/proxy'
import { confirmPage, page } from './pages'
import type { Store } from './store'
import { ProviderError, SERVICES, type Provider, type Service, type TokenSet } from './providers/types'

export interface ConnectConfig {
  /** Where the browser reaches this broker, e.g. https://connect.example.com (no trailing slash needed). */
  publicUrl: string
  /** ≥ 32 chars. Encrypts tokens at rest. */
  encryptionKey: string
  /** ≥ 32 chars. Signs the OAuth state. */
  stateKey: string
  store: Store
  providers: Partial<Record<Service, Provider>>
  version: string
  now?: () => number
  /** The caller's IP for rate limits. Default: cf-connecting-ip (set by Cloudflare, can't be spoofed there). Other hosts pass their own. */
  clientIp?: (req: Request) => string
  /** Server-side log line. Never passed tokens, codes or keys. */
  log?: (message: string) => void
  /** Origins allowed to call keys, poll and the relay. Default: Figma's `null` only. The local dev server adds localhost. */
  allowOrigin?: (origin: string) => boolean
  /**
   * The Jira relay for API-token mode, where Jira's lack of CORS blocks the plugin. Off unless set.
   * Bluebird Cloud: no extra hosts (only *.atlassian.net). A gateway: its own Jira Data Center hosts.
   */
  jiraRelay?: { extraHosts: readonly string[]; upstream?: Upstream }
  /** Where access-code logins go (Analytics Engine on Bluebird Cloud). Unset: reports are accepted and dropped. */
  analytics?: Analytics
  /** Brand ids a login may name (plugin.config.json). Unset: any well-formed id. */
  analyticsBrands?: readonly string[]
}

/** Sent by the plugin on keys and poll (src/shared/integrations/signin.ts). */
export const CLIENT_HEADER = 'x-connect-client'
export const CLIENT_VALUE = 'bluebird'
export const READ_HEADER = 'x-connect-read'

const KEYS_TTL_S = 10 * 60
const DONE_TTL_S = 5 * 60
const MINUTE = 60_000
const LIMITS = { keys: 20, start: 30, pollPerKey: 60, pollPerIp: 300, relay: 600, events: 30 } as const

const CORS: Readonly<Record<string, string>> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': `content-type, ${CLIENT_HEADER}, ${READ_HEADER}`,
  // Chrome's Private Network Access: Figma calling a localhost or intranet gateway.
  'access-control-allow-private-network': 'true',
  'access-control-max-age': '600',
}

type ReadRecord = { status: 'pending' } | { status: 'denied' } | { status: 'failed' } | { status: 'done'; box: string }
interface WriteRecord { read: string; service: Service }
interface ConfirmRecord { read: string; service: Service; host: string; browser: string; tries?: number }
interface StateRecord extends ConfirmRecord { verifier: string }

const PROVIDER_NAMES: Readonly<Record<Service, string>> = { github: 'GitHub', jira: 'Atlassian', bitbucket: 'Bitbucket' }
const MAX_FORM_BYTES = 4_096
const MAX_CODE_TRIES = 3
/** "k7q x92" → "K7QX92": case, spaces and the dash don't matter. */
const normalizeCode = (value: string | null): string => (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const cancelled = (): Response => page(200, 'Sign-in cancelled', 'Nothing was connected. You can close this tab and go back to Figma.')
const expired = (): Response => page(400, 'This sign-in link expired', 'Start again from Bluebird in Figma.')
const otherBrowser = (): Response => page(400, 'Open this in the browser you started in', 'Bluebird’s sign-in has to finish in the same browser that showed the code. Start again from Figma.')

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' } })
const empty = (status: number): Response => new Response(null, { status, headers: CORS })
const problem = (status: number, error: string): Response => json(status, { error })

function parseJson<T>(text: string | null): T | null {
  if (text === null) return null
  try { return JSON.parse(text) as T } catch { return null }
}

// Not x-forwarded-for: any caller can set it. A host behind its own proxy passes `clientIp`.
const defaultClientIp = (req: Request): string => req.headers.get('cf-connecting-ip') ?? 'unknown'

const isService = (value: string | undefined): value is Service => SERVICES.includes(value as Service)

export function createConnect(config: ConnectConfig): (req: Request) => Promise<Response> {
  for (const secret of [config.encryptionKey, config.stateKey]) {
    if (secret.length < 32) throw new Error('Connect secrets must be at least 32 characters.')
  }
  const base = config.publicUrl.replace(/\/+$/, '')
  const now = config.now ?? Date.now
  const log = config.log ?? (() => {})
  const clientIp = config.clientIp ?? defaultClientIp
  const allow = createLimiter(now)
  const { store, providers } = config
  const ready: Promise<[Sealer, Signer]> = Promise.all([createSealer(config.encryptionKey), createSigner(config.stateKey)])
  const pseudonymize = createPseudonymizer(config.stateKey)
  const consent = Object.values(providers).find((p) => p?.consentPage)?.consentPage
  const allowOrigin = config.allowOrigin ?? ((origin: string) => origin === 'null')
  /** True for the plugin: its header, and Figma's origin (or none, from a non-browser client). */
  const fromPlugin = (req: Request): boolean => {
    const origin = req.headers.get('origin')
    return req.headers.get(CLIENT_HEADER) === CLIENT_VALUE && (origin === null || allowOrigin(origin))
  }
  /** Figma, an allowed origin, or no browser at all. */
  const originOk = (req: Request): boolean => {
    const origin = req.headers.get('origin')
    return origin === null || allowOrigin(origin)
  }
  const cookie = browserCookie(base, isKey)
  const sameBrowser = async (req: Request, record: ConfirmRecord): Promise<boolean> => {
    const id = cookie.read(req)
    return id !== null && (await browserHash(id)) === record.browser
  }

  const setRead = (read: string, record: ReadRecord, ttl = KEYS_TTL_S) => store.put(`r:${read}`, JSON.stringify(record), ttl)
  /** Settles a sign-in only while the plugin is still waiting: a late callback can't overwrite or revive it. */
  const settle = async (read: string, record: ReadRecord, ttl?: number): Promise<boolean> => {
    if (parseJson<ReadRecord>(await store.get(`r:${read}`))?.status !== 'pending') return false
    await setRead(read, record, ttl)
    return true
  }

  async function keys(service: Service, req: Request): Promise<Response> {
    if (!allow(`keys:${clientIp(req)}`, LIMITS.keys, MINUTE)) return problem(429, 'Too many sign-ins. Wait a minute.')
    const read = randomKey()
    const write = randomKey()
    await store.put(`w:${write}`, JSON.stringify({ read, service } satisfies WriteRecord), KEYS_TTL_S)
    await setRead(read, { status: 'pending' })
    return json(200, { read, write, code: await confirmCode(read) })
  }

  async function start(service: Service, provider: Provider, url: URL, req: Request): Promise<Response> {
    if (!allow(`start:${clientIp(req)}`, LIMITS.start, MINUTE)) return page(429, 'Too many sign-ins', 'Wait a minute, then start again from Figma.')
    const write = url.searchParams.get('write')
    const host = (url.searchParams.get('host') ?? '').toLowerCase()
    // take(): a write key starts one sign-in, even if this request is then refused.
    const record = isKey(write) ? parseJson<WriteRecord>(await store.take(`w:${write}`)) : null
    if (!record || record.service !== service) return expired()
    if (!provider.acceptsHost(host)) return page(400, 'Sign-in isn’t set up for this address', 'Check the address in Bluebird’s Settings, or use a token.')
    // One id per browser, kept across sign-ins, so two at once in the same browser both finish.
    const id = cookie.read(req) ?? randomKey()
    const nonce = randomKey()
    await store.put(`c:${nonce}`, JSON.stringify({ read: record.read, service, host, browser: await browserHash(id) } satisfies ConfirmRecord), KEYS_TTL_S)
    return confirmPage({ provider: PROVIDER_NAMES[service], host, action: `/auth/${service}/confirm`, nonce, providerOrigin: providerOrigin(provider, host), setCookie: cookie.header(id) })
  }

  /** Where Continue's redirect goes: the provider's sign-in origin for this host, for the page's CSP. */
  function providerOrigin(provider: Provider, host: string): string {
    return new URL(provider.authorizeUrl({ host, state: 'x', redirectUri: base, codeChallenge: 'x' })).origin
  }

  async function confirm(service: Service, provider: Provider, req: Request, signer: Signer): Promise<Response> {
    if (!allow(`start:${clientIp(req)}`, LIMITS.start, MINUTE)) return page(429, 'Too many sign-ins', 'Wait a minute, then start again from Figma.')
    const text = await req.text()
    if (text.length > MAX_FORM_BYTES) return expired()
    const form = new URLSearchParams(text)
    const nonce = form.get('nonce')
    const record = isKey(nonce) ? parseJson<ConfirmRecord>(await store.get(`c:${nonce}`)) : null
    if (!nonce || !record || record.service !== service) return expired()
    // Another site's form, or another browser: no cookie, no sign-in. The real browser can still go on.
    if (!(await sameBrowser(req, record))) return otherBrowser()
    if (form.get('decision') !== 'confirm') {
      if ((await store.take(`c:${nonce}`)) === null) return expired()
      await settle(record.read, { status: 'denied' })
      return cancelled()
    }
    if (normalizeCode(form.get('code')) !== normalizeCode(await confirmCode(record.read))) {
      // Only this browser (the cookie) gets tries, so two racing wrong answers can't add up to many.
      const tries = (record.tries ?? 0) + 1
      if (tries >= MAX_CODE_TRIES) {
        if ((await store.take(`c:${nonce}`)) !== null) await settle(record.read, { status: 'denied' })
        return page(400, 'Too many wrong codes', 'Nothing was connected. Start again from Bluebird in Figma.')
      }
      await store.put(`c:${nonce}`, JSON.stringify({ ...record, tries } satisfies ConfirmRecord), KEYS_TTL_S)
      const left = MAX_CODE_TRIES - tries
      return confirmPage({ provider: PROVIDER_NAMES[service], host: record.host, action: `/auth/${service}/confirm`, nonce, providerOrigin: providerOrigin(provider, record.host),
        error: `That code doesn’t match the one in Figma. ${left} ${left === 1 ? 'try' : 'tries'} left.` })
    }
    if ((await store.take(`c:${nonce}`)) === null) return expired()
    const state = randomKey()
    const verifier = randomKey()
    await store.put(`s:${state}`, JSON.stringify({ ...record, verifier } satisfies StateRecord), KEYS_TTL_S)
    const location = provider.authorizeUrl({
      host: record.host,
      state: await signer.sign(state),
      redirectUri: `${base}/auth/${service}/callback`,
      codeChallenge: await pkceChallenge(verifier),
    })
    // 303: the browser follows with a GET, whatever the form's method.
    return new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } })
  }

  async function callback(service: Service, provider: Provider, url: URL, req: Request, signer: Signer, sealer: Sealer): Promise<Response> {
    const nonce = await signer.verify(url.searchParams.get('state') ?? '')
    const record = nonce ? parseJson<StateRecord>(await store.get(`s:${nonce}`)) : null
    if (!nonce || !record || record.service !== service) return expired()
    if (!(await sameBrowser(req, record))) return otherBrowser()
    if ((await store.take(`s:${nonce}`)) === null) return expired()
    const code = url.searchParams.get('code')
    if (url.searchParams.has('error') || !code) {
      await settle(record.read, { status: 'denied' })
      return cancelled()
    }
    let tokens: TokenSet
    try {
      tokens = await provider.exchange({ host: record.host, code, redirectUri: `${base}/auth/${service}/callback`, codeVerifier: record.verifier })
    } catch (error: unknown) {
      // The name only: provider errors can echo response bodies, codes or tokens.
      log(`${service} code exchange failed (${error instanceof ProviderError ? error.code : error instanceof Error ? error.name : 'unknown'})`)
      await settle(record.read, { status: 'failed' })
      return page(502, 'Sign-in didn’t finish', `${PROVIDER_NAMES[service]} didn’t accept the sign-in. Go back to Figma and try again, or use a token.`)
    }
    // Phase 5 keeps tokens.refreshToken (sealed) behind a refresh handle; until then it's dropped here.
    const result = { accessToken: tokens.accessToken, account: tokens.account, expiresAt: tokens.expiresAt, ...(tokens.site ? { site: tokens.site } : {}) }
    const box = await sealer.seal(result, record.read)
    if (!(await settle(record.read, { status: 'done', box }, DONE_TTL_S))) return expired()
    return page(200, 'You’re signed in', 'You can close this tab and go back to Figma.')
  }

  /** The plugin links here, so the install page lives in one place: the provider config on this broker. */
  function install(service: Service, provider: Provider): Response {
    if (!provider.installUrl) return page(404, 'There’s nothing to install', `${PROVIDER_NAMES[service]} sign-in works without installing anything here. Go back to Figma.`)
    return new Response(null, { status: 302, headers: { location: provider.installUrl, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } })
  }

  async function poll(req: Request, sealer: Sealer): Promise<Response> {
    const read = req.headers.get(READ_HEADER)
    if (!isKey(read)) return problem(400, 'Missing or malformed read key.')
    // Per IP first, so random read keys can't fill the limiter's table.
    if (!allow(`poll-ip:${clientIp(req)}`, LIMITS.pollPerIp, MINUTE) || !allow(`poll:${read}`, LIMITS.pollPerKey, MINUTE)) return problem(429, 'Polling too fast.')
    const peek = parseJson<ReadRecord>(await store.get(`r:${read}`))
    if (!peek) return problem(404, 'Unknown or expired sign-in.')
    if (peek.status === 'pending') return empty(202)
    const record = parseJson<ReadRecord>(await store.take(`r:${read}`))
    if (!record || record.status === 'pending') return problem(404, 'Unknown or expired sign-in.')
    if (record.status === 'denied') return problem(403, 'Sign-in was cancelled.')
    if (record.status === 'failed') return problem(502, 'The provider didn’t accept the sign-in.')
    const result = await sealer.open(record.box, read)
    return result ? json(200, result) : problem(500, 'Sign-in record unreadable.')
  }

  /** An access-code login from the plugin: checked, pseudonymised, handed to `analytics`. */
  async function loginEvent(req: Request): Promise<Response> {
    if (!allow(`events:${clientIp(req)}`, LIMITS.events, MINUTE)) return problem(429, 'Too many events.')
    const report = parseLoginEvent(await req.text())
    if (!report || (config.analyticsBrands && !config.analyticsBrands.includes(report.brand))) return problem(400, 'Malformed event.')
    if (config.analytics) {
      const user = report.user ? await (await pseudonymize)(report.user) : null
      const country = (req as Request & { cf?: { country?: unknown } }).cf?.country
      config.analytics.login({ brand: report.brand, user, version: report.version, country: typeof country === 'string' ? country : '' })
    }
    return empty(204)
  }

  async function relay(req: Request, url: URL, method: string): Promise<Response> {
    const settings = config.jiraRelay
    const reply = (status: number, body: string, headers: Record<string, string> = RELAY_CORS) => new Response(status === 204 ? null : body, { status, headers })
    if (!settings) return problem(404, 'Not found.')
    if (method === 'OPTIONS') return reply(204, '')
    if (!originOk(req)) return reply(403, JSON.stringify({ errorMessages: ['The Bluebird relay only answers the Figma plugin.'] }), { ...RELAY_CORS, 'content-type': 'application/json' })
    if (!allow(`relay:${clientIp(req)}`, LIMITS.relay, MINUTE)) return reply(429, JSON.stringify({ errorMessages: ['Too many Jira requests. Wait a minute.'] }), { ...RELAY_CORS, 'content-type': 'application/json' })
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => { headers[key.toLowerCase()] = value })
    const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text()
    const out = await forwardToJira({ method, url: `${url.pathname}${url.search}`, headers, body }, settings.extraHosts, settings.upstream ?? (fetch as unknown as Upstream))
    return reply(out.status, out.body, out.headers)
  }

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const method = req.method.toUpperCase()
    if (url.pathname.startsWith('/rest/')) return relay(req, url, method)
    if (method === 'OPTIONS') return empty(204)
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.pathname === '/health') return json(200, { ok: true, service: 'bluebird-connect', version: config.version, services: SERVICES.filter((s) => providers[s]) })
    if (url.pathname === '/fake/authorize' && consent) return consent(url)
    if (url.pathname === '/events/login') {
      if (method !== 'POST') return empty(405)
      return fromPlugin(req) ? loginEvent(req) : problem(403, 'Only the Bluebird plugin may send events.')
    }
    const [sealer, signer] = await ready
    if (url.pathname === '/auth/poll') {
      if (method !== 'GET') return empty(405)
      return fromPlugin(req) ? poll(req, sealer) : problem(403, 'Only the Bluebird plugin may poll.')
    }
    const [root, service, action, ...rest] = parts
    const provider = isService(service) ? providers[service] : undefined
    if (root !== 'auth' || !isService(service) || !provider || rest.length > 0) return problem(404, 'Not found.')
    if (action === 'keys') {
      if (method !== 'POST') return empty(405)
      return fromPlugin(req) ? keys(service, req) : problem(403, 'Only the Bluebird plugin may start a sign-in.')
    }
    if (action === 'confirm') return method === 'POST' ? confirm(service, provider, req, signer) : empty(405)
    if (method !== 'GET') return empty(405)
    if (action === 'start') return start(service, provider, url, req)
    if (action === 'install') return install(service, provider)
    if (action === 'callback') return callback(service, provider, url, req, signer, sealer)
    return problem(404, 'Not found.')
  }

  return async (req) => {
    try {
      return await route(req)
    } catch (error: unknown) {
      log(`unexpected error (${error instanceof Error ? error.name : 'unknown'})`)
      return problem(500, 'Something went wrong.')
    }
  }
}
