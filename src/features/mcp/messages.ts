// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages. The sandbox reads the real selection
// (mcp:selection), runs the handoff readiness checks over it (mcp:check), reports
// each scenario's repository from Settings › MCP + code sync (mcp:status) and looks
// for the developer's pull request on GitHub (mcp:track). The code itself is written
// by Claude Code or Cursor on the developer's machine, from the prompt the tab copies.
import * as z from 'zod/mini'
import type { McpScenario } from '@shared/integrations'
import type { CheckItemStatus, ReadinessMeterTone } from '@shared/ui'

export const MSG = {
  /** The current Figma selection, as the Select step shows it. */
  selection: 'mcp:selection',
  /** Readiness checks over the selected node. */
  check: 'mcp:check',
  /** Settings › MCP + code sync: each scenario's repository. */
  status: 'mcp:status',
  /** Is there a pull request for this branch yet? */
  track: 'mcp:track',
  /** Library releases from the team History (Settings › Storage): approved changelogs and extractions. */
  releases: 'mcp:releases',
  /** Screens in this file that use the components a release changed. */
  impact: 'mcp:impact',
  focus: 'mcp:focus',
  open: 'mcp:open',
} as const

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>

export const checkRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type CheckRequest = z.infer<typeof checkRequestSchema>

/** Pull request and Jira links: https only, never javascript:/data: URLs. */
export const openRequestSchema = z.object({
  url: z.string().check(z.maxLength(2048), z.regex(/^https:\/\/[^\s/]+\//, 'Only https links can be opened')),
})
export type OpenRequest = z.infer<typeof openRequestSchema>

/** A Git branch name as GitHub accepts it in a query: no spaces, no control characters, no `..`. */
export const BRANCH_NAME = /^(?!.*\.\.)[\w./-]+$/
const branchName = z.string().check(z.minLength(1), z.maxLength(200), z.regex(BRANCH_NAME, 'Branch names can’t contain spaces'))
/** A library update with one pull request per screen tracks every screen's branch. */
export const MAX_TRACKED_BRANCHES = 20
export const trackRequestSchema = z.object({
  scenario: z.enum(['component', 'screen', 'library']),
  branch: branchName,
  /** One branch per screen; when present, `branch` is only the shared prefix. */
  branches: z.optional(z.array(branchName).check(z.minLength(1), z.maxLength(MAX_TRACKED_BRANCHES))),
})
export type TrackRequest = z.infer<typeof trackRequestSchema>

/** One variant property of a component set and its values ("State": Default, Hover, Selected). */
export interface VariantAxis { name: string; options: readonly string[] }

/** The selected layer, as the handoff names it. */
export interface SelectionInfo {
  /** Figma node id ("Open in Figma" focuses it; the prompt links it). */
  nodeId: string
  /** Figma "Frame" on the Figma Link Card: the layer's name. */
  frame: string
  /** Figma "Path": page › ancestors, with the variant count when it is a set. */
  path: string
  /** FRAME, COMPONENT, COMPONENT_SET, INSTANCE, SECTION, GROUP, … */
  type: string
  /** Variants of a component set (or of the set a component / instance belongs to). */
  variants: number
  /** Layers inside the selection, the root included. */
  layers: number
  /** The component (set) description, or the main component's for an instance. */
  description: string
  /** Variant properties of the component (set); empty for a frame. */
  variantAxes: readonly VariantAxis[]
  /** Its other component properties (text, boolean, instance swap), by name. */
  properties: readonly string[]
}

export interface SelectionResult {
  /** The first selected layer; null when nothing is selected. */
  selected: SelectionInfo | null
  /** How many layers are selected (the handoff takes the first). */
  count: number
  fileName: string
  /** figma.fileKey — only private plugins get it; null otherwise, and the prompt names the file instead of linking it. */
  fileKey: string | null
}

export interface HandoffCheck {
  id: string
  status: CheckItemStatus
  title: string
  detail: string
  actionLabel?: string
}

/** What the readiness checks counted, for the Generate step's summary line and the prompt. */
export interface CheckStats {
  layers: number
  instances: number
  libraryInstances: number
  detached: number
  frames: number
  autoLayout: number
  /** Solid fills and strokes bound to a variable / not bound. */
  boundPaints: number
  rawPaints: number
  /** Spacing, padding and radius values bound to a variable / not bound. */
  boundNumbers: number
  rawNumbers: number
  texts: number
  styledTexts: number
  defaultNames: number
}

/** A component the selection is built from, and whether it comes from a library. `count`: how many instances of it the selection holds. */
export interface UsedComponent { name: string; count: number; library: boolean }

export interface CheckResult {
  nodeId: string
  readiness: { tone: ReadinessMeterTone; value: number }
  checks: readonly HandoffCheck[]
  stats: CheckStats
  /** Most used first. The prompt lists them so Claude Code reuses the ones already in code. */
  components: readonly UsedComponent[]
}

/** One scenario's repository from Settings › MCP + code sync. The token stays in the sandbox. */
export interface TargetStatus {
  connected: boolean
  repo: string
  branch: string
  framework: string
  folder: string
  /** The package screens import design-system components from; screen scenario only. */
  designPackage: string
  /** Library scenario only. */
  pullRequests: string
  /** Why it isn't connected, e.g. "Add the repository for Screen to code in Settings › MCP + code sync". */
  problem?: string
}

export interface McpStatus {
  targets: Record<McpScenario, TargetStatus>
}

export type PullState = 'waiting' | 'open' | 'merged' | 'closed'

/** One tracked branch and its pull request, if there is one yet. */
export interface TrackedPull {
  branch: string
  state: PullState
  number?: number
  url?: string
  title?: string
}

/**
 * What GitHub knows about the hand-off's branch. `waiting`: no pull request yet. With several
 * branches (a library update, one pull request per screen) `pulls` lists each and `state` is
 * `waiting` until every branch has one.
 */
export interface TrackResult {
  state: PullState
  repo: string
  branch: string
  number?: number
  url?: string
  title?: string
  pulls?: readonly TrackedPull[]
}

/** What a library release did to one component. */
export interface ComponentChange {
  name: string
  change: 'added' | 'modified' | 'removed'
  /** One line from the release, e.g. "New Size property · padding tokens changed". */
  note: string
  breaking: boolean
}

/** A library release as the team History recorded it: an approved changelog or a pushed extraction. */
export interface LibraryRelease {
  id: string
  kind: 'changelog' | 'extraction'
  title: string
  /** ISO time it was recorded. */
  at: string
  by: string
  /** The Figma file it was made in (the library). */
  file: string
  ticket?: string
  /** The pull request or report it landed in. */
  link?: string
  components: readonly ComponentChange[]
  /** Variable changes: their new values arrive with the token push, so they need no screen update. */
  variables: { added: number; modified: number; removed: number }
}

export interface ReleasesResult {
  releases: readonly LibraryRelease[]
  /** Why there are none to show, e.g. Storage isn't set up; absent when the list is just empty. */
  problem?: string
}

export const MAX_IMPACT_COMPONENTS = 200
export const impactRequestSchema = z.object({
  components: z.array(z.string().check(z.minLength(1), z.maxLength(200))).check(z.minLength(1), z.maxLength(MAX_IMPACT_COMPONENTS)),
})
export type ImpactRequest = z.infer<typeof impactRequestSchema>

/** A screen (a top-level frame) that uses changed components, and how often. */
export interface ImpactedScreen {
  nodeId: string
  name: string
  page: string
  uses: readonly { name: string; count: number }[]
}

export interface ImpactResult {
  screens: readonly ImpactedScreen[]
  pages: number
  /** Instances looked at across the file. */
  scanned: number
  /** The scan stopped at its limit: there may be more screens. */
  truncated: boolean
}
