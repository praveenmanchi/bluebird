import { describe, expect, it, vi } from 'vitest'
import { bitbucketCodeHost } from './bitbucket'
import type { CodeHostConfig, HostFetch } from './types'

const API = 'https://api.bitbucket.org/2.0'
const CONFIG: CodeHostConfig = { kind: 'bitbucket', api: API, web: 'https://bitbucket.org', token: 'ATATT-tok', email: 'maria@acme.com', repo: 'acme/design-tokens', branch: 'main', tokenPath: 'tokens.json' }
const SHA = 'a'.repeat(40)
const SHA2 = 'b'.repeat(40)

interface Call { method: string; url: string; headers: Record<string, string>; body?: string }
type Reply = { status: number; body?: unknown }

/** Answers by "METHOD path" (path after the API root, query included); unmatched calls are 404s. */
function fakeBitbucket(routes: Record<string, Reply | Reply[]>) {
  const calls: Call[] = []
  const fetch: HostFetch = vi.fn(async (url, init) => {
    calls.push({ method: init.method, url, headers: init.headers, body: init.body })
    const key = `${init.method} ${url.slice(API.length)}`
    const route = routes[key]
    const reply = Array.isArray(route) ? (route.length > 1 ? route.shift()! : route[0]!) : route
    const r = reply ?? { status: 404, body: { type: 'error', error: { message: `No route ${key}` } } }
    return { status: r.status, text: async () => (typeof r.body === 'string' ? r.body : r.body === undefined ? '' : JSON.stringify(r.body)) }
  })
  return { fetch, calls }
}
const host = (routes: Record<string, Reply | Reply[]>, config: Partial<CodeHostConfig> = {}) => {
  const fake = fakeBitbucket(routes)
  return { ...fake, bb: bitbucketCodeHost({ ...CONFIG, ...config }, fake.fetch, async () => {}) }
}
const formOf = (body = '') => Object.fromEntries(body.split('&').map((p) => p.split('=').map(decodeURIComponent) as [string, string]))

describe('bitbucketCodeHost', () => {
  it('signs in with the Atlassian email and API token, or a Bearer token when there is no email', async () => {
    const routes = { 'GET /repositories/acme/design-tokens/refs/branches/main': { status: 200, body: { target: { hash: SHA } } } }
    const basic = host(routes)
    await basic.bb.branchHead()
    expect(basic.calls[0]!.headers.Authorization).toBe(`Basic ${btoa('maria@acme.com:ATATT-tok')}`)
    const bearer = host(routes, { email: '' })
    await bearer.bb.branchHead()
    expect(bearer.calls[0]!.headers.Authorization).toBe('Bearer ATATT-tok')
  })

  it('says who the token is, the default branch and whether it can push', async () => {
    const { bb } = host({
      'GET /user': { status: 200, body: { username: 'maria-r', display_name: 'Maria Rossi' } },
      'GET /repositories/acme/design-tokens': { status: 200, body: { mainbranch: { name: 'develop' } } },
      [`GET /user/permissions/repositories?q=${encodeURIComponent('repository.full_name="acme/design-tokens"')}`]: { status: 200, body: { values: [{ permission: 'write' }] } },
    })
    expect(await bb.whoAmI()).toEqual({ login: 'maria-r', canPush: true, defaultBranch: 'develop' })
  })

  it('reads as “can’t push” when the permissions call is refused', async () => {
    const { bb } = host({
      'GET /user': { status: 200, body: { display_name: 'Maria Rossi' } },
      'GET /repositories/acme/design-tokens': { status: 200, body: {} },
    })
    expect(await bb.whoAmI()).toEqual({ login: 'Maria Rossi', canPush: false, defaultBranch: 'main' })
  })

  it('lists branches and reads files, null when missing', async () => {
    const { bb } = host({
      'GET /repositories/acme/design-tokens/refs/branches?pagelen=100&sort=-target.date': { status: 200, body: { values: [{ name: 'main' }, { name: 'release/1.2' }] } },
      'GET /repositories/acme/design-tokens/src/main/tokens.json': { status: 200, body: '{"a":1}' },
    })
    expect(await bb.listBranches()).toEqual(['main', 'release/1.2'])
    expect(await bb.readFile('tokens.json')).toBe('{"a":1}')
    expect(await bb.readFile('missing.json')).toBeNull()
  })

  it('reads a branch with a slash at its head commit (src/{ref} can’t tell it from a path)', async () => {
    const { bb, calls } = host({
      'GET /repositories/acme/design-tokens/refs/branches/release/1.2': { status: 200, body: { target: { hash: SHA } } },
      [`GET /repositories/acme/design-tokens/src/${SHA}/CHANGELOG.md`]: { status: 200, body: '# Changes' },
    })
    expect(await bb.readFile('CHANGELOG.md', 'release/1.2')).toBe('# Changes')
    expect(calls.map((c) => c.url.slice(API.length))).toEqual(['/repositories/acme/design-tokens/refs/branches/release/1.2', `/repositories/acme/design-tokens/src/${SHA}/CHANGELOG.md`])
  })

  it('reads a file with the branch head as its version, and writes it back on that parent', async () => {
    const { bb, calls } = host({
      'GET /repositories/acme/design-tokens/refs/branches/main': { status: 200, body: { target: { hash: SHA } } },
      [`GET /repositories/acme/design-tokens/src/${SHA}/.bluebird/history/2026-11-27.json`]: { status: 200, body: '[]' },
      'POST /repositories/acme/design-tokens/src': { status: 201 },
    })
    const file = await bb.readFileWithSha('.bluebird/history/2026-11-27.json', 'main')
    expect(file).toEqual({ text: '[]', sha: SHA })
    await bb.putFile('.bluebird/history/2026-11-27.json', '[{"id":1}]', 'chore(history): add', 'main', file!.sha)
    const post = calls.at(-1)!
    expect(post.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(formOf(post.body)).toEqual({ message: 'chore(history): add', branch: 'main', parents: SHA, '.bluebird/history/2026-11-27.json': '[{"id":1}]' })
  })

  it('treats a branch that moved on as a refusal, so History reads again and retries', async () => {
    const { bb } = host({ 'POST /repositories/acme/design-tokens/src': { status: 409, body: { type: 'error', error: { message: 'Branch main has moved on' } } } })
    await expect(bb.putFile('a.json', '{}', 'x', 'main', SHA)).rejects.toMatchObject({ kind: 'rejected', status: 409 })
  })

  it('lists a folder’s files, [] when the folder doesn’t exist', async () => {
    const { bb } = host({
      'GET /repositories/acme/design-tokens/src/main/.bluebird/history/?pagelen=100': { status: 200, body: { values: [{ type: 'commit_file', path: '.bluebird/history/2026-11-27.json', size: 812 }, { type: 'commit_directory', path: '.bluebird/history/old' }] } },
    })
    expect(await bb.listFolder('.bluebird/history', 'main')).toEqual([{ name: '2026-11-27.json', sha: '812' }])
    expect(await bb.listFolder('nope', 'main')).toEqual([])
  })

  it('commits every file onto a new branch in one call, and reads the new commit back', async () => {
    const { bb, calls } = host({
      'GET /repositories/acme/design-tokens/refs/branches/release/1.2.0': [{ status: 404, body: { type: 'error', error: { message: 'not found' } } }, { status: 200, body: { target: { hash: SHA2 } } }],
      'POST /repositories/acme/design-tokens/src': { status: 201 },
    })
    const made = await bb.commitFiles({ parent: SHA, message: 'release 1.2.0', files: [{ path: 'tokens.json', content: '{}' }, { path: 'CHANGELOG.md', content: '# 1.2.0' }], branch: 'release/1.2.0', create: true })
    expect(made).toEqual({ sha: SHA2, url: `https://bitbucket.org/acme/design-tokens/commits/${SHA2}`, branch: 'release/1.2.0' })
    expect(formOf(calls.find((c) => c.method === 'POST')!.body)).toEqual({ message: 'release 1.2.0', branch: 'release/1.2.0', parents: SHA, 'tokens.json': '{}', 'CHANGELOG.md': '# 1.2.0' })
  })

  it('refuses a new branch that exists, or uses the fallback name', async () => {
    const exists = { status: 200, body: { target: { hash: SHA } } }
    const { bb } = host({ 'GET /repositories/acme/design-tokens/refs/branches/release/1.2.0': exists })
    await expect(bb.commitFiles({ parent: SHA, message: 'm', files: [], branch: 'release/1.2.0', create: true })).rejects.toMatchObject({ kind: 'exists' })
    const fallback = host({
      'GET /repositories/acme/design-tokens/refs/branches/release/1.2.0': exists,
      'GET /repositories/acme/design-tokens/refs/branches/release/1.2.0-x1': { status: 200, body: { target: { hash: SHA2 } } },
      'POST /repositories/acme/design-tokens/src': { status: 201 },
    })
    expect((await fallback.bb.commitFiles({ parent: SHA, message: 'm', files: [], branch: 'release/1.2.0', create: true, fallbackBranch: 'release/1.2.0-x1' })).branch).toBe('release/1.2.0-x1')
  })

  it('maps a branch restriction to a refusal when moving a branch', async () => {
    const { bb } = host({ 'POST /repositories/acme/design-tokens/src': { status: 403, body: { type: 'error', error: { message: 'You do not have permission to push to main (branch restriction)' } } } })
    await expect(bb.commitFiles({ parent: SHA, message: 'm', files: [{ path: 'a', content: 'b' }], branch: 'main', create: false })).rejects.toMatchObject({ kind: 'rejected' })
  })

  it('opens and finds pull requests, and lists recent ones into a branch', async () => {
    const pr = { id: 7, title: '1.2.0 — Colours', state: 'OPEN', links: { html: { href: 'https://bitbucket.org/acme/design-tokens/pull-requests/7' } }, source: { branch: { name: 'release/1.2.0' }, repository: { full_name: 'acme/design-tokens' } } }
    const states = '&state=OPEN&state=MERGED&state=DECLINED&state=SUPERSEDED&sort=-created_on'
    const { bb, calls } = host({
      'POST /repositories/acme/design-tokens/pullrequests': { status: 201, body: pr },
      [`GET /repositories/acme/design-tokens/pullrequests?q=${encodeURIComponent('source.branch.name="release/1.2.0"')}${states}&pagelen=1`]: { status: 200, body: { values: [{ ...pr, state: 'MERGED' }] } },
      [`GET /repositories/acme/design-tokens/pullrequests?q=${encodeURIComponent('destination.branch.name="main"')}${states}&pagelen=50`]: { status: 200, body: { values: [pr] } },
    })
    expect(await bb.openPull('release/1.2.0', 'main', '1.2.0 — Colours', 'notes')).toEqual({ number: 7, url: pr.links.html.href })
    expect(JSON.parse(calls[0]!.body!)).toEqual({ title: '1.2.0 — Colours', description: 'notes', source: { branch: { name: 'release/1.2.0' } }, destination: { branch: { name: 'main' } } })
    expect(await bb.findPull('release/1.2.0')).toEqual({ number: 7, url: pr.links.html.href, title: '1.2.0 — Colours', state: 'merged' })
    expect(await bb.recentPulls('main')).toEqual([{ number: 7, url: pr.links.html.href, title: '1.2.0 — Colours', state: 'open', head: 'release/1.2.0', headRepo: 'acme/design-tokens' }])
  })

  it('escapes quotes in branch names inside the query', async () => {
    const { bb, calls } = host({})
    await bb.findPull('weird"name').catch(() => null)
    expect(decodeURIComponent(calls[0]!.url)).toContain('source.branch.name="weird\\"name"')
  })

  it('says when a pull request is already open', async () => {
    const { bb } = host({ 'POST /repositories/acme/design-tokens/pullrequests': { status: 400, body: { type: 'error', error: { message: 'There is already an open pull request from release/1.2.0 to main' } } } })
    await expect(bb.openPull('release/1.2.0', 'main', 't', 'b')).rejects.toMatchObject({ kind: 'exists' })
  })

  it('reads commit statuses as runs, in GitHub Actions’ shape', async () => {
    const { bb } = host({
      [`GET /repositories/acme/design-tokens/commit/${SHA}/statuses?pagelen=5&sort=-created_on`]: { status: 200, body: { values: [{ state: 'SUCCESSFUL', name: 'Pipeline #12', url: 'https://bitbucket.org/acme/design-tokens/pipelines/12' }, { state: 'INPROGRESS', key: 'lint' }] } },
    })
    expect(await bb.runsFor(SHA)).toEqual([
      { status: 'completed', conclusion: 'success', html_url: 'https://bitbucket.org/acme/design-tokens/pipelines/12', name: 'Pipeline #12', run_number: 0 },
      { status: 'in_progress', conclusion: null, html_url: '', name: 'lint', run_number: 0 },
    ])
  })

  it('tags a commit', async () => {
    const { bb, calls } = host({ 'POST /repositories/acme/design-tokens/refs/tags': { status: 201, body: {} } })
    await bb.createTag('1.2.0', SHA)
    expect(JSON.parse(calls[0]!.body!)).toEqual({ name: '1.2.0', target: { hash: SHA } })
  })

  it('turns Bitbucket’s errors into readable messages that name the place to fix them', async () => {
    await expect(host({ 'GET /repositories/acme/design-tokens/refs/branches/main': { status: 401 } }).bb.branchHead()).rejects.toMatchObject({ kind: 'auth', message: expect.stringContaining('Atlassian email and API token') })
    await expect(host({}).bb.branchHead()).rejects.toMatchObject({ kind: 'not-found', message: expect.stringContaining('workspace/repo') })
    await expect(host({ 'GET /repositories/acme/design-tokens/refs/branches/main': { status: 403, body: { type: 'error', error: { message: 'Forbidden' } } } }).bb.branchHead()).rejects.toMatchObject({ kind: 'access' })
  })

  it('retries a 5xx before giving up', async () => {
    const { bb, calls } = host({ 'GET /repositories/acme/design-tokens/refs/branches/main': [{ status: 503 }, { status: 200, body: { target: { hash: SHA } } }] })
    expect(await bb.branchHead()).toBe(SHA)
    expect(calls).toHaveLength(2)
  })

  it('links files to Bitbucket’s source view', () => {
    expect(host({}).bb.fileUrl('.bluebird/history/CHANGELOG.md', 'main')).toBe('https://bitbucket.org/acme/design-tokens/src/main/.bluebird/history/CHANGELOG.md')
  })
})
