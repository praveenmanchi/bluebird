// Tab actions: real runs over the bridge, streamed progress, fixes written back,
// annotations, the report frame, the agent conversation. Pure helpers first
// (unit tested), then the actions, which take the RpcClient the Tab holds.
import type { RpcClient } from '@shared/bridge'
import { PROVIDER_LABEL, failureOf, type AiFailure } from '@shared/ai'
import { scenarioCopy, sceneForFailure, type BotSceneId } from '@shared/ui'
import { AGENTS, PIPELINE_ORDER, agentById, isRunnable, type AgentDef } from './agents'
import {
  MSG, type AgentFinding, type AgentId, type AnnotateResult, type ApplyResult, type ChatResult, type ReportResult, type RunProgress, type RunRequest, type RunResult, type ScopeInfo,
} from './messages'
import {
  agentId, brands, chat, filter, findingStatus, mode, notice, outputs, results, rules, run, runAll, runAllApplied, scope, scopeInfo, transcript, view, voice, voiceReturn,
  type FindingFilter, type FindingStatus, type View, scenario, runAllFailure,
} from './state'

/** A run reads the document and may wait on the model several times. */
export const RUN_TIMEOUT_MS = 5 * 60_000
export const WRITE_TIMEOUT_MS = 60_000
export const CHAT_TIMEOUT_MS = 90_000
/** How long the spoken reply "plays" before the bar goes idle (no TTS in the plugin). */
export const SPEAK_MS = 2500

export function openFindings(findings: readonly AgentFinding[], status: Readonly<Record<string, FindingStatus>>): AgentFinding[] {
  return findings.filter((f) => status[f.id] === undefined || status[f.id] === 'failed')
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
export type PipelineState = 'done' | 'running' | 'queued' | 'skipped' | 'failed'

export function pipelineState(agent: AgentDef, progress: Partial<Record<AgentId, number>>, failed?: AgentId): PipelineState {
  if (!isRunnable(agent)) return 'skipped'
  if (agent.id === failed) return 'failed'
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

/** The Dev Mode annotation for a finding: rule, title, fix. */
export const annotationLabel = (f: AgentFinding): string => `${f.meta.split(' · ')[0]} — ${f.title}.${f.fixLabel ? ` ${f.fixLabel}.` : ''}`

/** "14 issues · 6 fixable with tokens" for a finished run. */
export function runSummary(result: RunResult): string {
  const n = result.findings.length
  if (!n) return 'No issues found'
  const fixable = result.findings.filter((f) => f.fixable).length
  return `${n} ${n === 1 ? 'issue' : 'issues'}${fixable ? ` · ${fixable} fixable` : ''}`
}

/** What the agent conversation knows about the latest run. */
export function chatContext(agent: AgentDef, result: RunResult | undefined, status: Readonly<Record<string, FindingStatus>>): string {
  if (!result) return `Agent: ${agent.title}. No run yet in this session. Scope options: selection, current frame, section, whole page.`
  const open = openFindings(result.findings, status)
  const lines = [
    `Agent: ${agent.title}. Scope: ${result.scope.name} (${result.scope.frames} frames, ${result.scope.layers} layers). Score: ${result.score}/100.`,
    `${open.length} open findings (${open.filter((f) => f.fixable).length} safe to apply), ${result.findings.length - open.length} already applied or ignored.`,
    ...open.slice(0, 25).map((f) => `- [${f.severity}] ${f.title} (${f.meta})${f.fixLabel ? ` ${f.fixLabel}` : ''}`),
    ...(open.length > 25 ? [`… and ${open.length - 25} more`] : []),
  ]
  return lines.join('\n')
}

export const markdownReport = (agent: AgentDef, result: RunResult, findings: readonly AgentFinding[]): string => [
  `# ${agent.title} · ${result.scope.name}`,
  '',
  `${result.scope.frames} frames · ${result.scope.layers} layers · score ${result.score}/100 · ${new Date().toISOString().slice(0, 10)}`,
  '',
  ...findings.map((f) => `- **${f.severity.toUpperCase()}** ${f.title}  \n  ${f.meta}${f.fixLabel ? `  \n  ${f.fixLabel}` : ''}`),
].join('\n')

// ---- actions ---------------------------------------------------------------

let seq = 0
const nextRunId = () => `run-${Date.now().toString(36)}-${(seq += 1).toString(36)}`
let speakTimer: ReturnType<typeof setTimeout> | undefined
let unsubscribe: (() => void) | undefined
let stopRunAllFlag = false

const say = (tone: 'info' | 'error', text: string) => { notice.value = { tone, text } }

/** Show a full-screen scene for this agent. Back returns to `back`. */
export function showScenario(scene: BotSceneId, agent: AgentId, back: View, details: { provider?: string; body?: string } = {}): void {
  agentId.value = agent
  scenario.value = { scene, agent, back, ...details }
  view.value = 'scenario'
}

/** Leave the scene for where it came from (or a screen the action picked). */
export function leaveScenario(to?: View): void {
  const back = scenario.value?.back ?? 'gallery'
  scenario.value = null
  view.value = to ?? back
}

const failureDetails = (failure: AiFailure) => (failure.provider ? { provider: PROVIDER_LABEL[failure.provider] } : {})

/** Run all marks the row; a single run opens the scene, or leaves a notice if the designer moved on. */
function reportFailure(id: AgentId, failure: AiFailure, navigate: boolean): void {
  const scene = sceneForFailure(failure.kind)
  if (!navigate) runAllFailure.value = { agent: id, text: scenarioCopy(scene, { surface: 'agents', ...failureDetails(failure) }).title }
  else if (view.value === 'running') showScenario(scene, id, 'setup', failureDetails(failure))
  else say('error', failure.message)
}

/** Run one agent, unless it can't start: nothing in scope, or it needs a model that isn't set up. */
export function startRun(rpc: RpcClient, id: AgentId, modelReady: boolean): void {
  if (scopeInfo.value?.empty) { showScenario('nothing-selected', id, 'setup'); return }
  if (agentById(id).needsModel && !modelReady) { showScenario('no-connection', id, 'setup'); return }
  void runOne(rpc, id)
}

function rulesFor(agent: AgentDef): string[] {
  const on = agent.rules.filter((r) => rules.value[`${agent.id}:${r.id}`] ?? r.enabled).map((r) => r.id)
  return on.length === agent.rules.length ? [] : on
}

export async function refreshScope(rpc: RpcClient): Promise<ScopeInfo | null> {
  try {
    const info = await rpc.call<ScopeInfo>(MSG.scope, { scope: scope.value }, WRITE_TIMEOUT_MS)
    scopeInfo.value = info
    return info
  } catch {
    scopeInfo.value = null
    return null
  }
}

export function setScope(rpc: RpcClient, next: RunRequest['scope']): void {
  scope.value = next
  void refreshScope(rpc)
}

export function openSetup(id: AgentId): void {
  agentId.value = id
  view.value = 'setup'
}

export function openResults(id: AgentId): void {
  agentId.value = id
  filter.value = 'all'
  notice.value = null
  view.value = 'results'
}

export function backToGallery(rpc: RpcClient): void {
  void stopRun(rpc)
  view.value = 'gallery'
}

/** One agent over the current scope, streamed. Resolves with the result (also stored in `results`). */
export async function runOne(rpc: RpcClient, id: AgentId, { navigate = true }: { navigate?: boolean } = {}): Promise<RunResult | null> {
  const agent = agentById(id)
  const runId = nextRunId()
  // A new run re-opens every finding of this agent.
  findingStatus.value = Object.fromEntries(Object.entries(findingStatus.value).filter(([fid]) => !fid.startsWith(`${id}:`)))
  run.value = { runId, agent: id, percent: 0, label: 'Reading the scope…', steps: [], findings: [] }
  if (navigate) { agentId.value = id; view.value = 'running' }
  unsubscribe?.()
  unsubscribe = rpc.on<RunProgress>(MSG.progress, (p) => {
    const current = run.value
    if (!current || p.runId !== runId) return
    run.value = { ...current, percent: p.percent, label: p.label, steps: p.steps, findings: [...current.findings, ...p.findings] }
  })
  const request: RunRequest = {
    runId, agent: id, scope: scope.value, rules: rulesFor(agent),
    brandModes: id === 'accessibility' ? Object.entries(brands.value).filter(([, on]) => on).map(([b]) => b) : [],
    mode: mode.value,
  }
  try {
    const result = await rpc.call<RunResult>(MSG.run, request, RUN_TIMEOUT_MS)
    if (run.value?.runId !== runId) return null // stopped meanwhile
    results.value = { ...results.value, [id]: result }
    run.value = null
    if (result.failure) {
      reportFailure(id, result.failure, navigate)
    } else if (navigate && view.value === 'running') {
      filter.value = 'all'
      notice.value = null
      const clean = !result.findings.length && !result.stopped && !(result.model && 'skipped' in result.model)
      if (clean) showScenario('all-clear', id, 'gallery', { body: `${agent.name} checked ${result.scope.layers} layers and every one looks great. Go you.` })
      else view.value = 'results'
    }
    void afterRun(rpc, agent, result)
    return result
  } catch (error: unknown) {
    if (run.value?.runId === runId) {
      run.value = null
      reportFailure(id, failureOf(error), navigate)
    }
    return null
  } finally {
    if (run.value === null) { unsubscribe?.(); unsubscribe = undefined }
  }
}

/** The outputs ticked in Setup, once a run lands: auto-fix, annotations, report frame. */
async function afterRun(rpc: RpcClient, agent: AgentDef, result: RunResult): Promise<void> {
  if (!result.findings.length) return
  const messages: string[] = []
  if (mode.value === 'autofix') {
    const safe = result.findings.filter((f) => f.fixable)
    if (safe.length) {
      const applied = await applyFindings(rpc, safe)
      if (applied) messages.push(`${applied} safe ${applied === 1 ? 'fix' : 'fixes'} applied`)
    }
  }
  if (outputs.value.annotations) {
    try {
      const { annotated } = await rpc.call<AnnotateResult>(MSG.annotate, { findings: result.findings.map((f) => ({ nodeIds: f.nodeIds, label: annotationLabel(f) })) }, WRITE_TIMEOUT_MS)
      messages.push(`Dev Mode annotations on ${annotated} ${annotated === 1 ? 'layer' : 'layers'}`)
    } catch { /* fixtures and layers that refuse annotations */ }
  }
  if (outputs.value.report) {
    const written = await writeReport(rpc, agent, result, result.findings, false)
    if (written) messages.push(`Report frame “${written.name}” on the canvas`)
  }
  if (messages.length) say('info', messages.join(' · '))
}

export async function writeReport(rpc: RpcClient, agent: AgentDef, result: RunResult, findings: readonly AgentFinding[], announce = true): Promise<ReportResult | null> {
  try {
    const written = await rpc.call<ReportResult>(MSG.report, {
      title: `${agent.title} · ${result.scope.name}`,
      summary: `${result.scope.frames} frames · ${result.scope.layers} layers · score ${result.score}/100 · ${runSummary(result)}${result.brandModes.length ? ` · ${result.brandModes.join(', ')}` : ''}`,
      rows: findings.map((f) => ({ severity: f.severity, title: f.title, meta: f.meta, fix: f.fixLabel, nodeId: f.nodeId })),
    }, WRITE_TIMEOUT_MS)
    if (announce) say('info', `Report frame “${written.name}” added to the canvas and selected.`)
    return written
  } catch (error: unknown) {
    if (announce) say('error', error instanceof Error ? error.message : 'Couldn’t draw the report.')
    return null
  }
}

/** Apply fixes in Figma; applied findings leave the list, failed ones stay with the reason. Returns how many applied. */
export async function applyFindings(rpc: RpcClient, findings: readonly AgentFinding[]): Promise<number> {
  const withFix = findings.filter((f) => f.fix && f.fix.kind !== 'manual')
  if (!withFix.length) return 0
  try {
    const result = await rpc.call<ApplyResult>(MSG.apply, { fixes: withFix.map((f) => ({ id: f.id, nodeIds: f.nodeIds, fix: f.fix })) }, WRITE_TIMEOUT_MS)
    const next = { ...findingStatus.value }
    for (const id of result.applied) next[id] = 'applied'
    for (const { id } of result.failed) next[id] = 'failed'
    findingStatus.value = next
    if (result.failed.length && view.value === 'results') {
      showScenario('fix-stuck', agentId.value, 'results', { body: `${result.applied.length} of ${withFix.length} fixes went in. Figma wouldn’t let ${result.failed.length} through, usually because those layers are locked or were removed.` })
    }
    if (result.failed.length) say('error', `${result.failed.length} ${result.failed.length === 1 ? 'fix' : 'fixes'} couldn’t be applied: ${result.failed[0]!.reason}`)
    return result.applied.length
  } catch (error: unknown) {
    say('error', error instanceof Error ? error.message : 'Couldn’t apply the fixes.')
    return 0
  }
}

export async function applySafeFixes(rpc: RpcClient, findings: readonly AgentFinding[]): Promise<number> {
  const safe = openFindings(findings, findingStatus.value).filter((f) => f.fixable)
  const applied = await applyFindings(rpc, safe)
  if (applied) say('info', `${applied} safe ${applied === 1 ? 'fix' : 'fixes'} applied in Figma.`)
  return applied
}

export function setFindingStatus(id: string, status: FindingStatus): void {
  findingStatus.value = { ...findingStatus.value, [id]: status }
}

/** Stop pressed: tell the sandbox, abandon the run and go back to Setup. */
export async function stopRun(rpc: RpcClient): Promise<void> {
  const current = run.value
  if (!current) return
  run.value = null
  unsubscribe?.()
  unsubscribe = undefined
  if (view.value === 'running') view.value = 'setup'
  try { await rpc.call(MSG.stop, { runId: current.runId }, 5000) } catch { /* the run may already be over */ }
}

export async function startRunAll(rpc: RpcClient): Promise<void> {
  if (scopeInfo.value?.empty) { showScenario('nothing-selected', agentId.value, 'gallery'); return }
  runAll.value = {}
  runAllApplied.value = false
  view.value = 'run-all'
  await runPipeline(rpc)
}

/** Run all's Retry: carries on from the agent that failed. */
export async function retryRunAll(rpc: RpcClient): Promise<void> {
  await runPipeline(rpc)
}

async function runPipeline(rpc: RpcClient): Promise<void> {
  stopRunAllFlag = false
  runAllFailure.value = null
  for (const id of PIPELINE_ORDER) {
    if (stopRunAllFlag) return
    if (!isRunnable(agentById(id)) || (runAll.value?.[id] ?? 0) >= 100) continue
    const off = rpc.on<RunProgress>(MSG.progress, (p) => { if (run.value?.runId === p.runId) runAll.value = { ...(runAll.value ?? {}), [id]: Math.min(99, p.percent) } })
    await runOne(rpc, id, { navigate: false })
    off()
    if (stopRunAllFlag) return
    // The later agents wait: the run order keeps their fixes from colliding.
    if (runAllFailure.value) return
    runAll.value = { ...(runAll.value ?? {}), [id]: 100 }
  }
}

/** "Stop all": halt the pipeline and go back to the gallery. */
export function stopAllAndLeave(rpc: RpcClient): void {
  stopRunAllFlag = true
  void stopRun(rpc)
  runAll.value = null
  runAllFailure.value = null
  view.value = 'gallery'
}

// ---- voice -----------------------------------------------------------------

type Recognition = { start(): void; stop(): void; abort(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; lang: string; interimResults: boolean; continuous: boolean }
let recognition: Recognition | null = null

/** The browser's speech recognition, when the host has one (Figma desktop may not). */
export function speechRecognition(): Recognition | null {
  const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  try { return new Ctor() } catch { return null }
}

/** Mic pressed. Idle anywhere → Voice view and listen; listening → send what was heard; speaking → interrupt. */
export function toggleMic(rpc: RpcClient): void {
  if (view.value !== 'voice') {
    voiceReturn.value = view.value
    view.value = 'voice'
    voice.value = 'idle'
    transcript.value = ''
  }
  if (voice.value === 'listening') {
    recognition?.stop()
    recognition = null
    const heard = transcript.value.trim()
    voice.value = 'idle'
    if (heard) void sendMessage(rpc, heard)
    return
  }
  if (voice.value === 'speaking') { clearTimeout(speakTimer); speakTimer = undefined; voice.value = 'idle'; return }
  if (voice.value === 'thinking') return
  recognition = speechRecognition()
  if (!recognition) { say('info', 'No microphone access in this window: type your request below instead.'); return }
  voice.value = 'listening'
  transcript.value = ''
  recognition.lang = 'en-GB'
  recognition.interimResults = true
  recognition.continuous = true
  recognition.onresult = (e) => { transcript.value = Array.from(e.results, (r) => r[0]?.transcript ?? '').join(' ') }
  recognition.onerror = () => { voice.value = 'idle'; recognition = null }
  recognition.onend = () => { if (voice.value === 'listening') toggleMic(rpc) }
  try { recognition.start() } catch { voice.value = 'idle'; recognition = null }
}

/** Phrases the agent ends its reply with when it offers to act; the plugin then does it. */
const ACTIONS: Record<string, (rpc: RpcClient) => void | Promise<unknown>> = {
  '[apply-safe]': (rpc) => { const r = results.value[agentId.value]; return r ? applySafeFixes(rpc, r.findings) : undefined },
  '[annotate]': (rpc) => { const r = results.value[agentId.value]; return r ? rpc.call(MSG.annotate, { findings: r.findings.map((f) => ({ nodeIds: f.nodeIds, label: annotationLabel(f) })) }, WRITE_TIMEOUT_MS).catch(() => undefined) : undefined },
  '[report]': (rpc) => { const r = results.value[agentId.value]; return r ? writeReport(rpc, agentById(agentId.value), r, openFindings(r.findings, findingStatus.value), false) : undefined },
  '[show-findings]': () => { if (results.value[agentId.value]) openResults(agentId.value) },
}

/** A typed or spoken request to the current agent, answered by the configured model with the run as context. */
export async function sendMessage(rpc: RpcClient, text: string): Promise<void> {
  const prompt = text.trim()
  if (!prompt || voice.value === 'thinking') return
  const agent = agentById(agentId.value)
  chat.value = [...chat.value, { role: 'user', text: prompt }]
  transcript.value = ''
  voice.value = 'thinking'
  const history = chat.value.slice(-8).map((t) => ({ role: t.role, content: t.text }))
  try {
    const reply = await rpc.call<ChatResult>(MSG.chat, { agent: agent.id, messages: history, context: chatContext(agent, results.value[agent.id], findingStatus.value) }, CHAT_TIMEOUT_MS)
    if (reply.status !== 'answered') {
      chat.value = [...chat.value, { role: 'assistant', text: reply.reason === 'disabled' ? 'AI Agent Assistance is switched off in Settings, so I can’t chat. Turn it on and add a key.' : 'Add a Claude, OpenAI or Gemini key in Settings › AI Agent Assistance and I can talk you through the run.' }]
      voice.value = 'idle'
      return
    }
    const action = Object.keys(ACTIONS).find((k) => reply.text.includes(k))
    const spoken = reply.text.replace(/\s*\[[a-z-]+\]\s*$/i, '').trim()
    chat.value = [...chat.value, { role: 'assistant', text: spoken, steps: action ? [`Doing it: ${action.slice(1, -1).replace('-', ' ')}`] : undefined }]
    voice.value = 'speaking'
    clearTimeout(speakTimer)
    speakTimer = setTimeout(() => { speakTimer = undefined; if (voice.value === 'speaking') voice.value = 'idle' }, SPEAK_MS)
    if (action) await ACTIONS[action]!(rpc)
  } catch (error: unknown) {
    chat.value = [...chat.value, { role: 'assistant', text: `I couldn’t answer: ${error instanceof Error ? error.message : 'no reply'}` }]
    voice.value = 'idle'
  }
}

export function leaveVoice(): void {
  clearTimeout(speakTimer)
  speakTimer = undefined
  recognition?.abort()
  recognition = null
  voice.value = 'idle'
  const back: View = voiceReturn.value === 'voice' ? 'gallery' : voiceReturn.value
  // A run that finished while the user was talking lands on its results.
  view.value = back === 'running' && !run.value ? 'results' : back
}

/** Clear every timer and subscription (tab unmount / tests). */
export function stopAll(): void {
  clearTimeout(speakTimer)
  speakTimer = undefined
  unsubscribe?.()
  unsubscribe = undefined
  recognition?.abort()
  recognition = null
  stopRunAllFlag = true
}
