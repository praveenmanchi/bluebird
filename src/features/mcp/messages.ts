// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages. The sandbox reads the real selection
// (mcp:selection), runs the handoff readiness checks over it (mcp:check) and
// reports the GitHub connection from Settings › MCP (mcp:status). Code generation
// and the Git push still run on fixtures: the prompt and the MCP setup the tab
// copies are what hands the real work to Claude Code or Cursor.
import * as z from 'zod/mini'
import type { CheckItemStatus, ReadinessMeterTone } from '@shared/ui'

export const MSG = {
  /** The current Figma selection, as the Select step shows it. */
  selection: 'mcp:selection',
  /** Readiness checks over the selected node. */
  check: 'mcp:check',
  /** Settings › MCP: where a push would go. */
  status: 'mcp:status',
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

export interface CheckResult {
  nodeId: string
  readiness: { tone: ReadinessMeterTone; value: number }
  checks: readonly HandoffCheck[]
  stats: CheckStats
}

/** Settings › MCP + Code Sync as the Ship step needs it. */
export interface GithubStatus {
  connected: boolean
  repo: string
  branch: string
  /** Why it isn't connected, e.g. "Add the personal access token in Settings › MCP + Code Sync". */
  problem?: string
}

export interface McpStatus {
  github: GithubStatus
}
