// Display helpers for the History screens.
import type { HistoryEntry, HistoryType } from '@shared/history/types'
import type { MetaBadgeTone } from '@shared/ui'

export const TYPE_LABEL: Record<HistoryType, string> = { extraction: 'Extraction', report: 'Report', 'code-connect': 'Code Connect', mcp: 'MCP', 'ux-ai': 'UX AI' }
/** Plural labels for the feature filter. */
export const FILTER_LABEL: Record<HistoryType, string> = { extraction: 'Extraction', report: 'Reports', 'code-connect': 'Code Connect', mcp: 'MCP', 'ux-ai': 'UX AI' }
export const TYPE_TONE: Record<HistoryType, MetaBadgeTone> = { extraction: 'success', report: 'accent', 'code-connect': 'warning', mcp: 'accent', 'ux-ai': 'neutral' }

export const typeTone = (e: HistoryEntry): MetaBadgeTone => e.status === 'failed' ? 'danger' : TYPE_TONE[e.type]

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
