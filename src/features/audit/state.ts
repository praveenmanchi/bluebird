// Tab-local state. Nothing outside src/features/audit reads or writes this.
import { signal } from '@preact/signals'
import type { Filter } from './format'
import type { AuditProgress, AuditResult, LibraryCard, PageInfo, Scope } from './messages'

export type Status = 'idle' | 'running' | 'done' | 'error'
export type View = 'scope' | 'files'
export interface Toast { tone: 'info' | 'error'; title: string; body: string }

export const pages = signal<readonly PageInfo[]>([])
export const selected = signal(0)
export const source = signal<string | null>(null)
/** The current page and its screen count, and the libraries the audit compares against. */
export const currentPage = signal({ name: '', screens: 0 })
export const libraries = signal<readonly LibraryCard[]>([])
export const scope = signal<Scope>({ mode: 'current' })
export const status = signal<Status>('idle')
export const progress = signal<AuditProgress | null>(null)
export const result = signal<AuditResult | null>(null)
export const error = signal<string | null>(null)
export const view = signal<View>('scope')
export const filter = signal<Filter>('overview')
/** The screen opened from the overview, by id; null for the whole audit. */
export const screen = signal<string | null>(null)
export const details = signal(false)
export const expanded = signal<ReadonlySet<string>>(new Set())
export const toast = signal<Toast | null>(null)

export function reset(): void {
  pages.value = []
  selected.value = 0
  source.value = null
  currentPage.value = { name: '', screens: 0 }
  libraries.value = []
  scope.value = { mode: 'current' }
  status.value = 'idle'
  progress.value = null
  result.value = null
  error.value = null
  view.value = 'scope'
  filter.value = 'overview'
  screen.value = null
  details.value = false
  expanded.value = new Set()
  toast.value = null
}
