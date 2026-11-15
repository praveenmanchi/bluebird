// Figma API key screen: checks a personal access token with GET /v1/me before it is saved.
// The token only goes to api.figma.com, and nothing is stored here: the screen saves it into
// Settings › Dual File (integrations) once this check passes.
import type { HandlerMap } from '@shared/bridge'
import { FIGMA_API, type HttpFetch } from '@shared/libraries/rest'
import { FIGMA_KEY_MSG, type FigmaKeyCheckResult } from '@shared/session'

const MIN_TOKEN = 10
const MAX_TOKEN = 256

export class FigmaKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FigmaKeyError'
  }
}

/** The token from a screen payload, trimmed; throws a readable error for anything else. */
export function tokenOf(payload: unknown): string {
  const raw = (payload as { token?: unknown } | null)?.token
  const token = typeof raw === 'string' ? raw.trim() : ''
  if (token.length < MIN_TOKEN || token.length > MAX_TOKEN || /\s/.test(token)) {
    throw new FigmaKeyError('That doesn’t look like a Figma personal access token. Copy it again from Figma › Settings › Security.')
  }
  return token
}

export async function checkFigmaKey(payload: unknown, fetchImpl: HttpFetch): Promise<FigmaKeyCheckResult> {
  const token = tokenOf(payload)
  let res
  try {
    res = await fetchImpl(`${FIGMA_API}/me`, { method: 'GET', headers: { 'X-Figma-Token': token } })
  } catch {
    throw new FigmaKeyError('Couldn’t reach Figma. Check your connection and try again.')
  }
  if (res.status === 401 || res.status === 403) {
    throw new FigmaKeyError('Figma didn’t accept it. Check it hasn’t expired and has the File content scope, then paste it again.')
  }
  if (res.status !== 200) throw new FigmaKeyError(`Figma answered ${res.status}. Try again in a moment.`)
  let handle = ''
  try {
    const body = JSON.parse(await res.text()) as { handle?: unknown }
    handle = typeof body.handle === 'string' ? body.handle : ''
  } catch {
    handle = ''
  }
  return { handle }
}

export function createFigmaKeyHandlers(deps: { fetch: HttpFetch }): HandlerMap {
  return {
    [FIGMA_KEY_MSG.check]: (payload: unknown) => checkFigmaKey(payload, deps.fetch),
  }
}
