// UI-side Jira calls: each one goes to the sandbox (which owns the connection)
// and folds the answer into the tab's signals. Writes answer with the issue as
// Jira stored it, so the board never shows an edit Jira refused.
import type { RpcClient } from '@shared/bridge'
import { boardDefaults, filterTickets, groupByStatus, openingScope } from './board'
import { MSG, type LoadResult } from './messages'
import {
  busy, connection, defaultFilters, filters, loadedDetail, loadError, me, notice, refreshError, refreshing,
  replaceTicket, selectedKey, settingsProblem, site, syncedAt, tickets, truncated,
} from './state'
import type { Ticket } from './types'

/** Searching every issue can take a while on big sites; writes re-read the issue. */
const LOAD_TIMEOUT_MS = 45_000

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

/** First load (`refresh: false`, the tab shows Loading / Error) or a refresh (the board stays, failures show inline). */
export async function loadBoard(rpc: RpcClient, { refresh = false }: { refresh?: boolean } = {}): Promise<void> {
  if (refresh) refreshing.value = true
  else connection.value = 'loading'
  try {
    const result = await rpc.call<LoadResult>(MSG.load, null, LOAD_TIMEOUT_MS)
    if (result.status === 'not-connected') {
      settingsProblem.value = { reason: result.reason, fields: result.missing }
      connection.value = 'not-connected'
      return
    }
    tickets.value = result.tickets
    site.value = result.site
    me.value = result.me
    syncedAt.value = result.syncedAt
    truncated.value = result.truncated
    loadedDetail.value = new Set()
    defaultFilters.value = boardDefaults(result.activeSprint)
    // Nothing assigned (e.g. an all-unassigned project)? Open on Reported / Watching instead of an empty board.
    if (!refresh) filters.value = { ...defaultFilters.value, scope: openingScope(result.tickets, filters.value.scope) }
    if (!result.tickets.some((t) => t.key === selectedKey.value)) {
      selectedKey.value = groupByStatus(filterTickets(result.tickets, filters.value))[0]?.tickets[0]?.key ?? result.tickets[0]?.key ?? null
    }
    refreshError.value = null
    loadError.value = null
    connection.value = 'connected'
  } catch (e: unknown) {
    const message = errorMessage(e, 'Couldn’t reach Jira.')
    if (refresh) refreshError.value = message
    else {
      loadError.value = message
      connection.value = 'error'
    }
  } finally {
    refreshing.value = false
  }
}

/** Comments, history, work log and Figma links for one issue, fetched once per load. */
export async function loadDetail(rpc: RpcClient, key: string): Promise<void> {
  if (loadedDetail.value.has(key)) return
  loadedDetail.value = new Set([...loadedDetail.value, key])
  try {
    replaceTicket(await rpc.call<Ticket>(MSG.issue, { key }, LOAD_TIMEOUT_MS))
  } catch (e: unknown) {
    const next = new Set(loadedDetail.value)
    next.delete(key)
    loadedDetail.value = next
    notice.value = errorMessage(e, `Couldn’t load ${key}’s activity.`)
  }
}

/** One Jira write. Resolves true when Jira accepted it; failures land in the detail notice. */
export async function write(rpc: RpcClient, type: string, payload: object, label: string, fallback: string): Promise<boolean> {
  notice.value = null
  busy.value = label
  try {
    replaceTicket(await rpc.call<Ticket>(type, payload, LOAD_TIMEOUT_MS))
    return true
  } catch (e: unknown) {
    notice.value = errorMessage(e, fallback)
    return false
  } finally {
    busy.value = null
  }
}

/** Opens a URL in the browser (the sandbox owns figma.openExternal). */
export function openExternal(rpc: RpcClient, url: string): void {
  rpc.call(MSG.open, { url }).catch((e: unknown) => { notice.value = errorMessage(e, 'Couldn’t open the browser.') })
}
