import { useEffect, useMemo } from 'preact/hooks'
import { signal } from '@preact/signals'
import { useRpc, type AiScenarioAction, type FindingAction } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { AGENTS, PIPELINE_ORDER, RUN_ALL_COPY, SCOPES, agentById, isRunnable, type AgentDef } from '../agents'
import { INTEGRATIONS_MSG, type IntegrationSettings } from '@shared/integrations'
import { isProviderConfig, selectProvider, PROVIDER_LABEL } from '@shared/ai'
import { MSG, type AgentFinding } from '../messages'
import {
  applyFindings, applySafeFixes, backToGallery, leaveVoice, markdownReport, openFindings, openResults, openSetup, overallProgress,
  pipelineState, refreshScope, runOne, runSummary, sendMessage, setFindingStatus, setScope, speechRecognition, startRunAll, stopAll, stopAllAndLeave, stopRun,
  toggleMic, writeReport, leaveScenario, retryRunAll, startRun, type PipelineState,
} from '../run'
import {
  agentId, brands, chat, filter, findingStatus, mode, notice, outputs, reset, results, rules, run, runAll, runAllApplied, scope, scopeInfo, transcript, view, voice, runAllFailure, scenario,
} from '../state'
import { AgentsGallery, scopeMetaFor, type CardStatus, type RecentRun } from './AgentsGallery'
import { AgentsResults } from './AgentsResults'
import { AgentsRunAll, type PipelineRow } from './AgentsRunAll'
import { AgentsRunning } from './AgentsRunning'
import { AgentsScenario } from './AgentsScenario'
import { AgentsSetup } from './AgentsSetup'
import { AgentsVoice } from './AgentsVoice'
import { downloadText, safeFilename } from './download'

/** Whether Settings hold a usable model key (read once per mount). */
const modelReady = signal(false)

/** Rule id → enabled for one agent, read from the tab-wide map. */
function rulesOf(agent: AgentDef): Record<string, boolean> {
  return Object.fromEntries(agent.rules.map((r) => [r.id, rules.value[`${agent.id}:${r.id}`] ?? r.enabled]))
}

/** "just now" / "4 min ago". */
const ago = (then: number, now = Date.now()): string => {
  const minutes = Math.floor((now - then) / 60_000)
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} h ago`
}

/**
 * AI Agents tab ("UX AI agents"): a gallery of expert agents, each with a setup, a live
 * run over the open document, results that can be applied, annotated and drawn on the
 * canvas, and a conversation with the agent about its run, plus "run all".
 */
export function Tab() {
  const rpc = useRpc()
  const canListen = useMemo(() => speechRecognition() !== null, [])

  useEffect(() => {
    void refreshScope(rpc)
    // The scope follows the selection while the gallery or setup is open.
    const off = rpc.on<{ count: number }>('shell:selection', () => { if (!run.value) void refreshScope(rpc) })
    return () => { off(); stopAll(); reset() }
  }, [rpc])

  // Whether a model is configured, for the Setup note on the agents that need one.
  useEffect(() => {
    rpc.call<IntegrationSettings>(INTEGRATIONS_MSG.get).then((s) => { modelReady.value = isProviderConfig(selectProvider(s.ai)) }, () => undefined)
  }, [rpc])

  const agent = agentById(agentId.value)
  const result = results.value[agent.id]
  const onFinding = (finding: AgentFinding, action: FindingAction) => {
    if (action === 'locate') { void rpc.call(MSG.focus, { nodeId: finding.nodeId }).catch(() => { notice.value = { tone: 'error', text: 'That layer no longer exists.' } }); return }
    if (action === 'ignore') { setFindingStatus(finding.id, 'ignored'); return }
    if (!finding.fix || finding.fix.kind === 'manual') { notice.value = { tone: 'info', text: finding.fix?.note ?? 'This one needs a designer: there is no automatic fix.' }; return }
    void applyFindings(rpc, [finding])
  }
  const open = result ? openFindings(result.findings, findingStatus.value) : []

  const exportReport = () => {
    if (!result) return
    void writeReport(rpc, agent, result, open)
    if (outputs.value.summary) {
      downloadText(safeFilename([agent.title, result.scope.name], 'md'), markdownReport(agent, result, open), 'text/markdown')
      downloadText(safeFilename([agent.title, result.scope.name], 'json'), JSON.stringify({ agent: agent.id, scope: result.scope, score: result.score, findings: open }, null, 2), 'application/json')
    }
  }
  const copyForJira = () => {
    if (!result) return
    const manual = open.filter((f) => !f.fixable)
    const text = manual.map((f) => `* [${f.severity}] ${f.title} — ${f.meta}${f.fixLabel ? ` — ${f.fixLabel}` : ''}`).join('\n')
    const clipboard = (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } }).navigator?.clipboard
    if (clipboard) clipboard.writeText(text).then(() => { notice.value = { tone: 'info', text: `${manual.length} ${manual.length === 1 ? 'issue' : 'issues'} copied as a Jira-ready list. Paste into a ticket, or into the Jira tab’s comment box.` } }, () => { notice.value = { tone: 'error', text: 'Couldn’t reach the clipboard.' } })
    else notice.value = { tone: 'error', text: 'Couldn’t reach the clipboard.' }
  }

  switch (view.value) {
    case 'setup':
      return (
        <AgentsSetup
          agent={agent}
          scope={scope.value}
          scopeInfo={scopeInfo.value}
          modelReady={modelReady.value}
          rules={rulesOf(agent)}
          mode={mode.value}
          brands={brands.value}
          outputs={outputs.value}
          onScope={(s) => setScope(rpc, s)}
          onToggleRule={(id, on) => { rules.value = { ...rules.value, [`${agent.id}:${id}`]: on } }}
          onMode={(m) => { mode.value = m }}
          onBrand={(b, on) => { brands.value = { ...brands.value, [b]: on } }}
          onOutput={(id, on) => { outputs.value = { ...outputs.value, [id]: on } }}
          onRun={() => startRun(rpc, agent.id, modelReady.value)}
          onMic={() => toggleMic(rpc)}
          onBack={() => backToGallery(rpc)}
        />
      )
    case 'scenario': {
      const shown = scenario.value
      if (!shown) { view.value = 'gallery'; return null }
      const owner = agentById(shown.agent)
      const again = { label: 'Run again', onClick: () => { leaveScenario('setup'); startRun(rpc, owner.id, modelReady.value) } }
      const back = { label: 'Back to agents', onClick: () => leaveScenario('gallery') }
      const settings = (label: string) => ({ label, onClick: requestSettings })
      const findings = results.value[owner.id]?.findings.length ?? 0
      const partial = findings ? [{ label: `See ${findings} ${findings === 1 ? 'finding' : 'findings'}`, onClick: () => { leaveScenario(); openResults(owner.id) } }] : [back]
      const actions = ((): readonly AiScenarioAction[] => {
        switch (shown.scene) {
          case 'no-connection': return [settings('Set up a connection'), back]
          case 'default-needed': return [settings('Choose a default'), back]
          case 'wrong-key': return [settings('Update key'), back]
          case 'wire-cut': return [again, settings('Check Settings')]
          case 'timed-out': return [again, { label: 'Change scope', onClick: () => leaveScenario('setup') }]
          case 'nothing-selected': return [{ label: 'Use the whole page', onClick: () => { setScope(rpc, 'page'); leaveScenario() } }, back]
          case 'all-clear': return [{ label: 'Run another agent', onClick: () => leaveScenario('gallery') }]
          case 'fix-stuck': return [{ label: 'See what’s left', onClick: () => leaveScenario('results') }, back]
          default: return [again, ...partial]
        }
      })()
      return <AgentsScenario scene={shown.scene} agent={owner} bot={owner.bot} provider={shown.provider} body={shown.body} actions={actions} />
    }
    case 'running': {
      const live = run.value?.agent === agent.id ? run.value : null
      const steps = live ? live.steps : (result?.steps ?? [])
      const findings = live ? live.findings : (result?.findings ?? [])
      return (
        <AgentsRunning
          agent={agent}
          percent={live ? live.percent : 100}
          progressLabel={live ? live.label : 'Done'}
          steps={steps}
          findings={openFindings(findings, findingStatus.value)}
          foundCount={findings.length}
          onStop={() => { void stopRun(rpc) }}
          onFindingAction={onFinding}
          onBack={() => backToGallery(rpc)}
        />
      )
    }
    case 'results': {
      if (!result) { view.value = 'setup'; return null }
      const resolved = result.findings.length - open.length
      const score = result.findings.length ? Math.round(result.score + ((100 - result.score) * resolved) / result.findings.length) : result.score
      const fixable = open.filter((f) => f.fixable).length
      const modes = result.brandModes.length
      const modelNote = result.model && 'model' in result.model ? `Reviewed by ${PROVIDER_LABEL[result.model.provider]} · ${result.model.model}` : result.model && 'skipped' in result.model ? `Model skipped: ${result.model.skipped}` : undefined
      return (
        <AgentsResults
          agent={agent}
          findings={open}
          filter={filter.value}
          score={score}
          caption={`${open.length} ${open.length === 1 ? 'issue' : 'issues'} in ${result.scope.frames} ${result.scope.frames === 1 ? 'frame' : 'frames'}${modes ? ` across ${modes} brand ${modes === 1 ? 'mode' : 'modes'}` : ''} · ${fixable} can be fixed with tokens or text${result.scope.truncated ? ' · large scope: first layers only' : ''}`}
          status={findingStatus.value}
          notice={notice.value}
          modelNote={modelNote}
          onFilter={(f) => { filter.value = f }}
          onFindingAction={onFinding}
          onApplySafe={() => { void applySafeFixes(rpc, result.findings) }}
          onExport={exportReport}
          onAnnotate={() => { void rpc.call(MSG.annotate, { findings: open.map((f) => ({ nodeIds: f.nodeIds, label: `${f.meta.split(' · ')[0]} — ${f.title}.${f.fixLabel ? ` ${f.fixLabel}.` : ''}` })) }, 60_000).then((r) => { notice.value = { tone: 'info', text: `Dev Mode annotations written on ${(r as { annotated: number }).annotated} layers.` } }, (e: unknown) => { notice.value = { tone: 'error', text: e instanceof Error ? e.message : 'Couldn’t annotate.' } }) }}
          onCreateJira={copyForJira}
          onRerun={() => { void runOne(rpc, agent.id) }}
          onBack={() => backToGallery(rpc)}
        />
      )
    }
    case 'voice':
      return (
        <AgentsVoice
          agent={agent}
          phase={voice.value}
          turns={chat.value}
          transcript={transcript.value}
          canListen={canListen}
          onMic={() => toggleMic(rpc)}
          onQuickReply={(text) => { void sendMessage(rpc, text) }}
          onSend={(text) => { void sendMessage(rpc, text) }}
          onBack={leaveVoice}
        />
      )
    case 'run-all': {
      const progress = runAll.value ?? {}
      const failure = runAllFailure.value
      const runnable = AGENTS.filter(isRunnable)
      const doneAgents = runnable.filter((a) => (progress[a.id] ?? 0) >= 100)
      const info = scopeInfo.value
      const allFindings = doneAgents.flatMap((a) => results.value[a.id]?.findings ?? [])
      const openAll = openFindings(allFindings, findingStatus.value)
      const appliedAll = allFindings.filter((f) => findingStatus.value[f.id] === 'applied').length
      const rows: PipelineRow[] = PIPELINE_ORDER.map(agentById).map((a, i, ordered) => {
        const state: PipelineState = pipelineState(a, progress, failure?.agent)
        const r = results.value[a.id]
        const before = ordered[i - 1]
        const live = run.value?.agent === a.id ? run.value : null
        const text = state === 'failed' && failure ? failure.text
          : state === 'done' && r ? runSummary(r)
            : state === 'running' ? (live?.label ?? 'Starting…')
              : state === 'queued' ? (failure ? `Waiting for you to retry ${agentById(failure.agent).name}` : `Waits for ${before?.name ?? 'the scope'} to finish`)
                : 'Not available'
        return { agent: a, state, text }
      })
      return (
        <AgentsRunAll
          rows={rows}
          subtitle={RUN_ALL_COPY.subtitle(SCOPES.find((s) => s.id === scope.value)?.label ?? 'Selection', info?.name ?? '', info?.frames ?? 0)}
          done={doneAgents.length}
          total={runnable.length}
          findings={allFindings.length}
          fixable={runAllApplied.value ? appliedAll : openAll.filter((f) => f.fixable).length}
          percent={overallProgress(progress)}
          applied={runAllApplied.value}
          onStopAll={() => stopAllAndLeave(rpc)}
          onOpen={openResults}
          onRetry={() => { void retryRunAll(rpc) }}
          failedName={failure ? agentById(failure.agent).name : undefined}
          onOpenMerged={() => { openResults(doneAgents[0]?.id ?? 'accessibility') }}
          onApply={() => { void applyFindings(rpc, openAll.filter((f) => f.fixable)).then(() => { runAllApplied.value = true }) }}
          onMic={() => toggleMic(rpc)}
          onBack={() => stopAllAndLeave(rpc)}
        />
      )
    }
    default: {
      const cards = AGENTS.map((a): { agent: AgentDef; status: CardStatus } => {
        const live = run.value?.agent === a.id ? run.value : null
        const r = results.value[a.id]
        if (live) return { agent: a, status: { state: 'running', status: `Running ${Math.round(live.percent)}%`, meta: live.label } }
        if (r) return { agent: a, status: { state: 'ready', meta: `Last run ${ago(Date.now() - r.durationMs)} · ${runSummary(r)}` } }
        return { agent: a, status: a.needsModel && !modelReady.value ? { state: 'idle', meta: 'Needs a model key in Settings' } : { state: 'idle', meta: 'Not run on this file yet' } }
      })
      const recent: RecentRun[] = PIPELINE_ORDER.map(agentById).flatMap((a) => {
        const r = results.value[a.id]
        return r ? [{ id: r.runId, agent: a.id, bot: a.bot, text: `${a.name} · ${r.scope.name} (${r.scope.frames} ${r.scope.frames === 1 ? 'frame' : 'frames'}) · ${runSummary(r)}` }] : []
      })
      return (
        <AgentsGallery
          agents={cards}
          scope={scope.value}
          scopeInfo={scopeInfo.value}
          scopeMeta={scopeMetaFor(scopeInfo.value)}
          recentRuns={recent}
          onScope={(s) => setScope(rpc, s)}
          onOpen={openSetup}
          onStop={() => { void stopRun(rpc) }}
          onRunAll={() => { void startRunAll(rpc) }}
          onOpenReport={openResults}
          onMic={() => toggleMic(rpc)}
        />
      )
    }
  }
}
