// The tab's round trips to the sandbox. UI components call these; they own
// the state transitions so the screens stay declarative.
import type { RpcClient } from '@shared/bridge'
import { MSG, type ExtractResult, type PushRequest, type PushResult, type StatusResult } from './messages'
import {
  baseBranch, branchMode, canPush, compareBranch, extractError, loadExtract, loadStatus, message, notify, phase, pushError, pushPhase, pushResult,
  pushTarget, result, status, statusError, ticket,
} from './state'

const text = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback

/** Extracting can take a while on a large library: every page is loaded. */
const EXTRACT_TIMEOUT_MS = 120_000
const PUSH_TIMEOUT_MS = 120_000

/** Reads the connection and the repository's branches. Also the Refresh action. */
export async function refreshStatus(rpc: RpcClient): Promise<void> {
  statusError.value = null
  try {
    loadStatus(await rpc.call<StatusResult>(MSG.status))
  } catch (e) {
    statusError.value = text(e, 'Couldn’t read the repository’s branches.')
  }
}

export async function runExtract(rpc: RpcClient): Promise<void> {
  // Nothing to compare with until the branches are in: a click that lands before then is dropped.
  if (phase.value === 'extracting' || !status.value?.repo.connected) return
  phase.value = 'extracting'
  extractError.value = null
  try {
    loadExtract(await rpc.call<ExtractResult>(MSG.extract, { branch: compareBranch.value }, EXTRACT_TIMEOUT_MS))
  } catch (e) {
    phase.value = 'failed'
    extractError.value = text(e, 'The extract stopped before it finished. Try again.')
  }
}

export function buildRequest(pullRequest: boolean): PushRequest | null {
  const extract = result.value, target = pushTarget.value
  if (!extract || !target || !canPush.value) return null
  const channels = status.value?.channels ?? { designSystem: false, devTeam: false }
  return {
    extractId: extract.extractId,
    target,
    create: branchMode.value === 'new',
    base: branchMode.value === 'new' ? baseBranch.value : '',
    message: message.value.trim(),
    pullRequest,
    notify: { designSystem: notify.value.designSystem && channels.designSystem, devTeam: notify.value.devTeam && channels.devTeam },
    ticket: ticket.value.trim(),
  }
}

export async function runPush(rpc: RpcClient, pullRequest: boolean): Promise<void> {
  const request = buildRequest(pullRequest)
  if (!request) return
  pushPhase.value = 'pushing'
  pushResult.value = null
  pushError.value = null
  try {
    const outcome = await rpc.call<PushResult>(MSG.push, request, PUSH_TIMEOUT_MS)
    pushResult.value = outcome
    if (outcome.outcome !== 'rejected') {
      // What was compared is now on GitHub: the list is done with, and the branches have a new latest.
      result.value = null
      phase.value = 'idle'
      void refreshStatus(rpc)
    }
  } catch (e) {
    pushError.value = text(e, 'The push stopped before it finished. Check the branch on GitHub before trying again.')
  } finally {
    pushPhase.value = 'idle'
  }
}
