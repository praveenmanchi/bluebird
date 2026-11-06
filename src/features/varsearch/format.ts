// Pure wording helpers shared by the sandbox (page names) and the UI (labels).
import type { PageInfo, UsageKind, VariableMatch } from './messages'

/** "  ↳ Molecules" → "Molecules": the file's outline arrows are decoration, not the name. */
export function cleanPageName(name: string): string {
  return name.replace(/^[\s↳→>-]+/u, '').trim() || name.trim()
}

/** Divider pages ("---", "--------") hold nothing worth scanning. */
export function isDividerPage(name: string): boolean {
  return /^[\s\-–—_.·]*$/u.test(name)
}

export type PageScope = { mode: 'all' } | { mode: 'current' } | { mode: 'some'; ids: readonly string[] }

/** The PageFilter trigger label (Figma "All Pages" / "3 Pages"). */
export function pageScopeLabel(scope: PageScope, pages: readonly PageInfo[]): string {
  if (scope.mode === 'all') return 'All Pages'
  if (scope.mode === 'current') return 'Current page'
  if (scope.ids.length === 1) return pages.find((p) => p.id === scope.ids[0])?.name ?? '1 Page'
  return `${scope.ids.length} Pages`
}

/**
 * Ticking a page in the menu. From All Pages, a page narrows the search to that
 * page; after that pages toggle. Nothing ticked, or everything ticked, means All Pages.
 */
export function togglePage(scope: PageScope, id: string, allIds: readonly string[], currentId: string): PageScope {
  if (scope.mode === 'all') return allIds.length > 1 ? { mode: 'some', ids: [id] } : scope
  const ticked = scope.mode === 'current' ? [currentId] : scope.ids
  const next = ticked.includes(id) ? ticked.filter((x) => x !== id) : [...ticked, id]
  return next.length === 0 || next.length >= allIds.length ? { mode: 'all' } : { mode: 'some', ids: next }
}

export function isPageTicked(scope: PageScope, id: string, currentId: string): boolean {
  return scope.mode === 'all' || (scope.mode === 'current' ? id === currentId : scope.ids.includes(id))
}

export function pageScopeIds(scope: PageScope, currentPageId: string): string[] {
  if (scope.mode === 'all') return []
  if (scope.mode === 'current') return currentPageId ? [currentPageId] : []
  return [...scope.ids]
}

export const KIND_LABEL: Readonly<Record<UsageKind, { one: string; many: string }>> = {
  frame: { one: 'Frame', many: 'frames' },
  component: { one: 'Component', many: 'components' },
  'text-style': { one: 'Text style', many: 'text styles' },
}

/** The FilterDropdown label (Figma "Component"). Empty selection = every type. */
export function typesLabel(types: readonly UsageKind[]): string {
  if (types.length === 0) return 'All types'
  if (types.length === 1) return KIND_LABEL[types[0]!].one
  return `${types.length} types`
}

/** Ticking a type in the menu: from All types it narrows to that type, then types toggle. Empty means every type. */
export function toggleType(types: readonly UsageKind[], kind: UsageKind, all: readonly UsageKind[]): UsageKind[] {
  if (types.length === 0) return [kind]
  const next = types.includes(kind) ? types.filter((k) => k !== kind) : [...types, kind]
  return next.length === 0 || next.length >= all.length ? [] : all.filter((k) => next.includes(k))
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Card second line: "Brand UI · Used by 5 components, 2 frames · Affects 8 brand modes". */
export function variableMeta(v: Pick<VariableMatch, 'collection' | 'modes' | 'usages'>): string {
  const counts: Record<UsageKind, number> = { frame: 0, component: 0, 'text-style': 0 }
  for (const u of v.usages) counts[u.kind] += 1
  const used = (['component', 'frame', 'text-style'] as const)
    .filter((k) => counts[k] > 0)
    .map((k) => plural(counts[k], KIND_LABEL[k].many.replace(/s$/, ''), KIND_LABEL[k].many))
    .join(', ')
  return [v.collection, used && `Used by ${used}`, `Affects ${plural(v.modes, 'brand mode', 'brand modes')}`].filter(Boolean).join(' · ')
}

/** The expanded card's first summary chip: what the rows are. */
export function usagesLabel(v: Pick<VariableMatch, 'usages'>): string {
  const kinds = new Set(v.usages.map((u) => u.kind))
  if (kinds.size !== 1) return 'Used in'
  const [only] = kinds
  return only === 'component' ? 'Components' : only === 'frame' ? 'Frames' : 'Text styles'
}

/** Recent-search timestamp (Figma "12 Days ago"). */
export function relativeTime(at: number, now: number = Date.now()): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}
