// Jira REST transport: turns Settings › Jira Integration into a base URL and
// auth header, routes calls through the CORS proxy when one is set, and maps
// HTTP failures to sentences a designer can act on. Runs in the Figma sandbox
// (no URL, btoa or TextEncoder there), so everything is plain string work.
import * as z from 'zod/mini'
import { normalizeIntegration, sectionSchemas, validateIntegration, type IntegrationValues } from '@shared/integrations'

/** Header the proxy (tools/jira-proxy) reads to know which Jira to forward to. */
export const TARGET_HEADER = 'x-jira-target'

export interface JiraConfig {
  /** Cloud = REST v3 + ADF bodies + accountId; server = Jira Server / Data Center, REST v2 + plain text. */
  flavor: 'cloud' | 'server'
  /** Jira base the requests address, no trailing slash. */
  site: string
  /** Where requests are sent: the proxy when set, else the site itself. */
  endpoint: string
  authorization: string
  /** Optional JQL project filter ("DS"). */
  projectKey: string
}

export type SettingsProblem = { reason: 'disabled' | 'incomplete' | 'invalid'; missing: string[] }

const trimSlash = (s: string) => s.trim().replace(/\/+$/, '')
const FIELD_LABELS: Record<string, string> = { siteUrl: 'Site URL', baseUrl: 'Base URL', proxyUrl: 'Proxy URL', email: 'Email ID', projectKey: 'Project Key' }

/** The connection Settings describe, or why there is none. */
export function configFromSettings(s: IntegrationValues<'jira'>): JiraConfig | SettingsProblem {
  if (!s.enabled) return { reason: 'disabled', missing: [] }
  const server = s.baseUrl.trim() !== ''
  const missing = [
    ...(server || s.siteUrl.trim() ? [] : ['Site URL']),
    ...(s.apiKey.trim() ? [] : ['Jira API Key']),
    ...(server || s.email.trim() ? [] : ['Email ID']),
  ]
  if (missing.length) return { reason: 'incomplete', missing }
  // Stored values are re-checked here: the token is only ever sent to a host these rules allow.
  const invalid = Object.keys(validateIntegration('jira', s))
  if (invalid.length) return { reason: 'invalid', missing: invalid.map((k) => FIELD_LABELS[k] ?? k) }
  const site = trimSlash(server ? s.baseUrl : s.siteUrl)
  // Server / DC personal access tokens are bearer tokens; Cloud API tokens are basic auth with the email.
  const authorization = s.email.trim() ? `Basic ${base64(`${s.email.trim()}:${s.apiKey.trim()}`)}` : `Bearer ${s.apiKey.trim()}`
  return { flavor: server ? 'server' : 'cloud', site, endpoint: trimSlash(s.proxyUrl) || site, authorization, projectKey: s.projectKey.trim() }
}

export function isConfig(value: JiraConfig | SettingsProblem): value is JiraConfig {
  return 'site' in value
}

/** What to tell the designer when Settings don't describe a usable connection. */
export function problemMessage(problem: SettingsProblem): string {
  if (problem.reason === 'disabled') return 'Jira is switched off. Turn it on in Settings › Jira Integration.'
  const fields = problem.missing.join(', ')
  return problem.reason === 'invalid' ? `Fix the ${fields} in Settings › Jira Integration.` : `Add your ${fields} in Settings › Jira Integration.`
}

/** Settings › Test Connection: the form's (unsaved) values as a connection, tested even while the switch is off. */
export function configForTest(payload: unknown): JiraConfig {
  const parsed = z.safeParse(sectionSchemas.jira, payload)
  if (!parsed.success) throw new JiraError('Those Jira settings are incomplete or too long.', 0)
  const config = configFromSettings({ ...normalizeIntegration<'jira'>(parsed.data), enabled: true })
  if (!isConfig(config)) throw new JiraError(problemMessage(config), 0)
  return config
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function utf8(text: string): number[] {
  const bytes: number[] = []
  for (const ch of text) {
    const c = ch.codePointAt(0)!
    if (c < 0x80) bytes.push(c)
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return bytes
}

/** Standard base64 of the UTF-8 bytes (the sandbox has no btoa). */
export function base64(text: string): string {
  const b = utf8(text)
  let out = ''
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + (i + 1 < b.length ? B64[(n >> 6) & 63]! : '=') + (i + 2 < b.length ? B64[n & 63]! : '=')
  }
  return out
}

/** The subset of fetch the sandbox (Figma's fetch) and tests both provide. */
export type HttpFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ status: number; text(): Promise<string> }>

export class JiraError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'JiraError'
  }
}

/** Jira's own explanation from an error body ({ errorMessages, errors }), if any. */
function jiraDetail(body: string): string {
  try {
    const parsed = JSON.parse(body) as { errorMessages?: unknown; errors?: unknown; message?: unknown }
    const messages = [
      ...(Array.isArray(parsed.errorMessages) ? parsed.errorMessages.map(String) : []),
      ...(parsed.errors && typeof parsed.errors === 'object' ? Object.values(parsed.errors as Record<string, unknown>).map(String) : []),
      ...(typeof parsed.message === 'string' ? [parsed.message] : []),
    ]
    return messages.join(' ').trim()
  } catch {
    return ''
  }
}

function failure(status: number, body: string, viaProxy: boolean): JiraError {
  const detail = jiraDetail(body)
  const said = detail ? ` Jira said: ${detail}` : ''
  switch (status) {
    case 401: return new JiraError('Jira rejected the email or API token. Check them in Settings › Jira Integration.', status)
    case 403: return new JiraError(`Your Jira account isn’t allowed to do that.${said}`, status)
    case 404: return new JiraError(`Jira couldn’t find that. Check the Site URL in Settings.${said}`, status)
    case 429: return new JiraError('Jira is rate-limiting requests. Wait a minute and try again.', status)
    case 502: case 504: return new JiraError(viaProxy ? `The proxy couldn’t reach Jira.${said}` : `Jira didn’t respond.${said}`, status)
    default: return new JiraError(detail || `Jira answered ${status}.`, status)
  }
}

export type JiraRequest = <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<T>

/** A request function bound to one connection. `path` starts at the API root, e.g. `/myself`. */
export function createRequest(config: JiraConfig, fetchImpl: HttpFetch): JiraRequest {
  const version = config.flavor === 'cloud' ? '3' : '2'
  const viaProxy = config.endpoint !== config.site
  return async <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> => {
    const headers: Record<string, string> = { authorization: config.authorization, accept: 'application/json' }
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (viaProxy) headers[TARGET_HEADER] = config.site
    let res: { status: number; text(): Promise<string> }
    try {
      res = await fetchImpl(`${config.endpoint}/rest/api/${version}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    } catch {
      throw new JiraError(viaProxy
        ? 'Couldn’t reach the Jira proxy. Start it with `npm run jira:proxy` and check Settings › Proxy URL.'
        : 'Couldn’t reach Jira from Figma. Jira Cloud blocks direct plugin calls — set a Proxy URL in Settings › Jira Integration.', 0)
    }
    const text = await res.text()
    if (res.status < 200 || res.status >= 300) throw failure(res.status, text, viaProxy)
    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new JiraError('Jira sent a response that isn’t JSON. Check the Site URL points at Jira.', res.status)
    }
  }
}
