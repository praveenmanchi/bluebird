import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS, testMessage } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import { BASELINE, CURRENT } from '../fixtures'
import { MSG, type ExtractResult, type PublishRequest, type PublishResult, type StatusResult } from '../messages'
import { createPublishHandlers, type DocumentData } from '../sandbox/publish-handlers'
import { configFromSettings, type GithubFetch } from '../github/client'
import { prependChangelog, tokensFilePath } from '../github/release'
import type { Snapshot } from '../types'

const TOKEN = 'ghp_test_secret'
const REPO = 'acme/ds-site'

interface Run { status: string; conclusion: string | null; html_url: string; name: string; run_number: number }

/** In-memory GitHub: just the endpoints a release touches. */
function fakeGithub(opts: { protectedBranch?: boolean; changelog?: string | null; runs?: Run[][]; status?: number; canPush?: boolean } = {}) {
  const heads: Record<string, string> = { main: 'base0' }
  const tags = new Set<string>()
  const calls: Array<{ method: string; path: string; headers: Record<string, string>; body?: unknown }> = []
  let trees: Array<{ path: string; content: string }> = []
  let commitMessage = ''
  let runCall = 0
  let commits = 0
  const reply = (status: number, body: unknown) => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) })
  const fetch: GithubFetch = async (url, init) => {
    const path = url.replace('https://api.github.com', '')
    const body = init.body ? JSON.parse(init.body) as Record<string, unknown> : undefined
    calls.push({ method: init.method, path, headers: init.headers, body })
    if (opts.status) return reply(opts.status, { message: 'Bad credentials' })
    const r = `/repos/${REPO}`
    if (init.method === 'GET' && path === '/user') return reply(200, { login: 'designer' })
    if (init.method === 'GET' && path === r) return reply(200, { permissions: { push: opts.canPush ?? true }, default_branch: 'main' })
    if (init.method === 'GET' && path === `${r}/git/ref/heads/main`) return reply(200, { object: { sha: heads.main } })
    if (init.method === 'GET' && path.startsWith(`${r}/contents/CHANGELOG.md`)) return opts.changelog ? reply(200, opts.changelog) : reply(404, { message: 'Not Found' })
    if (init.method === 'GET' && path.startsWith(`${r}/git/commits/`)) return reply(200, { tree: { sha: 'tree0' } })
    if (init.method === 'POST' && path === `${r}/git/trees`) { trees = (body!.tree as typeof trees); return reply(201, { sha: 'tree1' }) }
    if (init.method === 'POST' && path === `${r}/git/commits`) {
      commitMessage = String(body!.message)
      const sha = commits++ === 0 ? 'base1111111111' : 'c0ffee1234567'
      return reply(201, { sha, html_url: `https://github.com/${REPO}/commit/${sha}` })
    }
    if (init.method === 'PATCH' && path === `${r}/git/refs/heads/main`) {
      if (opts.protectedBranch) return reply(422, { message: 'Protected branch update failed for refs/heads/main.' })
      heads.main = String(body!.sha); return reply(200, {})
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
  return { fetch, opts, heads, tags, calls, files: () => trees, message: () => commitMessage }
}

function setup(github = fakeGithub(), snapshot: Snapshot = CURRENT, baseline?: Snapshot) {
  const raw = new Map<string, string>()
  const data: DocumentData = { get: (k) => raw.get(k) ?? '', set: (k, v) => { if (v) raw.set(k, v); else raw.delete(k) } }
  let current = baseline ?? snapshot
  let clock = Date.parse('2026-10-11T16:05:00.000Z')
  const events: unknown[] = []
  const opened: string[] = []
  const ctx = { emit: (_t: string, p: unknown) => events.push(p) } as HandlerContext
  const handlers = createPublishHandlers({
    readSnapshot: async () => current,
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, repo: REPO, apiKey: TOKEN }),
    data,
    fetch: github.fetch,
    sleep: async (ms) => { clock += ms },
    openExternal: (url) => opened.push(url),
    now: () => new Date(clock),
  })
  const call = (type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<unknown>)(payload, ctx)
  return {
    github, data, events, opened,
    setSnapshot: (s: Snapshot) => { current = s },
    status: () => call(MSG.status) as Promise<StatusResult>,
    extract: () => call(MSG.extract) as Promise<ExtractResult>,
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
    expect((await setup().status()).repo).toEqual({ connected: true, repo: REPO, branch: 'main' })
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
    expect(Object.keys(files).sort()).toEqual(['CHANGELOG.md', 'releases/v4.0.0.json', 'tokens.json'])
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

describe('Settings › GitHub › Test Connection', () => {
  const form = { ...DEFAULT_INTEGRATIONS.github, repo: REPO, apiKey: TOKEN }
  it('names the account and confirms it can push', async () => {
    expect((await setup().test(form)).message).toBe(`Connected as designer · can push to ${REPO} (default branch main).`)
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
    await expect(t.open('https://evil.example/phish')).rejects.toThrow('That link isn’t on GitHub.')
    await expect(t.open('javascript:alert(1)')).rejects.toThrow()
  })
})
