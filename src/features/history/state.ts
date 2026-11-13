// Tab-local state. Nothing outside src/features/history reads or writes this.
import { computed, signal } from '@preact/signals'
import type { HistoryEntry, HistoryType } from '@shared/history/types'
import type { ChangelogContext, ChangelogDraft, FileVersion, ListResult, RangeDays, TicketsResult, VersionDiff, VersionsResult } from './messages'

/** Versioning is not a History type: it reads the open file's Figma versions. Code Connect is no longer listed. */
export type FeatureFilter = 'all' | Exclude<HistoryType, 'code-connect'> | 'versioning'
export const FEATURE_FILTERS: readonly FeatureFilter[] = ['all', 'extraction', 'changelog', 'report', 'versioning', 'mcp', 'ux-ai']

export const result = signal<ListResult | null>(null)
export const loading = signal(false)
/** An automatic check is running (no spinner). */
export const polling = signal(false)
export const error = signal<string | null>(null)
export const days = signal<RangeDays>(7)
export const feature = signal<FeatureFilter>('all')
export const showAll = signal(false)
/** The entry open in Entry details; null on the list. */
export const selected = signal<string | null>(null)
/** Entries the last Refresh added: their authors, for the "N new entries" notice. */
export const fresh = signal<{ count: number; by: readonly string[] } | null>(null)

export const entries = computed<readonly HistoryEntry[]>(() => (result.value?.entries ?? []).filter((e) => e.type !== 'code-connect'))
export const shown = computed(() => feature.value === 'all' ? entries.value : entries.value.filter((e) => e.type === feature.value))

// ── Versioning ──
export const versionsResult = signal<VersionsResult | null>(null)
export const versionsLoading = signal(false)
export const versionsError = signal<string | null>(null)
/** The version open in Version details. */
export const openVersion = signal<FileVersion | null>(null)
export const versionDiff = signal<VersionDiff | null>(null)
export const versionDiffError = signal<string | null>(null)
export const current = computed(() => entries.value.find((e) => e.id === selected.value) ?? null)

/** The "New changelog" pop-up: closed, or where it is in check → generate → preview → submit. */
export type ChangelogPhase = 'closed' | 'checking' | 'ready' | 'generating' | 'preview' | 'submitting'
export const changelogPhase = signal<ChangelogPhase>('closed')
export const changelogContext = signal<ChangelogContext | null>(null)
export const changelogDraft = signal<ChangelogDraft | null>(null)
export const changelogError = signal<string | null>(null)
export const changelogTitle = signal('')
export const changelogNotes = signal('')
export const changelogTicket = signal('')
export const changelogCard = signal(true)
/** Pick a ticket from Jira, or type its key. */
export const ticketMode = signal<'pick' | 'type'>('pick')
export const ticketOptions = signal<TicketsResult | null>(null)
/** Post the changes to the ticket as a Jira comment. */
export const changelogPostToJira = signal(true)
export const notifyTeams = signal(true)
export const notifyOutlook = signal(true)
/** The reviewer posts the approval to the ticket. */
export const approvePostToJira = signal(true)
/** The last submit or approval, said once above the list. */
export const flash = signal<string | null>(null)
/** The entry being approved, by id. */
export const approving = signal<string | null>(null)
export const approveError = signal<string | null>(null)

export function closeChangelog(): void {
  changelogPhase.value = 'closed'
  changelogContext.value = null
  changelogDraft.value = null
  changelogError.value = null
  changelogTitle.value = ''
  changelogNotes.value = ''
  changelogTicket.value = ''
  changelogCard.value = true
  ticketMode.value = 'pick'
  ticketOptions.value = null
  changelogPostToJira.value = true
  notifyTeams.value = true
  notifyOutlook.value = true
}

export function closeVersion(): void {
  openVersion.value = null
  versionDiff.value = null
  versionDiffError.value = null
}

/** A new list: note what's new since the previous one (same range only). */
export function loadResult(next: ListResult, sameRange: boolean): void {
  const before = new Set((result.value?.entries ?? []).map((e) => e.id))
  const added = sameRange && result.value ? next.entries.filter((e) => !before.has(e.id)) : []
  fresh.value = added.length ? { count: added.length, by: [...new Set(added.map((e) => e.by.name))] } : null
  result.value = next
  error.value = null
}

export function reset(): void {
  result.value = null
  loading.value = false
  polling.value = false
  error.value = null
  days.value = 7
  feature.value = 'all'
  showAll.value = false
  selected.value = null
  fresh.value = null
  flash.value = null
  approving.value = null
  approveError.value = null
  approvePostToJira.value = true
  versionsResult.value = null
  versionsLoading.value = false
  versionsError.value = null
  closeVersion()
  closeChangelog()
}
