// Pure: the files an extraction writes to the repository and what the tab
// derives from a diff. No Figma, no network.
//
// Every branch carries its own extractions in one folder:
//   extractions/<UTC stamp>.json  the extraction itself (kept)
//   extractions/latest.json       a copy of the newest one — what a compare reads
//   extractions/index.json        who / when for the newest and the ones before it
import { diffSnapshots } from '@shared/design/diff'
import type { Change, Snapshot } from '@shared/design/types'
import type { ImpactedComponent, ModeCount } from './messages'

export const FOLDER = 'extractions'
export const LATEST_PATH = `${FOLDER}/latest.json`
export const INDEX_PATH = `${FOLDER}/index.json`
export const MAX_INDEX = 50

export interface ExtractionFile {
  schema: 1
  extractedAt: string
  extractedBy: string
  /** The Figma file's name. */
  file: string
  snapshot: Snapshot
}

export interface IndexEntry {
  at: string
  by: string
  file: string
  path: string
  variables: number
  components: number
  message: string
}

export interface ExtractionIndex {
  schema: 1
  latest: IndexEntry
  /** Newest first, `latest` included. */
  history: readonly IndexEntry[]
}

/** extractions/2026-11-12-0932.json (UTC, so two designers never disagree on the name). */
export function stampPath(at: string): string {
  const iso = new Date(at).toISOString()
  return `${FOLDER}/${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}.json`
}

export function parseExtraction(raw: string | null): ExtractionFile | null {
  if (!raw) return null
  try {
    const x = JSON.parse(raw) as Partial<ExtractionFile>
    const s = x.snapshot
    if (typeof x.extractedAt !== 'string' || typeof x.extractedBy !== 'string' || !s || !Array.isArray(s.variables) || !Array.isArray(s.components)) return null
    return { schema: 1, extractedAt: x.extractedAt, extractedBy: x.extractedBy, file: typeof x.file === 'string' ? x.file : '', snapshot: s }
  } catch {
    return null
  }
}

const isEntry = (e: unknown): e is IndexEntry => {
  const x = e as IndexEntry
  return !!x && typeof x.at === 'string' && typeof x.by === 'string' && typeof x.path === 'string'
}

export function parseIndex(raw: string | null): ExtractionIndex | null {
  if (!raw) return null
  try {
    const x = JSON.parse(raw) as Partial<ExtractionIndex>
    if (!isEntry(x.latest)) return null
    return { schema: 1, latest: x.latest, history: Array.isArray(x.history) ? x.history.filter(isEntry) : [x.latest] }
  } catch {
    return null
  }
}

export function nextIndex(previous: ExtractionIndex | null, entry: IndexEntry): ExtractionIndex {
  return { schema: 1, latest: entry, history: [entry, ...(previous?.history ?? [])].slice(0, MAX_INDEX) }
}

/** Variable changes between the branch's extraction and the file now; with no baseline everything is new. */
export function variableChanges(baseline: Snapshot | null, current: Snapshot): Change[] {
  return diffSnapshots(baseline, current).filter((c) => c.subject === 'variable')
}

/** How many variables were added, modified or removed in each brand mode. */
export function modeCounts(changes: readonly Change[]): ModeCount[] {
  const byMode = new Map<string, ModeCount>()
  const at = (mode: string) => {
    if (!byMode.has(mode)) byMode.set(mode, { mode, added: 0, modified: 0, removed: 0 })
    return byMode.get(mode)!
  }
  for (const change of changes) {
    for (const m of change.modeValues) {
      if (change.kind === 'added') at(m.mode).added += 1
      else if (change.kind === 'removed') at(m.mode).removed += 1
      else if (m.state === 'changed') at(m.mode).modified += 1
    }
  }
  return [...byMode.values()].filter((m) => m.added + m.modified + m.removed > 0)
}

const variableId = (change: Change): string => change.id.replace(/^variable:/, '')

/**
 * Components that use a variable that changed. A removed variable is looked up in the
 * baseline (the file no longer binds it); everything else in the file as it is now.
 */
export function impactedComponents(changes: readonly Change[], baseline: Snapshot | null, current: Snapshot): ImpactedComponent[] {
  const byName = new Map<string, { variants: number; variables: Set<string>; breaking: boolean }>()
  for (const change of changes) {
    if (change.kind === 'added') continue
    const id = variableId(change)
    const sources = [...current.components, ...(change.kind === 'removed' ? baseline?.components ?? [] : [])]
    for (const component of sources) {
      if (!component.usesVariables.includes(id)) continue
      const entry = byName.get(component.name) ?? { variants: component.variants, variables: new Set<string>(), breaking: false }
      entry.variables.add(change.name)
      entry.breaking = entry.breaking || change.breaking
      byName.set(component.name, entry)
    }
  }
  return [...byName.entries()]
    .map(([name, e]) => ({ name, variants: e.variants, variables: [...e.variables].sort(), breaking: e.breaking }))
    .sort((a, b) => Number(b.breaking) - Number(a.breaking) || a.name.localeCompare(b.name))
}

export function countKinds(changes: readonly Change[]): { added: number; modified: number; removed: number } {
  const added = changes.filter((c) => c.kind === 'added').length
  const removed = changes.filter((c) => c.kind === 'removed').length
  return { added, removed, modified: changes.length - added - removed }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "chore(tokens): 8 variable changes — 2 added, 5 modified, 1 removed". */
export function draftMessage(changes: readonly Change[]): string {
  if (!changes.length) return 'chore(tokens): extraction with no variable changes'
  const k = countKinds(changes)
  const parts = [k.added && `${k.added} added`, k.modified && `${k.modified} modified`, k.removed && `${k.removed} removed`].filter(Boolean)
  return `chore(tokens): ${plural(changes.length, 'variable change')} — ${parts.join(', ')}`
}

/** The diff as JSON, for "Copy diff as JSON". */
export function diffJson(changes: readonly Change[]): string {
  return JSON.stringify(changes.map((c) => ({
    name: c.name, change: c.kind, breaking: c.breaking,
    modes: Object.fromEntries(c.modeValues.map((m) => [m.mode, m.state === 'changed' ? { from: m.old, to: m.new } : m.value])),
    usedIn: c.usedIn,
  })), null, 2)
}

/** The commit's summary lines, reused for the pull request body and the channel message. */
export function summaryLines(changes: readonly Change[], impacted: readonly ImpactedComponent[]): string[] {
  const k = countKinds(changes)
  const breaking = impacted.filter((c) => c.breaking).length
  return [
    `${plural(changes.length, 'variable')} changed: ${k.added} added, ${k.modified} modified, ${k.removed} removed.`,
    `${plural(impacted.length, 'component')} impacted${breaking ? `, ${breaking} with a breaking change` : ''}${impacted.length ? `: ${impacted.slice(0, 12).map((c) => c.name).join(', ')}${impacted.length > 12 ? '…' : ''}.` : '.'}`,
  ]
}
