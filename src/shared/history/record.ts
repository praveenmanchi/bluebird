// What a tab's sandbox calls after something worth remembering happened.
// History is a side effect: it never throws, so a GitHub hiccup can't fail the
// push or report that triggered it — the caller just learns it wasn't recorded.
import type { IntegrationValues } from '@shared/integrations'
import { createCodeHost, type HostFetch as GithubFetch } from '@shared/codehost'
import { isStorageProblem, resolveStorage } from './config'
import { appendEntry } from './github'
import { newEntryId } from './store'
import type { HistoryEntry } from './types'

export interface RecordDeps {
  readGithub(): Promise<IntegrationValues<'github'>>
  /** Settings › Storage; omitted = the defaults (use the GitHub repository). */
  readStorage?(): Promise<IntegrationValues<'storage'>>
  fetch: GithubFetch
  sleep(ms: number): Promise<void>
  now(): Date
}

export type NewHistoryEntry = Omit<HistoryEntry, 'schema' | 'id' | 'at'> & { at?: string }

export async function recordHistory(deps: RecordDeps, entry: NewHistoryEntry): Promise<{ recorded: boolean; reason?: string }> {
  try {
    const [github, storage] = await Promise.all([deps.readGithub(), deps.readStorage?.()])
    const where = resolveStorage(storage, github)
    if (isStorageProblem(where)) return { recorded: false, reason: where.problem }
    const client = createCodeHost(where.config, deps.fetch, deps.sleep)
    const now = deps.now()
    await appendEntry(client, where.config.branch, where.folder, { ...entry, schema: 1, id: newEntryId(now), at: entry.at ?? now.toISOString() })
    return { recorded: true }
  } catch (e) {
    return { recorded: false, reason: e instanceof Error ? e.message : 'unknown error' }
  }
}
