// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'
import type { Change } from '@shared/design/types'

export const MSG = {
  status: 'extraction:status',
  extract: 'extraction:extract',
  push: 'extraction:push',
  /** Open a GitHub link (pull request, commit) in the browser. */
  open: 'extraction:open',
} as const

/** Who took an extraction and when. */
export interface ExtractionStamp { by: string; at: string }

export interface BranchInfo {
  name: string
  /** The newest extraction on this branch; null when it has none. */
  latest: ExtractionStamp | null
}

/** The GitHub connection, read from Settings › GitHub. */
export interface RepoStatus {
  connected: boolean
  repo: string
  /** Why it isn't connected, e.g. "Add the access token in Settings › GitHub". */
  problem?: string
}

/** Which Settings › Notifications webhooks are filled in. */
export interface NotifyChannels { designSystem: boolean; devTeam: boolean }

export interface StatusResult {
  repo: RepoStatus
  branches: readonly BranchInfo[]
  /** '' when the repository has no branches yet. */
  defaultBranch: string
  channels: NotifyChannels
}

export interface ModeCount { mode: string; added: number; modified: number; removed: number }

export interface ImpactedComponent {
  name: string
  variants: number
  /** Names of the changed variables this component uses. */
  variables: readonly string[]
  /** One of those variables was removed or renamed. */
  breaking: boolean
}

export interface ExtractResult {
  /** Identifies the extraction; a push must send it back. */
  extractId: string
  extractedAt: string
  /** The branch it was compared with; null when the repository has none. */
  branch: string | null
  /** The extraction on that branch it was compared with; null when the branch has none (everything is new). */
  baseline: ExtractionStamp | null
  counts: { variables: number; components: number; modes: number }
  /** Variable changes only. */
  changes: readonly Change[]
  modes: readonly ModeCount[]
  impacted: readonly ImpactedComponent[]
  /** Drafted commit message. */
  message: string
}

/** A git branch name GitHub accepts; kept strict because it ends up in a URL. */
const BRANCH = /^(?![-/.])(?!.*(\.\.|\/\/|@\{))[A-Za-z0-9._/-]{1,120}(?<![/.])$/
export const isBranchName = (name: string): boolean => BRANCH.test(name) && !name.endsWith('.lock')

const branch = z.string().check(z.regex(BRANCH), z.maxLength(120))

export const extractRequestSchema = z.object({ branch: z.nullable(branch) })
export type ExtractRequest = z.infer<typeof extractRequestSchema>

export const pushRequestSchema = z.object({
  extractId: z.string().check(z.minLength(1)),
  /** The branch the extraction lands on. */
  target: branch,
  /** Create `target` (from `base`) instead of pushing to an existing branch. */
  create: z.boolean(),
  /** Where a new branch starts; '' = the default branch. */
  base: z.union([z.literal(''), branch]),
  message: z.string().check(z.minLength(1), z.maxLength(500)),
  /** Also open a pull request from `target` into the default branch. */
  pullRequest: z.boolean(),
  notify: z.object({ designSystem: z.boolean(), devTeam: z.boolean() }),
  /** Jira key to tag, e.g. BB-342; '' for none. */
  ticket: z.union([z.literal(''), z.string().check(z.regex(/^[A-Z][A-Z0-9]{1,9}-\d{1,7}$/))]),
})
export type PushRequest = z.infer<typeof pushRequestSchema>

export const openRequestSchema = z.object({ url: z.string().check(z.regex(/^https:\/\/[^\s]+$/), z.maxLength(2048)) })

/**
 * How a push ended.
 * - `pushed`: committed on the branch.
 * - `pr-opened`: committed and a pull request into the default branch is open.
 * - `rejected`: GitHub refused the branch update (protected branch); nothing landed.
 */
export type PushOutcome = 'pushed' | 'pr-opened' | 'rejected'

export interface PushResult {
  outcome: PushOutcome
  headline: string
  message: string
  link?: string
  linkLabel?: string
}
