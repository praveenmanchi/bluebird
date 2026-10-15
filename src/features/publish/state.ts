// Tab-local state. Nothing outside src/features/publish reads or writes this.
import { computed, signal } from '@preact/signals'
import { draftNote, draftTitle } from './notes'
import { bumpVersion, suggestBump } from './semver'
import type { CommitPreview, ExtractResult, PipelineStepState, PublishResult, StatusResult } from './messages'
import type { Bump, Change } from './types'

export type ExtractPhase = 'idle' | 'extracting' | 'done' | 'failed'
export type PublishPhase = 'idle' | 'running' | 'done' | 'failed'
export type ChangeFilter = 'all' | 'variable' | 'component'
/** 0 Review changes · 1 Release notes · 2 Final review · 3 Publish. */
export type FlowStep = 0 | 1 | 2 | 3

export interface PublishOptions { openPr: boolean; postToTeams: boolean; tag: boolean }

/** null until publish:status answers; `statusError` when it could not be read. */
export const status = signal<StatusResult | null>(null)
export const statusError = signal<string | null>(null)
export const extractPhase = signal<ExtractPhase>('idle')
export const extractError = signal<string | null>(null)
export const result = signal<ExtractResult | null>(null)
export const step = signal<FlowStep>(0)

export const included = signal<ReadonlySet<string>>(new Set())
export const expanded = signal<string | null>(null)
export const filter = signal<ChangeFilter>('all')
export const showAll = signal(false)

/** null = take the suggestion. */
export const chosenBump = signal<Bump | null>(null)
export const title = signal('')
/** Notes the designer edited, by change id; the rest stay drafted. */
export const editedNotes = signal<Readonly<Record<string, string>>>({})
export const editing = signal<string | null>(null)
export const options = signal<PublishOptions>({ openPr: true, postToTeams: true, tag: true })

/** The Final review's "Commit contents": null until publish:preview answers; `previewError` when it could not. */
export const preview = signal<CommitPreview | null>(null)
export const previewError = signal<string | null>(null)
/** The previewed file's path; the first file when null. */
export const previewFile = signal<string | null>(null)

export const publishPhase = signal<PublishPhase>('idle')
export const steps = signal<readonly PipelineStepState[]>([])
export const publishResult = signal<PublishResult | null>(null)
export const publishError = signal<string | null>(null)

export const changes = computed<readonly Change[]>(() => result.value?.changes ?? [])
export const firstRelease = computed(() => (result.value ?? status.value) !== null && (result.value ?? status.value)!.baseline === null)
export const currentVersion = computed(() => (result.value ?? status.value)?.baseline?.version ?? null)
export const suggestedBump = computed<Bump>(() => suggestBump(changes.value, firstRelease.value))
export const bump = computed<Bump>(() => chosenBump.value ?? suggestedBump.value)
export const nextVersion = computed(() => bumpVersion(currentVersion.value, bump.value))
export const includedChanges = computed(() => changes.value.filter((c) => included.value.has(c.id)))

export function noteFor(change: Change): string {
  return editedNotes.value[change.id] ?? draftNote(change)
}

/** Load a fresh extract: everything included, notes and version back to their drafts. */
export function loadExtract(next: ExtractResult): void {
  result.value = next
  status.value = { repo: next.repo, baseline: next.baseline, history: next.history, notify: status.value?.notify ?? { webhooks: 0 } }
  extractPhase.value = 'done'
  extractError.value = null
  included.value = new Set(next.changes.map((c) => c.id))
  expanded.value = null
  filter.value = 'all'
  showAll.value = false
  chosenBump.value = null
  title.value = draftTitle(next.changes)
  editedNotes.value = {}
  editing.value = null
  step.value = 0
  preview.value = null
  previewError.value = null
  previewFile.value = null
  publishPhase.value = 'idle'
  steps.value = []
  publishResult.value = null
  publishError.value = null
}

export function toggleIncluded(id: string, on: boolean): void {
  const next = new Set(included.value)
  if (on) next.add(id)
  else next.delete(id)
  included.value = next
}

export function setAllIncluded(on: boolean): void {
  included.value = on ? new Set(changes.value.map((c) => c.id)) : new Set()
}

export function editNote(id: string, text: string): void {
  editedNotes.value = { ...editedNotes.value, [id]: text }
}

export function reset(): void {
  status.value = null
  statusError.value = null
  extractPhase.value = 'idle'
  extractError.value = null
  result.value = null
  step.value = 0
  included.value = new Set()
  expanded.value = null
  filter.value = 'all'
  showAll.value = false
  chosenBump.value = null
  title.value = ''
  editedNotes.value = {}
  editing.value = null
  options.value = { openPr: true, postToTeams: true, tag: true }
  preview.value = null
  previewError.value = null
  previewFile.value = null
  publishPhase.value = 'idle'
  steps.value = []
  publishResult.value = null
  publishError.value = null
}
