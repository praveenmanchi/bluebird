// Bluebird Connect: the sign-in broker the plugin talks to
// (src/shared/integrations/signin.ts; contract in docs/research/auth-server-roadmap.md §3.2).
// A plain Fetch API handler, so it runs unchanged on Cloudflare Workers,
// Vercel and Node (server.ts).
//
// Flow, with the records it keeps (all short-lived, see TTLs):
//   POST /auth/{service}/keys        w:<write> → {read, service}   r:<read> → pending
//   GET  /auth/{service}/start       takes w:<write>, keeps s:<nonce> → {read, host, verifier}, redirects to the provider
//   GET  /auth/{service}/callback    takes s:<nonce>, swaps the code, r:<read> → sealed token (or denied / failed)
//   GET  /auth/poll?read=            202 pending · 200 token (then deleted) · 403 denied · 502 failed · 404 expired
import { createSealer, createSigner, isKey, pkceChallenge, randomKey, type Sealer, type Signer } from './crypto'
import { createLimiter } from './limits'
import { page } from './pages'
import type { Store } from './store'
import { SERVICES, type Provider, type Service, type TokenSet } from './providers/types'

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
}

const KEYS_TTL_S = 10 * 60
const DONE_TTL_S = 5 * 60
const MINUTE = 60_000
const LIMITS = { keys: 20, start: 30, pollPerKey: 60, pollPerIp: 300 } as const

const CORS: Readonly<Record<string, string>> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  // Chrome's Private Network Access: Figma calling a localhost or intranet gateway.
  'access-control-allow-private-network': 'true',
  'access-control-max-age': '600',
}

type ReadRecord = { status: 'pending' } | { status: 'denied' } | { status: 'failed' } | { status: 'done'; box: string }
interface WriteRecord { read: string; service: Service }
interface StateRecord { read: string; service: Service; host: string; verifier: string }

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
  const consent = Object.values(providers).find((p) => p?.consentPage)?.consentPage

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
    return json(200, { read, write })
  }

  async function start(service: Service, provider: Provider, url: URL, req: Request, signer: Signer): Promise<Response> {
    if (!allow(`start:${clientIp(req)}`, LIMITS.start, MINUTE)) return page(429, 'Too many sign-ins', 'Wait a minute, then start again from Figma.')
    const write = url.searchParams.get('write')
    const host = (url.searchParams.get('host') ?? '').toLowerCase()
    // take(): a write key starts one sign-in, even if this request is then refused.
    const record = isKey(write) ? parseJson<WriteRecord>(await store.take(`w:${write}`)) : null
    if (!record || record.service !== service) return page(400, 'This sign-in link expired', 'Start again from Bluebird in Figma.')
    if (!provider.acceptsHost(host)) return page(400, 'Sign-in isn’t set up for this address', 'Check the address in Bluebird’s Settings, or use a token.')
    const nonce = randomKey()
    const verifier = randomKey()
    await store.put(`s:${nonce}`, JSON.stringify({ read: record.read, service, host, verifier } satisfies StateRecord), KEYS_TTL_S)
    const location = provider.authorizeUrl({
      host,
      state: await signer.sign(nonce),
      redirectUri: `${base}/auth/${service}/callback`,
      codeChallenge: await pkceChallenge(verifier),
    })
    return new Response(null, { status: 302, headers: { location, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } })
  }

  async function callback(service: Service, provider: Provider, url: URL, signer: Signer, sealer: Sealer): Promise<Response> {
    const nonce = await signer.verify(url.searchParams.get('state') ?? '')
    const record = nonce ? parseJson<StateRecord>(await store.take(`s:${nonce}`)) : null
    if (!nonce || !record || record.service !== service) return page(400, 'This sign-in link expired', 'Start again from Bluebird in Figma.')
    const code = url.searchParams.get('code')
    if (url.searchParams.has('error') || !code) {
      await settle(record.read, { status: 'denied' })
      return page(200, 'Sign-in cancelled', 'Nothing was connected. You can close this tab and go back to Figma.')
    }
    let tokens: TokenSet
    try {
      tokens = await provider.exchange({ host: record.host, code, redirectUri: `${base}/auth/${service}/callback`, codeVerifier: record.verifier })
    } catch (error: unknown) {
      // The name only: provider errors can echo response bodies, codes or tokens.
      log(`${service} code exchange failed (${error instanceof Error ? error.name : 'unknown'})`)
      await settle(record.read, { status: 'failed' })
      return page(502, 'Sign-in didn’t finish', `${service === 'github' ? 'GitHub' : 'The provider'} didn’t accept the sign-in. Go back to Figma and try again, or use a token.`)
    }
    // Phase 5 keeps tokens.refreshToken (sealed) behind a refresh handle; until then it's dropped here.
    const box = await sealer.seal({ accessToken: tokens.accessToken, account: tokens.account, expiresAt: tokens.expiresAt }, record.read)
    if (!(await settle(record.read, { status: 'done', box }, DONE_TTL_S))) return page(400, 'This sign-in link expired', 'Start again from Bluebird in Figma.')
    return page(200, 'You’re signed in', 'You can close this tab and go back to Figma.')
  }

  async function poll(url: URL, req: Request, sealer: Sealer): Promise<Response> {
    const read = url.searchParams.get('read')
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

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const method = req.method.toUpperCase()
    if (method === 'OPTIONS') return empty(204)
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.pathname === '/health') return json(200, { ok: true, service: 'bluebird-connect', version: config.version, services: SERVICES.filter((s) => providers[s]) })
    if (url.pathname === '/fake/authorize' && consent) return consent(url)
    const [sealer, signer] = await ready
    if (url.pathname === '/auth/poll') return method === 'GET' ? poll(url, req, sealer) : empty(405)
    const [root, service, action, ...rest] = parts
    const provider = isService(service) ? providers[service] : undefined
    if (root !== 'auth' || !isService(service) || !provider || rest.length > 0) return problem(404, 'Not found.')
    if (action === 'keys') return method === 'POST' ? keys(service, req) : empty(405)
    if (method !== 'GET') return empty(405)
    if (action === 'start') return start(service, provider, url, req, signer)
    if (action === 'callback') return callback(service, provider, url, signer, sealer)
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
