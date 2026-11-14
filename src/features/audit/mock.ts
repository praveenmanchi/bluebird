// Fixture handlers for browser-only development (?mode=mock) and UI tests. The
// numbers are illustrative, the same ones the Figma screens show: the Plugin UI
// file holds the design system itself, so a real scan of it reads as all-library.
import type { HandlerMap } from '@shared/bridge'
import { countItems, coverageOf, issuesOf, pageCoverageOf, scoreOf } from './audit'
import {
  MSG, type AnalyticsResult, type Asset, type AuditItem, type AuditResult, type BoundPlace, type GotoResult, type LibraryCard, type Origin, type PagesResult, type Place, type SelectResult, type UnusedComponent,
} from './messages'

export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

const SOURCE = 'Bluebird UI'
const FRAMES = ['Access code flow', 'SSO flow', 'Error states'] as const

const place = (item: string, name: string, count: number): Place => ({
  id: `f:${name}`, name, page: 'Login', nodeIds: Array.from({ length: count }, (_, i) => `n:${item}:${name}:${i}`),
})

function item(origin: Origin, name: string, ...counts: number[]): AuditItem {
  return {
    id: `${origin}:${name}`, name, origin, count: counts.reduce((a, b) => a + b, 0),
    places: counts.map((c, i) => place(name, FRAMES[i]!, c)),
  }
}

const value = (origin: 'colour' | 'spacing', name: string, hint: string, ...counts: number[]): AuditItem => ({ ...item(origin, name, ...counts), hint })

export const MOCK_ITEMS: readonly AuditItem[] = [
  value('colour', '#FAFAFA', 'Fill · use text/secondary', 12, 7), value('colour', '#26262B', 'Fill · use surface/raised', 8, 4),
  value('colour', '#D4D4D8', 'Stroke · use border/default', 7), value('colour', '#60A5FA', 'Fill · no variable holds this', 3),
  value('spacing', 'Item spacing 14', 'Nearest on the scale: 12', 4, 2), value('spacing', 'Padding top 18', 'Nearest on the scale: 16', 4), value('spacing', 'Padding left 22', 'Nearest on the scale: 24', 2),
  item('library', 'Button', 24, 16, 8), item('library', 'Tab', 24, 12), item('library', 'Dropdown', 12, 6, 4), item('library', 'Meta Badge', 12, 6),
  item('library', 'Notice', 8, 4), item('library', 'Section Title', 8, 4), item('library', 'Checkbox', 10), item('library', 'KPI Tile', 8),
  item('library', 'Link Button', 8), item('library', 'Toggle', 6), item('library', 'Menu item', 6),
  item('detached', 'Button', 6, 2), item('detached', 'Notice', 4), item('detached', 'Dropdown', 2),
  item('local', 'Card / Promo', 9, 4, 2), item('local', 'Icon / Close', 6, 2), item('other', 'Promo tile', 6, 3),
]

const unusedNames = ['Agent Card', 'Avatar', 'Chat Input', 'Pipeline', 'Release Row', 'Rule Row', 'Site Preview', 'Stepper', 'Ticket Row', 'Voice Bar', 'Value Diff', 'Version Option']
export const MOCK_UNUSED: readonly UnusedComponent[] = unusedNames.map((name) => ({ key: `k:${name}`, name, location: 'Molecules' }))

const MOCK_PAGES = ['Cover', 'Atoms', 'Molecules', 'Organisms', 'Login', 'Onboarding', 'Accessibility', 'Settings'].map((name, i) => ({ id: `p:${i}`, name }))

const BOUND = 487
/** How the bound paints fall across the frames: the first takes what the others leave. */
const BOUND_SHARE: readonly number[] = [0, 160, 87]
const boundPlaces = (bound: number): BoundPlace[] => {
  const rest = BOUND_SHARE.reduce((a, b) => a + b, 0)
  const split = bound > rest ? [bound - rest, ...BOUND_SHARE.slice(1)] : [bound]
  return split.map((count, i) => ({ place: { id: `f:${FRAMES[i]!}`, name: FRAMES[i]! }, page: 'Login', count })).filter((b) => b.count > 0)
}

export const MOCK_LIBRARIES: readonly LibraryCard[] = [
  { role: 'components', name: 'Bluebird Components', count: 232 },
  { role: 'variables', name: 'Bluebird Variables', count: 528 },
]

export function mockAudit(items: readonly AuditItem[] = MOCK_ITEMS, unused: readonly UnusedComponent[] = MOCK_UNUSED, bound = BOUND): Extract<AuditResult, { status: 'ready' }> {
  const counts = countItems(items, bound, unused.length, items.filter((i) => i.origin === 'library').length + unused.length)
  const screens = coverageOf(items, boundPlaces(bound))
  return {
    status: 'ready', source: SOURCE, problem: null, scope: 'Login', counts, score: scoreOf(counts), issues: issuesOf(counts),
    items: items.filter((i) => i.origin !== 'library'), unused, screens, pageCoverage: pageCoverageOf(screens), visited: 1204, durationMs: 840,
  }
}

const NO_LIBRARY = 'Add a Components file in Settings › Dual File Mode.'
/** No library connected: only the variable half ran. */
export function mockNoLibrary(): AuditResult {
  const items = MOCK_ITEMS.filter((i) => i.origin === 'colour' || i.origin === 'spacing')
  return { ...mockAudit(items, []), source: null, problem: NO_LIBRARY }
}

export const MOCK_ANALYTICS: Readonly<Record<Asset, AnalyticsResult>> = {
  components: {
    status: 'ready', asset: 'components', uses: 4218, files: 37, teams: 6, detached: 86, published: 139,
    top: [{ name: 'Button', hint: '6 teams · 31 files', usages: 1204 }, { name: 'Tab', hint: '5 teams · 22 files', usages: 688 }, { name: 'Dropdown', hint: '4 teams · 19 files', usages: 412 }],
    breakdown: [{ name: 'Checkout redesign', hint: 'Web team', usages: 642 }, { name: 'Mobile app', hint: 'Apps team', usages: 518 }],
    notUsed: ['Site Preview', 'Stepper', 'Voice Bar'], truncated: false,
  },
  variables: {
    status: 'ready', asset: 'variables', uses: 18640, files: 42, teams: 7, detached: 214, published: 1606,
    top: [{ name: 'text/primary', hint: 'Brand UI · Color · 7 teams · 38 files', usages: 3120 }, { name: 'surface/raised', hint: 'Brand UI · Color · 6 teams · 31 files', usages: 2204 }, { name: 'space/md', hint: 'Semantics · Float · 6 teams · 29 files', usages: 1876 }],
    breakdown: [{ name: 'Brand UI', hint: '988 variables', usages: 14302 }, { name: 'Semantics', hint: '59 variables', usages: 4338 }],
    notUsed: ['a11y/surface/ghost', 'docs/overlay/scrim', 'jira/priority/lowest'], truncated: false,
  },
  styles: {
    status: 'ready', asset: 'styles', uses: 1204, files: 28, teams: 5, detached: 12, published: 24,
    top: [{ name: 'Code/SM', hint: 'Text · 5 teams · 18 files', usages: 402 }, { name: 'Elevation/Card', hint: 'Effect · 4 teams · 14 files', usages: 288 }, { name: 'Grid/12 col', hint: 'Grid · 3 teams · 9 files', usages: 146 }],
    breakdown: [{ name: 'Checkout redesign', hint: 'Web team', usages: 188 }, { name: 'Mobile app', hint: 'Apps team', usages: 142 }],
    notUsed: ['Elevation/Modal', 'Grid/4 col'], truncated: false,
  },
  teams: {
    status: 'ready', asset: 'teams', inserted: 2140, detached: 312, teams: 6, detachRate: 15,
    byTeam: [{ name: 'Web team', hint: 'Digital workspace · 94 detached', usages: 842 }, { name: 'Apps team', hint: 'Digital workspace · 61 detached', usages: 618 }, { name: 'Brand team', hint: 'Marketing workspace · 28 detached', usages: 344 }],
    weeks: [{ name: 'Week of 26 Oct', hint: '184 inserted · 22 detached', usages: 184 }, { name: 'Week of 19 Oct', hint: '212 inserted · 31 detached', usages: 212 }],
    mostDetached: [{ name: 'Button', detachments: 38 }, { name: 'Tab', detachments: 21 }, { name: 'Dropdown', detachments: 14 }], truncated: false,
  },
}

export function createMockHandlers(scenario: MockScenario = 'default'): HandlerMap {
  return {
    [MSG.pages]: async (): Promise<PagesResult> => ({ pages: MOCK_PAGES, currentPageId: 'p:4', currentPage: 'Login', screens: 14, selected: 3, source: SOURCE, libraries: MOCK_LIBRARIES }),
    [MSG.run]: async (): Promise<AuditResult> => {
      if (scenario === 'error') throw new Error('Figma stopped answering.')
      return scenario === 'empty' ? mockAudit([], [], 0) : mockAudit()
    },
    [MSG.analytics]: async (p: { asset: Asset }): Promise<AnalyticsResult> => (scenario === 'empty'
      ? { status: 'unavailable', reason: 'plan', message: 'Library Analytics is only available on Figma Enterprise, with a token that has library_analytics:read. This scope still works on any plan.' }
      : MOCK_ANALYTICS[p.asset]),
    [MSG.select]: async (p: { nodeIds: readonly string[] }): Promise<SelectResult> => ({ selected: p.nodeIds.length, page: 'Login', elsewhere: 0 }),
    [MSG.goto]: async (): Promise<GotoResult> => ({ page: 'Login', name: 'Button' }),
  }
}
