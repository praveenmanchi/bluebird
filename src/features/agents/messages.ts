// This tab's wire contract. The sandbox runs the agents against the open document
// (reads layers, resolves tokens, asks the configured model), streams findings
// back as it goes, and writes results into Figma: token rebinds, text fixes,
// Dev Mode annotations and a report frame on the canvas.
import type { AiFailure } from '@shared/ai'
import * as z from 'zod/mini'
import type { FindingSeverity } from '@shared/ui'

export const MSG = {
  focus: 'agents:focus',
  /** What a run over the scope would read (frames, layers, text layers). */
  scope: 'agents:scope',
  /** Run one agent over the scope; the result carries every finding. Progress streams on `agents:progress`. */
  run: 'agents:run',
  progress: 'agents:progress',
  /** Cancel a run in flight; it answers with what it found so far. */
  stop: 'agents:stop',
  /** Apply fixes (token rebinds, text replacements, resizes) to the layers they point at. */
  apply: 'agents:apply',
  /** Write findings into Figma's Dev Mode annotations on their layers. */
  annotate: 'agents:annotate',
  /** Draw a report frame next to the scope on the canvas. */
  report: 'agents:report',
  /** Talk to an agent about its run (the Voice view); the sandbox adds the provider and key. */
  chat: 'agents:chat',
} as const

export const AGENT_IDS = ['accessibility', 'content', 'writing', 'spelling', 'design-system', 'localization'] as const
export type AgentId = (typeof AGENT_IDS)[number]
export const agentIdSchema = z.enum(AGENT_IDS)

export const SCOPE_IDS = ['selection', 'frame', 'section', 'page'] as const
export type ScopeId = (typeof SCOPE_IDS)[number]
export const scopeIdSchema = z.enum(SCOPE_IDS)

export const RUN_MODES = ['review', 'suggest', 'autofix'] as const
export type RunMode = (typeof RUN_MODES)[number]

/** Walk cap per run: a whole product page stays responsive; the result says when it was hit. */
export const RUN_NODE_LIMIT = 6000

export const scopeRequestSchema = z.object({ scope: scopeIdSchema })

/** What a run of the scope would read. `empty` when the scope is the selection and nothing is selected. */
export interface ScopeInfo {
  scope: ScopeId
  /** The selected layer's name, "3 layers", the frame's or section's name, or the page name. */
  name: string
  frames: number
  layers: number
  textLayers: number
  instances: number
  truncated: boolean
  empty: boolean
}

export const runRequestSchema = z.object({
  runId: z.string().check(z.minLength(1), z.maxLength(64)),
  agent: agentIdSchema,
  scope: scopeIdSchema,
  /** Rule ids switched on in Setup; an empty list means every rule. */
  rules: z.array(z.string().check(z.maxLength(64))).check(z.maxLength(64)),
  /** Brand modes to check (the Accessibility agent); empty means the file's current mode only. Figma caps a collection at 40 modes. */
  brandModes: z.array(z.string().check(z.maxLength(64))).check(z.maxLength(64)),
  mode: z.enum(RUN_MODES),
})
export type RunRequest = z.infer<typeof runRequestSchema>

/** What Apply does for a finding. `manual` findings carry advice only. */
export type AgentFix =
  | { kind: 'rebind-fill'; variableId: string; variableName: string }
  | { kind: 'rebind-stroke'; variableId: string; variableName: string }
  | { kind: 'bind-number'; field: 'itemSpacing' | 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom' | 'cornerRadius'; variableId: string; variableName: string }
  | { kind: 'replace-text'; text: string }
  | { kind: 'resize'; width: number; height: number }
  | { kind: 'manual'; note: string }

export interface AgentFinding {
  id: string
  agent: AgentId
  /** The rule it breaks (the Setup rule id, e.g. "1.4.3" or "placeholder-text"). */
  rule: string
  severity: FindingSeverity
  title: string
  /** "WCAG 1.4.3 · Checkout › Pay button › Label · Ikea mode". */
  meta: string
  /** The layer Locate selects. */
  nodeId: string
  /** Every layer sharing the finding; Apply touches all of them. */
  nodeIds: readonly string[]
  fix: AgentFix | null
  /** The Fix chip text ("Fix: jira/text/key → text/primary (7.8:1)"); null when the agent only explains. */
  fixLabel: string | null
  /** Apply can do it with tokens or text alone, without changing the design's intent. */
  fixable: boolean
}

export interface RunStep { label: string; status: 'done' | 'running' }

/** `agents:progress`: percent and the steps so far; `findings` are the new ones since the last event. */
export interface RunProgress {
  runId: string
  agent: AgentId
  percent: number
  steps: readonly RunStep[]
  findings: readonly AgentFinding[]
  /** "Checking 8 of 12 frames · 96 of 148 layers · 5 brand modes". */
  label: string
}

export interface RunResult {
  runId: string
  agent: AgentId
  scope: ScopeInfo
  /** Brand modes the run checked (Accessibility); empty for the others. */
  brandModes: readonly string[]
  steps: readonly RunStep[]
  findings: readonly AgentFinding[]
  /** 0–100, the share of what was checked that passed. */
  score: number
  /** How many layers / texts the agent judged, for the score's caption. */
  checked: number
  durationMs: number
  /** The model that reviewed the text (Spelling, UX writing, Content suggestions), or why none did. */
  model: { provider: 'claude' | 'openai' | 'gemini'; model: string } | { skipped: string } | null
  stopped: boolean
  /** A model request failed, so the run is incomplete even if it finished. */
  failure?: AiFailure
}

export const stopRequestSchema = z.object({ runId: z.string().check(z.minLength(1)) })

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>

const nodeIds = z.array(z.string().check(z.minLength(1))).check(z.minLength(1), z.maxLength(500))
const fixSchema = z.union([
  z.object({ kind: z.literal('rebind-fill'), variableId: z.string(), variableName: z.string() }),
  z.object({ kind: z.literal('rebind-stroke'), variableId: z.string(), variableName: z.string() }),
  z.object({ kind: z.literal('bind-number'), field: z.enum(['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'cornerRadius']), variableId: z.string(), variableName: z.string() }),
  z.object({ kind: z.literal('replace-text'), text: z.string().check(z.maxLength(5000)) }),
  z.object({ kind: z.literal('resize'), width: z.number().check(z.gte(1), z.lte(10_000)), height: z.number().check(z.gte(1), z.lte(10_000)) }),
  z.object({ kind: z.literal('manual'), note: z.string() }),
])

export const applyRequestSchema = z.object({
  fixes: z.array(z.object({ id: z.string(), nodeIds, fix: fixSchema })).check(z.minLength(1), z.maxLength(200)),
})
export type ApplyRequest = z.infer<typeof applyRequestSchema>
export interface ApplyResult { applied: string[]; failed: { id: string; reason: string }[] }

export const annotateRequestSchema = z.object({
  findings: z.array(z.object({ nodeIds, label: z.string().check(z.minLength(1), z.maxLength(1000)) })).check(z.minLength(1), z.maxLength(500)),
})
export interface AnnotateResult { annotated: number }

/** Dev Mode annotations written by the agents start with this, so a re-run replaces them. */
export const ANNOTATION_PREFIX = 'UX AI ·'

export const reportRequestSchema = z.object({
  title: z.string().check(z.minLength(1), z.maxLength(200)),
  summary: z.string().check(z.maxLength(2000)),
  rows: z.array(z.object({
    severity: z.enum(['critical', 'serious', 'moderate', 'minor']),
    title: z.string().check(z.maxLength(400)),
    meta: z.string().check(z.maxLength(400)),
    fix: z.nullable(z.string().check(z.maxLength(400))),
    nodeId: z.string(),
  })).check(z.maxLength(400)),
})
export type ReportRequest = z.infer<typeof reportRequestSchema>
export interface ReportResult { nodeId: string; name: string }

export const chatRequestSchema = z.object({
  agent: agentIdSchema,
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().check(z.minLength(1), z.maxLength(8000)) })).check(z.minLength(1), z.maxLength(20)),
  /** The latest run, summarised by the UI, so the agent can talk about it. */
  context: z.string().check(z.maxLength(12_000)),
})
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ChatResult =
  | { status: 'answered'; text: string; provider: 'claude' | 'openai' | 'gemini'; model: string }
  | { status: 'not-configured'; reason: 'disabled' | 'no-key' }
