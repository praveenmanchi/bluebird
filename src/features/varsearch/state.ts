// Tab-local state. Nothing outside src/features/varsearch reads or writes this.
import { signal } from '@preact/signals'
import type { PageScope } from './format'
import type { PageInfo, RecentSearch, SearchProgress, SearchResult, UsageKind } from './messages'

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
export const toast = signal<Toast | null>(null)

export function reset(): void {
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
  toast.value = null
}
