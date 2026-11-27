// Bitbucket Cloud behind the CodeHost interface (api.bitbucket.org/2.0). Runs in the Figma sandbox:
// no URL, URLSearchParams, btoa or TextEncoder, so query strings and form bodies are built by hand.
// Bitbucket answers plugin requests directly (CORS: any origin, Authorization allowed), so no relay.
//
// How it differs from GitHub, and what that means here:
// - A commit is made straight onto a branch (POST /src, a form with one field per file), not as a
//   loose commit a ref is pointed at later. commitFiles does both steps in one call.
// - POST /src answers 201 with an empty body, so the new commit's hash is read back from the branch.
// - There's no per-file sha: readFileWithSha returns the branch's head commit, and putFile sends it as
//   `parents`, so a write onto a branch that moved on since is refused (409 → kind 'rejected').
// - Auth: an Atlassian API token with the person's Atlassian email (Basic), or a Bearer token
//   (sign-in, or a repository / workspace access token) when no email is set.
// - Bitbucket Data Center is a different API; createCodeHost refuses it with a clear message.
import { base64 } from '@shared/github/base64'
import { GithubError, RETRY_ATTEMPTS, RETRY_BASE_MS, type GithubErrorKind, type PullSummary, type WorkflowRun } from '@shared/github/client'
import type { CodeHost, CodeHostConfig, HostFetch } from './types'

/** Bitbucket's largest page for pull requests. */
export const BITBUCKET_PAGE = 50
const HEX_SHA = /^[0-9a-f]{40}$/i

const isTransient = (status: number): boolean => status >= 500 || status === 429
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const enc = encodeURIComponent
const segments = (path: string) => path.split('/').filter(Boolean).map(enc).join('/')
/** A value inside Bitbucket's query language: double-quoted, with quotes and backslashes escaped. */
const quoted = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
const form = (fields: ReadonlyArray<readonly [string, string]>) => fields.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&')

function kindOf(status: number, message: string): GithubErrorKind {
  if (status === 401) return 'auth'
  if (status === 404) return 'not-found'
  if (/already exists|already an open pull request|already has an open pull request/i.test(message)) return 'exists'
  // A moved branch (parents no longer the tip) and branch restrictions are refusals, not errors.
  if (status === 409 || (status === 403 && /restrict|permission to push|merge check|branch permission/i.test(message))) return 'rejected'
  if (status === 403) return 'access'
  return 'other'
}

function sentence(kind: GithubErrorKind, repo: string, apiMessage: string): string {
  switch (kind) {
    case 'auth': return 'Bitbucket didn’t accept the token. Check the Atlassian email and API token in Settings › Code repository.'
    case 'access': return `The token can’t write to ${repo}. It needs Repositories and Pull requests write access.`
    case 'not-found': return `Bitbucket can’t find ${repo}, or the token can’t see it. Check the repository (workspace/repo) in Settings › Code repository.`
    case 'rejected': return `Bitbucket refused the update: ${apiMessage || 'the branch is protected or moved on'}.`
    case 'exists': return apiMessage || 'That already exists on Bitbucket.'
    default: return `Bitbucket answered ${apiMessage || 'with an error'}. Try again in a minute.`
  }
}

/** The message in Bitbucket's error body: { type: 'error', error: { message, detail } }. */
function apiMessageOf(text: string): string {
  try {
    const body = JSON.parse(text) as { error?: { message?: unknown; detail?: unknown } }
    const message = String(body.error?.message ?? '')
    const detail = typeof body.error?.detail === 'string' ? body.error.detail : ''
    return [message, detail].filter(Boolean).join(' ')
  } catch {
    return ''
  }
}

interface BbPull { id: number; title: string; state: string; links?: { html?: { href?: string } }; source?: { branch?: { name?: string }; repository?: { full_name?: string } | null } }
const pullState = (state: string): PullSummary['state'] => (state === 'MERGED' ? 'merged' : state === 'OPEN' ? 'open' : 'closed')

interface BbStatus { state: string; name?: string; key?: string; url?: string }
const CONCLUSION: Readonly<Record<string, string | null>> = { SUCCESSFUL: 'success', FAILED: 'failure', STOPPED: 'cancelled', INPROGRESS: null }

export function bitbucketCodeHost(config: CodeHostConfig, fetch: HostFetch, sleep: (ms: number) => Promise<void> = defaultSleep): CodeHost {
  const [workspace = '', slug = ''] = config.repo.split('/')
  const repoPath = `/repositories/${enc(workspace)}/${enc(slug)}`
  const authorization = config.email ? `Basic ${base64(`${config.email}:${config.token}`)}` : `Bearer ${config.token}`

  async function send(method: string, path: string, body?: { type: string; data: string }): Promise<{ status: number; text(): Promise<string> }> {
    let attempt = 0
    for (;;) {
      attempt += 1
      let res: { status: number; text(): Promise<string> } | null = null
      try {
        res = await fetch(`${config.api}${path}`, {
          method,
          headers: { Accept: 'application/json', Authorization: authorization, ...(body ? { 'Content-Type': body.type } : {}) },
          ...(body ? { body: body.data } : {}),
        })
      } catch {
        if (attempt >= RETRY_ATTEMPTS) throw new GithubError('Couldn’t reach Bitbucket. Check your connection.', 'network', 0)
      }
      if (res && !isTransient(res.status)) return res
      if (res && attempt >= RETRY_ATTEMPTS) return res
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1))
    }
  }

  async function call<T>(method: string, path: string, body?: { type: string; data: string }, raw = false): Promise<T> {
    const res = await send(method, path, body)
    const text = await res.text()
    if (res.status >= 200 && res.status < 300) return (raw ? text : text ? JSON.parse(text) : {}) as T
    const apiMessage = apiMessageOf(text)
    const kind = kindOf(res.status, apiMessage)
    const message = isTransient(res.status)
      ? `Bitbucket answered ${res.status}${apiMessage ? ` (${apiMessage})` : ''} ${RETRY_ATTEMPTS} times in a row. Try again in a minute.`
      : sentence(kind, config.repo, apiMessage)
    throw new GithubError(message, kind, res.status, apiMessage)
  }
  const json = (data: unknown) => ({ type: 'application/json', data: JSON.stringify(data) })
  const notFoundAs = async <T>(work: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await work()
    } catch (e) {
      if (e instanceof GithubError && e.kind === 'not-found') return fallback
      throw e
    }
  }

  async function branchHead(branch = config.branch): Promise<string> {
    return (await call<{ target: { hash: string } }>('GET', `${repoPath}/refs/branches/${segments(branch)}`)).target.hash
  }
  /** /src/{ref}/… can't tell a branch with a slash from a path, so such a branch is read at its head commit. */
  const refFor = async (ref: string): Promise<string> => (HEX_SHA.test(ref) || !ref.includes('/') ? enc(ref) : branchHead(ref))
  const branchExists = (branch: string) => notFoundAs(async () => { await branchHead(branch); return true }, false)

  async function postFiles(branch: string, message: string, files: ReadonlyArray<{ path: string; content: string }>, parent?: string): Promise<void> {
    const fields: Array<readonly [string, string]> = [['message', message], ['branch', branch], ...(parent ? [['parents', parent] as const] : [])]
    for (const f of files) fields.push([f.path, f.content])
    await call('POST', `${repoPath}/src`, { type: 'application/x-www-form-urlencoded', data: form(fields) })
  }

  const pulls = async (q: string, pagelen: number) =>
    (await call<{ values?: BbPull[] }>('GET', `${repoPath}/pullrequests?q=${enc(q)}&state=OPEN&state=MERGED&state=DECLINED&state=SUPERSEDED&sort=-created_on&pagelen=${pagelen}`)).values ?? []
  const summary = (pr: BbPull): PullSummary => ({ number: pr.id, url: pr.links?.html?.href ?? '', title: pr.title, state: pullState(pr.state) })

  return {
    kind: 'bitbucket', label: 'Bitbucket', ciName: 'Bitbucket Pipelines', config, fetch,
    async whoAmI() {
      const [user, repo] = await Promise.all([
        call<{ username?: string; nickname?: string; display_name?: string }>('GET', '/user'),
        call<{ mainbranch?: { name?: string } }>('GET', repoPath),
      ])
      // Write access comes from the user's repository permissions; a token without that scope just reads as "can't push".
      const perms = await call<{ values?: Array<{ permission?: string }> }>('GET', `/user/permissions/repositories?q=${enc(`repository.full_name=${quoted(config.repo)}`)}`).catch(() => ({ values: [] }))
      const permission = perms.values?.[0]?.permission ?? ''
      return { login: user.username || user.nickname || user.display_name || '', canPush: permission === 'write' || permission === 'admin', defaultBranch: repo.mainbranch?.name || 'main' }
    },
    async listBranches() {
      return ((await call<{ values?: Array<{ name: string }> }>('GET', `${repoPath}/refs/branches?pagelen=100&sort=-target.date`)).values ?? []).map((b) => b.name)
    },
    branchHead,
    readFile: (path, ref = config.branch) => notFoundAs(async () => call<string>('GET', `${repoPath}/src/${await refFor(ref)}/${segments(path)}`, undefined, true), null),
    async readFileWithSha(path, ref) {
      const head = await notFoundAs(() => branchHead(ref), '')
      if (!head) return null
      const text = await notFoundAs(() => call<string>('GET', `${repoPath}/src/${head}/${segments(path)}`, undefined, true), null)
      return text === null ? null : { text, sha: head }
    },
    putFile: (path, content, message, branch, sha) => postFiles(branch, message, [{ path, content }], sha),
    async listFolder(path, ref) {
      const listing = await notFoundAs(async () => call<{ values?: Array<{ type: string; path: string; size?: number; commit?: { hash?: string } }> }>('GET', `${repoPath}/src/${await refFor(ref)}/${segments(path)}/?pagelen=100`), { values: [] })
      // No blob sha here: the size changes whenever a day file gains or changes an entry, which is what the cache needs.
      return (listing.values ?? []).filter((v) => v.type === 'commit_file').map((v) => ({ name: v.path.split('/').pop() ?? v.path, sha: `${v.size ?? ''}` }))
    },
    async commitFiles({ parent, message, files, branch, create, fallbackBranch }) {
      let target = branch
      if (create && (await branchExists(branch))) {
        if (!fallbackBranch) throw new GithubError(`${branch} already exists on Bitbucket.`, 'exists', 400)
        target = fallbackBranch
      }
      await postFiles(target, message, files, parent)
      const sha = await branchHead(target)
      return { sha, url: `${config.web}/${config.repo}/commits/${sha}`, branch: target }
    },
    async createTag(name, sha) {
      await call('POST', `${repoPath}/refs/tags`, json({ name, target: { hash: sha } }))
    },
    async openPull(head, base, title, body) {
      const pr = await call<BbPull>('POST', `${repoPath}/pullrequests`, json({ title, description: body, source: { branch: { name: head } }, destination: { branch: { name: base } } }))
      return { number: pr.id, url: pr.links?.html?.href ?? '' }
    },
    async findPull(branch) {
      const [pr] = await pulls(`source.branch.name=${quoted(branch)}`, 1)
      return pr ? summary(pr) : null
    },
    async recentPulls(base) {
      return (await pulls(`destination.branch.name=${quoted(base)}`, BITBUCKET_PAGE)).map((pr) => ({ ...summary(pr), head: pr.source?.branch?.name ?? '', headRepo: pr.source?.repository?.full_name ?? '' }))
    },
    async runsFor(sha) {
      const statuses = (await call<{ values?: BbStatus[] }>('GET', `${repoPath}/commit/${enc(sha)}/statuses?pagelen=5&sort=-created_on`)).values ?? []
      return statuses.map((s): WorkflowRun => ({
        status: s.state === 'INPROGRESS' ? 'in_progress' : 'completed',
        conclusion: CONCLUSION[s.state] ?? null,
        html_url: s.url ?? '',
        name: s.name || s.key || 'Build',
        run_number: 0,
      }))
    },
    fileUrl: (path, branch) => `${config.web}/${config.repo}/src/${segments(branch)}/${segments(path)}`,
  }
}
