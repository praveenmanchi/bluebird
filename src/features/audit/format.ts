import type { AuditItem, AuditCounts, Origin, PageInfo, Scope } from './messages'

export type Filter = 'all' | 'colours' | 'spacing' | 'detached' | 'not-library' | 'unused'

const ORIGINS: Readonly<Record<Exclude<Filter, 'all' | 'unused'>, readonly Origin[]>> = {
  colours: ['colour'], spacing: ['spacing'], detached: ['detached'], 'not-library': ['local', 'other'],
}

export const isValue = (item: AuditItem) => item.origin === 'colour' || item.origin === 'spacing'

const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`

export function scopeButtonLabel(scope: Scope, pages: readonly PageInfo[]): string {
  if (scope.mode === 'selection') return 'Selection'
  if (scope.mode === 'current') return 'This page'
  if (scope.pageIds.length === 1) return pages.find((p) => p.id === scope.pageIds[0])?.name ?? '1 Page'
  return `${scope.pageIds.length} Pages`
}

/** Ticking a page moves to a page list; unticking the last one goes back to this page. */
export function togglePage(scope: Scope, id: string): Scope {
  const ids = scope.mode === 'pages' ? scope.pageIds : []
  const next = ids.includes(id) ? ids.filter((p) => p !== id) : [...ids, id]
  return next.length ? { mode: 'pages', pageIds: next } : { mode: 'current' }
}

/** One row for every kind of issue. Without a library only the variable checks ran. */
export function filterOptions(c: AuditCounts, issues: number, hasLibrary: boolean): { value: Filter; label: string }[] {
  const values: { value: Filter; label: string }[] = [
    { value: 'all', label: `All ${issues}` },
    { value: 'colours', label: `Colours ${c.colours}` },
    { value: 'spacing', label: `Spacing ${c.spacing}` },
  ]
  if (!hasLibrary) return values
  return [
    ...values,
    { value: 'detached', label: `Detached ${c.detached}` },
    { value: 'not-library', label: `Not in library ${c.notLibrary}` },
    { value: 'unused', label: `Unused ${c.unused}` },
  ]
}

export function visibleItems(items: readonly AuditItem[], filter: Filter, query: string): readonly AuditItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((i) => (filter === 'all' || (filter !== 'unused' && ORIGINS[filter].includes(i.origin))) && i.name.toLowerCase().includes(q))
}

export function itemMeta(item: AuditItem): string {
  if (item.hint) return item.hint
  const frames = plural(item.places.length, 'frame')
  if (item.origin === 'detached') return `Detached · on ${frames}`
  if (item.origin === 'local') return `Local component · on ${frames}`
  return `Another library · on ${frames}`
}

export const pagesOf = (item: AuditItem) => new Set(item.places.map((p) => p.page)).size

export const summaryCaption = (issues: number) => (issues ? plural(issues, 'issue') + ' to review' : 'Nothing to fix')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Analytics weeks are dates; read as UTC so a time zone can't shift the day. Anything else is shown as it came. */
export function weekLabel(week: string): string {
  const date = new Date(week)
  if (Number.isNaN(date.getTime())) return week
  return `Week of ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}
