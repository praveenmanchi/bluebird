import { CATEGORIES, type Candidate, type Category, type MapperGroup, type MatchKind } from './messages'
import type { Binding, Filter } from './state'

export const CATEGORY_LABEL: Readonly<Record<Category, string>> = { colors: 'Colours', border: 'Border', spacing: 'Spacing', typography: 'Typography' }

const MAX_NAMES = 3
const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`

type Picks = ReadonlyMap<string, Candidate>
type Bindings = ReadonlyMap<string, Binding>

/** "4 layers · Frame" / "5 layers · Login, Access code flow, SSO flow" / "3 of 4 layers bound · 1 restored". */
export function whereLabel(g: MapperGroup, binding?: Binding, showMode = false): string {
  const total = g.layers.length
  if (binding?.restoredLayers) return `${total - binding.restoredLayers} of ${plural(total, 'layer')} bound · ${binding.restoredLayers} restored`
  const names = [...new Set(g.layers.map((l) => l.name))]
  const mode = showMode && g.mode ? ` · ${g.mode}` : ''
  return `${plural(total, 'layer')} · ${names.slice(0, MAX_NAMES).join(', ')}${names.length > MAX_NAMES ? '…' : ''}${mode}`
}

/** Where a row stands now: picking a variable settles a Check, and any pick can change the value. */
export function kindOf(g: MapperGroup, picks: Picks): MatchKind {
  const pick = picks.get(g.id)
  if (pick) return pick.exact ? 'exact' : 'near'
  return g.match
}

/** "999 px", matching how the row shows the hard-coded value. */
const withUnit = (g: MapperGroup, value: string) => (g.current.endsWith(' px') ? `${value} px` : value)

/** The line under a row: what binding will do, or what it did. */
export function rowNote(g: MapperGroup, kind: MatchKind, variable: Candidate | undefined, source: string, binding?: Binding): string | undefined {
  if (binding) {
    if (binding.restoredLayers) {
      return `${plural(g.layers.length - binding.restoredLayers, 'layer')} bound, value unchanged. ${binding.restoredLayers} restored, value would have changed.`
    }
    return binding.variable.exact ? 'Bound. Value unchanged.' : 'Bound. Value changed.'
  }
  if (kind === 'check') return `${plural(g.matches, 'variable')} ${g.matches === 1 ? 'has' : 'have'} this value. Check this one fits.`
  if (kind === 'near' && variable) return `Changes the value: ${g.current} becomes ${withUnit(g, variable.value)}.`
  if (kind === 'none') return `Nothing in ${source} is near this value.`
  return undefined
}

export const candidateLabel = (c: Candidate) => `${c.name} · ${c.value}`

export const glyphText = (g: MapperGroup) => (typeof g.value === 'number' ? String(g.value) : '')

/** Values still hard-coded in a group: a Bind can leave some behind. */
export const valuesLeft = (g: MapperGroup, bound: Bindings) => g.targets.length - (bound.get(g.id)?.values ?? 0)

const sum = (groups: readonly MapperGroup[], bound: Bindings) => groups.reduce((n, g) => n + valuesLeft(g, bound), 0)

export function matchCounts(groups: readonly MapperGroup[], picks: Picks, bound: Bindings): Record<MatchKind, number> {
  // What a Bind left behind needs a Re-check first, so it isn't ready to bind.
  const standing = (g: MapperGroup) => (bound.has(g.id) ? 'check' : kindOf(g, picks))
  const of = (kind: MatchKind) => sum(groups.filter((g) => standing(g) === kind), bound)
  return { exact: of('exact'), check: of('check'), near: of('near'), none: of('none') }
}

export function filterOptions(groups: readonly MapperGroup[], bound: Bindings): { value: Filter; label: string }[] {
  return [
    { value: 'all', label: `All ${sum(groups, bound)}` },
    ...CATEGORIES.map((c) => ({ value: c, label: `${CATEGORY_LABEL[c]} ${sum(groups.filter((g) => g.category === c), bound)}` })),
  ]
}

/** Rows for the current tab and search text: layer names, the value, or a suggested variable. */
export function visibleGroups(groups: readonly MapperGroup[], filter: Filter, query: string): readonly MapperGroup[] {
  const q = query.trim().toLowerCase()
  return groups.filter((g) => (filter === 'all' || g.category === filter) && (!q
    || g.current.toLowerCase().includes(q) || g.property.toLowerCase().includes(q)
    || g.layers.some((l) => l.name.toLowerCase().includes(q)) || g.candidates.some((c) => c.name.toLowerCase().includes(q))))
}
