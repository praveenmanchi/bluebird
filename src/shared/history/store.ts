// Pure: how History entries are laid out in the repository.
//
// One JSON file per UTC day — .bluebird/history/2026-11-12.json — holding that
// day's entries. A day file is small, so appending is read + write with the
// file's sha (GitHub refuses a write made on top of an older sha, which is how
// two people recording at once don't overwrite each other), and reading a date
// range only fetches the days that have entries.
import * as z from 'zod/mini'
import { historyEntrySchema, type HistoryEntry } from './types'

export const HISTORY_FOLDER = '.bluebird/history'
/** Entries kept per day file; the oldest go first past this. */
export const MAX_PER_DAY = 500

const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/

export const dayOf = (iso: string): string => new Date(iso).toISOString().slice(0, 10)
export const dayPath = (iso: string): string => `${HISTORY_FOLDER}/${dayOf(iso)}.json`

/** Day files whose date is on or after `since` (YYYY-MM-DD), newest first. */
export function daysInRange(fileNames: readonly string[], since: string): string[] {
  return fileNames.map((n) => DAY_FILE.exec(n)?.[1]).filter((d): d is string => !!d && d >= since).sort().reverse()
}

/** The entries in a day file. Entries that don't match the schema are dropped, not trusted. */
export function parseDay(raw: string | null): HistoryEntry[] {
  if (!raw) return []
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const list = (parsed as { entries?: unknown })?.entries
  if (!Array.isArray(list)) return []
  return list.flatMap((e) => {
    const r = z.safeParse(historyEntrySchema, e)
    return r.success ? [r.data] : []
  })
}

/** The day file with `entry` added (or replaced, by id), newest first. */
export function appendToDay(existing: readonly HistoryEntry[], entry: HistoryEntry): string {
  const entries = [entry, ...existing.filter((e) => e.id !== entry.id)].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_PER_DAY)
  return `${JSON.stringify({ schema: 1, entries }, null, 2)}\n`
}

/** "Design System" → "DS", "UI/UX Designer" → "UD", "Dev" stays "Dev". */
export function teamShort(team: string | undefined): string {
  const t = (team ?? '').trim()
  if (!t) return ''
  if (t.length <= 4 && !t.includes(' ')) return t
  return t.split(/\s+/).map((w) => w[0]!.toUpperCase()).join('').slice(0, 3)
}

/** A short random id for a new entry. */
export function newEntryId(now: Date, random: () => number = Math.random): string {
  return `${now.getTime().toString(36)}${Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0')}`
}
