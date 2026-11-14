// Pure: the open file's Figma version history as Versioning shows it, and what
// changed between two versions — pages, their top-level frames and sections,
// and components — compared by node id. No Figma, no network.
import type { FileVersion, StructureChange, VersionDiff } from './messages'

/** Rows a version's details list; the rest are counted in the note. */
export const MAX_STRUCTURE_ROWS = 200

export interface RestVersion { id?: string | number; created_at?: string; label?: string | null; description?: string | null; user?: { handle?: string } }

/** GET /files/:key/versions → the versions saved since `since` (ISO), newest first. */
export function toVersions(raw: readonly RestVersion[], since: string): FileVersion[] {
  return raw.flatMap((v) => {
    const id = String(v.id ?? '')
    const at = v.created_at ?? ''
    if (!/^[0-9]{1,20}$/.test(id) || !/^\d{4}-\d{2}-\d{2}T/.test(at) || at < since) return []
    return [{ id, at, label: (v.label ?? '').trim().slice(0, 160), description: (v.description ?? '').trim().slice(0, 600), by: (v.user?.handle ?? 'Someone').slice(0, 120) }]
  }).sort((a, b) => b.at.localeCompare(a.at))
}

export const isAutosave = (v: FileVersion): boolean => v.label === ''

export interface RestNode { id: string; name: string; type: string; children?: RestNode[] }
export interface RestFile { document?: RestNode; components?: Record<string, { name?: string }>; componentSets?: Record<string, { name?: string }> }

interface Item { what: string; name: string; where: string }

const WHAT: Record<string, string> = { CANVAS: 'Page', FRAME: 'Frame', SECTION: 'Section', COMPONENT: 'Component', COMPONENT_SET: 'Component set', GROUP: 'Group', INSTANCE: 'Instance' }
const whatOf = (type: string) => WHAT[type] ?? 'Layer'

/** Pages, the layers directly on them, and every component the response names. */
export function structureOf(file: RestFile): Map<string, Item> {
  const out = new Map<string, Item>()
  for (const page of file.document?.children ?? []) {
    out.set(page.id, { what: 'Page', name: page.name, where: '' })
    for (const top of page.children ?? []) out.set(top.id, { what: whatOf(top.type), name: top.name, where: page.name })
  }
  for (const [id, c] of Object.entries(file.components ?? {})) if (!out.has(id)) out.set(id, { what: 'Component', name: c.name ?? 'Component', where: '' })
  for (const [id, c] of Object.entries(file.componentSets ?? {})) if (!out.has(id)) out.set(id, { what: 'Component set', name: c.name ?? 'Component set', where: '' })
  return out
}

const on = (i: Item) => i.where ? ` on ${i.where}` : ''

/** What `after` added, removed or renamed compared with `before`. Pages first, then by name. */
export function diffStructure(before: RestFile | null, after: RestFile): VersionDiff {
  const a = before ? structureOf(before) : new Map<string, Item>()
  const b = structureOf(after)
  const changes: StructureChange[] = []
  for (const [id, item] of b) {
    const old = a.get(id)
    if (!old) { if (before) changes.push({ kind: 'added', what: item.what, name: item.name, detail: `New ${item.what.toLowerCase()}${on(item)}` }) }
    else if (old.name !== item.name) changes.push({ kind: 'modified', what: item.what, name: item.name, detail: `Renamed from ${old.name}${on(item)}` })
    else if (old.where !== item.where) changes.push({ kind: 'modified', what: item.what, name: item.name, detail: `Moved from ${old.where || 'the file'} to ${item.where || 'the file'}` })
  }
  for (const [id, item] of a) if (!b.has(id)) changes.push({ kind: 'removed', what: item.what, name: item.name, detail: `Deleted ${item.what.toLowerCase()}${on(item)}` })
  const order = (c: StructureChange) => (c.what === 'Page' ? 0 : 1)
  const sorted = changes.sort((x, y) => order(x) - order(y) || x.name.localeCompare(y.name))
  const more = sorted.length > MAX_STRUCTURE_ROWS ? ` ${sorted.length - MAX_STRUCTURE_ROWS} more changes are not listed.` : ''
  const note = before
    ? `Pages, the frames and sections on them, and components, compared with the version before. Edits inside a frame and variable values are not kept with Figma versions.${more}`
    : 'This is the oldest version in the range, so there is nothing before it to compare with.'
  return { changes: sorted.slice(0, MAX_STRUCTURE_ROWS), note }
}
