// Pure: what changed between the last release's snapshot and the file now.
// Variables are matched by id (a rename keeps its id) and components by key, so
// renames read as renames, not as a removal plus an addition.
import type { Change, ComponentEntry, ModeValue, Snapshot, VariableEntry } from './types'

const DEPRECATED = /\bdeprecated\b/i
const MAX_USED_IN = 6

const isDeprecated = (entry: { name: string; description: string }): boolean =>
  DEPRECATED.test(entry.description) || DEPRECATED.test(entry.name)

/** "all brands", "3 of 5 brands", "1 of 5 brands". */
function modeSpan(changed: number, total: number): string {
  if (total <= 1) return ''
  return changed === total ? 'all brands' : `${changed} of ${total} brands`
}

function previewOf(v: VariableEntry): Change['preview'] {
  return v.type === 'color' ? 'color' : 'number'
}

function modeValues(before: VariableEntry, after: VariableEntry): ModeValue[] {
  const kind = after.type === 'color' ? 'color' : 'number'
  return Object.keys(after.values).map((mode) => {
    const old = before.values[mode]
    const now = after.values[mode]!
    return old === now ? { mode, state: 'unchanged', kind, value: now } : { mode, state: 'changed', kind, old: old ?? '—', new: now }
  })
}

function singleValues(v: VariableEntry): ModeValue[] {
  const kind = v.type === 'color' ? 'color' : 'number'
  return Object.entries(v.values).map(([mode, value]) => ({ mode, state: 'unchanged', kind, value }))
}

/** The value every mode shares, or null when the modes differ. */
function sharedValue(values: Readonly<Record<string, string>>): string | null {
  const all = [...new Set(Object.values(values))]
  return all.length === 1 ? all[0]! : null
}

function usedInIndex(components: readonly ComponentEntry[]): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const c of components) {
    for (const id of c.usesVariables) index.set(id, [...(index.get(id) ?? []), c.name])
  }
  return index
}

function variableChange(before: VariableEntry | undefined, after: VariableEntry | undefined, usedIn: readonly string[]): Change | null {
  const entry = (after ?? before)!
  const base = {
    id: `variable:${entry.id}`,
    subject: 'variable' as const,
    preview: previewOf(entry),
    name: entry.name,
    usedIn: usedIn.slice(0, MAX_USED_IN),
    source: `${entry.collection} › ${entry.name}`,
  }
  const swatchOf = (v: VariableEntry) => v.type === 'color' ? (Object.values(v.values)[0] ?? undefined) : undefined

  if (!before && after) {
    const value = sharedValue(after.values)
    return { ...base, kind: 'added', breaking: false, detail: value ? `New · ${value}` : `New · ${Object.keys(after.values).length} brand values`, swatch: swatchOf(after), modeValues: singleValues(after) }
  }
  if (before && !after) {
    const detail = usedIn.length ? `Removed · used by ${usedIn.length} component${usedIn.length === 1 ? '' : 's'}` : 'Removed'
    return { ...base, kind: 'removed', breaking: true, detail, swatch: swatchOf(before), modeValues: singleValues(before) }
  }
  if (!before || !after) return null

  const values = modeValues(before, after)
  const changedModes = values.filter((m) => m.state === 'changed')
  const renamed = before.name !== after.name
  const deprecatedNow = isDeprecated(after) && !isDeprecated(before)
  if (!renamed && !deprecatedNow && changedModes.length === 0 && before.description === after.description) return null

  if (deprecatedNow) return { ...base, kind: 'deprecated', breaking: false, detail: `Deprecated${after.description ? ` · ${after.description}` : ''}`, swatch: swatchOf(after), modeValues: values }

  const parts: string[] = []
  if (renamed) parts.push(`Renamed from ${before.name}`)
  if (changedModes.length) {
    const olds = new Set(changedModes.map((m) => m.old)), news = new Set(changedModes.map((m) => m.new))
    const span = modeSpan(changedModes.length, values.length)
    parts.push(olds.size === 1 && news.size === 1 ? `${[...olds][0]} → ${[...news][0]}${span ? ` · ${span}` : ''}` : `${changedModes.length} values changed${span ? ` · ${span}` : ''}`)
  }
  if (!parts.length) parts.push('Description updated')
  return { ...base, kind: 'modified', breaking: renamed, detail: parts.join(' · '), swatch: swatchOf(after), modeValues: values }
}

function componentChange(before: ComponentEntry | undefined, after: ComponentEntry | undefined): Change | null {
  const entry = (after ?? before)!
  const base = { id: `component:${entry.id}`, subject: 'component' as const, preview: 'component' as const, name: entry.name, modeValues: [], usedIn: [], source: `${entry.page} › ${entry.name}` }
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

  if (!before && after) return { ...base, kind: 'added', breaking: false, detail: `New · ${plural(after.variants, 'variant')} · ${plural(after.properties.length, 'property', 'properties')}` }
  if (before && !after) return { ...base, kind: 'removed', breaking: true, detail: 'Removed from the library' }
  if (!before || !after) return null

  if (isDeprecated(after) && !isDeprecated(before)) return { ...base, kind: 'deprecated', breaking: false, detail: after.description || 'Deprecated' }

  const parts: string[] = []
  const removedProps = before.properties.filter((p) => !after.properties.includes(p))
  const addedProps = after.properties.filter((p) => !before.properties.includes(p))
  if (before.name !== after.name) parts.push(`Renamed from ${before.name}`)
  const delta = after.variants - before.variants
  if (delta) parts.push(`${delta > 0 ? '+' : '−'}${plural(Math.abs(delta), 'variant')}`)
  if (addedProps.length && removedProps.length) parts.push(`${removedProps.join(', ')} → ${addedProps.join(', ')}`)
  else if (addedProps.length) parts.push(`+${addedProps.join(', ')}`)
  else if (removedProps.length) parts.push(`−${removedProps.join(', ')}`)
  if (!parts.length && before.description !== after.description) parts.push('Description updated')
  if (!parts.length) return null
  return { ...base, kind: 'modified', breaking: removedProps.length > 0 || before.name !== after.name, detail: parts.join(' · ') }
}

/** Order: breaking first, then added, modified, deprecated; alphabetical within a group. */
const ORDER: Record<Change['kind'], number> = { removed: 0, added: 1, modified: 2, deprecated: 3 }

/** Every change between `baseline` (null = first release: everything is new) and `current`. */
export function diffSnapshots(baseline: Snapshot | null, current: Snapshot): Change[] {
  const before = baseline ?? { takenAt: '', variables: [], components: [] }
  const usedNow = usedInIndex(current.components)
  const usedBefore = usedInIndex(before.components)
  const out: Change[] = []

  const oldVars = new Map(before.variables.map((v) => [v.id, v]))
  const newVars = new Map(current.variables.map((v) => [v.id, v]))
  for (const id of new Set([...oldVars.keys(), ...newVars.keys()])) {
    const change = variableChange(oldVars.get(id), newVars.get(id), usedNow.get(id) ?? usedBefore.get(id) ?? [])
    if (change) out.push(change)
  }
  const oldComps = new Map(before.components.map((c) => [c.id, c]))
  const newComps = new Map(current.components.map((c) => [c.id, c]))
  for (const id of new Set([...oldComps.keys(), ...newComps.keys()])) {
    const change = componentChange(oldComps.get(id), newComps.get(id))
    if (change) out.push(change)
  }
  return out.sort((a, b) => Number(b.breaking) - Number(a.breaking) || ORDER[a.kind] - ORDER[b.kind] || a.name.localeCompare(b.name))
}

/**
 * The snapshot the next release compares against: the old baseline with only
 * the included changes applied, so excluded changes still show up next time.
 */
export function applyChanges(baseline: Snapshot | null, current: Snapshot, include: ReadonlySet<string>): Snapshot {
  const before = baseline ?? { takenAt: current.takenAt, variables: [], components: [] }
  const merge = <T extends { id: string }>(prefix: string, old: readonly T[], now: readonly T[]): T[] => {
    const result = new Map(old.map((e) => [e.id, e]))
    const nowById = new Map(now.map((e) => [e.id, e]))
    for (const id of new Set([...result.keys(), ...nowById.keys()])) {
      if (!include.has(`${prefix}:${id}`)) continue
      const next = nowById.get(id)
      if (next) result.set(id, next)
      else result.delete(id)
    }
    return [...result.values()]
  }
  return {
    takenAt: current.takenAt,
    variables: merge('variable', before.variables, current.variables),
    components: merge('component', before.components, current.components),
  }
}

/** Counts per kind, for the summary badges. */
export function countKinds(changes: readonly Change[]): Record<Change['kind'], number> {
  const counts = { added: 0, modified: 0, removed: 0, deprecated: 0 }
  for (const c of changes) counts[c.kind] += 1
  return counts
}
