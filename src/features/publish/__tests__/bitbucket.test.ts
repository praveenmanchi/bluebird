// Publish on Bitbucket Cloud: the same release flow as GitHub, through the Bitbucket adapter
// (@shared/codehost/bitbucket) against a small stateful fake of api.bitbucket.org.
import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import { BASELINE, CURRENT } from '../fixtures'
import { MSG, type ExtractResult, type PublishRequest, type PublishResult } from '../messages'
import { createPublishHandlers, type DocumentData } from '../sandbox/publish-handlers'
import type { GithubFetch } from '../github/client'

const API = 'https://api.bitbucket.org/2.0'
const REPO_PATH = '/repositories/acme/ds-site'

interface Posted { branch: string; parents: string; message: string; files: Record<string, string> }

function fakeBitbucket(opts: { restricted?: boolean; statuses?: Array<{ state: string; name: string; url: string }> } = {}) {
  let commits = 0
  const branches = new Map<string, string>([['main', 'c'.repeat(40)]])
  const posted: Posted[] = []
  const pulls: Array<{ title: string; source: string; destination: string }> = []
  const json = (status: number, body?: unknown) => ({ status, text: async () => (body === undefined ? '' : JSON.stringify(body)) })
  const fetch: GithubFetch = async (url, init) => {
    const path = url.slice(API.length)
    const branch = /^\/repositories\/acme\/ds-site\/refs\/branches\/(.+)$/.exec(path)
    if (init.method === 'GET' && branch) {
      const hash = branches.get(decodeURIComponent(branch[1]!))
      return hash ? json(200, { target: { hash } }) : json(404, { type: 'error', error: { message: 'Branch not found' } })
    }
    if (init.method === 'GET' && path.startsWith(`${REPO_PATH}/src/`)) return json(404, { type: 'error', error: { message: 'No such file' } })
    if (init.method === 'POST' && path === `${REPO_PATH}/src`) {
      const fields = Object.fromEntries((init.body ?? '').split('&').map((p) => p.split('=').map(decodeURIComponent) as [string, string]))
      const { branch: target = '', parents = '', message = '', ...files } = fields
      if (opts.restricted && target === 'main') return json(403, { type: 'error', error: { message: 'You do not have permission to push to main (branch restriction)' } })
      posted.push({ branch: target, parents, message, files })
      commits += 1
      branches.set(target, String(commits).padStart(40, '0'))
      return json(201)
    }
    if (init.method === 'POST' && path === `${REPO_PATH}/pullrequests`) {
      const body = JSON.parse(init.body ?? '{}') as { title: string; source: { branch: { name: string } }; destination: { branch: { name: string } } }
      pulls.push({ title: body.title, source: body.source.branch.name, destination: body.destination.branch.name })
      return json(201, { id: 7, title: body.title, state: 'OPEN', links: { html: { href: 'https://bitbucket.org/acme/ds-site/pull-requests/7' } } })
    }
    if (init.method === 'POST' && path === `${REPO_PATH}/refs/tags`) return json(201, {})
    if (init.method === 'GET' && /\/commit\/[0-9a-f]+\/statuses/.test(path)) return json(200, { values: opts.statuses ?? [] })
    return json(404, { type: 'error', error: { message: `Unexpected ${init.method} ${path}` } })
  }
  return { fetch, posted, pulls, branches }
}

function setup(bb = fakeBitbucket()) {
  const raw = new Map<string, string>()
  const data: DocumentData = { get: (k) => raw.get(k) ?? '', set: (k, v) => { if (v) raw.set(k, v); else raw.delete(k) } }
  let current = BASELINE
  let clock = Date.parse('2026-11-27T16:05:00.000Z')
  const ctx = { emit: () => undefined } as unknown as HandlerContext
  const handlers = createPublishHandlers({
    readSnapshot: async () => current,
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, host: 'bitbucket', email: 'maria@acme.com', repo: 'acme/ds-site', apiKey: 'ATATT-tok' }),
    readNotifications: async () => DEFAULT_INTEGRATIONS.notifications,
    data,
    fetch: bb.fetch,
    sleep: async (ms) => { clock += ms },
    openExternal: () => undefined,
    now: () => new Date(clock),
  })
  const call = (type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<unknown>)(payload, ctx)
  return {
    bb,
    setSnapshot: (s: typeof CURRENT) => { current = s },
    extract: () => call(MSG.extract) as Promise<ExtractResult>,
    publish: (r: PublishRequest) => call(MSG.publish, r) as Promise<PublishResult>,
  }
}

const request = (x: ExtractResult, options: Partial<PublishRequest['options']> = {}): PublishRequest => ({
  extractId: x.extractId, version: 'v3.0.0', title: 'First release',
  include: x.changes.map((c) => c.id),
  notes: x.changes.map((c) => ({ changeId: c.id, text: `Note for ${c.name}` })),
  options: { openPr: true, postToTeams: false, tag: false, ...options },
})

describe('publishing to Bitbucket', () => {
  it('commits the release on a release branch in one call and opens a pull request', async () => {
    const t = setup()
    const res = await t.publish(request(await t.extract()))
    expect(res).toMatchObject({ outcome: 'pr-opened', link: 'https://bitbucket.org/acme/ds-site/pull-requests/7', linkLabel: 'Open pull request' })
    expect(t.bb.posted).toHaveLength(1)
    const [commit] = t.bb.posted
    expect(commit).toMatchObject({ branch: 'release/v3.0.0', parents: 'c'.repeat(40) })
    expect(Object.keys(commit!.files)).toEqual(expect.arrayContaining(['tokens.json', 'CHANGELOG.md']))
    expect(t.bb.pulls).toEqual([{ title: 'v3.0.0 — First release', source: 'release/v3.0.0', destination: 'main' }])
  })

  it('pushes straight to the branch and follows Bitbucket Pipelines', async () => {
    const t = setup(fakeBitbucket({ statuses: [{ state: 'SUCCESSFUL', name: 'Pipeline #12', url: 'https://bitbucket.org/acme/ds-site/pipelines/12' }] }))
    const res = await t.publish(request(await t.extract(), { openPr: false }))
    expect(res).toMatchObject({ outcome: 'pushed', link: 'https://bitbucket.org/acme/ds-site/pipelines/12' })
    expect(res.message).toContain('Bitbucket Pipelines run passed')
    expect(t.bb.posted[0]).toMatchObject({ branch: 'main', parents: 'c'.repeat(40) })
  })

  it('reports a branch restriction as a refused push, and records nothing', async () => {
    const t = setup(fakeBitbucket({ restricted: true }))
    const res = await t.publish(request(await t.extract(), { openPr: false }))
    expect(res).toMatchObject({ outcome: 'push-rejected', headline: 'Push to main was rejected' })
    expect(res.message).toContain('Bitbucket refused the update')
  })
})
