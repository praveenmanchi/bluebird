// GitHub REST transport for the Publish tab. Turns Settings › GitHub into an
// API base + token and wraps the handful of calls a release needs. Runs in the
// Figma sandbox (no URL, btoa or TextEncoder there): bodies are JSON strings and
// files are sent as tree `content`, so nothing needs base64.
import { githubHost, validateIntegration, type IntegrationValues } from '@shared/integrations'
import { base64, decodeBase64 } from './base64'

export type GithubFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ status: number; text(): Promise<string> }>

export interface GithubConfig {
  /** REST root without trailing slash: https://api.github.com, api.<tenant>.ghe.com, or <baseUrl>/api/v3 for GitHub Enterprise Server. */
  api: string
  token: string
  /** owner/repository */
  repo: string
  branch: string
  /** Where the token JSON goes; a path without an extension is a folder. */
  tokenPath: string
}

export type GithubProblem = { reason: 'incomplete' | 'invalid'; fields: string[] }

/** The connection Settings › GitHub describes, or why there is none. */
export function configFromSettings(s: IntegrationValues<'github'>): GithubConfig | GithubProblem {
  const missing = [...(s.repo.trim() ? [] : ['Repository']), ...(s.apiKey.trim() ? [] : ['Access token'])]
  if (missing.length) return { reason: 'incomplete', fields: missing }
  // Stored values are re-checked: the token is only ever sent to a host these rules allow.
  const invalid = Object.keys(validateIntegration('github', s))
  if (invalid.length) return { reason: 'invalid', fields: invalid }
  return {
    api: githubHost(s.baseUrl).api,
    token: s.apiKey.trim(),
    repo: s.repo.trim(),
    branch: s.branch.trim() || 'main',
    tokenPath: s.tokenPath.trim() || 'tokens.json',
  }
}

export const isProblem = (c: GithubConfig | GithubProblem): c is GithubProblem => 'reason' in c

export type GithubErrorKind = 'auth' | 'access' | 'not-found' | 'rejected' | 'exists' | 'network' | 'other'

export class GithubError extends Error {
  constructor(message: string, readonly kind: GithubErrorKind, readonly status: number, readonly detail = '') {
    super(message)
    this.name = 'GithubError'
  }
}

function kindOf(status: number, body: string): GithubErrorKind {
  if (status === 401) return 'auth'
  if (status === 404) return 'not-found'
  if (status === 422 && /already exists/i.test(body)) return 'exists'
  // Protected-branch and non-fast-forward refusals come back as 403, 409 or 422.
  if (status === 409 || status === 422 || (status === 403 && /protected|review|status check/i.test(body))) return 'rejected'
  if (status === 403) return 'access'
  return 'other'
}

function sentence(kind: GithubErrorKind, repo: string, apiMessage: string): string {
  switch (kind) {
    case 'auth': return 'GitHub didn’t accept the access token. Create a new one and paste it in Settings › GitHub.'
    case 'access': return `The access token can’t write to ${repo}. It needs Contents and Pull requests write access (or the repo scope).`
    case 'not-found': return `GitHub can’t find ${repo}, or the token can’t see it. Check the repository in Settings › GitHub.`
    case 'rejected': return `GitHub refused the update: ${apiMessage || 'the branch is protected'}.`
    case 'exists': return apiMessage || 'That already exists on GitHub.'
    default: return `GitHub answered ${apiMessage || 'with an error'}. Try again in a minute.`
  }
}

export interface CommitFile { path: string; content: string }
export interface PullSummary { number: number; url: string; title: string; state: 'open' | 'merged' | 'closed' }
export interface WorkflowRun { status: string; conclusion: string | null; html_url: string; name: string; run_number: number }

/**
 * Transient failures are retried before they reach the designer (Tokens Studio's
 * storage providers do the same around every GitHub call): a dropped connection,
 * a 5xx from GitHub, or a 429 / secondary rate limit. Everything else fails at once.
 */
/** How many pull requests `recentPulls` reads: GitHub's largest page. */
export const RECENT_PULLS = 100
export const RETRY_ATTEMPTS = 3
export const RETRY_BASE_MS = 400
const isTransient = (status: number): boolean => status >= 500 || status === 429

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createGithubClient(config: GithubConfig, fetch: GithubFetch, sleep: (ms: number) => Promise<void> = defaultSleep) {
  const repoPath = `/repos/${config.repo.split('/').map(encodeURIComponent).join('/')}`
  const host = config.api.replace(/^https?:\/\//, '').split('/')[0]

  async function send(method: string, path: string, body: unknown, accept: string): Promise<{ status: number; text(): Promise<string> }> {
    let attempt = 0
    for (;;) {
      attempt += 1
      let res: { status: number; text(): Promise<string> } | null = null
      try {
        res = await fetch(`${config.api}${path}`, {
          method,
          headers: {
            Accept: accept,
            Authorization: `Bearer ${config.token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        })
      } catch {
        if (attempt >= RETRY_ATTEMPTS) throw new GithubError(`Couldn’t reach ${host}. Check your connection; GitHub Enterprise hosts also need adding to the plugin’s network access.`, 'network', 0)
      }
      if (res && !isTransient(res.status)) return res
      if (res && attempt >= RETRY_ATTEMPTS) return res
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1))
    }
  }

  async function call<T>(method: string, path: string, body?: unknown, accept = 'application/vnd.github+json'): Promise<T> {
    const res = await send(method, path, body, accept)
    const text = await res.text()
    if (res.status >= 200 && res.status < 300) {
      if (accept.includes('raw')) return text as T
      return (text ? JSON.parse(text) : {}) as T
    }
    let apiMessage = ''
    try { apiMessage = String((JSON.parse(text) as { message?: unknown }).message ?? '') } catch { apiMessage = '' }
    const kind = kindOf(res.status, text)
    const message = isTransient(res.status)
      ? `GitHub answered ${res.status}${apiMessage ? ` (${apiMessage})` : ''} ${RETRY_ATTEMPTS} times in a row. Try again in a minute.`
      : sentence(kind, config.repo, apiMessage)
    throw new GithubError(message, kind, res.status, apiMessage)
  }

  const branchRef = (branch: string) => `/git/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`

  return {
    config,
    /** The sandbox's fetch, for the Teams post that rides along with a release. */
    fetch,
    /** Settings › Test Connection: who the token is and whether it can push. */
    async whoAmI(): Promise<{ login: string; canPush: boolean; defaultBranch: string }> {
      const [user, repo] = await Promise.all([
        call<{ login: string }>('GET', '/user'),
        call<{ permissions?: { push?: boolean }; default_branch: string }>('GET', repoPath),
      ])
      return { login: user.login, canPush: repo.permissions?.push === true, defaultBranch: repo.default_branch }
    },
    /** Branch names, up to 100 (one page). An empty repository answers with none. */
    async listBranches(): Promise<string[]> {
      return (await call<Array<{ name: string }>>('GET', `${repoPath}/branches?per_page=100`)).map((b) => b.name)
    },
    /**
     * Create one file through the Contents API. Unlike the Git Data calls this works on an
     * empty repository, where it makes the first commit and with it the branch.
     */
    async putFile(path: string, content: string, message: string, branch: string, sha?: string): Promise<void> {
      await call('PUT', `${repoPath}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, { message, content: base64(content), branch, ...(sha ? { sha } : {}) })
    },
    /** A file's text and blob sha (needed to update it), or null when it doesn't exist. */
    async readFileWithSha(path: string, ref: string): Promise<{ text: string; sha: string } | null> {
      try {
        const file = await call<{ content?: string; sha: string }>('GET', `${repoPath}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`)
        return { text: decodeBase64(file.content ?? ''), sha: file.sha }
      } catch (e) {
        if (e instanceof GithubError && e.kind === 'not-found') return null
        throw e
      }
    },
    /** Files in a folder (one level) with their blob sha, or [] when the folder doesn't exist. */
    async listFolder(path: string, ref: string): Promise<Array<{ name: string; sha: string }>> {
      try {
        const items = await call<Array<{ name: string; type: string; sha?: string }>>('GET', `${repoPath}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`)
        return Array.isArray(items) ? items.filter((i) => i.type === 'file').map((i) => ({ name: i.name, sha: i.sha ?? '' })) : []
      } catch (e) {
        if (e instanceof GithubError && e.kind === 'not-found') return []
        throw e
      }
    },
    async branchHead(branch = config.branch): Promise<string> {
      return (await call<{ object: { sha: string } }>('GET', `${repoPath}${branchRef(branch)}`)).object.sha
    },
    /** A file's text on a branch, or null when it doesn't exist yet. */
    async readFile(path: string, ref = config.branch): Promise<string | null> {
      try {
        return await call<string>('GET', `${repoPath}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, undefined, 'application/vnd.github.raw+json')
      } catch (e) {
        if (e instanceof GithubError && e.kind === 'not-found') return null
        throw e
      }
    },
    /** One commit with every file, on top of `parent` (not yet on any branch). */
    async commit(parent: string, message: string, files: readonly CommitFile[]): Promise<{ sha: string; url: string }> {
      const base = await call<{ tree: { sha: string } }>('GET', `${repoPath}/git/commits/${parent}`)
      const tree = await call<{ sha: string }>('POST', `${repoPath}/git/trees`, {
        base_tree: base.tree.sha,
        tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
      })
      const made = await call<{ sha: string; html_url: string }>('POST', `${repoPath}/git/commits`, { message, tree: tree.sha, parents: [parent] })
      return { sha: made.sha, url: made.html_url }
    },
    /** Fast-forward a branch; a protected branch or a moved head is refused (GithubError 'rejected'). */
    async moveBranch(branch: string, sha: string): Promise<void> {
      await call('PATCH', `${repoPath}/git/refs/heads/${branch.split('/').map(encodeURIComponent).join('/')}`, { sha, force: false })
    },
    async createRef(ref: string, sha: string): Promise<void> {
      await call('POST', `${repoPath}/git/refs`, { ref, sha })
    },
    async openPull(head: string, base: string, title: string, body: string): Promise<{ number: number; url: string }> {
      const pr = await call<{ number: number; html_url: string }>('POST', `${repoPath}/pulls`, { title, head, base, body })
      return { number: pr.number, url: pr.html_url }
    },
    /** The newest pull request from `branch` in this repository, open or not; null when there is none yet. */
    async findPull(branch: string): Promise<PullSummary | null> {
      const owner = config.repo.split('/')[0] ?? ''
      const head = encodeURIComponent(`${owner}:${branch}`)
      const list = await call<Array<{ number: number; html_url: string; title: string; state: string; merged_at: string | null }>>('GET', `${repoPath}/pulls?head=${head}&state=all&per_page=1`)
      const pr = Array.isArray(list) ? list[0] : undefined
      if (!pr) return null
      return { number: pr.number, url: pr.html_url, title: pr.title, state: pr.merged_at ? 'merged' : pr.state === 'open' ? 'open' : 'closed' }
    },
    /** The 100 newest pull requests into `base`, open or not, with the branch each comes from. */
    async recentPulls(base: string): Promise<Array<PullSummary & { head: string; headRepo: string }>> {
      const list = await call<Array<{ number: number; html_url: string; title: string; state: string; merged_at: string | null; head?: { ref?: string; repo?: { full_name?: string } | null } }>>('GET', `${repoPath}/pulls?base=${encodeURIComponent(base)}&state=all&sort=created&direction=desc&per_page=${RECENT_PULLS}`)
      return (Array.isArray(list) ? list : []).map((pr) => ({
        number: pr.number, url: pr.html_url, title: pr.title, head: pr.head?.ref ?? '', headRepo: pr.head?.repo?.full_name ?? '',
        state: pr.merged_at ? 'merged' as const : pr.state === 'open' ? 'open' as const : 'closed' as const,
      }))
    },
    async runsFor(sha: string): Promise<WorkflowRun[]> {
      return (await call<{ workflow_runs?: WorkflowRun[] }>('GET', `${repoPath}/actions/runs?head_sha=${sha}&per_page=5`)).workflow_runs ?? []
    },
  }
}

export type GithubClient = ReturnType<typeof createGithubClient>
