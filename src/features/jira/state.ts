// Tab-local state. Nothing outside src/features/jira reads or writes this.
// reset() leaves the fixture board in place so stories and tests can render
// <JiraBoard /> directly; the tab itself replaces it with `jira:load` data.
import { signal } from '@preact/signals'
import { boardDefaults, type BoardFilters } from './board'
import { CURRENT_SPRINT, ME, SAMPLE_SITE, TICKETS } from './fixtures'
import type { Person, Ticket } from './types'

/** Which body the tab shows. */
export type Connection = 'loading' | 'connected' | 'not-connected' | 'error'
/** Figma "Activity tabs". */
export type ActivityTab = 'Comments' | 'History' | 'Work log'

const FIXTURE_SYNC_AGE = 2 * 60_000

export const connection = signal<Connection>('connected')
/** Why the first load failed (Error state body). */
export const loadError = signal<string | null>(null)
/** Why the Not connected state shows: Jira off, fields missing, or fields that fail validation. */
export const settingsProblem = signal<{ reason: 'disabled' | 'incomplete' | 'invalid'; fields: readonly string[] }>({ reason: 'disabled', fields: [] })
export const tickets = signal<readonly Ticket[]>(TICKETS)
/** The Jira site, for "Open in Jira" and "Copy issue link". */
export const site = signal(SAMPLE_SITE)
export const me = signal<Person>(ME)
export const syncedAt = signal<number | null>(Date.now() - FIXTURE_SYNC_AGE)
/** What "Clear filters" returns to: the active sprint, everything else open. */
export const defaultFilters = signal<BoardFilters>(boardDefaults(CURRENT_SPRINT, TICKETS))
export const filters = signal<BoardFilters>(boardDefaults(CURRENT_SPRINT, TICKETS))
export const refreshing = signal(false)
/** Jira matched more issues than the board reads (api/client MAX_ISSUES). */
export const truncated = signal(false)
/** A refresh failed while tickets were showing (Figma "Jira UI · Refresh failed"). */
export const refreshError = signal<string | null>(null)
/** Issues whose comments / history / work log / links have been fetched. */
export const loadedDetail = signal<ReadonlySet<string>>(new Set())
/** Label of the Jira write in flight ("Changing status…"); null when idle. */
export const busy = signal<string | null>(null)
export const selectedKey = signal<string | null>('BB-142')
export const activityTab = signal<ActivityTab>('Comments')
export const commentDraft = signal('')
/** The comment being edited in the composer; null when composing a new one. */
export const editingCommentId = signal<string | null>(null)
/** One-line status message in the ticket detail (nothing selected to attach, a Jira error, …). */
export const notice = signal<string | null>(null)

export function setFilter<K extends keyof BoardFilters>(key: K, value: BoardFilters[K]): void {
  filters.value = { ...filters.value, [key]: value }
}

export function replaceTicket(ticket: Ticket): void {
  tickets.value = tickets.value.some((t) => t.key === ticket.key)
    ? tickets.value.map((t) => (t.key === ticket.key ? ticket : t))
    : [...tickets.value, ticket]
}

export function issueUrl(key: string): string {
  return `${site.value.replace(/\/+$/, '')}/browse/${encodeURIComponent(key)}`
}

export function reset(): void {
  connection.value = 'connected'
  loadError.value = null
  settingsProblem.value = { reason: 'disabled', fields: [] }
  tickets.value = TICKETS
  site.value = SAMPLE_SITE
  me.value = ME
  syncedAt.value = Date.now() - FIXTURE_SYNC_AGE
  defaultFilters.value = boardDefaults(CURRENT_SPRINT, TICKETS)
  filters.value = boardDefaults(CURRENT_SPRINT, TICKETS)
  refreshing.value = false
  truncated.value = false
  refreshError.value = null
  loadedDetail.value = new Set()
  busy.value = null
  selectedKey.value = 'BB-142'
  activityTab.value = 'Comments'
  commentDraft.value = ''
  editingCommentId.value = null
  notice.value = null
}
