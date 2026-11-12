// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'
import type { HistoryEntry } from '@shared/history/types'

export const MSG = {
  /** The team's entries for a date range. Also what Refresh calls. */
  list: 'history:list',
  /** Open a pull request, commit, report or Jira ticket in the browser. */
  open: 'history:open',
} as const

export const RANGES = [7, 30, 90] as const
export type RangeDays = typeof RANGES[number]

export const listRequestSchema = z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) })
export const openRequestSchema = z.object({ url: z.string().check(z.regex(/^https:\/\/[^\s]+$/), z.maxLength(2048)) })

export interface RepoStatus {
  connected: boolean
  repo: string
  /** Why it isn't connected, e.g. "Add the access token in Settings › GitHub". */
  problem?: string
}

export interface ListResult {
  repo: RepoStatus
  entries: readonly HistoryEntry[]
  /** Settings › Jira site, e.g. https://acme.atlassian.net — '' when unset, so tickets show without a link. */
  jiraSite: string
  fetchedAt: string
  /** Settings › Storage › “Check for teammates’ changes”, in ms; 0 = only when Refresh is pressed. */
  refreshMs: number
}
