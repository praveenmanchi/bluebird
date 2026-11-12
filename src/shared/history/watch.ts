// The background check for teammates' new History entries. The shell runs it
// while the plugin is open (the History tab may not be on screen), shows the
// count on the History tab, and the History tab clears it when opened.
// Answered by the History tab's sandbox handlers.
import { signal } from '@preact/signals'

export const HISTORY_CHECK = 'history:check'

export interface HistoryCheckResult {
  /** Storage is set up and readable. */
  connected: boolean
  /** Entries by other people since you last opened History. */
  unseen: number
  /** Who added them. */
  by: readonly string[]
}

/** Teammates' entries you haven't seen yet; the shell badges the History tab with it. */
export const historyUnseen = signal(0)

export interface WatchClient { call<T>(type: string, payload?: unknown, timeoutMs?: number): Promise<T> }

/**
 * Checks now, then every `intervalMs` (0 = only now). Returns a stop function.
 * A failed check is ignored: the next one tries again, and History says what's wrong when opened.
 */
export function watchHistory(client: WatchClient, intervalMs: number): () => void {
  let stopped = false
  const check = () => {
    client.call<HistoryCheckResult>(HISTORY_CHECK, undefined, 30_000)
      .then((r) => { if (!stopped) historyUnseen.value = r.connected ? r.unseen : 0 })
      .catch(() => undefined)
  }
  check()
  const timer = intervalMs > 0 ? setInterval(check, intervalMs) : null
  return () => { stopped = true; if (timer) clearInterval(timer) }
}
