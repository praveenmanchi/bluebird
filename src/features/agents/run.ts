// Fake agent runs: timers that move the tab-local signals the way a real run
// would stream progress. Pure helpers first (unit tested), then the actions.
import { AGENTS, PIPELINE_ORDER, VOICE_COPY, agentById, isRunnable, type AgentDef, type AgentFinding, type AgentId } from './fixtures'
import {
  agentId, cards, chat, filter, findingStatus, run, runAll, runAllApplied, view, voice, voiceReturn,
  type FindingFilter, type FindingStatus, type View,
} from './state'

export const TICK_MS = 150
/** Single run: percentage points per tick (≈3.75 s for a whole run). */
export const RUN_STEP = 4
/** Run all: percentage points per tick for the agent currently running. */
export const RUN_ALL_STEP = 10
/** How long the agent's spoken reply plays before the bar goes idle. */
export const SPEAK_MS = 2500

/** Progress thresholds at which each of the four Running steps is done. */
export const STEP_DONE_AT: readonly number[] = [15, 30, 55, 100]

/** Findings revealed at this progress: the k-th of N lands at (k+1)/(N+1). 14 findings at 64% → 9. */
export function revealedCount(total: number, progress: number): number {
  return Math.min(total, Math.floor((progress * (total + 1)) / 100))
}

export function openFindings(findings: readonly AgentFinding[], status: Readonly<Record<string, FindingStatus>>): AgentFinding[] {
  return findings.filter((f) => status[f.id] === undefined)
}

export function matchesFilter(finding: AgentFinding, by: FindingFilter): boolean {
  if (by === 'all') return true
  if (by === 'fixable') return finding.fixable
  return finding.severity === by
}

export function filterCounts(findings: readonly AgentFinding[]): Record<FindingFilter, number> {
  const filters: FindingFilter[] = ['all', 'critical', 'serious', 'moderate', 'minor', 'fixable']
  return Object.fromEntries(filters.map((f) => [f, findings.filter((x) => matchesFilter(x, f)).length])) as Record<FindingFilter, number>
}

/** Run all row state for one agent. */
export type PipelineState = 'done' | 'running' | 'queued' | 'skipped'

export function pipelineState(agent: AgentDef, progress: Partial<Record<AgentId, number>>): PipelineState {
  if (!isRunnable(agent)) return 'skipped'
  const p = progress[agent.id] ?? 0
  if (p >= 100) return 'done'
  const order = PIPELINE_ORDER.map(agentById).filter(isRunnable)
  const current = order.find((a) => (progress[a.id] ?? 0) < 100)
  return current?.id === agent.id ? 'running' : 'queued'
}

export function overallProgress(progress: Partial<Record<AgentId, number>>): number {
  const runnable = AGENTS.filter(isRunnable)
  const sum = runnable.reduce((n, a) => n + Math.min(100, progress[a.id] ?? 0), 0)
  return Math.round(sum / runnable.length)
}

// ---- actions ---------------------------------------------------------------

let runTimer: ReturnType<typeof setInterval> | undefined
let runAllTimer: ReturnType<typeof setInterval> | undefined
let speakTimer: ReturnType<typeof setTimeout> | undefined

function setCard(id: AgentId, next: { state: 'ready' | 'running' | 'idle'; status?: string; meta?: string }): void {
  cards.value = { ...cards.value, [id]: next }
}

export function openSetup(id: AgentId): void {
  if (!isRunnable(agentById(id))) return
  agentId.value = id
  view.value = 'setup'
}

export function openResults(id: AgentId): void {
  agentId.value = id
  filter.value = 'all'
  view.value = 'results'
}

export function backToGallery(): void {
  stopRun()
  view.value = 'gallery'
}

export function startRun(id: AgentId = agentId.value): void {
  const agent = agentById(id)
  if (!isRunnable(agent)) return
  stopRun()
  agentId.value = id
  // A new run re-opens every finding of this agent.
  findingStatus.value = Object.fromEntries(Object.entries(findingStatus.value).filter(([fid]) => !agent.findings.some((f) => f.id === fid)))
  run.value = { agent: id, progress: 0 }
  setCard(id, { state: 'running', status: 'Running 0%' })
  view.value = 'running'
  runTimer = setInterval(() => {
    const current = run.value
    if (!current) return
    const progress = Math.min(100, current.progress + RUN_STEP)
    run.value = { ...current, progress }
    setCard(id, { state: 'running', status: `Running ${progress}%` })
    if (progress >= 100) finishRun(agent)
  }, TICK_MS)
}

function finishRun(agent: AgentDef): void {
  clearInterval(runTimer)
  runTimer = undefined
  run.value = null
  setCard(agent.id, { state: 'ready', meta: `Last run just now · ${agent.findings.length} issues` })
  filter.value = 'all'
  if (view.value === 'running') view.value = 'results'
}

/** Stop pressed: abandon the run and go back to Setup. */
export function stopRun(): void {
  if (runTimer !== undefined) clearInterval(runTimer)
  runTimer = undefined
  const current = run.value
  if (!current) return
  run.value = null
  setCard(current.agent, { state: 'ready' })
  if (view.value === 'running') view.value = 'setup'
}

/** Stop on a gallery card that was already running when the tab opened (Content, in the design). */
export function stopCard(id: AgentId): void {
  if (run.value?.agent === id) { stopRun(); return }
  setCard(id, { state: 'ready', meta: 'Stopped · no results kept' })
}

export function setFindingStatus(id: string, status: FindingStatus): void {
  findingStatus.value = { ...findingStatus.value, [id]: status }
}

export function applySafeFixes(findings: readonly AgentFinding[]): void {
  const next = { ...findingStatus.value }
  for (const f of openFindings(findings, findingStatus.value)) if (f.fixable) next[f.id] = 'applied'
  findingStatus.value = next
}

export function startRunAll(): void {
  stopRunAll()
  runAll.value = {}
  runAllApplied.value = false
  view.value = 'run-all'
  runAllTimer = setInterval(() => {
    const progress = runAll.value ?? {}
    const current = PIPELINE_ORDER.map(agentById).filter(isRunnable).find((a) => (progress[a.id] ?? 0) < 100)
    if (!current) { clearInterval(runAllTimer); runAllTimer = undefined; return }
    runAll.value = { ...progress, [current.id]: Math.min(100, (progress[current.id] ?? 0) + RUN_ALL_STEP) }
  }, TICK_MS)
}

export function stopRunAll(): void {
  if (runAllTimer !== undefined) clearInterval(runAllTimer)
  runAllTimer = undefined
}

/** "Stop all": halt the pipeline and go back to the gallery. */
export function stopAllAndLeave(): void {
  stopRunAll()
  runAll.value = null
  view.value = 'gallery'
}

/** Mic pressed. Idle anywhere → Voice view, listening; listening → speaking; speaking → interrupt. */
export function toggleMic(): void {
  if (view.value !== 'voice') {
    voiceReturn.value = view.value
    view.value = 'voice'
    voice.value = 'listening'
    return
  }
  if (voice.value === 'listening') {
    chat.value = [...chat.value, { role: 'user', text: VOICE_COPY.listening }]
    voice.value = 'speaking'
    clearTimeout(speakTimer)
    speakTimer = setTimeout(() => {
      speakTimer = undefined
      chat.value = [...chat.value, { role: 'assistant', text: VOICE_COPY.speaking.replace(/[“”]/g, '') }]
      voice.value = 'idle'
    }, SPEAK_MS)
    return
  }
  if (voice.value === 'speaking') {
    clearTimeout(speakTimer)
    speakTimer = undefined
    voice.value = 'idle'
    return
  }
  voice.value = 'listening'
}

export function sendQuickReply(text: string): void {
  chat.value = [...chat.value, { role: 'user', text }]
}

export function leaveVoice(): void {
  clearTimeout(speakTimer)
  speakTimer = undefined
  voice.value = 'idle'
  const back: View = voiceReturn.value === 'voice' ? 'gallery' : voiceReturn.value
  // A run that finished while the user was talking lands on its results.
  view.value = back === 'running' && !run.value ? 'results' : back
}

/** Clear every timer (tab unmount / tests). */
export function stopAll(): void {
  if (runTimer !== undefined) clearInterval(runTimer)
  if (runAllTimer !== undefined) clearInterval(runAllTimer)
  clearTimeout(speakTimer)
  runTimer = undefined
  runAllTimer = undefined
  speakTimer = undefined
}
