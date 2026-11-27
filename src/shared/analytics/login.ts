// Reports one access-code login to Bluebird Connect, which counts it in Cloudflare Analytics Engine
// (tools/connect/events.ts says what's stored). Sent once per login, never on reopen.
//
// Only a build with VITE_LOGIN_ANALYTICS_URL set reports anything (put it in .env, git-ignored).
// Builds without it send nothing, and so does a broker that isn't in the manifest's network list.
import { BUILD_VERSION } from '@shared/buildInfo'

export interface ReportOptions {
  /** Broker base address; '' turns reporting off. */
  url: string
  version: string
  fetch: typeof fetch
}

const TIMEOUT_MS = 5_000

const builtInUrl = (): string => {
  const value: unknown = import.meta.env.VITE_LOGIN_ANALYTICS_URL
  return typeof value === 'string' ? value.trim() : ''
}

const defaults = (): ReportOptions => ({ url: builtInUrl(), version: BUILD_VERSION, fetch: (...args) => fetch(...args) })

/** True when the broker took the report. Never throws: analytics must not get in the way of logging in. */
export async function reportLogin(input: { brand: string; /** From session:login: SHA-256 hex of the Figma user id, or null. */ userKey: string | null }, options: ReportOptions = defaults()): Promise<boolean> {
  const base = options.url.replace(/\/+$/, '')
  if (!base) return false
  try {
    const res = await options.fetch(`${base}/events/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-connect-client': 'bluebird' },
      body: JSON.stringify({ brand: input.brand, user: input.userKey, version: options.version }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return res.status === 204
  } catch {
    return false
  }
}
