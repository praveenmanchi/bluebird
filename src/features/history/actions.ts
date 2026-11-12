// The tab's round trips to the sandbox.
import type { RpcClient } from '@shared/bridge'
import { historyUnseen } from '@shared/history/watch'
import { MSG, type ListResult, type RangeDays } from './messages'
import { days, error, loadResult, loading, polling } from './state'

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
