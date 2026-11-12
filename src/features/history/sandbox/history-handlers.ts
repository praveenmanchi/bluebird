// The History tab's sandbox handlers, built from injected dependencies so they
// run the same in Figma (handler.ts), in tests and with fixtures. Entries are
// read from Settings › Storage (see @shared/history/config); other tabs write
// them with @shared/history/record.
import * as z from 'zod/mini'
import type { HandlerMap } from '@shared/bridge'
import { normalizeIntegration, refreshMs, sectionSchemas, testMessage, type ConnectionTestResult, type IntegrationValues } from '@shared/integrations'
import { createGithubClient, type GithubFetch } from '@shared/github/client'
import { isStorageProblem, resolveStorage, type HistoryStorage } from '@shared/history/config'
import { listEntries, type DayCache } from '@shared/history/github'
import { HISTORY_CHECK, type HistoryCheckResult } from '@shared/history/watch'
import type { HistoryEntry } from '@shared/history/types'
import { MSG, listRequestSchema, openRequestSchema, type ListResult } from '../messages'

export interface HistoryDeps {
  readGithub(): Promise<IntegrationValues<'github'>>
  readStorage(): Promise<IntegrationValues<'storage'>>
  readJira(): Promise<IntegrationValues<'jira'>>
  /** When this person last opened History (ISO), kept in clientStorage. */
  seen: { get(): Promise<string | null>; set(iso: string): Promise<void> }
  /** The signed-in Figma user's name: your own entries never count as new. */
  me(): string
  fetch: GithubFetch
  sleep(ms: number): Promise<void>
  openExternal(url: string): void
  now(): Date
}

export const STORAGE_TEST = testMessage('storage')
/** Days the background check looks back over. */
export const CHECK_DAYS = 7

/** The Jira site as an https origin, or '' when it isn't one. */
export function jiraSite(jira: IntegrationValues<'jira'>): string {
  const raw = (jira.siteUrl || jira.baseUrl).trim().replace(/\/+$/, '')
  return /^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(raw) ? raw : ''
}

export function createHistoryHandlers(deps: HistoryDeps): HandlerMap {
  // One cache per repository + branch + folder, so switching Storage never mixes histories.
  const caches = new Map<string, DayCache>()
  const cacheFor = (s: HistoryStorage) => {
    const key = `${s.config.api}|${s.config.repo}|${s.config.branch}|${s.folder}`
    if (!caches.has(key)) caches.set(key, new Map())
    return caches.get(key)!
  }

  async function storage(): Promise<ReturnType<typeof resolveStorage>> {
    const [github, store] = await Promise.all([deps.readGithub(), deps.readStorage()])
    return resolveStorage(store, github)
  }

  async function read(where: HistoryStorage, days: number): Promise<HistoryEntry[]> {
    const client = createGithubClient(where.config, deps.fetch, deps.sleep)
    return (await listEntries(client, where.config.branch, where.folder, days, deps.now(), cacheFor(where))).entries
  }

  async function list(payload: unknown): Promise<ListResult> {
    const { days } = listRequestSchema.parse(payload)
    const [where, jira, store] = await Promise.all([storage(), deps.readJira(), deps.readStorage()])
    const now = deps.now()
    const every = refreshMs(store.refresh)
    if (isStorageProblem(where)) return { repo: { connected: false, repo: '', problem: where.problem }, entries: [], jiraSite: jiraSite(jira), fetchedAt: now.toISOString(), refreshMs: every }
    const entries = await read(where, days)
    await deps.seen.set(now.toISOString()) // opening History is what marks everything as seen
    return { repo: { connected: true, repo: `${where.config.repo} · ${where.folder}` }, entries, jiraSite: jiraSite(jira), fetchedAt: now.toISOString(), refreshMs: every }
  }

  async function check(): Promise<HistoryCheckResult> {
    const where = await storage()
    if (isStorageProblem(where)) return { connected: false, unseen: 0, by: [] }
    const [entries, seen] = await Promise.all([read(where, CHECK_DAYS), deps.seen.get()])
    const me = deps.me()
    // Never opened History: what's there now is the baseline, not "new".
    if (!seen) { await deps.seen.set(deps.now().toISOString()); return { connected: true, unseen: 0, by: [] } }
    const fresh = entries.filter((e) => e.at > seen && e.by.name !== me)
    return { connected: true, unseen: fresh.length, by: [...new Set(fresh.map((e) => e.by.name))] }
  }

  /** Settings › Storage › Test Connection, with the form's unsaved values. */
  async function test(payload: unknown): Promise<ConnectionTestResult> {
    const values = z.safeParse(sectionSchemas.storage, payload)
    if (!values.success) throw new Error('Those Storage settings aren’t complete. Check the fields and try again.')
    const where = resolveStorage(normalizeIntegration(values.data, 'storage'), await deps.readGithub())
    if (isStorageProblem(where)) throw new Error(`${where.problem}.`)
    const client = createGithubClient(where.config, deps.fetch, deps.sleep)
    const me = await client.whoAmI()
    if (!me.canPush) throw new Error(`Signed in as ${me.login}, but this key can’t write to ${where.config.repo}. History needs Contents write access.`)
    const days = (await client.listFolder(where.folder, where.config.branch)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f.name)).length
    return { message: `Connected as ${me.login} · can write to ${where.config.repo} on ${where.config.branch}. ${where.folder} ${days ? `holds ${days} ${days === 1 ? 'day' : 'days'} of history` : 'is empty — the first extraction or report starts it'}.` }
  }

  return {
    [MSG.list]: async (payload: unknown) => list(payload),
    [HISTORY_CHECK]: async () => check(),
    [STORAGE_TEST]: async (payload: unknown) => test(payload),
    [MSG.open]: async (payload: unknown) => {
      const { url } = openRequestSchema.parse(payload)
      // Entries come from a shared repository, so their links are not trusted:
      // only GitHub, the Enterprise hosts in Settings and the Jira site open.
      const [github, store, jira] = await Promise.all([deps.readGithub(), deps.readStorage(), deps.readJira()])
      const hosts = [github.baseUrl, store.baseUrl].map((b) => b.trim().replace(/\/+$/, '')).filter((b) => b.startsWith('https://')).map((b) => `${b}/`)
      const site = jiraSite(jira)
      const allowed = ['https://github.com/', ...hosts, ...(site ? [`${site}/`] : [])]
      if (!allowed.some((prefix) => url.startsWith(prefix))) throw new Error('That link isn’t on GitHub or your Jira site.')
      deps.openExternal(url)
    },
  }
}
