// Tab-local state. Nothing outside src/features/audit reads or writes this.
import { signal } from '@preact/signals'
import type { Filter } from './format'
import type { AnalyticsResult, Asset, AuditProgress, AuditResult, PageInfo, Scope } from './messages'

export type Status = 'idle' | 'running' | 'done' | 'error'
export type View = 'scope' | 'files'
export interface Toast { tone: 'info' | 'error'; title: string; body: string }
export type AnalyticsState = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | AnalyticsResult

export const pages = signal<readonly PageInfo[]>([])
export const selected = signal(0)
export const source = signal<string | null>(null)
export const scope = signal<Scope>({ mode: 'current' })
export const status = signal<Status>('idle')
export const progress = signal<AuditProgress | null>(null)
export const result = signal<AuditResult | null>(null)
export const error = signal<string | null>(null)
export const view = signal<View>('scope')
export const filter = signal<Filter>('all')
export const query = signal('')
export const details = signal(false)
export const expanded = signal<ReadonlySet<string>>(new Set())
export const asset = signal<Asset>('components')
/** One read per view, kept while the tab stays open. */
export const analytics = signal<Readonly<Partial<Record<Asset, AnalyticsState>>>>({})
export const toast = signal<Toast | null>(null)

export function reset(): void {
  pages.value = []
  selected.value = 0
  source.value = null
  scope.value = { mode: 'current' }
  status.value = 'idle'
  progress.value = null
  result.value = null
  error.value = null
  view.value = 'scope'
  filter.value = 'all'
  query.value = ''
  details.value = false
  expanded.value = new Set()
  asset.value = 'components'
  analytics.value = {}
  toast.value = null
}
