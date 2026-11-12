// Tab-local state. Nothing outside src/features/extraction reads or writes this.
import { computed, signal } from '@preact/signals'
import type { Change } from '@shared/design/types'
import { isBranchName, type ExtractResult, type PushResult, type StatusResult } from './messages'

export type ExtractPhase = 'idle' | 'extracting' | 'done' | 'failed'
export type PushPhase = 'idle' | 'pushing'
export type ChangeFilter = 'all' | 'added' | 'modified' | 'removed'
export type BranchMode = 'existing' | 'new'

/** null until extraction:status answers; `statusError` when GitHub could not be read. */
export const status = signal<StatusResult | null>(null)
export const statusError = signal<string | null>(null)
/** The branch to compare with; null when the repository has none. */
export const compareBranch = signal<string | null>(null)

export const phase = signal<ExtractPhase>('idle')
export const extractError = signal<string | null>(null)
export const result = signal<ExtractResult | null>(null)
export const filter = signal<ChangeFilter>('all')
export const showAll = signal(false)
export const expanded = signal<string | null>(null)

export const branchMode = signal<BranchMode>('existing')
export const targetBranch = signal('')
export const newBranch = signal('')
/** Where a new branch starts; '' = the default branch. */
export const baseBranch = signal('')
export const message = signal('')
export const ticket = signal('')
export const notify = signal({ designSystem: true, devTeam: true })

export const pushPhase = signal<PushPhase>('idle')
export const pushResult = signal<PushResult | null>(null)
export const pushError = signal<string | null>(null)

export const changes = computed<readonly Change[]>(() => result.value?.changes ?? [])
export const branches = computed(() => status.value?.branches ?? [])
export const hasBranches = computed(() => branches.value.length > 0)

const TICKET = /^[A-Z][A-Z0-9]{1,9}-\d{1,7}$/
export const ticketValid = computed(() => ticket.value.trim() === '' || TICKET.test(ticket.value.trim()))

/** The branch a push would land on, or null while the form doesn't name a usable one. */
export const pushTarget = computed<string | null>(() => {
  if (branchMode.value === 'existing') return branches.value.some((b) => b.name === targetBranch.value) ? targetBranch.value : null
  const name = newBranch.value.trim()
  return isBranchName(name) && !branches.value.some((b) => b.name === name) ? name : null
})

/** Why the new branch name can't be used; null when it can (or is still empty). */
export const newBranchProblem = computed<string | null>(() => {
  const name = newBranch.value.trim()
  if (branchMode.value !== 'new' || !name) return null
  if (!isBranchName(name)) return 'Use letters, numbers, “-”, “_”, “.” and “/” — no spaces.'
  return branches.value.some((b) => b.name === name) ? `${name} already exists. Pick it under Existing branch.` : null
})

export const canPush = computed(() => !!result.value && pushPhase.value === 'idle' && !!pushTarget.value && message.value.trim().length > 0 && ticketValid.value)

/** New status: keep the picked branches when they still exist, else fall back to the default branch. */
export function loadStatus(next: StatusResult): void {
  status.value = next
  statusError.value = null
  const names = next.branches.map((b) => b.name)
  const fallback = names.includes(next.defaultBranch) ? next.defaultBranch : names[0] ?? null
  if (!compareBranch.value || !names.includes(compareBranch.value)) compareBranch.value = fallback
  if (!names.includes(targetBranch.value)) targetBranch.value = fallback ?? ''
  if (!names.includes(baseBranch.value)) baseBranch.value = ''
  if (!names.length) branchMode.value = 'new'
  notify.value = { designSystem: next.channels.designSystem, devTeam: next.channels.devTeam }
}

export function loadExtract(next: ExtractResult): void {
  result.value = next
  phase.value = 'done'
  extractError.value = null
  filter.value = 'all'
  showAll.value = false
  expanded.value = null
  message.value = next.message
  pushResult.value = null
  pushError.value = null
}

export function reset(): void {
  status.value = null
  statusError.value = null
  compareBranch.value = null
  phase.value = 'idle'
  extractError.value = null
  result.value = null
  filter.value = 'all'
  showAll.value = false
  expanded.value = null
  branchMode.value = 'existing'
  targetBranch.value = ''
  newBranch.value = ''
  baseBranch.value = ''
  message.value = ''
  ticket.value = ''
  notify.value = { designSystem: true, devTeam: true }
  pushPhase.value = 'idle'
  pushResult.value = null
  pushError.value = null
}
