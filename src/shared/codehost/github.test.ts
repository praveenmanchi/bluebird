import { describe, expect, it, vi } from 'vitest'
import { githubCodeHost } from './github'
import type { CodeHostConfig, HostFetch } from './types'

const API = 'https://api.github.com'
const CONFIG: CodeHostConfig = { kind: 'github', api: API, web: 'https://github.com', email: '', token: 'ghp', repo: 'acme/tokens', branch: 'main', tokenPath: 'tokens.json' }

function fakeGithub(routes: Record<string, { status: number; body?: unknown }>) {
  const calls: string[] = []
  const fetch: HostFetch = vi.fn(async (url, init) => {
    const key = `${init.method} ${url.slice(API.length)}`
    calls.push(key)
    const r = routes[key] ?? { status: 404, body: { message: 'Not Found' } }
    return { status: r.status, text: async () => JSON.stringify(r.body ?? {}) }
  })
  return { calls, gh: githubCodeHost(CONFIG, fetch, async () => {}) }
}
const COMMIT = {
  'GET /repos/acme/tokens/git/commits/p1': { status: 200, body: { tree: { sha: 't0' } } },
  'POST /repos/acme/tokens/git/trees': { status: 201, body: { sha: 't1' } },
  'POST /repos/acme/tokens/git/commits': { status: 201, body: { sha: 'c1', html_url: 'https://github.com/acme/tokens/commit/c1' } },
}

describe('githubCodeHost.commitFiles', () => {
  it('makes the commit, then points a new branch at it: the same requests as before', async () => {
    const { gh, calls } = fakeGithub({ ...COMMIT, 'POST /repos/acme/tokens/git/refs': { status: 201 } })
    expect(await gh.commitFiles({ parent: 'p1', message: 'm', files: [{ path: 'a', content: 'b' }], branch: 'release/1', create: true })).toEqual({ sha: 'c1', url: 'https://github.com/acme/tokens/commit/c1', branch: 'release/1' })
    expect(calls).toEqual(['GET /repos/acme/tokens/git/commits/p1', 'POST /repos/acme/tokens/git/trees', 'POST /repos/acme/tokens/git/commits', 'POST /repos/acme/tokens/git/refs'])
  })

  it('fast-forwards an existing branch', async () => {
    const { gh, calls } = fakeGithub({ ...COMMIT, 'PATCH /repos/acme/tokens/git/refs/heads/main': { status: 200 } })
    await gh.commitFiles({ parent: 'p1', message: 'm', files: [], branch: 'main', create: false })
    expect(calls.at(-1)).toBe('PATCH /repos/acme/tokens/git/refs/heads/main')
  })

  it('uses the fallback name when the branch exists, without committing twice', async () => {
    let refs = 0
    const routes = { ...COMMIT }
    const fetch: HostFetch = vi.fn(async (url, init) => {
      const key = `${init.method} ${url.slice(API.length)}`
      if (key === 'POST /repos/acme/tokens/git/refs') {
        refs += 1
        return refs === 1 ? { status: 422, text: async () => '{"message":"Reference already exists"}' } : { status: 201, text: async () => '{}' }
      }
      const r = (routes as Record<string, { status: number; body?: unknown }>)[key]!
      return { status: r.status, text: async () => JSON.stringify(r.body ?? {}) }
    })
    const gh = githubCodeHost(CONFIG, fetch, async () => {})
    expect((await gh.commitFiles({ parent: 'p1', message: 'm', files: [], branch: 'release/1', create: true, fallbackBranch: 'release/1-x' })).branch).toBe('release/1-x')
    const urls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([url]) => String(url))
    expect(urls.filter((u) => u.endsWith('/git/commits'))).toHaveLength(1)
    expect(refs).toBe(2)
  })

  it('links files on the host it talks to', () => {
    expect(fakeGithub({}).gh.fileUrl('.bluebird/history/CHANGELOG.md', 'main')).toBe('https://github.com/acme/tokens/blob/main/.bluebird/history/CHANGELOG.md')
  })
})
