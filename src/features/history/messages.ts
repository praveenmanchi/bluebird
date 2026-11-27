// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'
import type { Change } from '@shared/design/types'
import type { HistoryEntry } from '@shared/history/types'

export const MSG = {
  /** The team's entries for a date range. Also what Refresh calls. */
  list: 'history:list',
  /** Open a pull request, commit, report or Jira ticket in the browser. */
  open: 'history:open',
  /** Versioning: the open file's version history from the Figma REST API. */
  versions: 'history:versions',
  /** What changed in one version, compared with the version before it. */
  versionDiff: 'history:version-diff',
} as const

export const RANGES = [7, 30, 90] as const
export type RangeDays = typeof RANGES[number]

export const listRequestSchema = z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) })
export const openRequestSchema = z.object({ url: z.string().check(z.regex(/^https:\/\/[^\s]+$/), z.maxLength(2048)) })

export interface RepoStatus {
  connected: boolean
  repo: string
  /** Why it isn't connected, e.g. "Add the access token in Settings › Code repository". */
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

// ── Changelog: what a Figma branch changed against its main file ──────────────

export const CHANGELOG = {
  /** Where the person is: the file, the page, and whether the file is a branch. */
  context: 'history:changelog-context',
  /** Compare the branch with its main file. */
  generate: 'history:changelog-generate',
  /** Open tickets in the Jira project from Settings, for the ticket picker. */
  tickets: 'history:changelog-tickets',
  /** Save the compared changes to the team History as "under review". */
  submit: 'history:changelog-submit',
  /** A teammate approves a changelog: it is published to the shared changelog file. */
  approve: 'history:changelog-approve',
} as const

/** Settings › Notifications webhooks a changelog can go to, by whether they are filled in. */
export interface ReviewChannels { teams: boolean; outlook: boolean }

export interface ChangelogContext {
  file: string
  page: string
  user: string
  /** The main file's name when the open file is a branch; null when it isn't. */
  main: string | null
  /** Why a changelog can't be generated here, as a sentence; absent when it can. */
  problem?: string
  /** Which reviewer webhooks are set up. */
  channels: ReviewChannels
  /** Settings › Jira integration: connected, or why not. */
  jira: { connected: boolean; problem?: string }
}

/** One open ticket the picker lists. */
export interface TicketOption { key: string; title: string; status: string }
export interface TicketsResult { tickets: readonly TicketOption[]; problem?: string }

export interface ChangelogDraft {
  /** Identifies the compare; a submit must send it back. */
  draftId: string
  context: ChangelogContext
  title: string
  changes: readonly Change[]
  /** What could not be compared. */
  warnings: readonly string[]
  /** The Figma branch's link, for the Jira comment and the reviewers; '' when unknown. */
  branch: string
}

const TICKET = /^[A-Z][A-Z0-9]{1,9}-\d{1,7}$/
export const isTicket = (key: string): boolean => TICKET.test(key)

export const submitRequestSchema = z.object({
  draftId: z.string().check(z.minLength(1), z.maxLength(40)),
  title: z.string().check(z.minLength(1), z.maxLength(160)),
  notes: z.string().check(z.maxLength(2000)),
  /** Jira key to tag, e.g. BB-342; '' for none. */
  ticket: z.union([z.literal(''), z.string().check(z.regex(TICKET))]),
  /** Also draw the changelog card on the current page. */
  addCard: z.boolean(),
  /** Post the changes (and the Figma branch link) to the ticket as a Jira comment. */
  postToJira: z.boolean(),
  /** Reviewer webhooks to post to. */
  notify: z.object({ teams: z.boolean(), outlook: z.boolean() }),
})
export type SubmitRequest = z.infer<typeof submitRequestSchema>

export interface SubmitResult {
  id: string
  /** The card was drawn on the page. */
  card: boolean
  message: string
}

export const approveRequestSchema = z.object({
  id: z.string().check(z.regex(/^[A-Za-z0-9_-]{6,64}$/)),
  /** The entry's time: it names the day file the entry is in. */
  at: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/)),
  /** Post the approval to the changelog's ticket as a Jira comment. */
  postToJira: z.boolean(),
})

export interface ApproveResult { message: string }

// ── Versioning: the open file's Figma version history ────────────────────────

export const versionsRequestSchema = listRequestSchema
const VERSION_ID = z.string().check(z.regex(/^[0-9]{1,20}$/))
export const versionDiffRequestSchema = z.object({ id: VERSION_ID, previousId: z.union([z.null(), VERSION_ID]) })

export interface FileVersion {
  id: string
  /** ISO time it was saved. */
  at: string
  /** The name a person gave it; '' for an autosave. */
  label: string
  description: string
  by: string
}

export interface VersionsResult {
  /** The open file's name. */
  file: string
  versions: readonly FileVersion[]
  /** Why there is no history to show, e.g. no Figma REST key. */
  problem?: string
  /** True when the problem is a missing key or file key, so Settings can fix it. */
  needsSettings?: boolean
}

export interface StructureChange {
  kind: 'added' | 'removed' | 'modified'
  /** What the layer is: Page, Frame, Section, Component, Component set… */
  what: string
  name: string
  detail: string
}

export interface VersionDiff {
  changes: readonly StructureChange[]
  /** Pages and frames compared: what a reader should know about the limits. */
  note: string
}
