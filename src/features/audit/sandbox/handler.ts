// Runs inside Figma. Everything that touches the document for this tab lives here.
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import { librariesRuntime, type LibrariesRuntime } from '@shared/libraries/handlers'
import type { LibraryIndex, LibraryLoadResult } from '@shared/libraries/types'
import { countItems, groupHits, issuesOf, scoreOf, unusedComponents } from '../audit'
import {
  MSG, analyticsRequestSchema, gotoRequestSchema, scopeSchema, selectRequestSchema,
  type AnalyticsResult, type AuditProgress, type AuditResult, type GotoResult, type PagesResult, type Scope, type SelectResult,
} from '../messages'
import { readAnalytics } from './analytics'
import { cleanPageName, scan } from './scan'
import { loadScales } from './variables'

const isDivider = (name: string) => /^[-–—\s]*$/.test(name)
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

const pageOf = (node: BaseNode): PageNode | null => {
  let p: BaseNode | null = node
  while (p && p.type !== 'PAGE') p = p.parent
  return p as PageNode | null
}

function scopeLabel(scope: Scope): string {
  if (scope.mode === 'selection') return plural(figma.currentPage.selection.length, 'selected layer')
  if (scope.mode === 'current') return cleanPageName(figma.currentPage.name)
  return plural(scope.pageIds.length, 'page')
}

const sourceName = (index: LibraryIndex) => index.files.filter((f) => f.roles.includes('components')).map((f) => f.name).join(', ')

export interface AuditDeps {
  loadLibraries: () => Promise<LibraryLoadResult>
  runtime: () => Pick<LibrariesRuntime, 'readSettings' | 'fetch'>
  now?: () => number
}

export function createHandlers(deps: AuditDeps): HandlerMap {
  const now = deps.now ?? Date.now

  /** What to compare against. Variables still get checked when components can't be. */
  async function library(): Promise<{ index: LibraryIndex | null; problem: string | null }> {
    const r = await deps.loadLibraries()
    if (r.status !== 'ready') return { index: null, problem: r.message }
    if (r.index.components.length) return { index: r.index, problem: null }
    const failed = r.index.files.find((f) => f.roles.includes('components') && f.error)
    return { index: r.index, problem: failed?.error ?? 'Add a Components file in Settings › Dual File Mode.' }
  }

  async function pages(): Promise<PagesResult> {
    const r = await library()
    return {
      pages: figma.root.children.filter((p) => !isDivider(p.name)).map((p) => ({ id: p.id, name: cleanPageName(p.name) })),
      currentPageId: figma.currentPage.id,
      selected: figma.currentPage.selection.length,
      source: r.index && !r.problem ? sourceName(r.index) : null,
    }
  }

  async function run(payload: unknown, ctx: HandlerContext): Promise<AuditResult> {
    const scope = scopeSchema.parse(payload)
    const started = now()
    if (scope.mode === 'selection' && !figma.currentPage.selection.length) return { status: 'nothing-selected' }
    const { index, problem } = await library()
    const components = index && !problem ? index.components : null
    // The designer can click away during a long scan: name the scope as it was when it started.
    const label = scopeLabel(scope)
    const scales = await loadScales(index?.variables ?? [])
    const { hits, seenKeys, bound, visited } = await scan(scope, components, scales, (p) => ctx.emit(MSG.progress, p satisfies AuditProgress))
    const grouped = groupHits(hits)
    const unused = components ? unusedComponents(components, seenKeys) : []
    const counts = countItems(grouped, bound, unused.length, components?.length ?? 0)
    return {
      status: 'ready', source: components && index ? sourceName(index) : null, problem, scope: label, counts, score: scoreOf(counts), issues: issuesOf(counts),
      items: grouped.filter((i) => i.origin !== 'library'), unused, visited, durationMs: now() - started,
    }
  }

  async function analytics(payload: unknown): Promise<AnalyticsResult> {
    const { asset } = analyticsRequestSchema.parse(payload)
    const r = await deps.loadLibraries()
    if (r.status !== 'ready') return { status: 'no-source', message: r.message }
    return readAnalytics(deps.runtime(), asset, r.index, now)
  }

  async function nodesOf(ids: readonly string[]): Promise<SceneNode[]> {
    const nodes = await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)))
    return nodes.filter((n): n is SceneNode => !!n && n.type !== 'DOCUMENT' && n.type !== 'PAGE')
  }

  /** Layers can span pages; Figma selects on one, so the first layer's page wins. */
  async function select(payload: unknown): Promise<SelectResult> {
    const { nodeIds } = selectRequestSchema.parse(payload)
    const found = await nodesOf(nodeIds)
    if (!found.length) throw new Error('Those layers no longer exist. Run the audit again to refresh the list.')
    const page = pageOf(found[0]!)
    if (!page) throw new Error('Those layers are not on a page.')
    const onPage = found.filter((n) => pageOf(n) === page)
    if (figma.currentPage !== page) await figma.setCurrentPageAsync(page)
    figma.currentPage.selection = onPage
    figma.viewport.scrollAndZoomIntoView(onPage)
    return { selected: onPage.length, page: cleanPageName(page.name), elsewhere: found.length - onPage.length }
  }

  async function goto(payload: unknown): Promise<GotoResult> {
    const { nodeId } = gotoRequestSchema.parse(payload)
    const [node] = await nodesOf([nodeId])
    if (!node) throw new Error('That layer no longer exists. Run the audit again to refresh the list.')
    const page = pageOf(node)
    if (!page) throw new Error('That layer is not on a page.')
    if (figma.currentPage !== page) await figma.setCurrentPageAsync(page)
    figma.currentPage.selection = [node]
    figma.viewport.scrollAndZoomIntoView([node])
    return { page: cleanPageName(page.name), name: node.name }
  }

  return { [MSG.pages]: pages, [MSG.run]: run, [MSG.analytics]: analytics, [MSG.select]: select, [MSG.goto]: goto }
}

export const handlers: HandlerMap = createHandlers({ loadLibraries: () => librariesRuntime().load(), runtime: librariesRuntime })
