// Tab-local state. Nothing outside src/features/varsearch reads or writes this.
import { signal } from '@preact/signals'
import type { PageScope } from './format'
import type { PageInfo, RecentSearch, SearchProgress, SearchResult, UsageKind, VariableMatch } from './messages'

export type Status = 'idle' | 'searching' | 'done' | 'error'
export interface Toast { tone: 'info' | 'error'; title: string; body: string }

export const pages = signal<readonly PageInfo[]>([])
export const currentPageId = signal('')
export const pageScope = signal<PageScope>({ mode: 'all' })
export const types = signal<readonly UsageKind[]>([])
export const query = signal('')
export const status = signal<Status>('idle')
export const progress = signal<SearchProgress | null>(null)
export const result = signal<SearchResult | null>(null)
export const error = signal<string | null>(null)
/** Variable ids whose card is expanded. */
export const expanded = signal<ReadonlySet<string>>(new Set())
export const recent = signal<readonly RecentSearch[]>([])
/** Matches found this session, by variable name, so a recent search opens without scanning again. */
export const recentResults = signal<ReadonlyMap<string, VariableMatch>>(new Map())
/** Recent searches whose card is open. */
export const recentOpen = signal<ReadonlySet<string>>(new Set())
export const toast = signal<Toast | null>(null)
/** When the shown results were found: the report's Last updated. */
export const searchedAt = signal<number | null>(null)
/** Add to Figma is drawing the report. */
export const adding = signal(false)

/** Bumped by reset(), so a scan that finishes after the tab closed does not write into the next visit. */
let generation = 0
export const currentGeneration = (): number => generation

export function reset(): void {
  generation += 1
  pages.value = []
  currentPageId.value = ''
  pageScope.value = { mode: 'all' }
  types.value = []
  query.value = ''
  status.value = 'idle'
  progress.value = null
  result.value = null
  error.value = null
  expanded.value = new Set()
  recent.value = []
  recentResults.value = new Map()
  recentOpen.value = new Set()
  toast.value = null
  searchedAt.value = null
  adding.value = false
}
