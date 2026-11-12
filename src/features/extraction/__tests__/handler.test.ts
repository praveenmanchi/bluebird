import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import type { Snapshot } from '@shared/design/types'
import { BASELINE, CURRENT } from '../fixtures'
import { MSG, type ExtractResult, type PushRequest, type PushResult, type StatusResult } from '../messages'
import { INDEX_PATH, LATEST_PATH, parseExtraction, parseIndex } from '../model'
import { createExtractionHandlers } from '../sandbox/extraction-handlers'

const REPO = 'acme/tokens'
const HOOK = 'https://acme.webhook.office.com/webhookb2/abc'

interface FakeOptions { branches?: Record<string, Record<string, string>>; protectedBranches?: string[]; defaultBranch?: string }

/** An in-memory GitHub: branches hold files; commits are trees waiting for a ref. */
function fakeGithub({ branches = { main: {} }, protectedBranches = [], defaultBranch = 'main' }: FakeOptions = {}) {
  const files = new Map(Object.entries(branches).map(([name, tree]) => [name, { ...tree }]))
  const heads = new Map([...files.keys()].map((name) => [name, `sha-${name}`]))
  const commits = new Map<string, Record<string, string>>([...files.entries()].map(([name, tree]) => [`sha-${name}`, tree]))
  const trees = new Map<string, Record<string, string>>()
  const pulls: Array<{ head: string; base: string; title: string; body: string }> = []
  const posts: Array<{ url: string; body: string }> = []
  const requests: string[] = []
  let n = 0
  const reply = (status: number, body: unknown) => ({ status, text: async () => typeof body === 'string' ? body : JSON.stringify(body) })

  const fetch = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    if (!url.startsWith('https://api.github.com')) { posts.push({ url, body: init.body ?? '' }); return reply(200, '1') }
    const path = url.replace('https://api.github.com', '').replace(`/repos/${REPO}`, '')
    const body = init.body ? JSON.parse(init.body) as Record<string, unknown> : {}
    requests.push(`${init.method} ${path}`)
    if (path === '/user') return reply(200, { login: 'praveen' })
    if (path === '') return reply(200, { permissions: { push: true }, default_branch: defaultBranch })
    if (path.startsWith('/branches')) return reply(200, [...files.keys()].map((name) => ({ name })))
    const content = /^\/contents\/(.+?)(?:\?ref=(.+))?$/.exec(path)
    if (content && init.method === 'GET') {
      const tree = files.get(decodeURIComponent(content[2]!)) ?? {}
      const file = decodeURIComponent(content[1]!)
      const text = tree[file]
      if (text === undefined) {
        const inFolder = Object.keys(tree).filter((p) => p.startsWith(`${file}/`) && !p.slice(file.length + 1).includes('/'))
        return inFolder.length ? reply(200, inFolder.map((p) => ({ name: p.slice(file.length + 1), type: 'file' }))) : reply(404, { message: 'Not Found' })
      }
      if ((init.headers.Accept ?? '').includes('raw')) return reply(200, text)
      return reply(200, { content: Buffer.from(text, 'utf8').toString('base64'), sha: `blob-${text.length}` })
    }
    if (content && init.method === 'PUT') {
      const branch = String(body.branch)
      const file = decodeURIComponent(content[1]!)
      const existing = files.get(branch)
      if (existing?.[file] !== undefined && body.sha !== `blob-${existing[file]!.length}`) return reply(409, { message: 'sha does not match' })
      const tree = { ...(existing ?? {}), [file]: Buffer.from(String(body.content), 'base64').toString('utf8') }
      files.set(branch, tree); heads.set(branch, `sha-${branch}-${++n}`); commits.set(heads.get(branch)!, tree)
      return reply(201, {})
    }
    const ref = /^\/git\/ref\/heads\/(.+)$/.exec(path)
    if (ref) { const sha = heads.get(decodeURIComponent(ref[1]!)); return sha ? reply(200, { object: { sha } }) : reply(404, { message: 'Not Found' }) }
    const commit = /^\/git\/commits\/(.+)$/.exec(path)
    if (commit && init.method === 'GET') return reply(200, { tree: { sha: commit[1] } })
    if (path === '/git/trees') {
      const sha = `tree-${++n}`
      const added = Object.fromEntries((body.tree as Array<{ path: string; content: string }>).map((f) => [f.path, f.content]))
      trees.set(sha, { ...commits.get(String(body.base_tree)), ...added })
      return reply(201, { sha })
    }
    if (path === '/git/commits') {
      const sha = `commit-${++n}`
      commits.set(sha, trees.get(String(body.tree))!)
      return reply(201, { sha, html_url: `https://github.com/${REPO}/commit/${sha}` })
    }
    const move = /^\/git\/refs\/heads\/(.+)$/.exec(path)
    if (move && init.method === 'PATCH') {
      const branch = decodeURIComponent(move[1]!)
      if (protectedBranches.includes(branch)) return reply(422, { message: 'Protected branch update failed' })
      heads.set(branch, String(body.sha)); files.set(branch, commits.get(String(body.sha))!)
      return reply(200, {})
    }
    if (path === '/git/refs') {
      const branch = String(body.ref).replace('refs/heads/', '')
      heads.set(branch, String(body.sha)); files.set(branch, commits.get(String(body.sha))!)
      return reply(201, {})
    }
    if (path === '/pulls') {
      pulls.push({ head: String(body.head), base: String(body.base), title: String(body.title), body: String(body.body) })
      return reply(201, { number: 74, html_url: `https://github.com/${REPO}/pull/74` })
    }
    return reply(500, { message: `unhandled ${init.method} ${path}` })
  }
  return { fetch, files, pulls, posts, requests }
}

const extractionOn = (snapshot: Snapshot, by = 'Anita Rao', at = '2026-11-08T14:20:00.000Z') => {
  const file = JSON.stringify({ schema: 1, extractedAt: at, extractedBy: by, file: 'Bluebird UI', snapshot })
  const entry = { at, by, file: 'Bluebird UI', path: 'extractions/2026-11-08-1420.json', variables: snapshot.variables.length, components: snapshot.components.length, message: 'baseline' }
  return { [LATEST_PATH]: file, [INDEX_PATH]: JSON.stringify({ schema: 1, latest: entry, history: [entry] }) }
}

function setup(options: FakeOptions & { connected?: boolean; webhooks?: boolean; snapshot?: Snapshot } = {}) {
  const { connected = true, webhooks = false, snapshot = CURRENT, ...fake } = options
  const github = fakeGithub(fake)
  const opened: string[] = []
  const handlers = createExtractionHandlers({
    readSnapshot: async () => snapshot,
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, repo: REPO, apiKey: connected ? 'ghp_test' : '' }),
    readNotifications: async () => ({ ...DEFAULT_INTEGRATIONS.notifications, devTeamWebhook: webhooks ? HOOK : '', designSystemWebhook: webhooks ? 'https://evil.example.com/hook' : '' }),
    fetch: github.fetch,
    sleep: async () => undefined,
    openExternal: (url) => opened.push(url),
    now: () => new Date('2026-11-12T09:32:00.000Z'),
    user: () => 'Praveen Manchi',
    fileName: () => 'Bluebird UI',
    team: async () => 'Design System',
  })
  const call = (type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<unknown>)(payload, {} as HandlerContext)
  const request = (extractId: string, over: Partial<PushRequest> = {}): PushRequest =>
    ({ extractId, target: 'develop', create: false, base: '', message: 'chore(tokens): button refresh', pullRequest: false, notify: { designSystem: false, devTeam: false }, ticket: '', ...over })
  return {
    github, opened, request,
    status: () => call(MSG.status) as Promise<StatusResult>,
    extract: (branch: string | null) => call(MSG.extract, { branch }) as Promise<ExtractResult>,
    push: (req: PushRequest) => call(MSG.push, req) as Promise<PushResult>,
    open: (url: string) => call(MSG.open, { url }),
  }
}

describe('extraction handlers', () => {
  it('reports a missing token without calling GitHub', async () => {
    const t = setup({ connected: false })
    const s = await t.status()
    expect(s.repo).toMatchObject({ connected: false, problem: 'Add the access token in Settings › GitHub' })
    expect(t.github.requests).toHaveLength(0)
  })

  it('lists the branches, default first, with who extracted last and when', async () => {
    const t = setup({ branches: { develop: extractionOn(BASELINE), main: extractionOn(BASELINE, 'Praveen Manchi'), 'feature/x': {} } })
    const s = await t.status()
    expect(s.defaultBranch).toBe('main')
    expect(s.branches).toEqual([
      { name: 'main', latest: { by: 'Praveen Manchi', at: '2026-11-08T14:20:00.000Z' } },
      { name: 'develop', latest: { by: 'Anita Rao', at: '2026-11-08T14:20:00.000Z' } },
      { name: 'feature/x', latest: null },
    ])
  })

  it('compares the file with the latest extraction on the picked branch', async () => {
    const t = setup({ branches: { main: extractionOn(BASELINE) } })
    const r = await t.extract('main')
    expect(r.baseline).toEqual({ by: 'Anita Rao', at: '2026-11-08T14:20:00.000Z' })
    expect(r.changes).toHaveLength(6)
    expect(r.impacted.map((c) => c.name)).toContain('Toggle')
    expect(r.message).toMatch(/^chore\(tokens\): 6 variable changes/)
  })

  it('counts everything as new on a branch with no extraction', async () => {
    const r = await setup().extract('main')
    expect(r.baseline).toBeNull()
    expect(r.changes).toHaveLength(CURRENT.variables.length)
  })

  it('refuses to compare with a file that is not an extraction', async () => {
    await expect(setup({ branches: { main: { [LATEST_PATH]: '{"hello":1}' } } }).extract('main')).rejects.toThrow(/isn’t a Bluebird extraction/)
  })

  it('pushes the dated file, latest.json and the index to an existing branch', async () => {
    const t = setup({ branches: { main: {}, develop: extractionOn(BASELINE) } })
    const { extractId } = await t.extract('develop')
    const result = await t.push(t.request(extractId, { ticket: 'BB-342' }))
    expect(result).toMatchObject({ outcome: 'pushed', headline: 'Pushed to develop', linkLabel: 'Open commit' })
    const tree = t.github.files.get('develop')!
    expect(Object.keys(tree).sort()).toEqual(['extractions/2026-11-12-0932.json', INDEX_PATH, LATEST_PATH].sort())
    expect(parseExtraction(tree[LATEST_PATH]!)).toMatchObject({ extractedBy: 'Praveen Manchi', file: 'Bluebird UI' })
    const index = parseIndex(tree[INDEX_PATH]!)!
    expect(index.latest).toMatchObject({ by: 'Praveen Manchi', message: 'chore(tokens): button refresh (BB-342)' })
    expect(index.history).toHaveLength(2)
    // The push itself only touched develop; main (the default branch) got the History entry.
    const main = t.github.files.get('main')!
    expect(Object.keys(main)).toEqual(['.bluebird/history/2026-11-12.json'])
    const day = JSON.parse(main['.bluebird/history/2026-11-12.json']!) as { entries: Array<Record<string, unknown>> }
    expect(day.entries[0]).toMatchObject({ type: 'extraction', status: 'done', title: 'button refresh', ticket: 'BB-342', by: { name: 'Praveen Manchi', team: 'Design System' }, variables: '2 added · 3 modified · 1 removed', components: '4 components' })
    expect(result.message).not.toMatch(/team history/)
  })

  it('creates a new branch from the default branch and opens a pull request', async () => {
    const t = setup({ branches: { main: extractionOn(BASELINE) } })
    const { extractId } = await t.extract('main')
    const result = await t.push(t.request(extractId, { target: 'extraction/button-refresh', create: true, pullRequest: true }))
    expect(result).toMatchObject({ outcome: 'pr-opened', headline: 'Pull request #74 is open', link: `https://github.com/${REPO}/pull/74` })
    expect(t.github.pulls).toEqual([expect.objectContaining({ head: 'extraction/button-refresh', base: 'main', title: 'chore(tokens): button refresh' })])
    expect(t.github.files.get('extraction/button-refresh')![LATEST_PATH]).toBeDefined()
    // main is untouched until the pull request merges.
    expect(parseExtraction(t.github.files.get('main')![LATEST_PATH]!)!.extractedBy).toBe('Anita Rao')
  })

  it('makes the first commit in an empty repository', async () => {
    const t = setup({ branches: {} })
    expect((await t.status()).branches).toEqual([])
    const { extractId } = await t.extract(null)
    const result = await t.push(t.request(extractId, { target: 'main', create: true }))
    expect(result.outcome).toBe('pushed')
    expect(Object.keys(t.github.files.get('main')!)).toEqual(expect.arrayContaining([LATEST_PATH, '.bluebird/history/2026-11-12.json']))
  })

  it('reports a protected branch as rejected and notifies nobody', async () => {
    const t = setup({ branches: { main: {} }, protectedBranches: ['main'], webhooks: true })
    const { extractId } = await t.extract('main')
    const result = await t.push(t.request(extractId, { target: 'main', notify: { designSystem: true, devTeam: true } }))
    expect(result.outcome).toBe('rejected')
    expect(result.message).toMatch(/Nothing was pushed/)
    expect(t.github.posts).toHaveLength(0)
    // Nothing landed, but the attempt is in the History as a failed entry.
    const main = t.github.files.get('main')!
    expect(Object.keys(main)).toEqual(['.bluebird/history/2026-11-12.json'])
    expect(JSON.parse(main['.bluebird/history/2026-11-12.json']!).entries[0]).toMatchObject({ status: 'failed', summary: 'Extraction not pushed to main · Bluebird UI' })
  })

  it('posts to the picked Teams webhook and never to a host that is not Teams', async () => {
    const t = setup({ branches: { main: {}, develop: {} }, webhooks: true })
    const { extractId } = await t.extract('develop')
    const result = await t.push(t.request(extractId, { notify: { designSystem: true, devTeam: true } }))
    expect(t.github.posts.map((p) => p.url)).toEqual([HOOK])
    expect(JSON.parse(t.github.posts[0]!.body)).toMatchObject({ '@type': 'MessageCard', title: expect.stringContaining('Praveen Manchi pushed an extraction') })
    expect(result.message).toMatch(/1 channel was notified\. 1 channel could not be reached\./)
  })

  it('refuses a stale extraction, a pull request from the default branch, and a branch that already exists', async () => {
    const t = setup({ branches: { main: {}, develop: {} } })
    await expect(t.push(t.request('nope'))).rejects.toThrow(/Extract again/)
    const { extractId } = await t.extract('main')
    await expect(t.push(t.request(extractId, { target: 'main', pullRequest: true }))).rejects.toThrow(/branch other than main/)
    await expect(t.push(t.request(extractId, { target: 'develop', create: true }))).rejects.toThrow(/already exists/)
    await expect(t.push(t.request(extractId, { target: 'gone' }))).rejects.toThrow(/no longer a branch/)
    // None of those wrote anything, and the extraction is still pushable.
    expect((await t.push(t.request(extractId))).outcome).toBe('pushed')
    await expect(t.push(t.request(extractId))).rejects.toThrow(/Extract again/)
  })

  it('opens GitHub links only', async () => {
    const t = setup()
    await t.open(`https://github.com/${REPO}/pull/74`)
    await expect(t.open('https://example.com/phish')).rejects.toThrow(/isn’t on GitHub/)
    expect(t.opened).toEqual([`https://github.com/${REPO}/pull/74`])
  })
})
