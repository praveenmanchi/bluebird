// Display helpers for the Publish screens.
import type { ChangeItemBrandValue, ChangeItemRow } from '@shared/ui'
import type { PipelineStepId } from '../messages'
import type { Change } from '../types'

export const STEP_LABELS = ['Review changes', 'Release notes', 'Final review', 'Publish'] as const

export const PIPELINE_STEP_TITLE: Record<PipelineStepId, string> = {
  extract: 'Extract variables',
  components: 'Read components',
  commit: 'Commit to repository',
  build: 'Build the site',
  deploy: 'Deploy',
}

/** "just now", "4 min ago", "2 h ago", or the date. */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso)
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000)
  if (!Number.isFinite(minutes)) return ''
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`
  return shortDate(iso)
}

/** "9 Oct". */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

/** Props for the Change Item header row. */
export function rowProps(change: Change, included: boolean, onIncludedChange: (on: boolean) => void): ChangeItemRow {
  return {
    kind: change.preview,
    name: change.name,
    detail: change.detail,
    change: change.kind,
    swatch: change.swatch,
    included,
    onIncludedChange,
  }
}

/** Per-brand rows for a variable change; component changes have none. */
export function brandValues(change: Change): ChangeItemBrandValue[] {
  return change.modeValues.map((m) => m.state === 'changed'
    ? { brand: m.mode, state: 'changed', kind: m.kind, old: m.old, new: m.new }
    : { brand: m.mode, state: 'unchanged', kind: m.kind, value: m.value })
}
