// Fixture handlers for browser-only development (?mode=mock), stories and UI
// tests. With `growOnRefresh`, the first read leaves out the three newest
// entries and the next one adds them, so Refresh has something new to show.
import type { HandlerMap } from '@shared/bridge'
import { SAMPLE_JIRA, SAMPLE_REPO, sampleEntries } from './fixtures'
import { HISTORY_CHECK, type HistoryCheckResult } from '@shared/history/watch'
import { MSG, listRequestSchema, type ListResult } from './messages'

/** Matches the dev harness "data" knob. */
export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

export interface HistoryMockOptions {
  scenario?: MockScenario
  notConnected?: boolean
  growOnRefresh?: boolean
  delayMs?: number
  now?: () => Date
  /** Settings › Storage refresh interval the mock reports; 0 turns automatic checks off. */
  refreshMs?: number
}

export const LIST_FAILED_MESSAGE = 'GitHub didn’t accept the access token. Create a new one and paste it in Settings › GitHub.'

const wait = (ms: number) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()

export function createMockHandlers(options: HistoryMockOptions | MockScenario = {}): HandlerMap {
  const { scenario = 'default', notConnected = false, growOnRefresh = true, delayMs = 250, now = () => new Date(), refreshMs = 60_000 } = typeof options === 'string' ? { scenario: options } : options
  let calls = 0
  return {
    [MSG.list]: async (payload: unknown): Promise<ListResult> => {
      const { days } = listRequestSchema.parse(payload)
      await wait(scenario === 'slow' ? 3000 : delayMs)
      if (scenario === 'error') throw new Error(LIST_FAILED_MESSAGE)
      const at = now()
      if (notConnected) return { repo: { connected: false, repo: '', problem: 'Add the repository and API key in Settings › Storage' }, entries: [], jiraSite: '', fetchedAt: at.toISOString(), refreshMs }
      calls += 1
      const since = at.getTime() - days * 86_400_000
      let entries = scenario === 'empty' ? [] : sampleEntries(at).filter((e) => Date.parse(e.at) >= since)
      if (growOnRefresh && calls === 1) entries = entries.slice(3)
      return { repo: { connected: true, repo: `${SAMPLE_REPO} · .bluebird/history` }, entries, jiraSite: SAMPLE_JIRA, fetchedAt: at.toISOString(), refreshMs }
    },
    // Before History is first opened, teammates have added the three entries the first read leaves out.
    [HISTORY_CHECK]: async (): Promise<HistoryCheckResult> => notConnected || scenario === 'error' || scenario === 'empty' || calls > 0 || !growOnRefresh
      ? { connected: !notConnected && scenario !== 'error', unseen: 0, by: [] }
      : { connected: true, unseen: 3, by: ['Praveen Manchi', 'Ravi Kumar', 'Anita Rao'] },
    [MSG.open]: async (payload: { url: string }) => { if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(payload.url, '_blank', 'noopener') },
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
