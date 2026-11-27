// One interface for where code lives: GitHub (github.com, ghe.com, Enterprise Server) or Bitbucket
// Cloud. Publish, Extraction, History and MCP call this, never a provider's API directly, so a
// team's choice in Settings › Code repository decides which one answers. Runs in the Figma sandbox.
import type { CodeHostKind } from '@shared/integrations'
import type { CommitFile, GithubConfig, GithubFetch, PullSummary, WorkflowRun } from '@shared/github/client'

export type { CommitFile, PullSummary, WorkflowRun }
export type HostFetch = GithubFetch

export interface CodeHostConfig extends GithubConfig {
  kind: CodeHostKind
  /** Web root, for links people open: https://github.com, https://bitbucket.org, an Enterprise host… */
  web: string
  /** Bitbucket API token: the Atlassian email it signs in with (Basic auth). '' = Bearer token. */
  email: string
}

export interface CommitInput {
  /** The commit the new one builds on (branchHead). */
  parent: string
  message: string
  files: readonly CommitFile[]
  /** The branch the commit lands on. */
  branch: string
  /** true: a new branch (refused with kind 'exists' when it's there already); false: fast-forward an existing one. */
  create: boolean
  /** With create: the name to use instead when `branch` exists. */
  fallbackBranch?: string
}

export interface CodeHost {
  readonly kind: CodeHostKind
  /** "GitHub" or "Bitbucket", for messages. */
  readonly label: string
  /** What runs checks on a commit: "GitHub Actions" or "Bitbucket Pipelines". */
  readonly ciName: string
  readonly config: CodeHostConfig
  /** The sandbox's fetch, for the Teams post that rides along with a release. */
  readonly fetch: HostFetch
  whoAmI(): Promise<{ login: string; canPush: boolean; defaultBranch: string }>
  listBranches(): Promise<string[]>
  branchHead(branch?: string): Promise<string>
  /** A file's text on a branch, or null when it doesn't exist. */
  readFile(path: string, ref?: string): Promise<string | null>
  /** A file's text and a version marker to write it back with (putFile's sha), or null when it doesn't exist. */
  readFileWithSha(path: string, ref: string): Promise<{ text: string; sha: string } | null>
  /** Writes one file as its own commit; with `sha`, refused (kind 'rejected' or 'exists') when the file moved on since. Works on an empty repository. */
  putFile(path: string, content: string, message: string, branch: string, sha?: string): Promise<void>
  /** Files in a folder (one level) with a marker that changes when the file does, or [] when the folder doesn't exist. */
  listFolder(path: string, ref: string): Promise<Array<{ name: string; sha: string }>>
  /** One commit with every file, on a new branch or fast-forwarded onto an existing one. */
  commitFiles(input: CommitInput): Promise<{ sha: string; url: string; branch: string }>
  createTag(name: string, sha: string): Promise<void>
  openPull(head: string, base: string, title: string, body: string): Promise<{ number: number; url: string }>
  findPull(branch: string): Promise<PullSummary | null>
  recentPulls(base: string): Promise<Array<PullSummary & { head: string; headRepo: string }>>
  /** Checks on a commit, newest first, in GitHub Actions' shape. */
  runsFor(sha: string): Promise<WorkflowRun[]>
  /** A file's page on the host, for links in History and the changelog. */
  fileUrl(path: string, branch: string): string
}
