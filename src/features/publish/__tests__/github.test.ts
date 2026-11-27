import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS, testMessage } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import { BASELINE, CURRENT } from '../fixtures'
import { MSG, type CommitPreview, type ExtractResult, type PublishRequest, type PublishResult, type StatusResult } from '../messages'
import { createPublishHandlers, type DocumentData } from '../sandbox/publish-handlers'
import { RETRY_ATTEMPTS, configFromSettings, type GithubFetch } from '../github/client'
import { STORE_PATH, allowedWebhook, prependChangelog, tokensFilePath, utf8Bytes } from '../github/release'
import { normalizeWebhook } from '@shared/integrations/webhooks'
import type { Snapshot } from '../types'

const TOKEN = 'ghp_test_secret'
const REPO = 'acme/ds-site'
const WEBHOOK = 'https://acme.webhook.office.com/webhookb2/abc'

interface Run { status: string; conclusion: string | null; html_url: string; name: string; run_number: number }

interface FakeOptions {
  protectedBranch?: boolean
  changelog?: string | null
  runs?: Run[][]
  /** Every GitHub call answers this status (401 for a bad token). */
  status?: number
  /** Statuses the first calls answer before GitHub behaves (502 then fine, say). */
  transient?: number[]
  canPush?: boolean
  /** Files on main before any publish (path → content). */
  mainFiles?: Record<string, string>
  /** What the Teams webhook answers. */
  webhookStatus?: number
}

/** In-memory GitHub: just the endpoints a release touches, plus the Teams webhook. */
function fakeGithub(opts: FakeOptions = {}) {
  const heads: Record<string, string> = { main: 'base0' }
  const tags = new Set<string>()
  const calls: Array<{ method: string; path: string; headers: Record<string, string>; body?: unknown }> = []
  const webhookCalls: Array<{ url: string; body: Record<string, unknown> }> = []
  /** Files on main (a fast-forward lands the commit's tree here; a pull request does not). */
  const mainFiles: Record<string, string> = { ...(opts.mainFiles ?? {}) }
  let trees: Array<{ path: string; content: string }> = []
  let commitMessage = ''
  let runCall = 0
  let commits = 0
  const transient = [...(opts.transient ?? [])]
  const reply = (status: number, body: unknown) => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) })
  const fetch: GithubFetch = async (url, init) => {
    if (!url.startsWith('https://api.github.com')) {
      webhookCalls.push({ url, body: JSON.parse(init.body ?? '{}') as Record<string, unknown> })
      return reply(opts.webhookStatus ?? 200, '1')
    }
    const path = url.replace('https://api.github.com', '')
    const body = init.body ? JSON.parse(init.body) as Record<string, unknown> : undefined
    calls.push({ method: init.method, path, headers: init.headers, body })
    if (transient.length) return reply(transient.shift()!, { message: 'Server Error' })
    if (opts.status) return reply(opts.status, { message: 'Bad credentials' })
    const r = `/repos/${REPO}`
    if (init.method === 'GET' && path === '/user') return reply(200, { login: 'designer' })
    if (init.method === 'GET' && path === r) return reply(200, { permissions: { push: opts.canPush ?? true }, default_branch: 'main' })
    if (init.method === 'GET' && path === `${r}/git/ref/heads/main`) return reply(200, { object: { sha: heads.main } })
    if (init.method === 'GET' && path.startsWith(`${r}/contents/`)) {
      const file = decodeURIComponent(path.slice(`${r}/contents/`.length).split('?')[0]!)
      if (file === 'CHANGELOG.md' && opts.changelog) return reply(200, opts.changelog)
      return file in mainFiles ? reply(200, mainFiles[file]!) : reply(404, { message: 'Not Found' })
    }
    if (init.method === 'GET' && path.startsWith(`${r}/git/commits/`)) return reply(200, { tree: { sha: 'tree0' } })
    if (init.method === 'POST' && path === `${r}/git/trees`) { trees = (body!.tree as typeof trees); return reply(201, { sha: 'tree1' }) }
    if (init.method === 'POST' && path === `${r}/git/commits`) {
      commitMessage = String(body!.message)
      const sha = commits++ === 0 ? 'base1111111111' : 'c0ffee1234567'
      return reply(201, { sha, html_url: `https://github.com/${REPO}/commit/${sha}` })
    }
    if (init.method === 'PATCH' && path === `${r}/git/refs/heads/main`) {
      if (opts.protectedBranch) return reply(422, { message: 'Protected branch update failed for refs/heads/main.' })
      heads.main = String(body!.sha)
      for (const f of trees) mainFiles[f.path] = f.content
      return reply(200, {})
    }
    if (init.method === 'POST' && path === `${r}/git/refs`) {
      const ref = String(body!.ref)
      const exists = ref.startsWith('refs/tags/') ? tags.has(ref) : heads[ref.replace('refs/heads/', '')] !== undefined
      if (exists) return reply(422, { message: 'Reference already exists' })
      if (ref.startsWith('refs/tags/')) tags.add(ref); else heads[ref.replace('refs/heads/', '')] = String(body!.sha)
      return reply(201, {})
    }
    if (init.method === 'POST' && path === `${r}/pulls`) return reply(201, { number: 62, html_url: `https://github.com/${REPO}/pull/62` })
    if (init.method === 'GET' && path.startsWith(`${r}/actions/runs`)) {
      const seq = opts.runs ?? [[]]
      return reply(200, { workflow_runs: seq[Math.min(runCall++, seq.length - 1)] })
    }
    return reply(404, { message: `Unhandled ${init.method} ${path}` })
  }
  return { fetch, opts, heads, tags, calls, webhookCalls, mainFiles, files: () => trees, message: () => commitMessage }
}

interface SetupOptions {
  /** Settings › Code repository › "Enable diff comparison" (on by default, as in Settings). */
  diffComparison?: boolean
  /** Settings › Notifications webhooks. */
  webhooks?: string[]
  /** Reuse another setup's document data: a second designer opening the same file. */
  data?: DocumentData
}

function setup(github = fakeGithub(), snapshot: Snapshot = CURRENT, baseline?: Snapshot, options: SetupOptions = {}) {
  const raw = new Map<string, string>()
  const data: DocumentData = options.data ?? { get: (k) => raw.get(k) ?? '', set: (k, v) => { if (v) raw.set(k, v); else raw.delete(k) } }
  let current = baseline ?? snapshot
  let clock = Date.parse('2026-10-11T16:05:00.000Z')
  const events: unknown[] = []
  const opened: string[] = []
  const slept: number[] = []
  const ctx = { emit: (_t: string, p: unknown) => events.push(p) } as HandlerContext
  const [designSystemWebhook = '', devTeamWebhook = ''] = options.webhooks ?? []
  const handlers = createPublishHandlers({
    readSnapshot: async () => current,
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, repo: REPO, apiKey: TOKEN, diffComparison: options.diffComparison ?? true }),
    readNotifications: async () => ({ ...DEFAULT_INTEGRATIONS.notifications, designSystemWebhook, devTeamWebhook }),
    data,
    fetch: github.fetch,
    sleep: async (ms) => { clock += ms; slept.push(ms) },
    openExternal: (url) => opened.push(url),
    now: () => new Date(clock),
  })
  const call = (type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<unknown>)(payload, ctx)
  return {
    github, data, events, opened, slept,
    setSnapshot: (s: Snapshot) => { current = s },
    advance: (ms: number) => { clock += ms },
    status: () => call(MSG.status) as Promise<StatusResult>,
    extract: () => call(MSG.extract) as Promise<ExtractResult>,
    preview: (r: PublishRequest) => call(MSG.preview, r) as Promise<CommitPreview>,
    publish: (r: PublishRequest) => call(MSG.publish, r) as Promise<PublishResult>,
    test: (v: unknown) => call(testMessage('github'), v) as Promise<{ message: string }>,
    open: (url: string) => call(MSG.open, { url }),
  }
}

const request = (x: ExtractResult, options: Partial<PublishRequest['options']> = {}): PublishRequest => ({
  extractId: x.extractId, version: 'v4.0.0', title: 'Date picker and a darker primary',
  include: x.changes.map((c) => c.id),
  notes: x.changes.map((c) => ({ changeId: c.id, text: `Note for ${c.name}` })),
  options: { openPr: true, postToTeams: false, tag: true, ...options },
})

/** First publish BASELINE as v3.0.0, then extract CURRENT: the Figma example's 12 changes. */
async function atV3(github = fakeGithub()) {
  const t = setup(github, CURRENT, BASELINE)
  await t.publish({ ...request(await t.extract(), { openPr: false, tag: false }), version: 'v3.0.0' })
  t.setSnapshot(CURRENT)
  return t
}

describe('configFromSettings', () => {
  it('needs a repository and a token, and targets api.github.com or the Enterprise host', () => {
    const gh = DEFAULT_INTEGRATIONS.github
    expect(configFromSettings(gh)).toEqual({ reason: 'incomplete', fields: ['Repository', 'Access token'] })
    expect(configFromSettings({ ...gh, repo: 'acme/ds', apiKey: 't' })).toMatchObject({ api: 'https://api.github.com', repo: 'acme/ds', branch: 'main', tokenPath: 'tokens.json' })
    expect(configFromSettings({ ...gh, repo: 'acme/ds', apiKey: 't', baseUrl: 'https://github.acme.com/' })).toMatchObject({ api: 'https://github.acme.com/api/v3' })
    expect(configFromSettings({ ...gh, repo: 'acme', apiKey: 't' })).toEqual({ reason: 'invalid', fields: ['repo'] })
  })
})

describe('publishing to GitHub', () => {
  it('reports the repository as connected once a token is set', async () => {
    expect((await setup().status()).repo).toEqual({ connected: true, repo: REPO, branch: 'main', diffComparison: true })
  })

  it('opens a pull request with one commit carrying tokens, the release record and the changelog', async () => {
    const t = await atV3()
    const x = await t.extract()
    expect(x.changes).toHaveLength(12)
    const res = await t.publish(request(x))
    expect(res).toMatchObject({ outcome: 'pr-opened', headline: 'v4.0.0 is ready for review', link: `https://github.com/${REPO}/pull/62`, linkLabel: 'Open pull request' })
    expect(res.message).toContain('Tag v4.0.0 once it merges.')
    expect(t.github.heads['release/v4.0.0']).toBe('c0ffee1234567')
    expect(t.github.heads.main).not.toBe('c0ffee1234567') // main untouched until the PR merges
    const files = Object.fromEntries(t.github.files().map((f) => [f.path, f.content]))
    expect(Object.keys(files).sort()).toEqual([STORE_PATH, 'CHANGELOG.md', 'releases/v4.0.0.json', 'tokens.json'])
    const store = JSON.parse(files[STORE_PATH]!) as { releases: Array<{ version: string }>; baseline: { variables: unknown[] } }
    expect(store.releases.map((r) => r.version)).toEqual(['v4.0.0', 'v3.0.0'])
    expect(store.baseline.variables).toHaveLength(CURRENT.variables.length)
    const tokens = JSON.parse(files['tokens.json']!) as { version: string; collections: Record<string, Record<string, { values: Record<string, string> }>>; components: Array<{ name: string }> }
    expect(tokens.version).toBe('v4.0.0')
    expect(tokens.collections['Brand UI']!['button/bg/primary']!.values.Bridge).toBe('#0560A3')
    expect(tokens.collections['Brand UI']!['surface/translucent']).toBeUndefined()
    expect(tokens.components.map((c) => c.name)).toContain('Date picker')
    expect(JSON.parse(files['releases/v4.0.0.json']!)).toMatchObject({ version: 'v4.0.0', changes: expect.arrayContaining([expect.objectContaining({ name: 'Date picker', note: 'Note for Date picker' })]) })
    expect(files['CHANGELOG.md']).toMatch(/^# Changelog\n\n## v4.0.0 — Date picker and a darker primary\n\n### Breaking\n/)
    expect(t.github.message()).toMatch(/^release: v4.0.0 — Date picker and a darker primary/)
    // The file now records v4.0.0: the next extract compares against it.
    expect((await t.status()).baseline?.version).toBe('v4.0.0')
  })

  it('sends the token only in the Authorization header', async () => {
    const t = await atV3()
    await t.publish(request(await t.extract()))
    for (const c of t.github.calls) {
      expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`)
      expect(c.path).not.toContain(TOKEN)
      expect(JSON.stringify(c.body ?? '')).not.toContain(TOKEN)
    }
  })

  it('picks a fresh branch name when release/<version> already exists', async () => {
    const github = fakeGithub()
    github.heads['release/v4.0.0'] = 'old'
    const t = await atV3(github)
    const res = await t.publish(request(await t.extract()))
    expect(res.outcome).toBe('pr-opened')
    expect(Object.keys(github.heads).some((h) => h.startsWith('release/v4.0.0-'))).toBe(true)
  })

  it('pushes straight to the branch, tags it and follows the CI run to success', async () => {
    const ok: Run = { status: 'completed', conclusion: 'success', html_url: `https://github.com/${REPO}/actions/runs/9`, name: 'Build docs', run_number: 484 }
    const running = { ...ok, status: 'in_progress', conclusion: null }
    const t = await atV3(fakeGithub({ runs: [[], [running], [ok]] }))
    const res = await t.publish(request(await t.extract(), { openPr: false }))
    expect(res).toMatchObject({ outcome: 'pushed', headline: 'v4.0.0 pushed to main', link: ok.html_url, linkLabel: 'Open the run' })
    expect(t.github.heads.main).toBe('c0ffee1234567')
    expect(t.github.tags.has('refs/tags/v4.0.0')).toBe(true)
    expect(res.steps.map((s) => s.status)).toEqual(['done', 'done', 'done', 'done', 'done'])
    expect(res.steps.find((s) => s.id === 'build')!.detail).toBe('GitHub Actions #484 · Build docs')
  })

  it('reports a failed CI run as build-failed but keeps the committed release', async () => {
    const failed: Run = { status: 'completed', conclusion: 'failure', html_url: `https://github.com/${REPO}/actions/runs/10`, name: 'Build docs', run_number: 485 }
    const t = await atV3(fakeGithub({ runs: [[failed]] }))
    const res = await t.publish(request(await t.extract(), { openPr: false }))
    expect(res).toMatchObject({ outcome: 'build-failed', headline: 'Site build failed', link: failed.html_url })
    expect(res.log).toContain('Build docs #485: failure')
    expect((await t.status()).baseline?.version).toBe('v4.0.0')
  })

  it('says so when no workflow runs for the commit', async () => {
    const t = await atV3(fakeGithub({ runs: [[]] }))
    const res = await t.publish(request(await t.extract(), { openPr: false }))
    expect(res).toMatchObject({ outcome: 'pushed', link: `https://github.com/${REPO}/commit/c0ffee1234567`, linkLabel: 'Open commit' })
    expect(res.steps.find((s) => s.id === 'build')).toMatchObject({ status: 'queued', detail: 'No GitHub Actions run started for this commit' })
  })

  it('turns a protected-branch refusal into push-rejected and records nothing', async () => {
    const github = fakeGithub()
    const t = await atV3(github)
    github.opts.protectedBranch = true
    const x = await t.extract()
    const res = await t.publish(request(x, { openPr: false }))
    expect(res).toMatchObject({ outcome: 'push-rejected', headline: 'Push to main was rejected' })
    expect(res.log).toContain('Protected branch update failed for refs/heads/main.')
    expect((await t.status()).baseline?.version).toBe('v3.0.0')
    // The same extract can be retried as a pull request.
    expect((await t.publish(request(x, { openPr: true }))).outcome).toBe('pr-opened')
  })

  it('stops with a readable error when GitHub rejects the token', async () => {
    const t = setup(fakeGithub({ status: 401 }))
    await expect(t.publish(request(await t.extract()))).rejects.toThrow('GitHub didn’t accept the access token')
    expect((await t.status()).baseline).toBeNull()
  })

  it('appends to an existing changelog under its heading', () => {
    expect(prependChangelog('# Changelog\n\n## v3.0.0 — Old\n', '## v4.0.0 — New\n')).toBe('# Changelog\n\n## v4.0.0 — New\n\n## v3.0.0 — Old\n')
    expect(prependChangelog(null, '## v1.0.0 — First\n')).toBe('# Changelog\n\n## v1.0.0 — First\n')
    expect(tokensFilePath('tokens')).toBe('tokens/tokens.json')
    expect(tokensFilePath('/design/tokens.json')).toBe('design/tokens.json')
  })
})

describe('retrying transient GitHub failures', () => {
  it('retries a 5xx with backoff and then succeeds', async () => {
    // The extract's one read of .bluebird/releases.json meets 502 then 503, then GitHub answers.
    const t = setup(fakeGithub({ transient: [502, 503] }), CURRENT, BASELINE)
    expect((await t.extract()).baselineNote).toContain(`has no ${STORE_PATH} on main yet`)
    expect(t.slept).toEqual([400, 800])
  })

  it('gives up after the last attempt with a readable message', async () => {
    const t = setup(fakeGithub({ transient: Array<number>(RETRY_ATTEMPTS).fill(502) }), CURRENT, undefined, { diffComparison: false })
    await expect(t.publish(request(await t.extract()))).rejects.toThrow(`GitHub answered 502 (Server Error) ${RETRY_ATTEMPTS} times in a row`)
    expect((await t.status()).baseline).toBeNull()
  })

  it('does not retry a 4xx', async () => {
    const t = setup(fakeGithub({ status: 401 }))
    await expect(t.extract().then((x) => t.publish(request(x)))).rejects.toThrow('GitHub didn’t accept the access token')
    expect(t.github.calls.filter((c) => c.path === `/repos/${REPO}/git/ref/heads/main`)).toHaveLength(1)
  })
})

describe('the repository as baseline (Settings › Code repository › diff comparison)', () => {
  /** v3.0.0 pushed to main by one designer; `fresh` is another copy of the file with no release in it. */
  async function published() {
    const github = fakeGithub()
    const first = setup(github, CURRENT, BASELINE)
    await first.publish({ ...request(await first.extract(), { openPr: false, tag: false }), version: 'v3.0.0' })
    expect(github.mainFiles[STORE_PATH]).toBeDefined()
    return github
  }

  it('recovers the baseline from .bluebird/releases.json when the file has none', async () => {
    const fresh = setup(await published(), CURRENT)
    const x = await fresh.extract()
    expect(x.baselineSource).toBe('github')
    expect(x.baseline?.version).toBe('v3.0.0')
    expect(x.changes).toHaveLength(12) // not "everything in this file"
    expect((await fresh.status()).baseline?.version).toBe('v3.0.0') // and the file now carries it too
  })

  it('lists everything as new when diff comparison is off', async () => {
    const fresh = setup(await published(), CURRENT, undefined, { diffComparison: false })
    const before = fresh.github.calls.length
    const x = await fresh.extract()
    expect(x.baselineSource).toBe('none')
    expect(x.baseline).toBeNull()
    expect(fresh.github.calls.slice(before)).toEqual([])
  })

  it('keeps the file’s release when it is newer than the repository’s and says so', async () => {
    const github = await published()
    const t = setup(github, CURRENT)
    await t.extract()
    t.advance(60_000) // a minute later
    await t.publish({ ...request(await t.extract(), { openPr: true, tag: false }), version: 'v3.1.0' }) // a PR: main still holds v3.0.0
    const x = await t.extract()
    expect(x.baselineSource).toBe('file')
    expect(x.baseline?.version).toBe('v3.1.0')
    expect(x.baselineNote).toContain('is behind this file (v3.0.0 on main)')
  })

  it('says when the repository has no store yet and when it cannot be read', async () => {
    const empty = setup(fakeGithub(), CURRENT, BASELINE)
    expect((await empty.extract()).baselineNote).toContain(`has no ${STORE_PATH} on main yet`)
    const broken = setup(fakeGithub({ mainFiles: { [STORE_PATH]: '{"releases": "nope"}' } }), CURRENT, BASELINE)
    expect((await broken.extract()).baselineNote).toContain('isn’t a Bluebird release store')
    const down = setup(fakeGithub({ transient: Array<number>(RETRY_ATTEMPTS).fill(500) }), CURRENT, BASELINE)
    const x = await down.extract()
    expect(x.baselineSource).toBe('none')
    expect(x.baselineNote).toMatch(/^Couldn’t read \.bluebird\/releases\.json from acme\/ds-site: GitHub answered 500/)
  })
})

describe('commit preview', () => {
  it('lists the four files with sizes and the commit message', async () => {
    const t = await atV3()
    const x = await t.extract()
    const before = t.github.calls.length
    const p = await t.preview(request(x))
    expect(p.message).toMatch(/^release: v4.0.0 — Date picker and a darker primary/)
    expect(p.files.map((f) => [f.path, f.language])).toEqual([['tokens.json', 'JSON'], ['releases/v4.0.0.json', 'JSON'], [STORE_PATH, 'JSON'], ['CHANGELOG.md', 'Markdown']])
    for (const f of p.files) expect(f.bytes).toBe(utf8Bytes(f.content))
    expect(p.files[3]!.content).toContain('## v4.0.0 — Date picker and a darker primary')
    expect(p.files.every((f) => !f.truncated)).toBe(true)
    expect(t.github.calls.slice(before)).toEqual([]) // built locally: nothing asked of GitHub, nothing written
  })

  it('needs the current extract', async () => {
    const t = await atV3()
    await expect(t.preview(request({ ...(await t.extract()), extractId: 'stale' }))).rejects.toThrow('Run the extract again')
    expect(utf8Bytes('é€😀')).toBe(2 + 3 + 4)
  })
})

describe('posting the changelog to Teams', () => {
  it('posts a MessageCard to every webhook after the release lands', async () => {
    const github = fakeGithub({ runs: [[]] })
    const t = setup(github, CURRENT, BASELINE, { webhooks: [WEBHOOK, 'https://prod-07.westus.logic.azure.com/workflows/x/triggers/manual/paths/invoke'] })
    await t.publish({ ...request(await t.extract(), { openPr: false, tag: false }), version: 'v3.0.0' })
    t.setSnapshot(CURRENT)
    expect((await t.status()).notify).toEqual({ webhooks: 2 })
    const res = await t.publish(request(await t.extract(), { openPr: false, postToTeams: true }))
    expect(res.outcome).toBe('pushed')
    expect(res.message).toContain('The changelog was posted to Teams.')
    expect(res.steps.find((s) => s.id === 'notify')).toMatchObject({ status: 'done', detail: 'Changelog posted to 2 Teams channels' })
    const posts = github.webhookCalls.filter((w) => w.body.title === 'v4.0.0 — Date picker and a darker primary')
    expect(posts).toHaveLength(2)
    expect(posts[0]!.body['@type']).toBe('MessageCard')
    expect(String(posts[0]!.body.text)).toContain('### Breaking')
    // Teams drops MessageCard buttons, so the link is a bare URL in the text and a discrete key.
    expect(posts[0]!.body).not.toHaveProperty('potentialAction')
    expect(posts[0]!.body.link).toBe(`https://github.com/${REPO}/commit/c0ffee1234567`)
    expect(String(posts[0]!.body.text)).toContain(`: https://github.com/${REPO}/commit/c0ffee1234567`)
  })

  it('sends the counts and names as discrete keys, so a flow never parses the prose', async () => {
    const github = fakeGithub({ runs: [[]] })
    const t = setup(github, CURRENT, BASELINE, { webhooks: [WEBHOOK] })
    await t.publish({ ...request(await t.extract(), { openPr: false, tag: false }), version: 'v3.0.0' })
    t.setSnapshot(CURRENT)
    await t.publish(request(await t.extract(), { openPr: false, postToTeams: true }))
    const body = github.webhookCalls[0]!.body
    expect(Object.keys(body).slice(0, 5)).toEqual(['@type', '@context', 'summary', 'title', 'text'])
    expect(body).toMatchObject({ kind: 'release', repo: REPO, ref: 'v4.0.0', notify: expect.stringMatching(/^(channel|none)$/) })
    for (const key of ['added', 'modified', 'removed', 'breaking']) expect(typeof body[key]).toBe('number')
    expect(Number(body.added) + Number(body.modified) + Number(body.removed)).toBe(body.changesTotal)
    expect(Array.isArray(body.impacted)).toBe(true)
  })

  it('tabulates the changes with breaking rows first and every cell a string', async () => {
    const github = fakeGithub({ runs: [[]] })
    const t = setup(github, CURRENT, BASELINE, { webhooks: [WEBHOOK] })
    await t.publish({ ...request(await t.extract(), { openPr: false, tag: false }), version: 'v3.0.0' })
    t.setSnapshot(CURRENT)
    await t.publish(request(await t.extract(), { openPr: false, postToTeams: true }))
    const body = github.webhookCalls[0]!.body
    const rows = body.changes as Array<Record<string, unknown>>
    expect(rows.length).toBe(body.changesShown)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      for (const key of ['name', 'kind', 'from', 'to', 'usedIn']) expect(typeof row[key]).toBe('string')
      expect(typeof row.breaking).toBe('boolean')
    }
    const firstRoutine = rows.findIndex((r) => !r.breaking)
    expect(firstRoutine === -1 || rows.slice(firstRoutine).every((r) => !r.breaking)).toBe(true)
    expect(body.breaking).toBeGreaterThan(0) // the fixture removes a variable
    expect(rows[0]!.breaking).toBe(true)
    expect(body.themeColor).toBe('D64045')
  })

  it('posts to a Power Platform trigger URL, without its explicit :443', async () => {
    const PLATFORM = 'https://default0123abcd.ef.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/abc/triggers/manual/paths/invoke?api-version=1&sig=xyz'
    const github = fakeGithub({ runs: [[]] })
    const t = setup(github, CURRENT, BASELINE, { webhooks: [PLATFORM] })
    const res = await t.publish(request(await t.extract(), { openPr: false, postToTeams: true }))
    expect(res.steps.find((s) => s.id === 'notify')).toMatchObject({ status: 'done' })
    expect(github.webhookCalls.map((w) => w.url)).toEqual([PLATFORM.replace(':443', '')])
    expect(normalizeWebhook('https://x.webhook.office.com:443')).toBe('https://x.webhook.office.com')
    expect(normalizeWebhook('https://x.webhook.office.com:8443/a')).toBe('https://x.webhook.office.com:8443/a')
    expect(allowedWebhook('https://x.environment.api.powerplatform.com:8443/a')).toBe(false)
  })

  it('reports a failed post without touching the release, and skips the step without a webhook', async () => {
    const failing = setup(fakeGithub({ webhookStatus: 403 }), CURRENT, BASELINE, { webhooks: [WEBHOOK] })
    const res = await failing.publish(request(await failing.extract(), { postToTeams: true }))
    expect(res.outcome).toBe('pr-opened')
    expect(res.steps.find((s) => s.id === 'notify')).toMatchObject({ status: 'failed', detail: 'acme.webhook.office.com: HTTP 403' })
    expect(res.message).toContain('The Teams post failed (acme.webhook.office.com: HTTP 403)')
    expect((await failing.status()).baseline?.version).toBe('v4.0.0')

    const none = setup(fakeGithub(), CURRENT, BASELINE)
    const quiet = await none.publish(request(await none.extract(), { postToTeams: true }))
    expect(quiet.steps.find((s) => s.id === 'notify')).toMatchObject({ status: 'queued', detail: 'Not posted — add a webhook in Settings › Notifications' })
    expect(none.github.webhookCalls).toHaveLength(0)
    const off = setup(fakeGithub(), CURRENT, BASELINE, { webhooks: [WEBHOOK] })
    expect((await off.publish(request(await off.extract(), { postToTeams: false }))).steps.some((s) => s.id === 'notify')).toBe(false)
  })

  it('only posts to Teams and Power Automate hosts', () => {
    expect(allowedWebhook(WEBHOOK)).toBe(true)
    expect(allowedWebhook('https://prod-07.westus.logic.azure.com/workflows/x')).toBe(true)
    expect(allowedWebhook('https://default0123.ef.environment.api.powerplatform.com:443/powerautomate/x')).toBe(true)
    expect(allowedWebhook('https://evil.example.com/environment.api.powerplatform.com/')).toBe(false)
    expect(allowedWebhook('https://evil.example.com/webhook.office.com/')).toBe(false)
    expect(allowedWebhook('http://acme.webhook.office.com/x')).toBe(false)
  })
})

describe('Settings › Code repository › Test connection', () => {
  const form = { ...DEFAULT_INTEGRATIONS.github, repo: REPO, apiKey: TOKEN }
  it('names the account, confirms it can push and says what the branch holds', async () => {
    expect((await setup().test(form)).message).toBe(`Connected as designer · can push to ${REPO} (default branch main). main has no Bluebird release yet.`)
    const t = await atV3()
    expect((await t.test(form)).message).toContain('main holds v3.0.0, which extracts compare against.')
    expect((await t.test({ ...form, diffComparison: false })).message).toContain('main holds v3.0.0.')
  })
  it('fails when the token can’t push, is rejected, or a field is missing', async () => {
    await expect(setup(fakeGithub({ canPush: false })).test(form)).rejects.toThrow('can’t push to acme/ds-site')
    await expect(setup(fakeGithub({ status: 401 })).test(form)).rejects.toThrow('GitHub didn’t accept the access token')
    await expect(setup().test({ ...form, apiKey: '' })).rejects.toThrow('Add the access token first.')
  })
})

describe('publish:open', () => {
  it('opens GitHub links only', async () => {
    const t = setup()
    await t.open(`https://github.com/${REPO}/pull/62`)
    expect(t.opened).toEqual([`https://github.com/${REPO}/pull/62`])
    await expect(t.open('https://evil.example/phish')).rejects.toThrow('That link isn’t on GitHub or Bitbucket.')
    await expect(t.open('https://bitbucket.org/acme/tokens/pull-requests/7')).resolves.not.toThrow()
    await expect(t.open('javascript:alert(1)')).rejects.toThrow()
  })
})
