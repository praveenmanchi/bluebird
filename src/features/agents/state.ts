// Tab-local state. Nothing outside src/features/agents reads or writes this.
import { signal } from '@preact/signals'
import type { FindingSeverity } from '@shared/ui'
import { AGENTS, BRAND_MODES, OUTPUTS, type AgentId, type CardState, type RunMode, type ScopeId } from './fixtures'

export type View = 'gallery' | 'setup' | 'running' | 'results' | 'voice' | 'run-all'
export type FindingFilter = 'all' | FindingSeverity | 'fixable'
export type FindingStatus = 'applied' | 'ignored'
export type VoicePhase = 'idle' | 'listening' | 'speaking'

export interface CardStatus { state: CardState; status?: string; meta?: string }
export interface ChatTurn { role: 'user' | 'assistant'; text: string }

const initialCards = (): Record<AgentId, CardStatus> =>
  Object.fromEntries(AGENTS.map((a) => [a.id, { state: a.card.state, meta: a.card.meta }])) as Record<AgentId, CardStatus>

const initialRules = (): Record<string, boolean> =>
  Object.fromEntries(AGENTS.flatMap((a) => a.rules.map((r) => [`${a.id}:${r.id}`, r.enabled])))

export const view = signal<View>('gallery')
/** Where the Voice view returns to. */
export const voiceReturn = signal<View>('gallery')
export const agentId = signal<AgentId>('accessibility')
export const scope = signal<ScopeId>('selection')
export const cards = signal<Record<AgentId, CardStatus>>(initialCards())
export const rules = signal<Record<string, boolean>>(initialRules())
export const mode = signal<RunMode>('suggest')
export const brands = signal<Record<string, boolean>>(Object.fromEntries(BRAND_MODES.map((b) => [b, true])))
export const outputs = signal<Record<string, boolean>>(Object.fromEntries(OUTPUTS.map((o) => [o.id, o.checked])))
/** The single-agent run in progress (0–100), or null. */
export const run = signal<{ agent: AgentId; progress: number } | null>(null)
export const findingStatus = signal<Record<string, FindingStatus>>({})
export const filter = signal<FindingFilter>('all')
export const voice = signal<VoicePhase>('idle')
export const chat = signal<readonly ChatTurn[]>([])
/** Run all: progress per agent (0–100); null when it has not been started. */
export const runAll = signal<Partial<Record<AgentId, number>> | null>(null)
export const runAllApplied = signal(false)

export function reset(): void {
  view.value = 'gallery'
  voiceReturn.value = 'gallery'
  agentId.value = 'accessibility'
  scope.value = 'selection'
  cards.value = initialCards()
  rules.value = initialRules()
  mode.value = 'suggest'
  brands.value = Object.fromEntries(BRAND_MODES.map((b) => [b, true]))
  outputs.value = Object.fromEntries(OUTPUTS.map((o) => [o.id, o.checked]))
  run.value = null
  findingStatus.value = {}
  filter.value = 'all'
  voice.value = 'idle'
  chat.value = []
  runAll.value = null
  runAllApplied.value = false
}
