// History search: paste a Jira ticket, a colour code, a variable path or a
// component name and get the entries that touched it, with only the changes
// that match. Pure functions — the tab keeps the query in state.ts.
import type { HistoryEntry, HistorySection } from '@shared/history/types'
import type { FileVersion } from './messages'

export type SearchKind = 'ticket' | 'color' | 'variable' | 'component'

export interface SearchQuery {
  kind: SearchKind
  /** What the person typed, trimmed. */
  raw: string
  /** Normalised: BB-342, #0978C8, button/bg/primary, date picker. */
  value: string
}

type ChangesSection = Extract<HistorySection, { kind: 'changes' }>
type ItemsSection = Extract<HistorySection, { kind: 'items' }>
export type ChangeRowData = ChangesSection['groups'][number]['rows'][number]

export type SearchHit =
  | { kind: 'change'; change: ChangesSection['groups'][number]['change']; unit: 'variable' | 'component'; row: ChangeRowData }
  | { kind: 'item'; section: string; title: string; detail: string; status: ItemsSection['rows'][number]['status'] }
  | { kind: 'text'; where: string; text: string }

export interface EntryMatch {
  entry: HistoryEntry
  hits: readonly SearchHit[]
}

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = { ticket: 'Jira ticket', color: 'Colour', variable: 'Variable', component: 'Component' }

const TICKET = /^[A-Za-z][A-Za-z0-9]{1,9}-\d{1,7}$/
const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const HEX_IN_TEXT = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi
/** "Brand UI › button/bg/primary" → "button/bg/primary". */
const COLLECTION_PREFIX = /^.*›\s*/

/** "#abc" → "#AABBCC", "#0978c8ff" → "#0978C8"; null when it is not a hex colour. */
export function normalizeHex(input: string): string | null {
  const m = HEX.exec(input.trim())
  if (!m) return null
  let hex = m[1]!.toUpperCase()
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('')
  if (hex.length === 8 && hex.endsWith('FF')) hex = hex.slice(0, 6)
  return `#${hex}`
}

/** A bare hex without # only counts with 6 or 8 digits and at least one number, so "bad" or "Facade" stay names. */
function readColor(raw: string): string | null {
  if (!raw.startsWith('#') && !(/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(raw) && /\d/.test(raw))) return null
  return normalizeHex(raw)
}

export function parseQuery(input: string): SearchQuery | null {
  const raw = input.trim()
  if (!raw) return null
  if (TICKET.test(raw)) return { kind: 'ticket', raw, value: raw.toUpperCase() }
  const color = readColor(raw)
  if (color) return { kind: 'color', raw, value: color }
  const path = raw.replace(COLLECTION_PREFIX, '').trim()
  if (path.includes('/')) return { kind: 'variable', raw, value: path.toLowerCase() }
  return { kind: 'component', raw, value: raw.toLowerCase() }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** "button" matches "Button, Tab" but not "Buttons" or "ToggleButton". */
const wordIn = (needle: string, hay: string | undefined) => !!hay && new RegExp(`(^|[^\\w])${escape(needle)}($|[^\\w])`, 'i').test(hay)

const sectionsOf = (e: HistoryEntry) => e.details?.sections ?? []

function changeHits(e: HistoryEntry, keep: (row: ChangeRowData, unit: 'variable' | 'component') => boolean): SearchHit[] {
  return sectionsOf(e).flatMap((s) => s.kind !== 'changes' ? [] : s.groups.flatMap((g) => g.rows
    .filter((row) => keep(row, s.unit ?? 'variable'))
    .map((row): SearchHit => ({ kind: 'change', change: g.change, unit: s.unit ?? 'variable', row }))))
}

function itemHits(e: HistoryEntry, keep: (row: ItemsSection['rows'][number]) => boolean): SearchHit[] {
  return sectionsOf(e).flatMap((s) => s.kind !== 'items' ? [] : s.rows.filter(keep).map((r): SearchHit => ({ kind: 'item', section: s.title, ...r })))
}

/** Free text an entry carries, with where it came from. */
function texts(e: HistoryEntry): { where: string; text: string }[] {
  const d = e.details
  return [
    { where: 'Summary', text: e.summary },
    ...(d?.description ? [{ where: 'Description', text: d.description }] : []),
    ...(d?.notice ? [{ where: d.notice.title, text: d.notice.body }] : []),
    ...sectionsOf(e).flatMap((s) => s.kind === 'messages' ? s.rows.map((r) => ({ where: s.title, text: r.text })) : []),
  ]
}

/** About 90 characters around the first match. */
function snippet(text: string, at: number, length: number): string {
  const start = Math.max(0, at - 40)
  const end = Math.min(text.length, at + length + 50)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

function textHits(e: HistoryEntry, find: (text: string) => { at: number; length: number } | null): SearchHit[] {
  return texts(e).flatMap(({ where, text }) => {
    const found = find(text)
    return found ? [{ kind: 'text', where, text: snippet(text, found.at, found.length) } as const] : []
  })
}

function findHex(hex: string) {
  return (text: string) => {
    for (const m of text.matchAll(HEX_IN_TEXT)) if (normalizeHex(m[0]) === hex) return { at: m.index ?? 0, length: m[0].length }
    return null
  }
}

function findPath(path: string) {
  return (text: string) => {
    const at = text.toLowerCase().indexOf(path)
    return at < 0 ? null : { at, length: path.length }
  }
}

function hitsFor(e: HistoryEntry, q: SearchQuery): SearchHit[] | null {
  switch (q.kind) {
    case 'ticket':
      return e.ticket?.toUpperCase() === q.value ? changeHits(e, () => true) : null
    case 'color': {
      const same = (v?: string) => !!v && normalizeHex(v) === q.value
      return [...changeHits(e, (r) => r.valueKind === 'color' && (same(r.old) || same(r.new))), ...textHits(e, findHex(q.value))]
    }
    case 'variable':
      return [
        ...changeHits(e, (r, unit) => unit === 'variable' && r.name.toLowerCase().includes(q.value)),
        ...itemHits(e, (r) => r.detail.toLowerCase().includes(q.value)),
        ...textHits(e, findPath(q.value)),
      ]
    case 'component': {
      const hits = [
        ...changeHits(e, (r, unit) => unit === 'component' ? wordIn(q.value, r.name) : wordIn(q.value, r.note)),
        ...itemHits(e, (r) => wordIn(q.value, r.title)),
      ]
      return hits.length || !wordIn(q.value, e.title) ? hits : [{ kind: 'text', where: 'Title', text: e.title }]
    }
  }
}

/** The entries that touched the query, in list order, each with only the matching changes. */
export function searchEntries(entries: readonly HistoryEntry[], query: SearchQuery): EntryMatch[] {
  return entries.flatMap((entry) => {
    const hits = hitsFor(entry, query)
    if (!hits) return []
    if (!hits.length && query.kind !== 'ticket') return []
    return [{ entry, hits }]
  })
}

/** What a Figma version carries that can be searched: its name ("Autosave" when it has none), description and author. */
const versionText = (v: FileVersion) => `${v.label || 'Autosave'} ${v.description} ${v.by}`.toLowerCase()

/**
 * Versioning search: the versions whose name, description or author hold every
 * word of the query. The changes inside a version are only read when it is
 * opened, so they are not searched.
 */
export function searchVersions(versions: readonly FileVersion[], query: string): FileVersion[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return versions.filter((v) => { const text = versionText(v); return words.every((w) => text.includes(w)) })
}
