// Tab-local state. Nothing outside src/features/history reads or writes this.
import { computed, signal } from '@preact/signals'
import type { HistoryEntry, HistoryType } from '@shared/history/types'
import type { ListResult, RangeDays } from './messages'

export type FeatureFilter = 'all' | HistoryType

export const result = signal<ListResult | null>(null)
export const loading = signal(false)
/** An automatic check is running (no spinner). */
export const polling = signal(false)
export const error = signal<string | null>(null)
export const days = signal<RangeDays>(7)
export const feature = signal<FeatureFilter>('all')
export const showAll = signal(false)
/** The entry open in Entry details; null on the list. */
export const selected = signal<string | null>(null)
/** Entries the last Refresh added: their authors, for the "N new entries" notice. */
export const fresh = signal<{ count: number; by: readonly string[] } | null>(null)

export const entries = computed<readonly HistoryEntry[]>(() => result.value?.entries ?? [])
export const shown = computed(() => feature.value === 'all' ? entries.value : entries.value.filter((e) => e.type === feature.value))
export const current = computed(() => entries.value.find((e) => e.id === selected.value) ?? null)

/** A new list: note what's new since the previous one (same range only). */
export function loadResult(next: ListResult, sameRange: boolean): void {
  const before = new Set((result.value?.entries ?? []).map((e) => e.id))
  const added = sameRange && result.value ? next.entries.filter((e) => !before.has(e.id)) : []
  fresh.value = added.length ? { count: added.length, by: [...new Set(added.map((e) => e.by.name))] } : null
  result.value = next
  error.value = null
}

export function reset(): void {
  result.value = null
  loading.value = false
  polling.value = false
  error.value = null
  days.value = 7
  feature.value = 'all'
  showAll.value = false
  selected.value = null
  fresh.value = null
}
