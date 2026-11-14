// Across files: Figma Library Analytics. It reports per library, by asset, file or team,
// so it complements the scan rather than replacing it. Enterprise only. Each view reads
// only its own endpoints, because every call counts against the Tier 3 rate limit.
import type { LibrariesRuntime } from '@shared/libraries/handlers'
import { filesFromSettings, type FileSpec } from '@shared/libraries/load'
import { createFigmaGet, LibraryError, type FigmaGet } from '@shared/libraries/rest'
import { fileLabel, type LibraryIndex } from '@shared/libraries/types'
import { weekLabel } from '../format'
import type { AnalyticsResult, Asset, AssetAnalytics, TeamAnalytics, UsageRow } from '../messages'

const WEEKS = 12
const DAY_MS = 86_400_000
const MAX_PAGES = 10
const TOP = 5

type Kind = 'component' | 'variable' | 'style'

interface Page<R> { rows: readonly R[]; next_page?: boolean; cursor?: string }
interface Rows<R> { rows: R[]; truncated: boolean }

interface Usage { usages: number; teams_using: number; files_using: number }
interface ComponentUsage extends Usage { component_key: string; component_name: string; component_set_key?: string | null; component_set_name?: string | null }
interface VariableUsage extends Usage { variable_key: string; variable_name: string; variable_type: string; collection_name: string }
interface StyleUsage extends Usage { style_key: string; style_name: string; style_type: string }
interface FileUsage { file_name: string; team_name: string; usages: number }
interface Action { week: string; insertions: number; detachments: number }
interface ComponentAction extends Action { component_name: string; component_set_name?: string | null }
interface TeamAction extends Action { team_name: string; workspace_name?: string | null }

async function allRows<R>(get: FigmaGet, path: string): Promise<Rows<R>> {
  const rows: R[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await get<Page<R>>(cursor ? `${path}${sep}cursor=${encodeURIComponent(cursor)}` : path, 'analytics')
    rows.push(...res.rows)
    if (!res.next_page || !res.cursor) return { rows, truncated: false }
    cursor = res.cursor
  }
  return { rows, truncated: true }
}

/**
 * One unreadable library file shouldn't sink the whole view, so reads are settled per file.
 * What's left is marked partial: an unread file could hold usage. Only all of them failing is an error.
 */
async function readAll<T>(reads: readonly Promise<T>[]): Promise<{ values: T[]; partial: boolean }> {
  const settled = await Promise.allSettled(reads)
  const values = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  if (settled.length && !values.length) throw (settled[0] as PromiseRejectedResult).reason
  return { values, partial: values.length < settled.length }
}

const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`
const reach = (r: Usage) => `${plural(r.teams_using, 'team')} · ${plural(r.files_using, 'file')}`
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
const byUsage = (a: UsageRow, b: UsageRow) => b.usages - a.usages
const sum = <R>(rows: readonly R[], of: (r: R) => number) => rows.reduce((n, r) => n + of(r), 0)

/** Variants roll up into their set, the unit the rest of the tab counts in. */
function bySet(rows: readonly ComponentUsage[]): UsageRow[] {
  const sets = new Map<string, { name: string; usages: number; teams: number; files: number }>()
  for (const r of rows) {
    const key = r.component_set_key || r.component_key
    const set = sets.get(key)
    if (set) {
      set.usages += r.usages
      set.teams = Math.max(set.teams, r.teams_using)
      set.files = Math.max(set.files, r.files_using)
    } else sets.set(key, { name: r.component_set_name || r.component_name, usages: r.usages, teams: r.teams_using, files: r.files_using })
  }
  return [...sets.values()].sort((a, b) => b.usages - a.usages).map((s) => ({ name: s.name, usages: s.usages, hint: `${plural(s.teams, 'team')} · ${plural(s.files, 'file')}` }))
}

function byCollection(rows: readonly VariableUsage[]): UsageRow[] {
  const groups = new Map<string, { usages: number; count: number }>()
  for (const r of rows) {
    const g = groups.get(r.collection_name) ?? { usages: 0, count: 0 }
    groups.set(r.collection_name, { usages: g.usages + r.usages, count: g.count + 1 })
  }
  return [...groups].map(([name, g]) => ({ name, hint: plural(g.count, 'variable'), usages: g.usages })).sort(byUsage)
}

/** Which library files can hold each kind. Styles aren't tied to a Dual File role. */
function specsFor(specs: readonly FileSpec[], kind: Kind): FileSpec[] {
  if (kind === 'style') return [...specs]
  return specs.filter((s) => s.roles.includes(kind === 'component' ? 'components' : 'variables'))
}

interface Reader { get: FigmaGet; base: string }

const reader = (spec: FileSpec, fetch: LibrariesRuntime['fetch']): Reader => ({
  get: createFigmaGet(spec.token, fileLabel(spec), fetch),
  base: `/analytics/libraries/${encodeURIComponent(spec.fileKey)}`,
})

interface AssetRead<U> { usage: Rows<U>; files: Rows<FileUsage>; actions: Rows<Action> }

async function readAsset<U>(readers: readonly Reader[], kind: Kind, since: string): Promise<{ usage: U[]; files: FileUsage[]; actions: Action[]; truncated: boolean }> {
  const { values: reads, partial } = await readAll<AssetRead<U>>(readers.map(async ({ get, base }) => {
    const path = `${base}/${kind}`
    const [usage, files, actions] = await Promise.all([
      allRows<U>(get, `${path}/usages?group_by=${kind}`),
      allRows<FileUsage>(get, `${path}/usages?group_by=file`),
      allRows<Action>(get, `${path}/actions?group_by=${kind}&start_date=${since}`),
    ])
    return { usage, files, actions }
  }))
  return {
    usage: reads.flatMap((r) => r.usage.rows),
    files: reads.flatMap((r) => r.files.rows),
    actions: reads.flatMap((r) => r.actions.rows),
    truncated: partial || reads.some((r) => r.usage.truncated || r.files.truncated || r.actions.truncated),
  }
}

const fileRows = (files: readonly FileUsage[]): UsageRow[] => files.map((f) => ({ name: f.file_name, hint: f.team_name, usages: f.usages })).sort(byUsage).slice(0, TOP)

interface Shaped { top: UsageRow[]; breakdown: UsageRow[]; used: Set<string>; catalogue: readonly { name: string; keys: readonly string[] }[] }

function unusedNames(shaped: Shaped, truncated: boolean): string[] {
  if (truncated) return []
  return shaped.catalogue.filter((c) => !c.keys.some((k) => shaped.used.has(k))).map((c) => c.name).sort((a, b) => a.localeCompare(b))
}

async function assetView<U extends Usage>(asset: AssetAnalytics['asset'], kind: Kind, readers: readonly Reader[], since: string, shape: (usage: readonly U[], files: readonly FileUsage[]) => Shaped): Promise<AssetAnalytics> {
  const read = await readAsset<U>(readers, kind, since)
  const shaped = shape(read.usage, read.files)
  return {
    status: 'ready', asset,
    uses: sum(read.usage, (r) => r.usages),
    files: read.files.length,
    teams: new Set(read.files.map((f) => f.team_name)).size,
    detached: sum(read.actions, (r) => r.detachments),
    published: shaped.catalogue.length,
    top: shaped.top.slice(0, TOP),
    breakdown: shaped.breakdown.slice(0, TOP),
    notUsed: unusedNames(shaped, read.truncated),
    truncated: read.truncated,
  }
}

/** Components only: binding a variable or applying a style isn't an insertion, so mixing them would make the detach rate meaningless. */
async function teamsView(readers: readonly Reader[], since: string): Promise<TeamAnalytics> {
  const { values: reads, partial } = await readAll(readers.map(async ({ get, base }) => {
    const path = `${base}/component/actions`
    const [teams, components] = await Promise.all([
      allRows<TeamAction>(get, `${path}?group_by=team&start_date=${since}`),
      allRows<ComponentAction>(get, `${path}?group_by=component&start_date=${since}`),
    ])
    return { teams, components }
  }))
  const rows = reads.flatMap((r) => r.teams.rows)
  const teams = new Map<string, { workspace: string; inserted: number; detached: number }>()
  const weeks = new Map<string, { inserted: number; detached: number }>()
  for (const r of rows) {
    const t = teams.get(r.team_name) ?? { workspace: r.workspace_name ?? '', inserted: 0, detached: 0 }
    teams.set(r.team_name, { ...t, inserted: t.inserted + r.insertions, detached: t.detached + r.detachments })
    const w = weeks.get(r.week) ?? { inserted: 0, detached: 0 }
    weeks.set(r.week, { inserted: w.inserted + r.insertions, detached: w.detached + r.detachments })
  }
  const detachedBy = new Map<string, number>()
  for (const r of reads.flatMap((d) => d.components.rows)) {
    const name = r.component_set_name || r.component_name
    detachedBy.set(name, (detachedBy.get(name) ?? 0) + r.detachments)
  }
  const inserted = sum(rows, (r) => r.insertions)
  const detached = sum(rows, (r) => r.detachments)
  return {
    status: 'ready', asset: 'teams', inserted, detached, teams: teams.size,
    detachRate: inserted ? Math.round((detached / inserted) * 100) : null,
    byTeam: [...teams].map(([name, t]) => ({ name, hint: `${t.workspace ? `${t.workspace} · ` : ''}${t.detached.toLocaleString()} detached`, usages: t.inserted })).sort(byUsage).slice(0, TOP),
    weeks: [...weeks].sort(([a], [b]) => b.localeCompare(a)).slice(0, TOP).map(([week, w]) => ({ name: weekLabel(week), hint: `${w.inserted.toLocaleString()} inserted · ${w.detached.toLocaleString()} detached`, usages: w.inserted })),
    mostDetached: [...detachedBy].filter(([, n]) => n > 0).map(([name, detachments]) => ({ name, detachments })).sort((a, b) => b.detachments - a.detachments).slice(0, TOP),
    truncated: partial || reads.some((r) => r.teams.truncated || r.components.truncated),
  }
}

const NEED_FILE: Readonly<Record<Asset, string>> = {
  components: 'Add a Components file in Settings › Dual File Mode.',
  variables: 'Add a Variables file in Settings › Dual File Mode.',
  styles: 'Add a library file in Settings › Dual File Mode.',
  teams: 'Add a Components file in Settings › Dual File Mode.',
}

// Figma's 403 also covers a bad token, the wrong account type or a file the token can't open.
const REFUSED_FOR_PLAN = /Figma said:.*\b(plan|enterprise)\b/i
const ENTERPRISE = 'Library Analytics is only available on Figma Enterprise, with a token that has library_analytics:read. This scope still works on any plan.'

function view(asset: Asset, specs: readonly FileSpec[], fetch: LibrariesRuntime['fetch'], index: LibraryIndex, since: string): Promise<AnalyticsResult> {
  const readers = (kind: Kind) => specsFor(specs, kind).map((s) => reader(s, fetch))
  if (asset === 'teams') return teamsView(readers('component'), since)
  if (asset === 'components') {
    return assetView<ComponentUsage>('components', 'component', readers('component'), since, (usage, files) => ({
      top: bySet(usage), breakdown: fileRows(files),
      used: new Set(usage.flatMap((r) => [r.component_key, r.component_set_key ?? ''])),
      catalogue: index.components.map((c) => ({ name: c.name, keys: [c.key, ...c.keys] })),
    }))
  }
  if (asset === 'variables') {
    return assetView<VariableUsage>('variables', 'variable', readers('variable'), since, (usage) => ({
      top: usage.map((r) => ({ name: r.variable_name, hint: `${r.collection_name} · ${titleCase(r.variable_type)} · ${reach(r)}`, usages: r.usages })).sort(byUsage),
      breakdown: byCollection(usage),
      used: new Set(usage.map((r) => r.variable_key)),
      catalogue: index.variables.map((v) => ({ name: v.name, keys: [v.key] })),
    }))
  }
  return assetView<StyleUsage>('styles', 'style', readers('style'), since, (usage, files) => ({
    top: usage.map((r) => ({ name: r.style_name, hint: `${titleCase(r.style_type)} · ${reach(r)}`, usages: r.usages })).sort(byUsage),
    breakdown: fileRows(files),
    used: new Set(usage.map((r) => r.style_key)),
    catalogue: (index.styles ?? []).map((s) => ({ name: s.name, keys: [s.key] })),
  }))
}

export async function readAnalytics(runtime: Pick<LibrariesRuntime, 'readSettings' | 'fetch'>, asset: Asset, index: LibraryIndex, now: () => number = Date.now): Promise<AnalyticsResult> {
  const specs = filesFromSettings(await runtime.readSettings())
  const needed = asset === 'variables' ? specsFor(specs, 'variable') : asset === 'styles' ? specs : specsFor(specs, 'component')
  if (!needed.length) return { status: 'no-source', message: NEED_FILE[asset] }
  const since = new Date(now() - WEEKS * 7 * DAY_MS).toISOString().slice(0, 10)
  try {
    return await view(asset, specs, runtime.fetch, index, since)
  } catch (error: unknown) {
    if (error instanceof LibraryError && error.status === 403) {
      if (/scope/i.test(error.message)) return { status: 'unavailable', reason: 'scope', message: error.message }
      return REFUSED_FOR_PLAN.test(error.message) ? { status: 'unavailable', reason: 'plan', message: ENTERPRISE } : { status: 'unavailable', reason: 'access', message: error.message }
    }
    throw error
  }
}
