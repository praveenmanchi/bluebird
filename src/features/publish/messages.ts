// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'
import type { Change, ReleaseSummary } from './types'

export const MSG = {
  status: 'publish:status',
  extract: 'publish:extract',
  /** The files the publish commit would carry, for the Final review (Tokens Studio's push dialog shows its JSON before pushing). */
  preview: 'publish:preview',
  publish: 'publish:publish',
  progress: 'publish:progress',
  /** Open a GitHub link (pull request, commit, run) in the browser. */
  open: 'publish:open',
} as const

export const openRequestSchema = z.object({ url: z.string().check(z.regex(/^https:\/\/[^\s]+$/), z.maxLength(2048)) })

/** Where the release goes, read from Settings › Code repository. */
export interface RepoStatus {
  /** Repository and access token are set and pass the Settings rules. */
  connected: boolean
  repo: string
  branch: string
  /** Settings › Code repository › "Enable diff comparison": extracts also read the repository's release store. */
  diffComparison: boolean
  /** Why it isn't connected, e.g. "Add an access token in Settings › Code repository". */
  problem?: string
}

/** Settings › Notifications as the Publish options need it: is there anywhere to post the changelog? */
export interface NotifyStatus {
  /** How many Teams / Power Automate webhooks are set (0 disables "Post the changelog to Teams"). */
  webhooks: number
}

/** Cheap pre-extract read: where the release goes and what was published last. */
export interface StatusResult {
  repo: RepoStatus
  /** The latest release of this file; null when it was never published. */
  baseline: ReleaseSummary | null
  history: readonly ReleaseSummary[]
  notify: NotifyStatus
}

/**
 * Where the baseline the diff compares against came from.
 * - `file`: the release stored in this Figma file.
 * - `github`: `.bluebird/releases.json` on the branch in Settings › Code repository was newer (or the file had none) — Settings › Code repository › "Enable diff comparison".
 * - `none`: first release.
 */
export type BaselineSource = 'file' | 'github' | 'none'

export interface ExtractResult {
  /** Identifies the snapshot this diff came from; publish must send it back. */
  extractId: string
  extractedAt: string
  counts: { variables: number; components: number; modes: number }
  /** The release this diff compares against; null for a first release. */
  baseline: ReleaseSummary | null
  baselineSource: BaselineSource
  /** Why GitHub's copy of the releases was not used when diff comparison is on (unreadable, missing, older). */
  baselineNote?: string
  changes: readonly Change[]
  history: readonly ReleaseSummary[]
  repo: RepoStatus
}

export const publishRequestSchema = z.object({
  extractId: z.string().check(z.minLength(1)),
  version: z.string().check(z.regex(/^v\d+\.\d+\.\d+$/)),
  title: z.string().check(z.minLength(1), z.maxLength(200)),
  /** Change ids to include; the rest stay unpublished for the next release. */
  include: z.array(z.string()),
  notes: z.array(z.object({ changeId: z.string(), text: z.string().check(z.maxLength(2000)) })),
  options: z.object({ openPr: z.boolean(), postToTeams: z.boolean(), tag: z.boolean() }),
})
export type PublishRequest = z.infer<typeof publishRequestSchema>

/** One file of the publish commit, as the Final review previews it. */
export interface CommitPreviewFile {
  path: string
  /** UTF-8 size of the whole file. */
  bytes: number
  /** CodeSnippet language caption: JSON, Markdown. */
  language: string
  /** The file's text, cut at PREVIEW_CHARS. */
  content: string
  truncated: boolean
}

export interface CommitPreview {
  /** The commit message. */
  message: string
  files: readonly CommitPreviewFile[]
}

/** Characters of each file the preview carries; tokens.json for a large library runs to hundreds of kB. */
export const PREVIEW_CHARS = 12_000

export type PipelineStepId = 'extract' | 'components' | 'commit' | 'build' | 'deploy' | 'notify'
export type PipelineStepStatus = 'done' | 'running' | 'queued' | 'failed'

export interface PipelineStepState {
  id: PipelineStepId
  status: PipelineStepStatus
  detail: string
  time: string
}

/** Streamed while a publish runs. */
export interface PublishProgress {
  steps: readonly PipelineStepState[]
}

/**
 * How a publish ended.
 * - `pr-opened`: committed on a release branch with a pull request; merging it publishes.
 * - `pushed`: committed straight to the branch; `link` is the commit or the CI run.
 * - `live`: pushed, built and deployed (the mock's docs-site flow).
 * - `saved`: recorded in this file only — no repository or token in Settings › Code repository.
 * - `push-rejected`: GitHub refused the branch update; nothing was published.
 * - `build-failed`: committed, but the CI run failed.
 */
export type PublishOutcome = 'live' | 'pushed' | 'pr-opened' | 'saved' | 'push-rejected' | 'build-failed'

export interface PublishResult {
  outcome: PublishOutcome
  /** The result card's title, e.g. "v4.0.0 is ready for review". */
  headline: string
  release: ReleaseSummary
  steps: readonly PipelineStepState[]
  /** Where to go next: the pull request, commit, CI run or release page. */
  link?: string
  linkLabel?: string
  /** Git or build output for the failed outcomes. */
  log?: string
  /** One sentence on what happened, for the result card. */
  message: string
}
