// Sandbox handlers for Dual File Mode, built from injected dependencies so the
// same code runs in Figma (src/sandbox/main.ts wires figma.clientStorage and
// Figma's fetch) and in the browser dev harness (tests/mocks wires window.fetch).
// Owns the connection: Settings in, a token-free LibraryIndex out.
import type { HandlerMap } from '@shared/bridge'
import { testMessage, type IntegrationValues } from '@shared/integrations'
import { filesFromSettings, loadLibraries, settingsProblem, testDualFile } from './load'
import type { HttpFetch } from './rest'
import { LIBRARIES_MSG, loadRequestSchema, type LibraryLoadResult } from './types'

export interface LibrariesDeps {
  readSettings: () => Promise<IntegrationValues<'dualFile'>>
  fetch: HttpFetch
  now?: () => number
}

/** What a tab's sandbox handlers use to reach the configured libraries. */
export interface LibrariesRuntime {
  load: () => Promise<LibraryLoadResult>
  readSettings: LibrariesDeps['readSettings']
  fetch: HttpFetch
}

let runtime: LibrariesRuntime | null = null

/** The loader the sandbox wired up, so a tab shares its cache instead of reading the files again. */
export function librariesRuntime(): LibrariesRuntime {
  if (!runtime) throw new Error('Dual File Mode isn’t available here.')
  return runtime
}

export function createLibrariesHandlers(deps: LibrariesDeps): HandlerMap {
  const now = deps.now ?? Date.now
  // One read per distinct configuration until Refresh; concurrent callers share the request in flight.
  let cached: { signature: string; result: Promise<LibraryLoadResult> } | null = null

  async function load(payload: unknown): Promise<LibraryLoadResult> {
    const refresh = loadRequestSchema.parse(payload ?? undefined)?.refresh === true
    const settings = await deps.readSettings()
    const problem = settingsProblem(settings)
    if (problem) { cached = null; return problem }
    const specs = filesFromSettings(settings)
    const signature = JSON.stringify(specs)
    if (refresh || cached?.signature !== signature) {
      const result = loadLibraries(specs, deps.fetch, now).then((index): LibraryLoadResult => ({ status: 'ready', index }))
      cached = { signature, result }
      // A failed read must not stick (offline, rate-limited, a bad key): the next call tries again.
      const forget = () => { if (cached?.result === result) cached = null }
      result.then((r) => { if (r.status === 'ready' && r.index.files.some((f) => f.error)) forget() }, forget)
    }
    return cached!.result
  }

  runtime = { load: () => load(undefined), readSettings: deps.readSettings, fetch: deps.fetch }

  return {
    [LIBRARIES_MSG.load]: load,
    [testMessage('dualFile')]: (payload: unknown) => testDualFile(payload, deps.fetch),
  }
}
