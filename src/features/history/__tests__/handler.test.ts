import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import { appendToDay } from '@shared/history/store'
import { HISTORY_CHECK, type HistoryCheckResult } from '@shared/history/watch'
import type { HistoryEntry } from '@shared/history/types'
import { MSG, type ListResult } from '../messages'
import { STORAGE_TEST, createHistoryHandlers, jiraSite } from '../sandbox/history-handlers'

const entry = (id: string, at: string, name = 'Anita'): HistoryEntry => ({ schema: 1, id, type: 'report', status: 'done', title: 'Login screen', summary: 'Report', at, by: { name, team: 'Product Design' }, file: 'Bluebird UI', ticket: 'BB-330' })

function setup({ connected = true, site = 'https://acme.atlassian.net', storage = DEFAULT_INTEGRATIONS.storage, seen = null as string | null } = {}) {
  let day = appendToDay([], entry('aaaaaa1', '2026-11-12T09:00:00.000Z'))
  let seenAt = seen
  const opened: string[] = []
  const requests: string[] = []
  const reply = (status: number, body: unknown) => ({ status, text: async () => typeof body === 'string' ? body : JSON.stringify(body) })
  const handlers = createHistoryHandlers({
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, repo: 'acme/history', branch: 'trunk', apiKey: connected ? 'ghp_x' : '' }),
    readStorage: async () => storage,
    readJira: async () => ({ ...DEFAULT_INTEGRATIONS.jira, siteUrl: site }),
    seen: { get: async () => seenAt, set: async (iso) => { seenAt = iso } },
    me: () => 'Praveen',
    fetch: async (url) => {
      requests.push(url)
      if (url.endsWith('/user')) return reply(200, { login: 'anita' })
      if (/\/repos\/acme\/[a-z]+$/.test(url)) return reply(200, { default_branch: 'trunk', permissions: { push: true } })
      if (url.includes('/contents/.bluebird/history?')) return reply(200, [{ name: '2026-11-12.json', type: 'file', sha: `s${day.length}` }, { name: '2026-01-01.json', type: 'file', sha: 'old' }])
      if (url.includes('/contents/.bluebird/history/2026-11-12.json')) return reply(200, day)
      return reply(404, { message: 'Not Found' })
    },
    sleep: async () => undefined,
    openExternal: (url) => opened.push(url),
    now: () => new Date('2026-11-12T12:00:00.000Z'),
  })
  const call = (type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<unknown>)(payload, {} as HandlerContext)
  return {
    requests, opened, seen: () => seenAt,
    add: (e: HistoryEntry) => { day = appendToDay(JSON.parse(day).entries, e) },
    list: (days = 7) => call(MSG.list, { days }) as Promise<ListResult>,
    check: () => call(HISTORY_CHECK) as Promise<HistoryCheckResult>,
    test: (values: unknown) => call(STORAGE_TEST, values) as Promise<{ message: string }>,
    open: (url: string) => call(MSG.open, { url }),
  }
}

describe('history handlers', () => {
  it('reads the range from Storage and skips day files outside it', async () => {
    const t = setup()
    const r = await t.list()
    expect(r.repo).toEqual({ connected: true, repo: 'acme/history · .bluebird/history' })
    expect(r.entries.map((e) => e.id)).toEqual(['aaaaaa1'])
    expect(r.jiraSite).toBe('https://acme.atlassian.net')
    expect(r.refreshMs).toBe(60_000)
    expect(t.requests.some((u) => u.includes('ref=trunk'))).toBe(true)
    expect(t.requests.some((u) => u.includes('2026-01-01'))).toBe(false)
  })

  it('does not fetch a day file again until it changes', async () => {
    const t = setup()
    await t.list()
    await t.list()
    expect(t.requests.filter((u) => u.includes('2026-11-12.json'))).toHaveLength(1)
    t.add(entry('bbbbbb2', '2026-11-12T11:00:00.000Z'))
    expect((await t.list()).entries).toHaveLength(2)
    expect(t.requests.filter((u) => u.includes('2026-11-12.json'))).toHaveLength(2)
  })

  it('counts teammates’ entries since History was last opened, never your own', async () => {
    const t = setup({ seen: '2026-11-12T10:00:00.000Z' })
    expect(await t.check()).toEqual({ connected: true, unseen: 0, by: [] })
    t.add(entry('bbbbbb2', '2026-11-12T11:00:00.000Z', 'Ravi'))
    t.add(entry('cccccc3', '2026-11-12T11:30:00.000Z', 'Praveen'))
    expect(await t.check()).toEqual({ connected: true, unseen: 1, by: ['Ravi'] })
    await t.list()
    expect(t.seen()).toBe('2026-11-12T12:00:00.000Z')
    expect((await t.check()).unseen).toBe(0)
  })

  it('treats what is there the first time as already seen', async () => {
    const t = setup()
    expect((await t.check()).unseen).toBe(0)
    expect(t.seen()).toBe('2026-11-12T12:00:00.000Z')
  })

  it('says what is missing when Storage is not set up, without calling GitHub', async () => {
    const t = setup({ connected: false })
    expect((await t.list()).repo).toMatchObject({ connected: false, problem: expect.stringMatching(/Add the API key in Settings › GitHub/) })
    expect(await t.check()).toEqual({ connected: false, unseen: 0, by: [] })
    expect(t.requests).toHaveLength(0)
  })

  it('tests the Storage connection with the unsaved form', async () => {
    const t = setup()
    expect((await t.test({ ...DEFAULT_INTEGRATIONS.storage, sameAsGithub: false, repo: 'acme/history', apiKey: 'ghp_y', branch: 'trunk' })).message).toMatch(/can write to acme\/history on trunk\. \.bluebird\/history holds 2 days of history/)
    await expect(t.test({ ...DEFAULT_INTEGRATIONS.storage, sameAsGithub: false })).rejects.toThrow(/Add the repository and API key/)
  })

  it('refuses ranges it does not offer', async () => {
    await expect(setup().list(365)).rejects.toThrow()
  })

  it('opens GitHub and Jira links only — entries come from a shared repository', async () => {
    const t = setup()
    await t.open('https://github.com/acme/history/pull/1')
    await t.open('https://acme.atlassian.net/browse/BB-330')
    await expect(t.open('https://evil.example.com/x')).rejects.toThrow(/isn’t on GitHub or your Jira site/)
    expect(t.opened).toHaveLength(2)
  })

  it('only trusts a Jira site that is a plain https origin', () => {
    const j = DEFAULT_INTEGRATIONS.jira
    expect(jiraSite({ ...j, siteUrl: 'https://acme.atlassian.net/' })).toBe('https://acme.atlassian.net')
    expect(jiraSite({ ...j, siteUrl: 'http://acme.atlassian.net' })).toBe('')
    expect(jiraSite({ ...j, siteUrl: 'https://acme.atlassian.net/path?x' })).toBe('')
  })
})
