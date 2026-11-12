// Fixture handlers for browser-only development (?mode=mock), stories and UI
// tests. With `growOnRefresh`, the first read leaves out the three newest
// entries and the next one adds them, so Refresh has something new to show.
import type { HandlerMap } from '@shared/bridge'
import { SAMPLE_JIRA, SAMPLE_REPO, sampleEntries } from './fixtures'
import { HISTORY_CHECK, type HistoryCheckResult } from '@shared/history/watch'
import type { HistoryEntry } from '@shared/history/types'
import { approveEntry, changelogEntry, draftTitle, isPending } from './changelog'
import { CHANGELOG, MSG, approveRequestSchema, listRequestSchema, submitRequestSchema, type ApproveResult, type ChangelogContext, type ChangelogDraft, type ListResult, type SubmitResult } from './messages'
import { SAMPLE_CHANGES } from './fixtures'

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
  /** The open file is not a branch: the pop-up explains instead of comparing. */
  notBranch?: boolean
}

export const LIST_FAILED_MESSAGE = 'GitHub didn’t accept the access token. Create a new one and paste it in Settings › GitHub.'

const wait = (ms: number) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()

export function createMockHandlers(options: HistoryMockOptions | MockScenario = {}): HandlerMap {
  const { scenario = 'default', notConnected = false, growOnRefresh = true, delayMs = 250, now = () => new Date(), refreshMs = 60_000, notBranch = false } = typeof options === 'string' ? { scenario: options } : options
  let calls = 0
  /** Changelogs submitted (and approved) in this session, on top of the samples. */
  let own: HistoryEntry[] = []
  const context: ChangelogContext = notBranch
    ? { file: 'Project Bluebird UI', page: 'Atoms', user: 'Praveen Manchi', main: null, problem: 'This file is not a branch. Open the branch you made your changes in, then generate the changelog there.' }
    : { file: 'button-refresh', page: 'Atoms', user: 'Praveen Manchi', main: 'Project Bluebird UI' }
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
      entries = [...own, ...entries.filter((e) => !own.some((o) => o.id === e.id))].sort((a, b) => b.at.localeCompare(a.at))
      return { repo: { connected: true, repo: `${SAMPLE_REPO} · .bluebird/history` }, entries, jiraSite: SAMPLE_JIRA, fetchedAt: at.toISOString(), refreshMs }
    },
    // Before History is first opened, teammates have added the three entries the first read leaves out.
    [HISTORY_CHECK]: async (): Promise<HistoryCheckResult> => notConnected || scenario === 'error' || scenario === 'empty' || calls > 0 || !growOnRefresh
      ? { connected: !notConnected && scenario !== 'error', unseen: 0, by: [] }
      : { connected: true, unseen: 3, by: ['Praveen Manchi', 'Ravi Kumar', 'Anita Rao'] },
    [CHANGELOG.context]: async (): Promise<ChangelogContext> => context,
    [CHANGELOG.generate]: async (): Promise<ChangelogDraft> => {
      await wait(scenario === 'slow' ? 3000 : delayMs)
      if (scenario === 'error') throw new Error('The main file’s API key is missing the file_variables:read scope. Create a token with it.')
      const changes = scenario === 'empty' ? [] : SAMPLE_CHANGES
      return { draftId: 'mock-draft', context, title: draftTitle(changes, context.file), changes, warnings: [] }
    },
    [CHANGELOG.submit]: async (payload: unknown): Promise<SubmitResult> => {
      const req = submitRequestSchema.parse(payload)
      await wait(delayMs)
      const at = now()
      const entry: HistoryEntry = {
        ...changelogEntry({ changes: scenario === 'empty' ? [] : SAMPLE_CHANGES, title: req.title, notes: req.notes, ticket: req.ticket, by: context.user, team: 'Design System', file: context.file, main: context.main ?? '', page: context.page, warnings: [], time: at.toISOString().slice(11, 16) }),
        schema: 1, id: `mock${at.getTime().toString(36)}`, at: at.toISOString(),
      }
      own = [entry, ...own]
      return { id: entry.id, card: req.addCard, message: `Submitted for review. Your team sees it in History as Under review.${req.addCard ? ' The changelog card is on this page.' : ''}` }
    },
    [CHANGELOG.approve]: async (payload: unknown): Promise<ApproveResult> => {
      const req = approveRequestSchema.parse(payload)
      await wait(delayMs)
      const entry = [...own, ...sampleEntries(now())].find((e) => e.id === req.id)
      if (!entry || !isPending(entry)) throw new Error('This entry is not waiting for review.')
      own = [approveEntry(entry, { by: 'Anita Rao', at: now().toISOString() }), ...own.filter((e) => e.id !== entry.id)]
      return { message: `Approved. “${entry.title}” is now in ${SAMPLE_REPO} · .bluebird/DESIGN-CHANGELOG.md.` }
    },
    [MSG.open]: async (payload: { url: string }) => { if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(payload.url, '_blank', 'noopener') },
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
