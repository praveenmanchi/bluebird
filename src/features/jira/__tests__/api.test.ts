import { describe, it, expect, vi } from 'vitest'
import { DEFAULT_INTEGRATIONS, testMessage, type IntegrationValues } from '@shared/integrations'
import { adfToText, textToAdf } from '../api/adf'
import { base64, configFromSettings, createRequest, isConfig, JiraError, TARGET_HEADER, type HttpFetch, type JiraConfig } from '../api/http'
import { formatDate, nodeIdFromUrl, relativeTime, toFigmaLinks, toHistoryEntries, toIssueType, toPerson, toPriority, toStatus, toTicket } from '../api/map'
import { boardJql, createJiraClient, findFieldIds, MAX_ISSUES, pickTransition } from '../api/client'
import { createJiraHandlers } from '../sandbox/jira-handlers'
import { MSG, type LoadResult } from '../messages'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const jira = (over: Partial<IntegrationValues<'jira'>> = {}): IntegrationValues<'jira'> => ({
  ...DEFAULT_INTEGRATIONS.jira, enabled: true, siteUrl: 'https://team.atlassian.net/', email: 'me@acme.com', apiKey: 'tok', proxyUrl: 'http://localhost:8787', ...over,
})

type Route = (body: unknown) => unknown
/** A fake Jira: routes keyed by "METHOD /path" (query stripped); records every call. */
function fakeJira(routes: Record<string, Route | { status: number; body?: unknown }>) {
  const calls: { method: string; url: string; headers: Record<string, string>; body: unknown }[] = []
  const fetchImpl: HttpFetch = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) as unknown : undefined
    calls.push({ method: init.method, url, headers: init.headers, body })
    const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/rest\/api\/\d/, '').split('?')[0]!
    const route = routes[`${init.method} ${path}`]
    if (!route) return { status: 404, text: async () => JSON.stringify({ errorMessages: [`no route ${init.method} ${path}`] }) }
    if (typeof route === 'function') {
      const out = route(body)
      return { status: out === undefined ? 204 : 200, text: async () => (out === undefined ? '' : JSON.stringify(out)) }
    }
    return { status: route.status, text: async () => (route.body === undefined ? '' : JSON.stringify(route.body)) }
  }
  return { fetchImpl, calls }
}

const ME_USER = { accountId: 'me-1', displayName: 'Praveen Manchi' }
const FIELDS = [{ id: 'customfield_10016', name: 'Story point estimate' }, { id: 'customfield_10020', name: 'Sprint', schema: { custom: 'com.pyxis.greenhopper.jira:gh-sprint' } }]
const ISSUE = {
  key: 'DS-7',
  fields: {
    summary: 'Ship the Jira tab', status: { name: 'In Review', statusCategory: { key: 'indeterminate' } }, priority: { name: 'Major' },
    issuetype: { name: 'Story' }, assignee: ME_USER, reporter: { accountId: 'ak', displayName: 'Anika Kumar' }, labels: ['jira'],
    duedate: '2026-10-17', fixVersions: [{ name: 'v2.12.0' }], watches: { isWatching: true },
    parent: { key: 'DS-1', fields: { summary: 'Plugin', issuetype: { name: 'Epic' } } },
    subtasks: [{ key: 'DS-8', fields: { summary: 'Wire search', status: { statusCategory: { key: 'done' } } } }],
    description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello ' }, { type: 'mention', attrs: { text: '@Anika' } }] }] },
    customfield_10016: 5,
    customfield_10020: [{ name: 'Sprint 41', state: 'closed' }, { name: 'Sprint 42', state: 'active', endDate: '2026-10-17T10:00:00Z' }],
  },
  changelog: { histories: [{ id: '9', author: ME_USER, created: '2026-10-11T10:00:00Z', items: [{ field: 'status', fromString: 'To Do', toString: 'In Review' }] }] },
}

describe('jira api · adf', () => {
  it('flattens documents to text and builds comment bodies', () => {
    expect(adfToText(ISSUE.fields.description)).toBe('Hello @Anika')
    expect(adfToText('  plain server text ')).toBe('plain server text')
    expect(adfToText(null)).toBe('')
    expect(textToAdf('one\ntwo\n\nthree')).toEqual({
      version: 1, type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'one' }, { type: 'hardBreak' }, { type: 'text', text: 'two' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'three' }] },
      ],
    })
  })
})

describe('jira api · settings and transport', () => {
  it('turns Settings into a connection, or says what is missing', () => {
    expect(configFromSettings({ ...DEFAULT_INTEGRATIONS.jira })).toEqual({ reason: 'disabled', missing: [] })
    expect(configFromSettings(jira({ siteUrl: '', apiKey: '' }))).toEqual({ reason: 'incomplete', missing: ['Site URL', 'Jira API key'] })
    const cloud = configFromSettings(jira({ projectKey: ' DS ' }))
    expect(isConfig(cloud) && cloud).toMatchObject({ flavor: 'cloud', site: 'https://team.atlassian.net', endpoint: 'http://localhost:8787', projectKey: 'DS', authorization: `Basic ${base64('me@acme.com:tok')}` })
    // The token only goes to an atlassian.net site through a local proxy: stored values are re-checked.
    expect(configFromSettings(jira({ siteUrl: 'https://evil.example.com' }))).toEqual({ reason: 'invalid', missing: ['Site URL'] })
    expect(configFromSettings(jira({ proxyUrl: 'https://proxy.example.com' }))).toEqual({ reason: 'invalid', missing: ['Proxy URL'] })
    expect(configFromSettings(jira({ projectKey: 'ds" OR 1=1' }))).toEqual({ reason: 'invalid', missing: ['Project key'] })
    const server = configFromSettings(jira({ baseUrl: 'https://jira.acme.com', email: '', proxyUrl: '' }))
    expect(isConfig(server) && server).toMatchObject({ flavor: 'server', site: 'https://jira.acme.com', endpoint: 'https://jira.acme.com', authorization: 'Bearer tok' })
  })

  // A Cloud site typed into the Enterprise Base URL field stays Cloud: `server` would send it to
  // /rest/api/2/search, which Atlassian removed (CHANGE-2046).
  it('treats an atlassian.net Base URL as cloud, not server', () => {
    const misfiled = configFromSettings(jira({ siteUrl: '', baseUrl: 'https://gapinc.atlassian.net' }))
    expect(isConfig(misfiled) && misfiled).toMatchObject({ flavor: 'cloud', site: 'https://gapinc.atlassian.net' })
    // A trailing slash, uppercase host or path must not sneak past the host check.
    const messy = configFromSettings(jira({ siteUrl: '', baseUrl: 'https://GapInc.Atlassian.NET/' }))
    expect(isConfig(messy) && messy).toMatchObject({ flavor: 'cloud' })
    // A look-alike host is still Server / DC.
    const lookalike = configFromSettings(jira({ siteUrl: '', baseUrl: 'https://atlassian.net.evil.com', email: '', proxyUrl: '' }))
    expect(isConfig(lookalike) && lookalike).toMatchObject({ flavor: 'server' })
  })

  it('base64-encodes UTF-8 like btoa', () => {
    expect(base64('me@acme.com:tok')).toBe(Buffer.from('me@acme.com:tok').toString('base64'))
    expect(base64('ünï:🔑')).toBe(Buffer.from('ünï:🔑').toString('base64'))
  })

  it('sends through the proxy with the target header and maps failures to readable errors', async () => {
    const config = configFromSettings(jira()) as JiraConfig
    const { fetchImpl, calls } = fakeJira({ 'GET /myself': () => ME_USER, 'GET /field': { status: 401 }, 'GET /issue/X-1': { status: 400, body: { errorMessages: ['Field x is bad'] } } })
    const request = createRequest(config, fetchImpl)
    await expect(request('GET', '/myself')).resolves.toEqual(ME_USER)
    expect(calls[0]).toMatchObject({ url: 'http://localhost:8787/rest/api/3/myself', headers: { [TARGET_HEADER]: 'https://team.atlassian.net', accept: 'application/json' } })
    await expect(request('GET', '/field')).rejects.toThrow('Jira rejected the email or API token')
    await expect(request('GET', '/issue/X-1')).rejects.toThrow('Field x is bad')
    const down = createRequest(config, async () => { throw new TypeError('Failed to fetch') })
    await expect(down('GET', '/myself')).rejects.toThrow('npm run jira:proxy')
  })
})

describe('jira api · mapping', () => {
  it('maps statuses, priorities, types, people and dates', () => {
    expect(toStatus({ statusCategory: { key: 'new' } })).toBe('todo')
    expect(toStatus({ name: 'Code Review', statusCategory: { key: 'indeterminate' } })).toBe('in-review')
    expect(toStatus({ name: 'In Progress', statusCategory: { key: 'indeterminate' } })).toBe('in-progress')
    expect(toStatus({ statusCategory: { key: 'done' } })).toBe('done')
    expect([toPriority('Blocker'), toPriority('Minor'), toPriority('Weird')]).toEqual(['highest', 'low', 'medium'])
    expect([toIssueType({ name: 'Bug' }), toIssueType({ name: 'Sub-task', subtask: true }), toIssueType({ name: 'Spike' })]).toEqual(['bug', 'subtask', 'task'])
    expect(toPerson({ displayName: 'Anika Kumar' })).toEqual({ name: 'Anika Kumar', initials: 'AK' })
    expect(toPerson(null)).toEqual({ name: 'Unassigned', initials: 'UN' })
    expect(formatDate('2026-10-17')).toBe('Oct 17, 2026')
    expect(relativeTime('2026-10-11T10:00:00Z', NOW)).toBe('2 hours ago')
    expect(relativeTime('2026-10-10T11:00:00Z', NOW)).toBe('Yesterday')
    expect(nodeIdFromUrl('https://www.figma.com/design/K/?node-id=40000269-5516')).toBe('40000269:5516')
    expect(toStatus({ name: 'Latest', statusCategory: { key: 'indeterminate' } })).toBe('in-progress')
    expect(toHistoryEntries({ id: '1', items: [{ field: 'labels', fromString: null }] }, NOW)[0]!.body).toBe('changed labels from None to None')
  })

  it('maps an issue onto a board ticket', () => {
    const ticket = toTicket(ISSUE, { me: ME_USER, fields: findFieldIds(FIELDS), now: NOW })
    expect(ticket).toMatchObject({
      key: 'DS-7', title: 'Ship the Jira tab', type: 'story', status: 'in-review', priority: 'high', points: 5,
      sprint: 'Sprint 42', sprintEnds: 'Oct 17', dueDate: 'Oct 17, 2026', fixVersion: 'v2.12.0', description: 'Hello @Anika',
      parent: { key: 'DS-1', title: 'Plugin', type: 'epic' }, subtasks: [{ id: 'DS-8', label: 'Wire search', done: true }],
      scopes: ['assigned', 'watching'],
    })
  })

  it('keeps only Figma remote links', () => {
    expect(toFigmaLinks([
      { id: 1, object: { url: 'https://www.figma.com/design/K/?node-id=1-2', title: 'Hero', summary: 'File › Page' } },
      { id: 2, object: { url: 'https://github.com/x', title: 'PR' } },
    ])).toEqual([{ id: '1', nodeId: '1:2', frame: 'Hero', path: 'File › Page', url: 'https://www.figma.com/design/K/?node-id=1-2' }])
  })
})

describe('jira api · client', () => {
  const routes = () => ({
    'GET /myself': () => ME_USER,
    'GET /field': () => FIELDS,
    'POST /search/jql': () => ({ issues: [ISSUE] }),
    'GET /issue/DS-7': () => ISSUE,
    'GET /issue/DS-7/comment': () => ({ comments: [{ id: '5', author: ME_USER, created: '2026-10-11T11:55:00Z', body: 'Looks good' }] }),
    'GET /issue/DS-7/worklog': () => ({ worklogs: [{ id: '3', author: ME_USER, started: '2026-10-11T09:00:00Z', timeSpent: '1h' }] }),
    'GET /issue/DS-7/remotelink': () => [],
    'GET /issue/DS-7/transitions': () => ({ transitions: [{ id: '31', name: 'Done', to: { name: 'Done', statusCategory: { key: 'done' } } }, { id: '21', name: 'Start review', to: { name: 'In Review', statusCategory: { key: 'indeterminate' } } }] }),
    'POST /issue/DS-7/transitions': () => undefined,
    'PUT /issue/DS-7': () => undefined,
    'POST /issue/DS-7/comment': () => ({ id: '6' }),
    'POST /issue/DS-7/worklog': () => ({ id: '4' }),
    'POST /issue/DS-7/remotelink': () => ({ id: 10 }),
  })

  it('searches the board with JQL and reports the active sprint', async () => {
    const { fetchImpl, calls } = fakeJira(routes())
    const client = createJiraClient(configFromSettings(jira({ projectKey: 'DS' })) as JiraConfig, fetchImpl, () => NOW)
    const board = await client.search()
    expect(board.activeSprint).toBe('Sprint 42')
    expect(board.tickets.map((t) => t.key)).toEqual(['DS-7'])
    const search = calls.find((c) => c.url.includes('/search/jql'))!
    expect(search.body).toMatchObject({ jql: boardJql('DS'), maxResults: 100 })
    expect((search.body as { fields: string[] }).fields).toEqual(expect.arrayContaining(['summary', 'customfield_10016', 'customfield_10020']))
    await client.search()
    expect(calls.filter((c) => c.url.endsWith('/myself'))).toHaveLength(1)
  })

  it('reads issue detail and writes through Jira', async () => {
    const { fetchImpl, calls } = fakeJira(routes())
    const client = createJiraClient(configFromSettings(jira()) as JiraConfig, fetchImpl, () => NOW)
    const detail = await client.issue('DS-7')
    expect(detail.comments).toEqual([{ id: '5', author: { name: 'Praveen Manchi', initials: 'PM' }, time: '5 minutes ago', body: 'Looks good' }])
    expect(detail.history[0]!.body).toBe('changed status from To Do to In Review')
    expect(detail.worklog[0]!.body).toBe('Logged 1h')

    await client.setStatus('DS-7', 'done')
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/transitions'))!.body).toEqual({ transition: { id: '31' } })
    await client.setPoints('DS-7', 8)
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ fields: { customfield_10016: 8 } })
    await client.addComment('DS-7', 'Hi')
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/comment'))!.body).toEqual({ body: textToAdf('Hi') })
    await client.logWork('DS-7', 3600)
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/worklog'))!.body).toEqual({ timeSpentSeconds: 3600 })
    await client.addFigmaLink('DS-7', { url: 'https://www.figma.com/design/K/?node-id=1-2', frame: 'Hero', path: 'File › Page' })
    expect(calls.find((c) => c.url.endsWith('/remotelink') && c.method === 'POST')!.body).toMatchObject({ object: { url: 'https://www.figma.com/design/K/?node-id=1-2', title: 'Hero' } })
  })

  it('pages through Cloud results and stops at the cap', async () => {
    let page = 0
    const { fetchImpl, calls } = fakeJira({ ...routes(), 'POST /search/jql': () => { page += 1; return { issues: Array.from({ length: 100 }, (_, i) => ({ ...ISSUE, key: `DS-${page * 100 + i}` })), nextPageToken: `p${page}` } } })
    const client = createJiraClient(configFromSettings(jira()) as JiraConfig, fetchImpl, () => NOW)
    const board = await client.search()
    expect(board.tickets).toHaveLength(MAX_ISSUES)
    expect(board.truncated).toBe(true)
    expect(calls.filter((c) => c.url.includes('/search/jql'))[1]!.body).toMatchObject({ nextPageToken: 'p1' })
  })

  it('refuses a status with no transition and picks the best-named one', async () => {
    expect(pickTransition([{ id: '1', name: 'Start', to: { name: 'In Progress', statusCategory: { key: 'indeterminate' } } }], 'in-review')).toBeUndefined()
    const { fetchImpl } = fakeJira({ ...routes(), 'GET /issue/DS-7/transitions': () => ({ transitions: [] }) })
    const client = createJiraClient(configFromSettings(jira()) as JiraConfig, fetchImpl, () => NOW)
    await expect(client.setStatus('DS-7', 'todo')).rejects.toBeInstanceOf(JiraError)
  })

  it('uses REST v2, /search and plain-text comments on Server / Data Center', async () => {
    const { fetchImpl, calls } = fakeJira({ ...routes(), 'POST /search': () => ({ issues: [] }) })
    const client = createJiraClient(configFromSettings(jira({ baseUrl: 'https://jira.acme.com', proxyUrl: '' })) as JiraConfig, fetchImpl, () => NOW)
    await client.search()
    expect(calls.some((c) => c.url === 'https://jira.acme.com/rest/api/2/search')).toBe(true)
    await client.addComment('DS-7', 'Hi')
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/comment'))!.body).toEqual({ body: 'Hi' })
  })
})

describe('jira sandbox handlers (live wiring)', () => {
  const deps = (settings: IntegrationValues<'jira'>, fetchImpl: HttpFetch = vi.fn()) => ({
    readSettings: async () => settings, fetch: fetchImpl, openExternal: vi.fn(), selection: async () => null, focus: async () => undefined, now: () => NOW,
  })
  const call = <T>(handlers: ReturnType<typeof createJiraHandlers>, type: string, payload?: unknown) =>
    (handlers[type] as unknown as (p: unknown, c: unknown) => Promise<T>)(payload, {})

  it('reports Not connected without calling Jira when Settings are incomplete', async () => {
    const fetchImpl = vi.fn<HttpFetch>()
    const h = createJiraHandlers(deps(jira({ apiKey: '' }), fetchImpl))
    await expect(call<LoadResult>(h, MSG.load)).resolves.toEqual({ status: 'not-connected', reason: 'incomplete', missing: ['Jira API key'] })
    await expect(call(h, MSG.issue, { key: 'DS-7' })).rejects.toThrow('Add your Jira API key in Settings')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('loads the board and refuses to link when nothing is selected', async () => {
    const { fetchImpl } = fakeJira({ 'GET /myself': () => ME_USER, 'GET /field': () => FIELDS, 'POST /search/jql': () => ({ issues: [ISSUE] }) })
    const h = createJiraHandlers(deps(jira(), fetchImpl))
    const result = await call<LoadResult>(h, MSG.load)
    expect(result).toMatchObject({ status: 'connected', site: 'https://team.atlassian.net', me: { name: 'Praveen Manchi' }, activeSprint: 'Sprint 42', syncedAt: NOW })
    await expect(call(h, MSG.link, { key: 'DS-7' })).rejects.toThrow('Select a frame in Figma')
    await expect(call(h, MSG.status, { key: 'not a key', status: 'done' })).rejects.toThrow()
  })

  it('only opens the Jira site and Figma', async () => {
    const d = deps(jira())
    const h = createJiraHandlers(d)
    await call(h, MSG.open, { url: 'https://team.atlassian.net/browse/DS-7' })
    expect(d.openExternal).toHaveBeenCalledWith('https://team.atlassian.net/browse/DS-7')
    await call(h, MSG.open, { url: 'https://www.figma.com/design/K/?node-id=1-2' })
    await expect(call(h, MSG.open, { url: 'https://evil.example.com/x' })).rejects.toThrow('isn’t on your Jira site')
    await expect(call(h, MSG.open, { url: 'https://team.atlassian.net.evil.com/' })).rejects.toThrow()
    await expect(call(h, MSG.open, { url: 'javascript:alert(1)' })).rejects.toThrow()
    expect(d.openExternal).toHaveBeenCalledTimes(2)
  })

  it('tests unsaved Settings values with a fresh client, even while Jira is switched off', async () => {
    expect(MSG.test).toBe(testMessage('jira'))
    const { fetchImpl, calls } = fakeJira({ 'GET /myself': () => ME_USER })
    const h = createJiraHandlers(deps(jira({ apiKey: '' }), fetchImpl))
    await expect(call(h, MSG.test, jira({ enabled: false }))).resolves.toEqual({ message: 'Connected to team.atlassian.net through the proxy as Praveen Manchi.' })
    expect(calls[0]!.headers.authorization).toBe(`Basic ${base64('me@acme.com:tok')}`)
    await expect(call(h, MSG.test, jira({ siteUrl: 'https://evil.example.com' }))).rejects.toThrow('Fix the Site URL')
    await expect(call(h, MSG.test, jira({ apiKey: '' }))).rejects.toThrow('Add your Jira API key')
    await expect(call(h, MSG.test, { siteUrl: 42 })).rejects.toThrow('incomplete')
    const denied = createJiraHandlers(deps(jira(), fakeJira({ 'GET /myself': { status: 401 } }).fetchImpl))
    await expect(call(denied, MSG.test, jira())).rejects.toThrow('Jira rejected the email or API token')
  })

  it('rejects comment ids that would change the URL path and blank comments', async () => {
    const h = createJiraHandlers(deps(jira()))
    await expect(call(h, MSG.commentDelete, { key: 'DS-7', id: '..' })).rejects.toThrow()
    await expect(call(h, MSG.commentEdit, { key: 'DS-7', id: '1/2', body: 'x' })).rejects.toThrow()
    await expect(call(h, MSG.comment, { key: 'DS-7', body: '   ' })).rejects.toThrow()
  })
})
