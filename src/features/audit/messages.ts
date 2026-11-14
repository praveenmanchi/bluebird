// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'

export const MSG = {
  pages: 'audit:pages',
  run: 'audit:run',
  progress: 'audit:progress',
  analytics: 'audit:analytics',
  select: 'audit:select',
  goto: 'audit:goto',
} as const

export const scopeSchema = z.union([
  z.object({ mode: z.literal('selection') }),
  z.object({ mode: z.literal('current') }),
  z.object({ mode: z.literal('pages'), pageIds: z.array(z.string()).check(z.minLength(1)) }),
])
export type Scope = z.infer<typeof scopeSchema>

/** Across files views. Each reads its own Library Analytics endpoints, only when opened. */
export const assetSchema = z.enum(['components', 'variables', 'styles', 'teams'])
export type Asset = z.infer<typeof assetSchema>
export const analyticsRequestSchema = z.object({ asset: assetSchema })

export const selectRequestSchema = z.object({ nodeIds: z.array(z.string()).check(z.minLength(1), z.maxLength(5000)) })
export const gotoRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })

export interface PageInfo { id: string; name: string }
/** One library the audit compares against: the published count and the file it comes from. */
export interface LibraryCard { role: 'components' | 'variables'; name: string; count: number }
export interface PagesResult {
  pages: readonly PageInfo[]
  currentPageId: string
  /** The current page's name and how many screens (top-level frames) it holds. */
  currentPage: string
  screens: number
  selected: number
  source: string | null
  libraries: readonly LibraryCard[]
}

/** What a counted layer is: a component's origin, or a value that doesn't read the system. */
export type Origin = 'library' | 'detached' | 'local' | 'other' | 'colour' | 'spacing'

/** One thing the scan met: an instance, a detached frame, a hard-coded colour or off-scale spacing. */
export interface Hit {
  origin: Origin
  /** The component set's key, else the component's; the frame's id for an unknown detach; `kind|value` for a value. */
  groupKey: string
  name: string
  nodeId: string
  place: { id: string; name: string }
  page: string
  /** Second line for a value: what it is and what to use instead. */
  hint?: string
}

/** The frame the layers sit in, for "Where it is used". */
export interface Place { id: string; name: string; page: string; nodeIds: readonly string[] }

export interface AuditItem {
  id: string
  name: string
  origin: Origin
  count: number
  places: readonly Place[]
  hint?: string
}

export interface UnusedComponent { key: string; name: string; location: string }

export interface AuditCounts {
  /** Paints reading a variable or style, and all paints. */
  bound: number
  paints: number
  /** Layers with a hard-coded colour, and with spacing off the scale. */
  colours: number
  spacing: number
  library: number
  detached: number
  /** Local components, and instances from another library; `notLibrary` is both. */
  local: number
  other: number
  notLibrary: number
  unused: number
  /** Component layers counted (library + detached + not in library). */
  total: number
  published: number
}

/** What was counted in one place: paints reading the system of all paints, library instances of all component layers. */
export interface Coverage { bound: number; paints: number; library: number; components: number }
/** One screen: the top-level frame the layers sit in. */
export interface ScreenCoverage extends Coverage { id: string; name: string; page: string }
export interface PageCoverage extends Coverage { name: string; screens: number }
/** Paints on one screen that already read a variable or style. */
export interface BoundPlace { place: { id: string; name: string }; page: string; count: number }

/** The one number: paints and component layers that come from the design system. */
export interface AuditScore { value: number | null; used: number; total: number }

export type AuditResult =
  | { status: 'nothing-selected' }
  | {
    status: 'ready'
    /** The component library's name; null when none is connected, so only variables were checked. */
    source: string | null
    /** Why components weren't checked. */
    problem: string | null
    scope: string
    counts: AuditCounts
    score: AuditScore
    issues: number
    /** Every issue. Library instances are healthy, so they are counted but not listed. */
    items: readonly AuditItem[]
    unused: readonly UnusedComponent[]
    /** Coverage for every screen in scope, the least mapped first, and the same added up by page. */
    screens: readonly ScreenCoverage[]
    pageCoverage: readonly PageCoverage[]
    visited: number
    durationMs: number
  }

export interface AuditProgress { page: string; index: number; total: number; visited: number }

export interface UsageRow { name: string; hint: string; usages: number }

/** Components, Variables or Styles, from the usages and actions endpoints. */
export interface AssetAnalytics {
  status: 'ready'
  asset: Exclude<Asset, 'teams'>
  uses: number
  files: number
  teams: number
  detached: number
  published: number
  top: readonly UsageRow[]
  /** Files for components and styles, collections for variables. */
  breakdown: readonly UsageRow[]
  /** Published items with no usage in any file. Empty when `truncated`: an unread page could hold their usage. */
  notUsed: readonly string[]
  /** Not everything could be read (more rows, or a file refused), so the totals are lower bounds. */
  truncated: boolean
}

/** Weekly component insertions and detachments, from component/actions grouped by team. */
export interface TeamAnalytics {
  status: 'ready'
  asset: 'teams'
  inserted: number
  detached: number
  teams: number
  /** Detached ÷ inserted, 0–100; null when nothing was inserted. */
  detachRate: number | null
  byTeam: readonly UsageRow[]
  weeks: readonly UsageRow[]
  mostDetached: readonly { name: string; detachments: number }[]
  truncated: boolean
}

export type AnalyticsResult =
  | { status: 'no-source'; message: string }
  /** Library Analytics refused: `plan` (Enterprise only), `scope` (the token lacks library_analytics:read) or `access` (the token, account or file). */
  | { status: 'unavailable'; reason: 'plan' | 'scope' | 'access'; message: string }
  | AssetAnalytics
  | TeamAnalytics

export interface SelectResult { selected: number; page: string; elsewhere: number }
export interface GotoResult { page: string; name: string }
