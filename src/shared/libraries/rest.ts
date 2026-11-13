// Figma REST transport for Dual File Mode. api.figma.com answers CORS with `*`, so the
// plugin calls it directly (no proxy). Runs in the Figma sandbox (no URL global) and in
// the browser dev harness; the token only ever goes to api.figma.com.

export const FIGMA_API = 'https://api.figma.com/v1'

/** The subset of fetch the sandbox (Figma's fetch), the browser and tests all provide. */
export type HttpFetch = (url: string, init: { method: string; headers: Record<string, string> }) => Promise<HttpResponse>
export interface HttpResponse {
  status: number
  text(): Promise<string>
  /** Read for Retry-After on a 429 when the runtime exposes it (browser, tests). */
  headers?: { get(name: string): string | null }
  /** Figma's sandbox fetch gives its headers only as this plain object, with no `headers`. */
  headersObject?: Readonly<Record<string, string>>
}

/** One response header from either shape, whatever the case of its name. */
export function headerOf(res: HttpResponse, name: string): string | null {
  const direct = res.headers?.get(name)
  if (direct) return direct
  const wanted = name.toLowerCase()
  const found = Object.entries(res.headersObject ?? {}).find(([key]) => key.toLowerCase() === wanted)
  return found ? found[1] : null
}

export class LibraryError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'LibraryError'
  }
}

/** What a request is for, so a 403 can name the scope or plan it needs. */
export type Need = 'variables' | 'components' | 'styles' | 'nodes' | 'meta' | 'analytics' | 'versions'

const SCOPE: Record<Need, string> = { variables: 'file_variables:read', components: 'library_content:read', styles: 'library_content:read', nodes: 'file_content:read', meta: 'file_metadata:read', analytics: 'library_analytics:read', versions: 'file_versions:read' }

/** Figma's own explanation from an error body ({ err } or { message }). */
function figmaDetail(body: string): string {
  try {
    const parsed = JSON.parse(body) as { err?: unknown; message?: unknown }
    return String(parsed.err ?? parsed.message ?? '').trim()
  } catch {
    return ''
  }
}

function failure(status: number, body: string, need: Need, label: string): LibraryError {
  const detail = figmaDetail(body)
  if (status === 401 || /invalid token/i.test(detail)) {
    return new LibraryError(`Figma rejected ${label}’s API key. Create a new personal access token in Figma › Settings › Security.`, status)
  }
  if (status === 403) {
    if (/scope/i.test(detail)) return new LibraryError(`${label}’s API key is missing the ${SCOPE[need]} scope. Create a token with it.`, status)
    if (/account type/i.test(detail)) {
      return new LibraryError(`${label}: this API key belongs to a guest or another account type. Reading ${need} over the REST API needs a full member of the Enterprise org — use a token from a full member.`, status)
    }
    if (need === 'variables' && /plan|enterprise|upgrade/i.test(detail)) {
      return new LibraryError(`${label}: reading variables over the REST API needs a Figma Enterprise plan. Set this file to “Components” instead.`, status)
    }
    return new LibraryError(`${label}: this API key can’t open the file. Check the file is shared with the key’s owner.${detail ? ` Figma said: ${detail}` : ''}`, status)
  }
  if (status === 404) return new LibraryError(`Figma couldn’t find ${label}. Check its ID (from figma.com/design/<file-id>/…).`, status)
  if (status === 429) return new LibraryError('Figma is still rate-limiting requests after a few retries. Wait a minute and try again.', status)
  return new LibraryError(`${label}: Figma answered ${status}.${detail ? ` ${detail}` : ''}`, status)
}

export type FigmaGet = <T>(path: string, need: Need) => Promise<T>

/** A hung request would hold the shared load forever; Figma answers even large variable files well inside this. */
export const REQUEST_TIMEOUT_MS = 60_000

const timeout = <T>(work: Promise<T>, ms: number): Promise<T> => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms)
  work.then((v) => { clearTimeout(timer); resolve(v) }, (e: unknown) => { clearTimeout(timer); reject(e) })
})

/** Retries after a 429 before giving up, and the longest wait the plugin holds a loading panel for. */
export const RATE_LIMIT_RETRIES = 2
export const MAX_RETRY_WAIT_MS = 10_000

/** Seconds from Retry-After as Figma gave them, else 1 s, 2 s… */
export function retryWaitMs(retryAfter: string | null | undefined, attempt: number): number {
  const seconds = Number(retryAfter)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000 * 2 ** attempt
}

/** "45 seconds", "30 minutes", "3 hours": how long Figma asked to wait. */
export function waitText(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  const [n, unit] = seconds < 90 ? [seconds, 'second'] : seconds < 5400 ? [Math.round(seconds / 60), 'minute'] : [Math.round(seconds / 3600), 'hour']
  return `${n} ${unit}${n === 1 ? '' : 's'}`
}

/**
 * Retrying sooner than Retry-After only spends another request against the limit. View and
 * Collab seats get a monthly allowance on file reads, so the wait can be far longer than a panel can hold.
 */
const tooLong = (ms: number) => new LibraryError(`Figma is rate-limiting this API key and asked to wait ${waitText(ms)}. Try again after that; a key from a Full or Dev seat has much higher limits.`, 429)

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A GET bound to one token. `label` names the file in messages ("File 1"); `path` starts after /v1. */
export function createFigmaGet(token: string, label: string, fetchImpl: HttpFetch, sleep: (ms: number) => Promise<void> = wait): FigmaGet {
  return async <T>(path: string, need: Need): Promise<T> => {
    for (let attempt = 0; ; attempt += 1) {
      let res: HttpResponse
      let text: string
      try {
        res = await timeout(fetchImpl(`${FIGMA_API}${path}`, { method: 'GET', headers: { 'X-Figma-Token': token, accept: 'application/json' } }), REQUEST_TIMEOUT_MS)
        text = await res.text()
      } catch {
        throw new LibraryError('Couldn’t reach api.figma.com. Check your connection and try again.', 0)
      }
      if (res.status === 429 && attempt < RATE_LIMIT_RETRIES) {
        const waitMs = retryWaitMs(headerOf(res, 'retry-after'), attempt)
        if (waitMs > MAX_RETRY_WAIT_MS) throw tooLong(waitMs)
        await sleep(waitMs)
        continue
      }
      if (res.status < 200 || res.status >= 300) throw failure(res.status, text, need, label)
      try {
        return JSON.parse(text) as T
      } catch {
        throw new LibraryError(`${label}: Figma sent a response that isn’t JSON.`, res.status)
      }
    }
  }
}
