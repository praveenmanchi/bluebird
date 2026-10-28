// Runs inside Figma. Everything that touches the document for this tab lives here.
import type { HandlerMap, HandlerContext } from '@shared/bridge'
import { cleanPageName, isDividerPage } from '../format'
import {
  MSG, searchRequestSchema, selectRequestSchema, gotoRequestSchema, recentRequestSchema, recentSearchSchema,
  type GotoResult, type PagesResult, type RecentSearch, type SearchProgress, type SearchResult, type SelectResult,
} from '../messages'
import { scan } from './scan'

export const RECENT_KEY = 'bluebird:varsearch:recent'
const MAX_RECENT = 6

function pages(): PagesResult {
  return {
    pages: figma.root.children.filter((p) => !isDividerPage(p.name)).map((p) => ({ id: p.id, name: cleanPageName(p.name) })),
    currentPageId: figma.currentPage.id,
  }
}

async function search(payload: unknown, ctx: HandlerContext): Promise<SearchResult> {
  const request = searchRequestSchema.parse(payload)
  return scan(request, (p) => ctx.emit(MSG.progress, p satisfies SearchProgress))
}

function pageOf(node: BaseNode): PageNode | null {
  let p: BaseNode | null = node
  while (p && p.type !== 'PAGE') p = p.parent
  return p as PageNode | null
}

/** Selects the layers that are on one page (the first one's) and zooms to them. */
async function select(payload: unknown): Promise<SelectResult> {
  const { nodeIds } = selectRequestSchema.parse(payload)
  const found: SceneNode[] = []
  for (const id of nodeIds) {
    const node = await figma.getNodeByIdAsync(id)
    if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') found.push(node as SceneNode)
  }
  if (!found.length) throw new Error('Those layers no longer exist. Search again to refresh the results.')
  const page = pageOf(found[0]!)
  if (!page) throw new Error('Those layers are not on a page')
  const onPage = found.filter((n) => pageOf(n) === page)
  if (figma.currentPage !== page) await figma.setCurrentPageAsync(page)
  figma.currentPage.selection = onPage
  figma.viewport.scrollAndZoomIntoView(onPage)
  return { selected: onPage.length, page: cleanPageName(page.name), elsewhere: found.length - onPage.length }
}

async function goto(payload: unknown): Promise<GotoResult> {
  const { nodeId } = gotoRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That layer no longer exists. Search again to refresh the results.')
  const page = pageOf(node)
  if (!page) throw new Error('That layer is not on a page')
  if (figma.currentPage !== page) await figma.setCurrentPageAsync(page)
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
  return { page: cleanPageName(page.name), name: node.name }
}

async function readRecent(): Promise<RecentSearch[]> {
  const stored: unknown = await figma.clientStorage.getAsync(RECENT_KEY)
  if (!Array.isArray(stored)) return []
  return stored.flatMap((entry) => {
    const parsed = recentSearchSchema.safeParse(entry)
    return parsed.success ? [parsed.data] : []
  })
}

/** Recent Searches: returns the list, after adding `add` (newest first, one entry per variable). */
async function recent(payload: unknown): Promise<RecentSearch[]> {
  const { add } = recentRequestSchema.parse(payload ?? {})
  const list = await readRecent()
  if (!add) return list
  const next = [add, ...list.filter((r) => r.name !== add.name)].slice(0, MAX_RECENT)
  await figma.clientStorage.setAsync(RECENT_KEY, next)
  return next
}

async function recentClear(): Promise<RecentSearch[]> {
  await figma.clientStorage.deleteAsync(RECENT_KEY)
  return []
}

export const handlers: HandlerMap = {
  [MSG.pages]: pages,
  [MSG.search]: search,
  [MSG.select]: select,
  [MSG.goto]: goto,
  [MSG.recent]: recent,
  [MSG.recentClear]: recentClear,
}
