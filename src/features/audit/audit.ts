// Turns what the scan met into the audit. Pure, so the sandbox and the mock share it.
import type { LibraryComponent } from '@shared/libraries/types'
import type { AuditCounts, AuditItem, AuditScore, BoundPlace, Coverage, Hit, Origin, PageCoverage, Place, ScreenCoverage, UnusedComponent } from './messages'

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
  const local = of('local')
  const other = of('other')
  const notLibrary = local + other
  return { bound, paints: bound + colours, colours, spacing: of('spacing'), library, detached, local, other, notLibrary, unused, total: library + detached + notLibrary, published }
}

/** Off-scale spacing is an issue but not part of the score: there is no "from the system" side to count it against. */
export function scoreOf(c: AuditCounts): AuditScore {
  const used = c.bound + c.library
  const total = c.paints + c.total
  return { value: total ? Math.round((used / total) * 100) : null, used, total }
}

export const issuesOf = (c: AuditCounts) => c.colours + c.spacing + c.detached + c.notLibrary + c.unused

export const mappedOf = (c: Coverage) => c.bound + c.library
export const countedOf = (c: Coverage) => c.paints + c.components
/** 0–100, or null when nothing was counted. */
export const percentOf = (c: Coverage) => (countedOf(c) ? Math.round((mappedOf(c) / countedOf(c)) * 100) : null)

const EMPTY: Coverage = { bound: 0, paints: 0, library: 0, components: 0 }

/** What one layer of an origin adds. Spacing has no "from the system" side, so it adds nothing. */
function add(c: Coverage, origin: Origin, n: number): Coverage {
  if (origin === 'spacing') return c
  if (origin === 'colour') return { ...c, paints: c.paints + n }
  return { ...c, components: c.components + n, library: c.library + (origin === 'library' ? n : 0) }
}

/**
 * Coverage per screen, from every grouped item (library ones included) and the bound paints.
 * The least mapped comes first: that is the screen to open.
 */
export function coverageOf(items: readonly AuditItem[], bound: readonly BoundPlace[]): ScreenCoverage[] {
  const screens = new Map<string, ScreenCoverage>()
  const at = (id: string, name: string, page: string) => screens.get(id) ?? { ...EMPTY, id, name, page }
  for (const b of bound) {
    const s = at(b.place.id, b.place.name, b.page)
    screens.set(s.id, { ...s, bound: s.bound + b.count, paints: s.paints + b.count })
  }
  for (const item of items) {
    for (const p of item.places) {
      const s = at(p.id, p.name, p.page)
      screens.set(s.id, { ...s, ...add(s, item.origin, p.nodeIds.length) })
    }
  }
  return [...screens.values()].filter((s) => countedOf(s) > 0)
    .sort((a, b) => (percentOf(a) ?? 0) - (percentOf(b) ?? 0) || countedOf(b) - countedOf(a) || a.name.localeCompare(b.name))
}

/** The screens added up by page, the least mapped first. */
export function pageCoverageOf(screens: readonly ScreenCoverage[]): PageCoverage[] {
  const pages = new Map<string, PageCoverage>()
  for (const s of screens) {
    const p = pages.get(s.page) ?? { ...EMPTY, name: s.page, screens: 0 }
    pages.set(s.page, { name: p.name, screens: p.screens + 1, bound: p.bound + s.bound, paints: p.paints + s.paints, library: p.library + s.library, components: p.components + s.components })
  }
  return [...pages.values()].sort((a, b) => (percentOf(a) ?? 0) - (percentOf(b) ?? 0) || a.name.localeCompare(b.name))
}
