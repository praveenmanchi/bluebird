// Turns what the scan met into the audit. Pure, so the sandbox and the mock share it.
import type { LibraryComponent } from '@shared/libraries/types'
import type { AuditCounts, AuditItem, AuditScore, Hit, Origin, Place, UnusedComponent } from './messages'

const ORIGIN_ORDER: readonly Origin[] = ['colour', 'spacing', 'library', 'detached', 'local', 'other']

export function groupHits(hits: readonly Hit[]): AuditItem[] {
  const byGroup = new Map<string, { hit: Hit; places: Map<string, { id: string; name: string; page: string; nodeIds: string[] }>; count: number }>()
  for (const hit of hits) {
    const id = `${hit.origin}:${hit.groupKey}`
    let group = byGroup.get(id)
    if (!group) byGroup.set(id, (group = { hit, places: new Map(), count: 0 }))
    group.count += 1
    const place = group.places.get(hit.place.id)
    if (place) place.nodeIds.push(hit.nodeId)
    else group.places.set(hit.place.id, { ...hit.place, page: hit.page, nodeIds: [hit.nodeId] })
  }
  return [...byGroup].map(([id, g]): AuditItem => ({
    id, name: g.hit.name, origin: g.hit.origin, count: g.count, ...(g.hit.hint ? { hint: g.hit.hint } : {}),
    places: [...g.places.values()].sort((a: Place, b: Place) => b.nodeIds.length - a.nodeIds.length || a.name.localeCompare(b.name)),
  })).sort((a, b) => ORIGIN_ORDER.indexOf(a.origin) - ORIGIN_ORDER.indexOf(b.origin) || b.count - a.count || a.name.localeCompare(b.name))
}

/** Library components with no instance among `seenKeys`. */
export function unusedComponents(components: readonly LibraryComponent[], seenKeys: ReadonlySet<string>): UnusedComponent[] {
  return components
    .filter((c) => !c.keys.some((k) => seenKeys.has(k)) && !seenKeys.has(c.key))
    .map((c) => ({ key: c.key, name: c.name, location: c.location }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function countItems(items: readonly AuditItem[], bound: number, unused: number, published: number): AuditCounts {
  const of = (...origins: Origin[]) => items.filter((i) => origins.includes(i.origin)).reduce((n, i) => n + i.count, 0)
  const colours = of('colour')
  const library = of('library')
  const detached = of('detached')
  const notLibrary = of('local', 'other')
  return { bound, paints: bound + colours, colours, spacing: of('spacing'), library, detached, notLibrary, unused, total: library + detached + notLibrary, published }
}

/** Off-scale spacing is an issue but not part of the score: there is no "from the system" side to count it against. */
export function scoreOf(c: AuditCounts): AuditScore {
  const used = c.bound + c.library
  const total = c.paints + c.total
  return { value: total ? Math.round((used / total) * 100) : null, used, total }
}

export const issuesOf = (c: AuditCounts) => c.colours + c.spacing + c.detached + c.notLibrary + c.unused
