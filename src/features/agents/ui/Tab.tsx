import { useEffect } from 'preact/hooks'
import { useRpc, type FindingAction } from '@shared/ui'
import { AGENTS, PIPELINE_ORDER, RUN_ALL_COPY, SCOPES, SCOPE_SIZE, agentById, isRunnable, type AgentDef, type AgentFinding } from '../fixtures'
import { MSG } from '../messages'
import {
  STEP_DONE_AT, applySafeFixes, backToGallery, leaveVoice, openFindings, openResults, openSetup, overallProgress,
  pipelineState, revealedCount, sendQuickReply, setFindingStatus, startRun, startRunAll, stopAll, stopAllAndLeave,
  stopCard, stopRun, toggleMic,
} from '../run'
import {
  agentId, brands, cards, chat, filter, findingStatus, mode, outputs, reset, rules, run, runAll, runAllApplied, scope,
  view, voice,
} from '../state'
import { AgentsGallery } from './AgentsGallery'
import { AgentsResults } from './AgentsResults'
import { AgentsRunAll, type PipelineRow } from './AgentsRunAll'
import { AgentsRunning, type RunningStep } from './AgentsRunning'
import { AgentsSetup } from './AgentsSetup'
import { AgentsVoice } from './AgentsVoice'

const brandCount = () => Object.values(brands.value).filter(Boolean).length

/** Rule id → enabled for one agent, read from the tab-wide map. */
function rulesOf(agent: AgentDef): Record<string, boolean> {
  return Object.fromEntries(agent.rules.map((r) => [r.id, rules.value[`${agent.id}:${r.id}`] ?? r.enabled]))
}

function runningSteps(agent: AgentDef, progress: number): RunningStep[] {
  const on = Object.values(rulesOf(agent)).filter(Boolean).length
  const labels = [`Loaded rule pack · ${agent.rulePack} (${on} of ${agent.rules.length} rules on)`, ...agent.steps]
  return labels
    .map((label, i) => ({ label, i }))
    .filter(({ i }) => i === 0 || progress >= (STEP_DONE_AT[i - 1] ?? 100))
    .map(({ label, i }) => ({ label, status: progress >= (STEP_DONE_AT[i] ?? 100) ? 'done' : 'running' }))
}

function progressLabel(progress: number): string {
  const size = SCOPE_SIZE[scope.value]
  const frames = Math.round((size.frames * progress) / 100)
  const layers = Math.round((size.layers * progress) / 100)
  return `Checking ${frames} of ${size.frames} frames · ${layers} of ${size.layers} layers · ${brandCount()} brand modes`
}

function pipelineRows(progress: Partial<Record<string, number>>): PipelineRow[] {
  const ordered = PIPELINE_ORDER.map(agentById)
  return ordered.map((agent) => {
    const state = pipelineState(agent, progress)
    const p = progress[agent.id] ?? 0
    const { running } = agent.pipeline
    const before = ordered.slice(0, ordered.indexOf(agent)).filter(isRunnable).at(-1)
    const text = state === 'done' ? agent.pipeline.done
      : state === 'running' ? `${running.label} · ${Math.round((running.total * p) / 100)} of ${running.total} ${running.unit}`
        : state === 'queued' ? `Waits for ${before?.name ?? 'the scope'} to finish`
          : 'Not available yet'
    return { agent, state, text }
  })
}

/**
 * AI Agents tab ("UX AI agents"): a gallery of expert agents, each with a setup,
 * a live run, results and a voice conversation, plus "run all". UI only for now:
 * runs are fake timer progressions over fixtures (see ../run.ts).
 */
export function Tab() {
  const rpc = useRpc()
  useEffect(() => () => { stopAll(); reset() }, [])

  const agent = agentById(agentId.value)
  const onFinding = (finding: AgentFinding, action: FindingAction) => {
    if (action === 'locate') { void rpc.call(MSG.focus, { nodeId: finding.nodeId }).catch(() => undefined); return }
    setFindingStatus(finding.id, action === 'apply' ? 'applied' : 'ignored')
  }
  const open = openFindings(agent.findings, findingStatus.value)

  switch (view.value) {
    case 'setup':
      return (
        <AgentsSetup
          agent={agent}
          scope={scope.value}
          rules={rulesOf(agent)}
          mode={mode.value}
          brands={brands.value}
          outputs={outputs.value}
          onScope={(s) => { scope.value = s }}
          onToggleRule={(id, on) => { rules.value = { ...rules.value, [`${agent.id}:${id}`]: on } }}
          onMode={(m) => { mode.value = m }}
          onBrand={(b, on) => { brands.value = { ...brands.value, [b]: on } }}
          onOutput={(id, on) => { outputs.value = { ...outputs.value, [id]: on } }}
          onRun={() => startRun(agent.id)}
          onMic={toggleMic}
          onBack={backToGallery}
        />
      )
    case 'running': {
      const progress = run.value?.agent === agent.id ? run.value.progress : 100
      const revealed = agent.findings.slice(0, revealedCount(agent.findings.length, progress))
      return (
        <AgentsRunning
          agent={agent}
          percent={progress}
          progressLabel={progressLabel(progress)}
          steps={runningSteps(agent, progress)}
          findings={openFindings(revealed, findingStatus.value)}
          foundCount={revealed.length}
          onStop={stopRun}
          onFindingAction={onFinding}
          onBack={backToGallery}
        />
      )
    }
    case 'results': {
      const resolved = agent.findings.length - open.length
      const score = agent.findings.length ? Math.round(agent.score + ((100 - agent.score) * resolved) / agent.findings.length) : 100
      const frames = SCOPE_SIZE[scope.value].frames
      const fixable = open.filter((f) => f.fixable).length
      return (
        <AgentsResults
          agent={agent}
          findings={open}
          filter={filter.value}
          score={score}
          caption={`${open.length} issues in ${frames} frames across ${brandCount()} brand modes · ${fixable} can be fixed with tokens`}
          onFilter={(f) => { filter.value = f }}
          onFindingAction={onFinding}
          onApplySafe={() => applySafeFixes(agent.findings)}
          onBack={backToGallery}
        />
      )
    }
    case 'voice':
      return <AgentsVoice agent={agent} phase={voice.value} turns={chat.value} onMic={toggleMic} onQuickReply={sendQuickReply} onBack={leaveVoice} />
    case 'run-all': {
      const progress = runAll.value ?? {}
      const runnable = AGENTS.filter(isRunnable)
      const doneAgents = runnable.filter((a) => (progress[a.id] ?? 0) >= 100)
      const size = SCOPE_SIZE[scope.value]
      return (
        <AgentsRunAll
          rows={pipelineRows(progress)}
          subtitle={RUN_ALL_COPY.subtitle(SCOPES.find((s) => s.id === scope.value)?.label ?? 'Selection', size.name, size.frames)}
          done={doneAgents.length}
          total={runnable.length}
          findings={doneAgents.reduce((n, a) => n + a.pipeline.findings, 0)}
          fixable={doneAgents.reduce((n, a) => n + a.pipeline.fixable, 0)}
          percent={overallProgress(progress)}
          applied={runAllApplied.value}
          onStopAll={stopAllAndLeave}
          onOpen={openResults}
          onApply={() => { runnable.forEach((a) => applySafeFixes(a.findings)); runAllApplied.value = true }}
          onMic={toggleMic}
          onBack={stopAllAndLeave}
        />
      )
    }
    default:
      return (
        <AgentsGallery
          agents={AGENTS.map((a) => ({ agent: a, status: cards.value[a.id] }))}
          scope={scope.value}
          onScope={(s) => { scope.value = s }}
          onOpen={openSetup}
          onStop={stopCard}
          onRunAll={startRunAll}
          onOpenReport={openResults}
          onMic={toggleMic}
        />
      )
  }
}
