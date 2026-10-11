// Request handling for the local Jira proxy (server.ts runs it).
//
// Why it exists: a Figma plugin's requests come from a `null` origin and only
// reach APIs that answer `Access-Control-Allow-Origin: *`. Jira Cloud does not
// send CORS headers for API-token calls, so the plugin calls this proxy, which
// forwards to Jira and adds the CORS headers. It is a pass-through: the
// plugin sends the Authorization header, the proxy stores nothing.
//
// Safety: only https targets on *.atlassian.net, plus hosts listed in
// JIRA_PROXY_HOSTS (Jira Server / Data Center), are forwarded — it is not an
// open proxy. Only REST paths under the target (no `..` tricks), only
// requests addressed to localhost (no DNS rebinding) and only from Figma
// (`Origin: null`) or a localhost page (the dev harness). The server binds to
// loopback only and does not follow redirects.

export const TARGET_HEADER = 'x-jira-target'
const FORWARDED_HEADERS = ['authorization', 'content-type', 'accept'] as const
const FORWARDED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE'])
export const MAX_BODY_BYTES = 1_000_000
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i
const UPSTREAM_TIMEOUT_MS = 20_000

export const CORS_HEADERS: Readonly<Record<string, string>> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': `authorization, content-type, accept, ${TARGET_HEADER}`,
  // Chrome's Private Network Access: Figma (a public origin) calling localhost.
  'access-control-allow-private-network': 'true',
  'access-control-max-age': '600',
}

export interface ProxyRequest {
  method: string
  /** Path and query as received, e.g. `/rest/api/3/myself`. */
  url: string
  headers: Readonly<Record<string, string | undefined>>
  body?: string
}

export interface ProxyResponse {
  status: number
  headers: Record<string, string>
  body: string
}

export type Upstream = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal; redirect: 'manual' }) => Promise<{ status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>

/** The Jira base the plugin asked for, or null when it is not an allowed https Jira host. */
export function allowedTarget(raw: string | undefined, extraHosts: readonly string[]): URL | null {
  if (!raw) return null
  let target: URL
  try { target = new URL(raw) } catch { return null }
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) return null
  const host = target.hostname.toLowerCase()
  const allowed = host.endsWith('.atlassian.net') || extraHosts.some((h) => h.toLowerCase() === host)
  return allowed ? target : null
}

/** Hosts from JIRA_PROXY_HOSTS ("jira.acme.com, jira.internal"). */
export function parseHosts(value: string | undefined): string[] {
  return (value ?? '').split(',').map((h) => h.trim()).filter(Boolean)
}

/** The upstream URL for a REST path under the target, or null when the path escapes it. */
export function upstreamUrl(target: URL, path: string): string | null {
  if (/\.\.|%2e|%2f|%5c|\\/i.test(path) || !path.startsWith('/rest/')) return null
  const prefix = target.pathname.replace(/\/+$/, '')
  const url = new URL(`${prefix}${path}`, target.origin)
  return url.origin === target.origin && url.pathname.startsWith(`${prefix}/rest/`) ? url.href : null
}

/** Requests must be addressed to localhost and come from Figma (Origin: null), a localhost page or no browser at all. */
export function trustedCaller(headers: ProxyRequest['headers']): boolean {
  const host = headers.host
  const origin = headers.origin
  return (host === undefined || LOOPBACK.test(host)) && (origin === undefined || origin === 'null' || LOCAL_ORIGIN.test(origin))
}

function json(status: number, payload: unknown): ProxyResponse {
  return { status, headers: { ...CORS_HEADERS, 'content-type': 'application/json' }, body: JSON.stringify(payload) }
}

/** One request through the proxy. Never throws: upstream failures become 502 / 504 JSON. */
export async function handleProxyRequest(req: ProxyRequest, extraHosts: readonly string[], upstream: Upstream): Promise<ProxyResponse> {
  if (!trustedCaller(req.headers)) return json(403, { errorMessages: ['The Jira proxy only answers Figma and localhost pages.'] })
  if (req.method === 'OPTIONS') return { status: 204, headers: { ...CORS_HEADERS }, body: '' }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) return json(200, { ok: true, service: 'bluebird-jira-proxy' })
  if (!FORWARDED_METHODS.has(req.method)) return json(405, { errorMessages: ['The proxy forwards GET, POST, PUT and DELETE only.'] })
  if (!req.url.startsWith('/rest/')) return json(404, { errorMessages: ['The proxy only forwards Jira REST paths (/rest/…).'] })

  const target = allowedTarget(req.headers[TARGET_HEADER], extraHosts)
  if (!target) {
    return json(400, { errorMessages: [`Set ${TARGET_HEADER} to your https Jira site (*.atlassian.net, or a host listed in JIRA_PROXY_HOSTS).`] })
  }
  if (req.body && Buffer.byteLength(req.body) > MAX_BODY_BYTES) return json(413, { errorMessages: ['Request body is too large.'] })

  const headers: Record<string, string> = { 'x-atlassian-token': 'no-check' }
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name]
    if (value) headers[name] = value
  }
  const url = upstreamUrl(target, req.url)
  if (!url) return json(400, { errorMessages: ['That path is not a Jira REST path under the target.'] })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const res = await upstream(url, { method: req.method, headers, body: req.body || undefined, signal: controller.signal, redirect: 'manual' })
    // A redirect would leave the allow-listed host; surface it instead of following it.
    if (res.status >= 300 && res.status < 400) return json(502, { errorMessages: [`Jira redirected the request (${res.status}). Check the Site URL.`] })
    const body = await res.text()
    return { status: res.status, headers: { ...CORS_HEADERS, 'content-type': res.headers.get('content-type') ?? 'application/json' }, body }
  } catch (error: unknown) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return json(timedOut ? 504 : 502, { errorMessages: [timedOut ? 'Jira did not answer in time.' : `Could not reach ${target.host}.`] })
  } finally {
    clearTimeout(timer)
  }
}
