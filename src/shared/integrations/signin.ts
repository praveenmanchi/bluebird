// Sign-in through a Bluebird broker, the pattern Figma documents for plugin OAuth
// (docs/research/enterprise-integrations-roadmap.md §4.3): the plugin asks the
// broker for a read/write key pair, opens the broker's start page in the browser
// with the write key, and polls with the read key until the person has signed
// in. The broker holds the app's client secret and swaps the code for a token;
// the plugin only ever sees the token. Runs in the plugin UI (fetch + crypto).
import * as z from 'zod/mini'

/**
 * Bluebird Cloud, the hosted broker for github.com and Jira Cloud. Not deployed yet (roadmap Phase 2),
 * so sign-in is offered only where a company gateway is set.
 */
export const BLUEBIRD_CLOUD_URL = ''

export type SignInService = 'github' | 'jira'

export interface SignInResult {
  /** Goes in the section's apiKey. */
  accessToken: string
  /** "@maria-r" (GitHub login) or "Maria Rossi" (Atlassian name). */
  account: string
  /** ISO date the token stops working; '' when it doesn't expire. */
  expiresAt: string
}

const resultSchema = z.object({
  accessToken: z.string().check(z.minLength(1), z.maxLength(4096)),
  account: z.string().check(z.maxLength(200)),
  expiresAt: z._default(z.string().check(z.maxLength(40)), ''),
})

const trimSlash = (s: string): string => s.trim().replace(/\/+$/, '')

/** The broker sign-in goes through: the company gateway when one is set, else Bluebird Cloud, else none. */
export function signInBroker(gatewayUrl: string): string | null {
  return trimSlash(gatewayUrl) || BLUEBIRD_CLOUD_URL || null
}

/** The browser page that starts the sign-in for `host` (the GitHub or Jira the person pasted). */
export function startUrl(broker: string, service: SignInService, host: string, writeKey: string): string {
  return `${trimSlash(broker)}/auth/${service}/start?host=${encodeURIComponent(host)}&write=${writeKey}`
}

export class SignInError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignInError'
  }
}

type Fetch = (url: string, init: { method: string; signal?: AbortSignal }) => Promise<{ status: number; json(): Promise<unknown> }>

const KEY = z.string().check(z.regex(/^[A-Za-z0-9_-]{16,128}$/))
const keysSchema = z.object({ read: KEY, write: KEY })
export interface SignInKeys { read: string; write: string }

const RETRY = ' Try again, or use a token.'
const unreadable = () => new SignInError(`The sign-in service sent something Bluebird can’t read.${RETRY}`)
const answered = (status: number) => new SignInError(`The sign-in service answered ${status}.${RETRY}`)
const unreachable = () => new SignInError('Couldn’t reach the sign-in service. Check you’re online (and on the VPN), then try again.')

/** Asks the broker for a fresh read/write pair: the write key goes to the browser, the read key stays here. */
export async function requestKeys(broker: string, service: SignInService, options: { fetch?: Fetch; signal?: AbortSignal } = {}): Promise<SignInKeys> {
  const get = options.fetch ?? (fetch as unknown as Fetch)
  let res: { status: number; json(): Promise<unknown> }
  try {
    res = await get(`${trimSlash(broker)}/auth/${service}/keys`, { method: 'POST', signal: options.signal })
  } catch (error: unknown) {
    if (options.signal?.aborted) throw error
    throw unreachable()
  }
  if (res.status !== 200) throw answered(res.status)
  const parsed = z.safeParse(keysSchema, await res.json().catch(() => null))
  if (!parsed.success) throw unreadable()
  return parsed.data
}

export interface PollOptions {
  fetch?: Fetch
  signal?: AbortSignal
  intervalMs?: number
  /** Gives up after this long; a person who walks away doesn't leave the plugin polling. */
  timeoutMs?: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 5 * 60_000
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Polls the broker until the sign-in finishes. 200 = done (the broker deletes the record), 202 / 204 = still
 * waiting, 404 / 410 = the key expired. Rejects with SignInError (or an AbortError when `signal` fires).
 */
export async function pollSignIn(broker: string, readKey: string, options: PollOptions = {}): Promise<SignInResult> {
  const { fetch: get = fetch as unknown as Fetch, signal, intervalMs = POLL_INTERVAL_MS, timeoutMs = POLL_TIMEOUT_MS, sleep = wait, now = Date.now } = options
  const url = `${trimSlash(broker)}/auth/poll?read=${readKey}`
  const deadline = now() + timeoutMs
  while (now() < deadline) {
    signal?.throwIfAborted()
    let res: { status: number; json(): Promise<unknown> }
    try {
      res = await get(url, { method: 'GET', signal })
    } catch (error: unknown) {
      if (signal?.aborted) throw error
      throw unreachable()
    }
    if (res.status === 200) {
      const parsed = z.safeParse(resultSchema, await res.json().catch(() => null))
      if (!parsed.success) throw unreadable()
      return parsed.data
    }
    if (res.status === 404 || res.status === 410) throw new SignInError('That sign-in expired. Start it again.')
    if (res.status !== 202 && res.status !== 204) throw answered(res.status)
    await sleep(intervalMs)
  }
  throw new SignInError('Sign-in took too long. Start it again when you’re ready.')
}

/** True when a stored sign-in has passed its expiry. */
export function signInExpired(expiresAt: string, now: number = Date.now()): boolean {
  const at = Date.parse(expiresAt)
  return Number.isFinite(at) && at <= now
}
