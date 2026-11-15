// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'

export const MSG = {
  pages: 'varsearch:pages',
  search: 'varsearch:search',
  progress: 'varsearch:progress',
  select: 'varsearch:select',
  goto: 'varsearch:goto',
  recent: 'varsearch:recent',
  recentClear: 'varsearch:recent-clear',
  /** Add to Figma: draws the search report as a frame on the current page. */
  report: 'varsearch:report',
} as const

/** Figma screens' Type filter: Frame / Component / Text style. Empty = all types. */
export const usageKindSchema = z.enum(['frame', 'component', 'text-style'])
export type UsageKind = z.infer<typeof usageKindSchema>
export const USAGE_KINDS: readonly UsageKind[] = ['frame', 'component', 'text-style']

export const MIN_QUERY = 2

export const searchRequestSchema = z.object({
  query: z.string().check(z.trim(), z.minLength(MIN_QUERY), z.maxLength(200)),
  /** Pages to scan; empty means every page in the file. */
  pageIds: z.array(z.string()),
  /** Kinds of place to report; empty means all of them. */
  types: z.array(usageKindSchema),
})
export type SearchRequest = z.infer<typeof searchRequestSchema>

export const selectRequestSchema = z.object({ nodeIds: z.array(z.string()).check(z.minLength(1), z.maxLength(5000)) })
export const gotoRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })

export interface PageInfo {
  id: string
  name: string
}

export interface PagesResult {
  pages: readonly PageInfo[]
  currentPageId: string
}

/** One component, frame or text style that reads the variable. */
export interface Usage {
  /** The component set / component / top-level frame / text style id. */
  id: string
  name: string
  kind: UsageKind
  /** Empty for text styles, which are not on the canvas. */
  pageId: string
  pageName: string
  /** Layers bound to the variable, each counted once however many fields it binds. */
  nodeIds: readonly string[]
  /** Bound layers; for a text style, the number of its fields bound to the variable. */
  count: number
}

export interface VariableMatch {
  id: string
  name: string
  collection: string
  resolvedType: string
  modes: number
  /** Font-ish variables show the text glyph on the card (Figma "Property 1=text style"). */
  textLike: boolean
  usages: readonly Usage[]
  totalNodes: number
}

export interface SearchResult {
  query: string
  /** Variables whose name matched, used or not. */
  matched: number
  /** Matched variables with at least one usage, best first. */
  variables: readonly VariableMatch[]
  scannedPages: number
  visited: number
  durationMs: number
  /** The file's key, for the Figma links in a copied report; null when Figma does not expose it. */
  fileKey?: string | null
}

export interface SearchProgress {
  page: string
  index: number
  total: number
  visited: number
}

export interface SelectResult {
  selected: number
  page: string
  /** Layers left out because they are on another page than the one shown. */
  elsewhere: number
}

export interface GotoResult {
  page: string
  name: string
}

/** A search remembered for the Recent Searches list (stored in figma.clientStorage). */
export const recentSearchSchema = z.object({
  query: z.string(),
  name: z.string(),
  meta: z.string(),
  usage: z.number(),
  textLike: z.boolean(),
  at: z.number(),
})
export type RecentSearch = z.infer<typeof recentSearchSchema>

export const recentRequestSchema = z.object({ add: z.optional(recentSearchSchema) })
