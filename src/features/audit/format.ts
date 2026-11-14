import type { AuditItem, Origin, PageInfo, Place, Scope, ScreenCoverage } from './messages'

/** Overview is the coverage rows; the rest list what is not mapped, by kind. */
export type Filter = 'overview' | 'not-mapped' | 'local' | 'other' | 'detached' | 'colours' | 'spacing'

const ORIGINS: Readonly<Record<Exclude<Filter, 'overview'>, readonly Origin[]>> = {
  'not-mapped': ['local', 'other', 'detached', 'colour'], local: ['local'], other: ['other'], detached: ['detached'], colours: ['colour'], spacing: ['spacing'],
}
const LABELS: Readonly<Record<Exclude<Filter, 'overview' | 'not-mapped'>, string>> = {
  local: 'Local', other: 'Other library', detached: 'Detached', colours: 'Colours', spacing: 'Spacing',
}
const COMPONENT_FILTERS: readonly Filter[] = ['local', 'other', 'detached']

export const isValue = (item: AuditItem) => item.origin === 'colour' || item.origin === 'spacing'

export const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`

export function scopeButtonLabel(scope: Scope, pages: readonly PageInfo[]): string {
  if (scope.mode === 'selection') return 'Selection'
  if (scope.mode === 'current') return 'This page'
  if (scope.pageIds.length === 1) return pages.find((p) => p.id === scope.pageIds[0])?.name ?? '1 Page'
  return `${scope.pageIds.length} Pages`
}

/** The Ready screen's button says what it is about to audit. */
export function runLabel(scope: Scope): string {
  if (scope.mode === 'selection') return 'Run audit on the selection'
  if (scope.mode === 'current') return 'Run audit on this page'
  return `Run audit on ${plural(scope.pageIds.length, 'page')}`
}

/** Ticking a page moves to a page list; unticking the last one goes back to this page. */
export function togglePage(scope: Scope, id: string): Scope {
  const ids = scope.mode === 'pages' ? scope.pageIds : []
  const next = ids.includes(id) ? ids.filter((p) => p !== id) : [...ids, id]
  return next.length ? { mode: 'pages', pageIds: next } : { mode: 'current' }
}

const layersIn = (items: readonly AuditItem[], filter: Exclude<Filter, 'overview'>) =>
  items.filter((i) => ORIGINS[filter].includes(i.origin)).reduce((n, i) => n + i.count, 0)

export interface FilterRowOptions {
  /** The whole audit opens on Overview; one screen opens on its list, labelled All. */
  overview: boolean
  /** Without a library only the variable checks ran. */
  hasLibrary: boolean
}

/** One tab for every kind of thing that is not mapped. Spacing is only offered when there is some: it is not part of the score. */
export function filterOptions(items: readonly AuditItem[], { overview, hasLibrary }: FilterRowOptions): { value: Filter; label: string }[] {
  const kinds = (Object.keys(LABELS) as (keyof typeof LABELS)[])
    .filter((f) => (hasLibrary || !COMPONENT_FILTERS.includes(f)) && (f !== 'spacing' || layersIn(items, f) > 0))
    .map((f) => ({ value: f as Filter, label: `${LABELS[f]} ${layersIn(items, f)}` }))
  const all = layersIn(items, 'not-mapped')
  const first = overview
    ? [{ value: 'overview' as Filter, label: 'Overview' }, { value: 'not-mapped' as Filter, label: `Not mapped ${all}` }]
    : [{ value: 'not-mapped' as Filter, label: `All ${all}` }]
  return [...first, ...kinds]
}

export function visibleItems(items: readonly AuditItem[], filter: Filter): readonly AuditItem[] {
  return filter === 'overview' ? [] : items.filter((i) => ORIGINS[filter].includes(i.origin))
}

const ORIGIN_LABEL: Readonly<Partial<Record<Origin, string>>> = { detached: 'Detached', local: 'Local component', other: 'From another library' }

export function itemMeta(item: AuditItem): string {
  if (item.hint) return item.hint
  return `${ORIGIN_LABEL[item.origin] ?? 'Component'} · on ${plural(item.places.length, 'screen')}`
}

/** The items that sit on one screen, counted for that screen alone. */
export function itemsOnScreen(items: readonly AuditItem[], screenId: string): { item: AuditItem; meta: string }[] {
  return items.flatMap((i) => {
    const place: Place | undefined = i.places.find((p) => p.id === screenId)
    if (!place) return []
    const count = place.nodeIds.length
    const meta = i.hint ?? `${ORIGIN_LABEL[i.origin] ?? 'Component'} · ${plural(count, 'layer')} on this screen`
    return [{ item: { ...i, count, places: [place] }, meta }]
  })
}

export const pagesOf = (item: AuditItem) => new Set(item.places.map((p) => p.page)).size

export const notMappedCaption = (n: number) => (n ? `${n.toLocaleString()} not mapped` : 'Everything is mapped')

/** Screens below the pass mark, the least mapped first: where to look when several pages were audited. */
export function needAttention(screens: readonly ScreenCoverage[], passMark: number, limit: number): readonly ScreenCoverage[] {
  return screens.filter((s) => {
    const total = s.paints + s.components
    return total > 0 && ((s.bound + s.library) / total) * 100 < passMark
  }).slice(0, limit)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Analytics weeks are dates; read as UTC so a time zone can't shift the day. Anything else is shown as it came. */
export function weekLabel(week: string): string {
  const date = new Date(week)
  if (Number.isNaN(date.getTime())) return week
  return `Week of ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}
