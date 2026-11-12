// The tab's round trips to the sandbox.
import type { RpcClient } from '@shared/bridge'
import { historyUnseen } from '@shared/history/watch'
import { CHANGELOG, MSG, isTicket, type ApproveResult, type ChangelogContext, type ChangelogDraft, type ListResult, type RangeDays, type SubmitResult } from './messages'
import {
  approveError, approving, changelogCard, changelogContext, changelogDraft, changelogError, changelogNotes, changelogPhase, changelogTicket, changelogTitle,
  closeChangelog, days, error, flash, loadResult, loading, polling, selected,
} from './state'
import type { HistoryEntry } from '@shared/history/types'

/** Reading a 90-day range can mean many day files. */
const LIST_TIMEOUT_MS = 60_000

/**
 * Loads (or refreshes) the team's entries for the current range. `quiet` is the
 * automatic check: no spinner, and a failure keeps what's on screen.
 */
export async function refresh(rpc: RpcClient, range: RangeDays = days.value, quiet = false): Promise<void> {
  if (loading.value || polling.value) return
  const sameRange = range === days.value
  days.value = range
  if (quiet) polling.value = true
  else { loading.value = true; error.value = null }
  try {
    loadResult(await rpc.call<ListResult>(MSG.list, { days: range }, LIST_TIMEOUT_MS), sameRange)
    historyUnseen.value = 0 // the sandbox marked everything as seen
  } catch (e) {
    if (!quiet) error.value = e instanceof Error && e.message ? e.message : 'Couldn’t read the team history.'
  } finally {
    loading.value = false
    polling.value = false
  }
}

export function openLink(rpc: RpcClient, url: string): void {
  rpc.call(MSG.open, { url }).catch(() => undefined)
}

const text = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback

/** Comparing reads every page of the file and the main file over REST. */
const GENERATE_TIMEOUT_MS = 180_000
const WRITE_TIMEOUT_MS = 60_000

/** Opens the "New changelog" pop-up and looks up where the person is. */
export async function openChangelog(rpc: RpcClient): Promise<void> {
  closeChangelog()
  changelogPhase.value = 'checking'
  try {
    changelogContext.value = await rpc.call<ChangelogContext>(CHANGELOG.context, undefined, WRITE_TIMEOUT_MS)
  } catch (e) {
    changelogError.value = text(e, 'Couldn’t read this file.')
  }
  if (changelogPhase.value === 'checking') changelogPhase.value = 'ready'
}

export async function generateChangelog(rpc: RpcClient): Promise<void> {
  if (changelogPhase.value !== 'ready') return
  changelogPhase.value = 'generating'
  changelogError.value = null
  try {
    const draft = await rpc.call<ChangelogDraft>(CHANGELOG.generate, undefined, GENERATE_TIMEOUT_MS)
    if (changelogPhase.value !== 'generating') return // closed while comparing
    changelogDraft.value = draft
    changelogContext.value = draft.context
    changelogTitle.value = draft.title
    changelogPhase.value = 'preview'
  } catch (e) {
    if (changelogPhase.value !== 'generating') return
    changelogError.value = text(e, 'The compare stopped before it finished. Try again.')
    changelogPhase.value = 'ready'
  }
}

export const canSubmit = (): boolean => !!changelogDraft.value && changelogTitle.value.trim().length > 0 && (changelogTicket.value.trim() === '' || isTicket(changelogTicket.value.trim()))

export async function submitChangelog(rpc: RpcClient): Promise<void> {
  const draft = changelogDraft.value
  if (!draft || changelogPhase.value !== 'preview' || !canSubmit()) return
  changelogPhase.value = 'submitting'
  changelogError.value = null
  try {
    const done = await rpc.call<SubmitResult>(CHANGELOG.submit, {
      draftId: draft.draftId, title: changelogTitle.value.trim(), notes: changelogNotes.value.trim(), ticket: changelogTicket.value.trim(), addCard: changelogCard.value,
    }, WRITE_TIMEOUT_MS)
    closeChangelog()
    flash.value = done.message
    await refresh(rpc)
  } catch (e) {
    changelogError.value = text(e, 'The changelog could not be submitted. Try again.')
    changelogPhase.value = 'preview'
  }
}

export async function approveChangelog(rpc: RpcClient, entry: HistoryEntry): Promise<void> {
  if (approving.value) return
  approving.value = entry.id
  approveError.value = null
  try {
    const done = await rpc.call<ApproveResult>(CHANGELOG.approve, { id: entry.id, at: entry.at }, WRITE_TIMEOUT_MS)
    flash.value = done.message
    selected.value = null
    await refresh(rpc)
  } catch (e) {
    approveError.value = text(e, 'The changelog could not be approved. Try again.')
  } finally {
    approving.value = null
  }
}
