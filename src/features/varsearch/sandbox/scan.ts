// Finds every layer and text style bound to the variables whose name matches a
// query, grouped by the component set / component / top-level frame it sits in.
import { traverse } from '@shared/figma/traverse'
import { cleanPageName } from '../format'
import { matcherFor, rankVariables } from '../match'
import type { SearchProgress, SearchRequest, SearchResult, Usage, UsageKind, VariableMatch } from '../messages'

const MAX_VARIABLES = 25

interface Owner { id: string; name: string; kind: Exclude<UsageKind, 'text-style'> }
interface Bucket { owner: Owner; pageId: string; pageName: string; nodeIds: Set<string> }

/** Variable ids a node reads, whatever field binds them (fills, strokes, gap, radius, text…). */
export function boundVariableIds(node: SceneNode): string[] {
  const bound = (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables
  if (!bound) return []
  const ids: string[] = []
  const add = (v: unknown) => {
    if (v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string') ids.push((v as { id: string }).id)
  }
  for (const value of Object.values(bound)) {
    if (Array.isArray(value)) value.forEach(add)
    else if (value && typeof value === 'object' && !('id' in value)) Object.values(value).forEach(add) // componentProperties map
    else add(value)
  }
  return ids
}

/**
 * The place a binding is reported under: the nearest component set, else the
 * nearest standalone component, else the top-level frame on the page (or in a
 * section). Variants roll up into their set, which is what the designer edits.
 */
export function ownerOf(node: SceneNode): Owner {
  let component: SceneNode | null = null
  let top: SceneNode = node
  for (let p: BaseNode | null = node; p && p.type !== 'PAGE'; p = p.parent) {
    const parentType = p.parent?.type
    if (!component && (p.type === 'COMPONENT_SET' || (p.type === 'COMPONENT' && parentType !== 'COMPONENT_SET'))) component = p as SceneNode
    if (p.type !== 'SECTION' && (parentType === 'PAGE' || parentType === 'SECTION')) top = p as SceneNode
  }
  const owner = component ?? top
  return { id: owner.id, name: owner.name, kind: component ? 'component' : 'frame' }
}

function isTextLike(v: Variable): boolean {
  return v.resolvedType === 'STRING' || v.scopes.some((s) => s.startsWith('FONT_') || s === 'LINE_HEIGHT' || s === 'LETTER_SPACING' || s === 'TEXT_CONTENT')
}

export async function scan(request: SearchRequest, emit: (p: SearchProgress) => void): Promise<SearchResult> {
  const started = Date.now()
  const matches = matcherFor(request.query)
  const wantCanvas = request.types.length === 0 || request.types.some((t) => t !== 'text-style')
  const wantStyles = request.types.length === 0 || request.types.includes('text-style')
  const wantKind = (k: UsageKind) => request.types.length === 0 || request.types.includes(k)

  // Local variables decide immediately; library variables are looked up once at the end.
  const locals = await figma.variables.getLocalVariablesAsync()
  const decided = new Map<string, Variable | null>()
  let matched = 0
  for (const v of locals) {
    const hit = matches(v.name)
    decided.set(v.id, hit ? v : null)
    if (hit) matched += 1
  }

  const buckets = new Map<string, Map<string, Bucket>>() // variable id → owner id → bucket
  const record = (varId: string, nodeId: string, owner: Owner, pageId: string, pageName: string) => {
    let byOwner = buckets.get(varId)
    if (!byOwner) buckets.set(varId, (byOwner = new Map()))
    let b = byOwner.get(owner.id)
    if (!b) byOwner.set(owner.id, (b = { owner, pageId, pageName, nodeIds: new Set() }))
    b.nodeIds.add(nodeId)
  }

  let visited = 0
  let scannedPages = 0
  if (wantCanvas) {
    const wanted = new Set(request.pageIds)
    const pages = figma.root.children.filter((p) => wanted.size === 0 || wanted.has(p.id))
    figma.skipInvisibleInstanceChildren = true
    for (const [index, page] of pages.entries()) {
      await page.loadAsync()
      const pageName = cleanPageName(page.name)
      const before = visited
      emit({ page: pageName, index: index + 1, total: pages.length, visited })
      await traverse(page.children, (node) => {
        const ids = boundVariableIds(node)
        if (!ids.length) return
        let owner: Owner | null = null
        for (const id of ids) {
          if (decided.get(id) === null) continue
          owner ??= ownerOf(node)
          if (!wantKind(owner.kind)) return
          record(id, node.id, owner, page.id, pageName)
        }
      }, {
        // Layers inside an instance read their main component's bindings; the
        // component reports them once. The instance itself still counts (overrides).
        skipChildren: (node) => node.type === 'INSTANCE',
        onProgress: (n) => {
          visited = before + n
          emit({ page: pageName, index: index + 1, total: pages.length, visited })
        },
      })
      scannedPages += 1
    }
  }

  // Library variables met on the canvas: resolve their names now.
  for (const id of buckets.keys()) {
    if (decided.has(id)) continue
    const v = await figma.variables.getVariableByIdAsync(id)
    const hit = v !== null && matches(v.name)
    decided.set(id, hit ? v : null)
    if (hit) matched += 1
  }

  const styleUsages = new Map<string, Usage[]>()
  if (wantStyles) {
    for (const style of await figma.getLocalTextStylesAsync()) {
      const counts = new Map<string, number>()
      for (const alias of Object.values(style.boundVariables ?? {})) {
        if (alias && decided.get(alias.id)) counts.set(alias.id, (counts.get(alias.id) ?? 0) + 1)
      }
      for (const [varId, count] of counts) {
        const list = styleUsages.get(varId) ?? []
        list.push({ id: style.id, name: style.name, kind: 'text-style', pageId: '', pageName: '', nodeIds: [], count })
        styleUsages.set(varId, list)
      }
    }
  }

  const collections = new Map<string, VariableCollection | null>()
  const variables: VariableMatch[] = []
  for (const [id, variable] of decided) {
    if (!variable) continue
    const canvas = [...(buckets.get(id)?.values() ?? [])].map((b): Usage => ({
      id: b.owner.id, name: b.owner.name, kind: b.owner.kind, pageId: b.pageId, pageName: b.pageName,
      nodeIds: [...b.nodeIds], count: b.nodeIds.size,
    }))
    const usages = [...canvas, ...(styleUsages.get(id) ?? [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    if (!usages.length) continue
    if (!collections.has(variable.variableCollectionId)) {
      collections.set(variable.variableCollectionId, await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId))
    }
    const collection = collections.get(variable.variableCollectionId)
    variables.push({
      id, name: variable.name,
      collection: collection?.name ?? 'Library',
      resolvedType: variable.resolvedType,
      modes: collection?.modes.length ?? Object.keys(variable.valuesByMode).length,
      textLike: isTextLike(variable),
      usages,
      totalNodes: usages.reduce((n, u) => n + u.count, 0),
    })
  }

  return {
    query: request.query,
    matched,
    variables: rankVariables(request.query, variables).slice(0, MAX_VARIABLES),
    scannedPages,
    visited,
    durationMs: Date.now() - started,
  }
}
