// Display helpers for the History screens.
import type { HistoryEntry, HistoryType } from '@shared/history/types'
import type { ChangeCountType, MetaBadgeTone } from '@shared/ui'

export const TYPE_LABEL: Record<HistoryType, string> = { extraction: 'Extraction', changelog: 'Changelog', report: 'Report', 'code-connect': 'Code Connect', mcp: 'MCP', 'ux-ai': 'UX AI' }
/** Plural labels for the feature filter. */
export const FILTER_LABEL: Record<HistoryType, string> = { extraction: 'Extraction', changelog: 'Changelog', report: 'Reports', 'code-connect': 'Code Connect', mcp: 'MCP', 'ux-ai': 'UX AI' }
export const TYPE_TONE: Record<HistoryType, MetaBadgeTone> = { extraction: 'success', changelog: 'accent', report: 'accent', 'code-connect': 'warning', mcp: 'accent', 'ux-ai': 'neutral' }

export const typeTone = (e: HistoryEntry): MetaBadgeTone => e.status === 'failed' ? 'danger' : TYPE_TONE[e.type]

export const STATUS_LABEL: Record<HistoryEntry['status'], string> = { done: 'Done', failed: 'Failed', review: 'Under review' }
export const STATUS_TONE: Record<HistoryEntry['status'], MetaBadgeTone> = { done: 'success', failed: 'danger', review: 'warning' }
/** A changelog a teammate approved reads "Approved", not "Done". */
export const statusLabel = (e: HistoryEntry): string => e.review ? 'Approved' : STATUS_LABEL[e.status]

export interface CardCount { status: ChangeCountType; count: string }
export interface CardCounts { counts: CardCount[]; rest: string }

const COUNT_WORD: Record<string, ChangeCountType> = { modified: 'modified', updated: 'modified', added: 'added', removed: 'removed' }
/** The order of the Change count chips on the Figma card: Added, Modified, Removed. */
const COUNT_ORDER: readonly ChangeCountType[] = ['added', 'modified', 'removed']
const COUNT_PART = /^(\d[\d,]*) (modified|updated|added|removed)$/

/**
 * Splits a card line ("2 added · 5 modified · 1 removed · not pushed") into the
 * counts the card shows as Change count chips and the text that is left over.
 * Lines other features write ("6 components", "14 bound") come back as text.
 */
export function changeCounts(line: string): CardCounts {
  const counts: CardCount[] = []
  const rest: string[] = []
  for (const part of line.split(' · ')) {
    const m = COUNT_PART.exec(part.trim())
    if (m) counts.push({ status: COUNT_WORD[m[2]!]!, count: m[1]! })
    else if (part.trim()) rest.push(part.trim())
  }
  return { counts: [...counts].sort((a, b) => COUNT_ORDER.indexOf(a.status) - COUNT_ORDER.indexOf(b.status)), rest: rest.join(' · ') }
}

/** "Variables: 2 added, 5 modified, 1 removed" for screen readers. */
export const countsLabel = (what: string, c: CardCounts): string =>
  `${what}: ${[...c.counts.map((n) => `${n.count} ${n.status}`), ...(c.rest ? [c.rest] : [])].join(', ')}`

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** "12 Nov · 09:36" (the viewer's time zone). */
export function cardDate(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

/** "12 Nov 2026 · 09:36". */
export function longDate(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

/** Today / Yesterday / Earlier this week / "3 Nov 2026" — in the viewer's time zone. */
export function groupLabel(iso: string, now: Date): string {
  const d = new Date(iso)
  if (sameDay(d, now)) return 'Today'
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, yesterday)) return 'Yesterday'
  if (now.getTime() - d.getTime() < 7 * 86_400_000) return 'Earlier this week'
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export interface EntryGroup { label: string; entries: HistoryEntry[] }

/** Consecutive entries (already newest first) grouped by groupLabel. */
export function groupEntries(list: readonly HistoryEntry[], now: Date): EntryGroup[] {
  const out: EntryGroup[] = []
  for (const e of list) {
    const label = groupLabel(e.at, now)
    const last = out[out.length - 1]
    if (last && last.label === label) last.entries.push(e)
    else out.push({ label, entries: [e] })
  }
  return out
}

export const initials = (name: string): string => name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).join('').slice(0, 2)
