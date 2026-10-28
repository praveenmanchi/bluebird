// Figma REST client: one GET helper with the token check, a retry on rate limits and a typed HTTP error.

/** Why Figma refused with a 403 (the variables endpoints document all three). */
export type ForbiddenReason = 'scope' | 'account' | 'plan' | 'access'

export class FigmaHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }

  /** Figma answers 403 both for a plan without the endpoint and for a token without the scope. */
  get isScope(): boolean { return this.status === 403 && /scope/i.test(this.message) }

  /** "Invalid scope", "Incorrect account type" (a guest or non-full member), "Limited by Figma plan", or no access. */
  get forbiddenReason(): ForbiddenReason | undefined {
    if (this.status !== 403) return undefined
    if (this.isScope) return 'scope'
    if (/account type/i.test(this.message)) return 'account'
    if (/plan/i.test(this.message)) return 'plan'
    return 'access'
  }
}

/** Attempts after a 429 before giving up. */
export const MAX_RATE_LIMIT_RETRIES = 3
const MAX_WAIT_MS = 60_000

/** Seconds from Retry-After, else exponential backoff (1 s, 2 s, 4 s…), capped at a minute. */
export function retryDelayMs(retryAfter: string | null, attempt: number): number {
  const seconds = Number(retryAfter)
  const ms = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000 * 2 ** attempt
  return Math.min(ms, MAX_WAIT_MS)
}

export interface GetOptions {
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

export async function figmaGet<T>(path: string, { fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: GetOptions = {}): Promise<T> {
  const token = process.env.FIGMA_TOKEN
  if (!token) throw new Error('FIGMA_TOKEN is not set (personal access token with file_content:read, plus file_variables:read on Enterprise)')
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetchImpl(`https://api.figma.com/v1${path}`, { headers: { 'X-Figma-Token': token } })
    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      await sleep(retryDelayMs(res.headers.get('retry-after'), attempt))
      continue
    }
    if (!res.ok) throw new FigmaHttpError(res.status, `Figma API ${res.status} for ${path}: ${await res.text()}`)
    return res.json() as Promise<T>
  }
}

/** `?version=` pins a read to one saved Figma version, so a pull is reproducible. The variables
 *  endpoints take no version parameter: they always answer with the file's latest values. */
export function withVersion(path: string, version: string | undefined): string {
  if (!version) return path
  return `${path}${path.includes('?') ? '&' : '?'}version=${encodeURIComponent(version)}`
}
