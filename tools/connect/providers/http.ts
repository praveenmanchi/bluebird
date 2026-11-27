// The few things every provider does over HTTP: a timeout, JSON in, and failures turned into a
// ProviderError whose code is safe to log.
import { ProviderError } from './types'

export type ProviderFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) =>
  Promise<{ status: number; json(): Promise<unknown> }>

/** Some APIs (GitHub's) refuse requests without one. */
export const USER_AGENT = 'bluebird-connect'
const TIMEOUT_MS = 10_000

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** One request; the body parsed as JSON (null when it isn't). Network failure or timeout → ProviderError('network'). */
export async function request(fetch: ProviderFetch, url: string, init: Parameters<ProviderFetch>[1]): Promise<{ status: number; body: unknown }> {
  let res: Awaited<ReturnType<ProviderFetch>>
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    throw new ProviderError('network')
  }
  return { status: res.status, body: await res.json().catch(() => null) }
}

/**
 * The token endpoint's answer as an object with an access_token, or a ProviderError: the provider's
 * own `error` code when it sends one (OAuth's standard shape), else token_<status>.
 */
export function tokenAnswer(status: number, body: unknown): Record<string, unknown> & { access_token: string } {
  if (isRecord(body) && typeof body.error === 'string') throw new ProviderError(body.error)
  if (status !== 200 || !isRecord(body) || typeof body.access_token !== 'string' || !body.access_token) throw new ProviderError(`token_${status}`)
  return body as Record<string, unknown> & { access_token: string }
}

/** ISO expiry from an OAuth `expires_in`, or '' when the token doesn't expire. */
export function expiryFrom(body: Record<string, unknown>, now: number): string {
  const seconds = typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 0
  return seconds ? new Date(now + seconds * 1000).toISOString() : ''
}

/** The refresh token, when the provider sent one (kept server-side for Phase 5). */
export function refreshFrom(body: Record<string, unknown>): { refreshToken?: string } {
  return typeof body.refresh_token === 'string' && body.refresh_token ? { refreshToken: body.refresh_token } : {}
}

/** First non-empty string among `keys` on an API answer. */
export function firstText(body: unknown, keys: readonly string[]): string | null {
  if (!isRecord(body)) return null
  for (const key of keys) {
    const value = body[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/** Reads an env value or null; throws a named error when it's set but doesn't match `pattern`. */
export function envValue(env: Readonly<Record<string, string | undefined>>, name: string, pattern?: RegExp): string | null {
  const value = env[name]?.trim() ?? ''
  if (!value) return null
  if (pattern && !pattern.test(value)) throw new Error(`${name} has characters it never has. Check you copied the right value.`)
  return value
}
