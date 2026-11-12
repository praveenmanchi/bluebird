// A Figma branch and its main file, over the REST API: is the open file a
// branch, and what do the main file's variables and components look like —
// as a Snapshot the diff (@shared/design/diff) compares with the open file.
//
// A branch keeps its main file's variable and node ids, so both sides match by
// id. No `figma` global: the caller passes a GET bound to a token.
import { rgbaToHex, type RGBA } from '@shared/figma/color'
import type { ComponentEntry, Snapshot, VariableEntry, VariableValueType } from '@shared/design/types'
import type { FigmaGet } from '@shared/libraries/rest'
import type { RestComponent, RestComponentSetsResponse, RestComponentsResponse, RestVariablesResponse } from '@shared/libraries/normalize'

export interface BranchInfo {
  /** The open file's name as Figma has it (the branch's name on a branch). */
  name: string
  /** The main file's key; null when the open file is not a branch. */
  mainFileKey: string | null
}

const filePath = (key: string) => `/files/${encodeURIComponent(key)}`

/** One small read (pages only) that says whether `fileKey` is a branch. */
export async function readBranchInfo(get: FigmaGet, fileKey: string): Promise<BranchInfo> {
  const file = await get<{ name?: string; mainFileKey?: string }>(`${filePath(fileKey)}?depth=1&branch_data=true`, 'nodes')
  return { name: file.name ?? '', mainFileKey: file.mainFileKey || null }
}

const TYPE: Record<string, VariableValueType> = { COLOR: 'color', FLOAT: 'number', STRING: 'string', BOOLEAN: 'boolean' }

/** The same text @shared/figma/snapshot writes for a value, so equal values compare equal. */
function formatValue(value: unknown, names: ReadonlyMap<string, string>): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(Math.round(value * 1000) / 1000)
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return '—'
  const v = value as { type?: string; id?: string; r?: number; g?: number; b?: number; a?: number }
  if (v.type === 'VARIABLE_ALIAS') return `→ ${names.get(v.id ?? '') ?? 'library variable'}`
  if (typeof v.r === 'number' && typeof v.g === 'number' && typeof v.b === 'number') return rgbaToHex({ r: v.r, g: v.g, b: v.b, a: v.a ?? 1 } as RGBA).toUpperCase()
  return '—'
}

/** The file's own variables (imported ones left out), one value per mode name. */
export function variablesFromRest(res: RestVariablesResponse): VariableEntry[] {
  const { variables, variableCollections } = res.meta
  const local = Object.values(variables).filter((v) => !v.remote)
  const names = new Map(local.map((v) => [v.id, v.name]))
  return local.flatMap((v) => {
    const collection = variableCollections[v.variableCollectionId]
    if (!collection) return []
    const values = Object.fromEntries(collection.modes.map((m) => [m.name, formatValue(v.valuesByMode[m.modeId], names)]))
    return [{ id: v.id, name: v.name, collection: collection.name, type: TYPE[v.resolvedType] ?? 'string', values, description: v.description ?? '' }]
  })
}

interface RestNode { id: string; name: string; type: string; children?: RestNode[]; componentPropertyDefinitions?: Record<string, unknown> }
interface RestMeta { description?: string }
export interface RestComponentNodes {
  nodes: Record<string, { document?: RestNode; components?: Record<string, RestMeta>; componentSets?: Record<string, RestMeta> } | null>
}

/**
 * The main file's side of the components the open file has, looked up by node id.
 * A node the main file doesn't have is left out, which the diff reads as "added".
 */
export function componentsFromNodes(local: readonly ComponentEntry[], res: RestComponentNodes): ComponentEntry[] {
  return local.flatMap((c) => {
    const found = c.nodeId ? res.nodes[c.nodeId] : null
    const doc = found?.document
    if (!found || !doc || (doc.type !== 'COMPONENT_SET' && doc.type !== 'COMPONENT')) return []
    const meta = found.componentSets?.[doc.id] ?? found.components?.[doc.id]
    return [{
      id: c.id,
      nodeId: doc.id,
      name: doc.name,
      page: c.page,
      variants: doc.type === 'COMPONENT_SET' ? (doc.children ?? []).filter((n) => n.type === 'COMPONENT').length : 1,
      properties: Object.keys(doc.componentPropertyDefinitions ?? {}).map((k) => k.replace(/#[^#]*$/, '')).sort(),
      // The node carries no description; without the metadata entry it is taken as unchanged.
      description: meta ? meta.description ?? '' : c.description,
      usesVariables: [],
    }]
  })
}

const setOf = (c: RestComponent) => c.containing_frame?.containingComponentSet ?? c.containing_frame?.containingStateGroup ?? null

/** Published sets and standalone components of the main file that the open file no longer has. */
export function removedComponents(localNodeIds: ReadonlySet<string>, components: RestComponentsResponse, sets: RestComponentSetsResponse): ComponentEntry[] {
  const variants = new Map<string, number>()
  for (const c of components.meta.components) {
    const set = setOf(c)
    if (set) variants.set(set.nodeId, (variants.get(set.nodeId) ?? 0) + 1)
  }
  const entry = (c: RestComponent, count: number): ComponentEntry => ({
    id: c.key, nodeId: c.node_id, name: c.name, page: c.containing_frame?.pageName ?? '', variants: count, properties: [], description: c.description ?? '', usesVariables: [],
  })
  return [
    ...sets.meta.component_sets.filter((s) => !localNodeIds.has(s.node_id)).map((s) => entry(s, variants.get(s.node_id) ?? 0)),
    ...components.meta.components.filter((c) => !setOf(c) && !localNodeIds.has(c.node_id)).map((c) => entry(c, 1)),
  ]
}

/** `/nodes` takes a comma-separated id list; keep each request short of the URL limit. */
export const NODES_PER_REQUEST = 60
/** Node requests in flight at once. */
const PARALLEL = 4

async function readNodes(get: FigmaGet, mainKey: string, ids: readonly string[]): Promise<RestComponentNodes> {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += NODES_PER_REQUEST) chunks.push(ids.slice(i, i + NODES_PER_REQUEST))
  const nodes: RestComponentNodes['nodes'] = {}
  for (let i = 0; i < chunks.length; i += PARALLEL) {
    const batch = await Promise.all(chunks.slice(i, i + PARALLEL).map((chunk) => get<RestComponentNodes>(`${filePath(mainKey)}/nodes?ids=${encodeURIComponent(chunk.join(','))}&depth=1`, 'nodes')))
    for (const res of batch) Object.assign(nodes, res.nodes)
  }
  return { nodes }
}

const reason = (e: unknown) => e instanceof Error ? e.message : 'unknown error'

export interface MainSnapshot {
  snapshot: Snapshot
  /** What could not be compared, as sentences for the designer. */
  warnings: string[]
}

/**
 * The main file as a Snapshot to diff `local` (the open branch) against.
 * A part that can't be read is taken as unchanged and named in `warnings`,
 * so one missing scope never turns the whole file into "added".
 */
export async function readMainSnapshot(get: FigmaGet, mainKey: string, local: Snapshot): Promise<MainSnapshot> {
  const warnings: string[] = []
  const path = filePath(mainKey)
  const ids = local.components.flatMap((c) => c.nodeId ? [c.nodeId] : [])

  const [variables, components, removed] = await Promise.all([
    get<RestVariablesResponse>(`${path}/variables/local`, 'variables').then(variablesFromRest, (e: unknown) => {
      warnings.push(`Variables were not compared: ${reason(e)}`)
      return [...local.variables]
    }),
    readNodes(get, mainKey, ids).then((res) => componentsFromNodes(local.components, res), (e: unknown) => {
      warnings.push(`Components were not compared: ${reason(e)}`)
      return [...local.components]
    }),
    Promise.all([
      get<RestComponentsResponse>(`${path}/components`, 'components'),
      get<RestComponentSetsResponse>(`${path}/component_sets`, 'components'),
    ]).then(([c, s]) => removedComponents(new Set(ids), c, s), (e: unknown) => {
      warnings.push(`Removed components were not checked: ${reason(e)}`)
      return [] as ComponentEntry[]
    }),
  ])
  return { snapshot: { takenAt: local.takenAt, variables, components: [...components, ...removed] }, warnings }
}
