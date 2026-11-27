// Settings › Code repository (or Storage, or an MCP scenario) → a CodeHost for GitHub or Bitbucket.
import { bitbucketHost, githubHost, type IntegrationValues, type McpTarget } from '@shared/integrations'
import { GithubError, configFromSettings, isProblem, type GithubProblem } from '@shared/github/client'
import { bitbucketCodeHost } from './bitbucket'
import { githubCodeHost } from './github'
import type { CodeHost, CodeHostConfig, HostFetch } from './types'

export type { CodeHost, CodeHostConfig, CommitInput, HostFetch, CommitFile, PullSummary, WorkflowRun } from './types'
export { GithubError as CodeHostError, isProblem } from '@shared/github/client'
export type { GithubProblem as CodeHostProblem } from '@shared/github/client'

const BITBUCKET_CLOUD_API = 'https://api.bitbucket.org/2.0'
export const DATA_CENTER_UNSUPPORTED = 'Bluebird works with Bitbucket Cloud for now. Bitbucket Data Center support (through your company gateway) is coming; until then use bitbucket.org or GitHub.'

/** The connection a Code repository section describes, or why there is none. Repository and token rules are the same for both hosts. */
export function codeHostConfig(s: IntegrationValues<'github'>): CodeHostConfig | GithubProblem {
  const base = configFromSettings(s)
  if (isProblem(base)) return base
  if (s.host === 'bitbucket') {
    const host = bitbucketHost(s.baseUrl)
    // A sign-in token is a Bearer token: an email left over from token mode would turn it into Basic auth.
    return { ...base, kind: 'bitbucket', api: host.api, web: host.web, email: s.method === 'signin' ? '' : (s.email ?? '').trim() }
  }
  return { ...base, kind: 'github', web: githubHost(s.baseUrl).web, email: '' }
}

/**
 * One MCP scenario's repository. The shared self-hosted address is a GitHub Enterprise host; a
 * Bitbucket scenario is always Bitbucket Cloud until Data Center is supported.
 */
export function mcpCodeHostConfig(target: McpTarget, enterpriseUrl: string): CodeHostConfig {
  const common = { token: target.token, repo: target.repo, branch: target.branch, tokenPath: '' }
  if (target.host === 'bitbucket') return { ...common, kind: 'bitbucket', api: BITBUCKET_CLOUD_API, web: 'https://bitbucket.org', email: target.email }
  const host = githubHost(enterpriseUrl)
  return { ...common, kind: 'github', api: host.api, web: host.web, email: '' }
}

/** A host that answers every call with why it can't be used. */
function refusing(config: CodeHostConfig, fetch: HostFetch, message: string): CodeHost {
  const no = () => Promise.reject(new GithubError(message, 'other', 0))
  return {
    kind: config.kind, label: 'Bitbucket', ciName: 'Bitbucket Pipelines', config, fetch,
    whoAmI: no, listBranches: no, branchHead: no, readFile: no, readFileWithSha: no, putFile: no, listFolder: no,
    commitFiles: no, createTag: no, openPull: no, findPull: no, recentPulls: no, runsFor: no,
    fileUrl: () => '',
  }
}

export function createCodeHost(config: CodeHostConfig, fetch: HostFetch, sleep?: (ms: number) => Promise<void>): CodeHost {
  if (config.kind !== 'bitbucket') return githubCodeHost(config, fetch, sleep)
  if (config.api !== BITBUCKET_CLOUD_API) return refusing(config, fetch, DATA_CENTER_UNSUPPORTED)
  return bitbucketCodeHost(config, fetch, sleep)
}
