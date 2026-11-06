// Tab-local state. Nothing outside src/features/agents reads or writes this.
import type { BotSceneId } from '@shared/ui'
import { signal } from '@preact/signals'
import type { FindingSeverity } from '@shared/ui'
import { AGENTS, BRAND_MODES, OUTPUTS } from './agents'
import type { AgentFinding, AgentId, RunMode, RunResult, RunStep, ScopeId, ScopeInfo } from './messages'

export type View = 'gallery' | 'setup' | 'running' | 'results' | 'voice' | 'run-all' | 'scenario'
export type FindingFilter = 'all' | FindingSeverity | 'fixable'
export type FindingStatus = 'applied' | 'ignored' | 'failed'
export type VoicePhase = 'idle' | 'listening' | 'speaking' | 'thinking'
export type OutputId = (typeof OUTPUTS)[number]['id']

export interface ChatTurn { role: 'user' | 'assistant'; text: string; /** Reasoning steps shown under an assistant turn. */ steps?: readonly string[] }

/** A run in flight: what the sandbox has streamed so far. */
export interface LiveRun {
  runId: string
  agent: AgentId
  percent: number
  label: string
  steps: readonly RunStep[]
  findings: readonly AgentFinding[]
}

/** The full-screen scene when a run can't start, fails, finds nothing, or a fix gets stuck. */
export interface AgentScenario {
  scene: BotSceneId
  agent: AgentId
  provider?: string
  /** Replaces the standard body, when the run knows more. */
  body?: string
  /** Where "Back" and the follow-on actions return to. */
  back: View
}

/** The agent that stopped Run all, and the row text for it. */
export interface RunAllFailure { agent: AgentId; text: string }

/** A transient notice on the Results screen (an Apply outcome, a report written). */
export interface Notice { tone: 'info' | 'error'; text: string }

const initialRules = (): Record<string, boolean> =>
  Object.fromEntries(AGENTS.flatMap((a) => a.rules.map((r) => [`${a.id}:${r.id}`, r.enabled])))

export const view = signal<View>('gallery')
/** Where the Voice view returns to. */
export const voiceReturn = signal<View>('gallery')
export const agentId = signal<AgentId>('accessibility')
export const scope = signal<ScopeId>('selection')
/** What the sandbox says the scope reads; null until asked, `empty` when nothing is selected. */
export const scopeInfo = signal<ScopeInfo | null>(null)
export const rules = signal<Record<string, boolean>>(initialRules())
export const mode = signal<RunMode>('suggest')
export const brands = signal<Record<string, boolean>>(Object.fromEntries(BRAND_MODES.map((b) => [b, true])))
export const outputs = signal<Record<OutputId, boolean>>(Object.fromEntries(OUTPUTS.map((o) => [o.id, o.checked])) as Record<OutputId, boolean>)
/** The single-agent run in progress, or null. */
export const run = signal<LiveRun | null>(null)
/** The last finished run per agent (this plugin session). */
export const results = signal<Partial<Record<AgentId, RunResult>>>({})
export const findingStatus = signal<Record<string, FindingStatus>>({})
export const filter = signal<FindingFilter>('all')
export const notice = signal<Notice | null>(null)
export const voice = signal<VoicePhase>('idle')
export const chat = signal<readonly ChatTurn[]>([])
/** Live transcript while listening. */
export const transcript = signal('')
/** Run all: percent per agent (0–100); null when it has not been started. */
export const runAll = signal<Partial<Record<AgentId, number>> | null>(null)
export const runAllApplied = signal(false)
export const scenario = signal<AgentScenario | null>(null)
export const runAllFailure = signal<RunAllFailure | null>(null)

export function reset(): void {
  view.value = 'gallery'
  scenario.value = null
  runAllFailure.value = null
  voiceReturn.value = 'gallery'
  agentId.value = 'accessibility'
  scope.value = 'selection'
  scopeInfo.value = null
  rules.value = initialRules()
  mode.value = 'suggest'
  brands.value = Object.fromEntries(BRAND_MODES.map((b) => [b, true]))
  outputs.value = Object.fromEntries(OUTPUTS.map((o) => [o.id, o.checked])) as Record<OutputId, boolean>
  run.value = null
  results.value = {}
  findingStatus.value = {}
  filter.value = 'all'
  notice.value = null
  voice.value = 'idle'
  chat.value = []
  transcript.value = ''
  runAll.value = null
  runAllApplied.value = false
}
