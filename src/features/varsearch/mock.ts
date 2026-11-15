// Fixture handlers for browser-only development (?mode=mock) and UI tests.
// The numbers are a real scan of the Plugin UI file's Atoms / Molecules /
// Organisms pages (2026-10-28), the same data the Figma screens show.
import type { HandlerMap } from '@shared/bridge'
import { matcherFor, rankVariables } from './match'
import {
  MSG, type GotoResult, type PageInfo, type PagesResult, type RecentSearch, type SearchRequest, type SearchResult,
  type SelectResult, type Usage, type VariableMatch,
} from './messages'
import type { ReportResult, SearchReport } from './report'

const PAGE_NAMES = ['Cover', 'Colours', 'Typography', 'Icons', 'Atoms', 'Molecules', 'Organisms', 'Login', 'Onboarding', 'Tokens',
  'Accessibility', 'Jira', 'MCP', 'UXAI', 'AI Agents', 'Publish', 'Documentation', 'Variable Search', 'Settings']
export const MOCK_PAGES: readonly PageInfo[] = PAGE_NAMES.map((name, i) => ({ id: `p:${i}`, name }))
const page = (name: string) => MOCK_PAGES.find((p) => p.name === name)!

const usage = (name: string, pageName: string, count: number, kind: Usage['kind'] = 'component'): Usage => ({
  id: `n:${name}`, name, kind, pageId: pageName ? page(pageName).id : '', pageName,
  nodeIds: Array.from({ length: count }, (_, i) => `n:${name}:${i}`), count,
})

const variable = (name: string, usages: Usage[]): VariableMatch => ({
  id: `v:${name}`, name, collection: 'Brand UI', resolvedType: 'COLOR', modes: 8, textLike: false,
  usages, totalNodes: usages.reduce((n, u) => n + u.count, 0),
})

export const MOCK_VARIABLES: readonly VariableMatch[] = [
  variable('dropdown/border/default', [
    usage('Tab sub menu', 'Molecules', 5), usage('Variable Row', 'Molecules', 2), usage('Dropdown', 'Organisms', 2),
    usage('dropdown', 'Molecules', 1), usage('dropbox', 'Molecules', 1),
  ]),
  variable('button/primary/bg/default', [
    usage('Publish Empty State', 'Organisms', 4), usage('Button', 'Molecules', 2), usage('variable button', 'Molecules', 1),
    usage('Fix Row', 'Molecules', 1), usage('Comment Composer', 'Molecules', 1), usage('Container', 'Molecules', 1),
    usage('Jira Empty State', 'Organisms', 1), usage('Component Artifact', 'Organisms', 1), usage('Agent Card', 'Organisms', 1),
    usage('Site Preview', 'Organisms', 1),
  ]),
  variable('surface/accent-strong', [
    usage('Tab sub menu', 'Molecules', 5), usage('Group Tab selecters', 'Molecules', 3), usage('Tab selecters', 'Molecules', 1),
    usage('Fix Row', 'Molecules', 1),
  ]),
  { ...variable('font/family-ui', [usage('Body', '', 4, 'text-style'), usage('Caption', '', 4, 'text-style')]), resolvedType: 'STRING', textLike: true },
]

export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

const DAY = 86_400_000

export function createMockHandlers(scenario: MockScenario = 'default', now: () => number = Date.now): HandlerMap {
  let recent: RecentSearch[] = scenario === 'empty' ? [] : [
    { query: 'button/primary/bg/default', name: 'button/primary/bg/default', meta: 'Brand UI · Used by 10 components · Affects 8 brand modes', usage: 15, textLike: false, at: now() - 2 * 60_000 },
    { query: 'surface/accent-strong', name: 'surface/accent-strong', meta: 'Brand UI · Used by 4 components · Affects 8 brand modes', usage: 10, textLike: false, at: now() - DAY },
    { query: 'font/family-ui', name: 'font/family-ui', meta: 'Brand UI · Used by 2 text styles · Affects 8 brand modes', usage: 8, textLike: true, at: now() - 12 * DAY },
  ]
  const delay = scenario === 'slow' ? 1000 : 120

  return {
    [MSG.pages]: async (): Promise<PagesResult> => ({ pages: MOCK_PAGES, currentPageId: page('Molecules').id }),
    [MSG.search]: async (payload: SearchRequest, ctx): Promise<SearchResult> => {
      const pages = payload.pageIds.length ? MOCK_PAGES.filter((p) => payload.pageIds.includes(p.id)) : MOCK_PAGES
      for (const [i, p] of pages.entries()) {
        await new Promise((r) => setTimeout(r, delay / pages.length))
        ctx.emit(MSG.progress, { page: p.name, index: i + 1, total: pages.length, visited: (i + 1) * 640 })
      }
      if (scenario === 'error') throw new Error('Figma stopped responding while loading the page “Accessibility · Ground truth” (mock scenario)')
      const matches = matcherFor(payload.query)
      const pageIds = new Set(pages.map((p) => p.id))
      const found = MOCK_VARIABLES.filter((v) => matches(v.name))
      const variables = scenario === 'empty' ? [] : found.flatMap((v) => {
        const usages = v.usages.filter((u) => (u.kind === 'text-style' || pageIds.has(u.pageId)) && (payload.types.length === 0 || payload.types.includes(u.kind)))
        return usages.length ? [{ ...v, usages, totalNodes: usages.reduce((n, u) => n + u.count, 0) }] : []
      })
      return { query: payload.query, matched: found.length, variables: rankVariables(payload.query, variables), scannedPages: pages.length, visited: pages.length * 640, durationMs: delay, fileKey: 'MOCKFILEKEY' }
    },
    [MSG.report]: async (payload: { report: SearchReport }): Promise<ReportResult> => ({ frameName: payload.report.frameName, page: 'Molecules' }),
    [MSG.select]: async (payload: { nodeIds: readonly string[] }): Promise<SelectResult> => ({ selected: payload.nodeIds.length, page: 'Molecules', elsewhere: 0 }),
    [MSG.goto]: async (payload: { nodeId: string }): Promise<GotoResult> => ({ page: 'Molecules', name: payload.nodeId.replace(/^n:/, '') }),
    [MSG.recent]: async (payload?: { add?: RecentSearch }): Promise<RecentSearch[]> => {
      if (payload?.add) recent = [payload.add, ...recent.filter((r) => r.name !== payload.add!.name)].slice(0, 6)
      return recent
    },
    [MSG.recentClear]: async (): Promise<RecentSearch[]> => (recent = []),
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
