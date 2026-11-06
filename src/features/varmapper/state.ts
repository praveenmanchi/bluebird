// Tab-local state. Nothing outside src/features/varmapper reads or writes this.
import { signal } from '@preact/signals'
import type { Candidate, Category, CheckResult } from './messages'

export type Status = 'checking' | 'done' | 'error'
export type Filter = 'all' | Category
export interface Toast { tone: 'info' | 'error'; title: string; body: string }
/** One Bind on a group: the variable used, how to undo it, and how it went. */
export interface Binding { variable: Candidate; undoId: string; values: number; restoredLayers: number }

export const status = signal<Status>('checking')
export const result = signal<CheckResult | null>(null)
export const error = signal<string | null>(null)
export const visited = signal(0)
export const filter = signal<Filter>('all')
export const query = signal('')
/** Groups ticked for Bind selected. */
export const ticked = signal<ReadonlySet<string>>(new Set())
/** Groups showing their layers. */
export const expanded = signal<ReadonlySet<string>>(new Set())
/** The variable chosen for a group, when it isn't the recommended one. */
export const picks = signal<ReadonlyMap<string, Candidate>>(new Map())
/** Groups bound since the last check. */
export const bound = signal<ReadonlyMap<string, Binding>>(new Map())
/** Layers put back by the last Bind, because binding changed how they look. */
export const restored = signal<{ layers: number; values: number } | null>(null)
export const toast = signal<Toast | null>(null)

/** Clears what belongs to one check. */
export function clearChoices(): void {
  ticked.value = new Set()
  expanded.value = new Set()
  picks.value = new Map()
  bound.value = new Map()
  restored.value = null
}

export function reset(): void {
  clearChoices()
  status.value = 'checking'
  result.value = null
  error.value = null
  visited.value = 0
  filter.value = 'all'
  query.value = ''
  toast.value = null
}
