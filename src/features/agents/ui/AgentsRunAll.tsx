import { BotAvatar, Button, LinkButton, MetaBadge, ProgressBar, VoiceBar, type MetaBadgeTone } from '@shared/ui'
import { RUN_ALL_COPY, agentById, type AgentDef, type AgentId } from '../fixtures'
import type { PipelineState } from '../run'
import { BackLink } from './parts'
import './AgentsRunAll.css'

export interface PipelineRow { agent: AgentDef; state: PipelineState; text: string }

export interface AgentsRunAllProps {
  /** One row per agent, in Figma order. */
  rows?: readonly PipelineRow[]
  subtitle?: string
  done?: number
  total?: number
  findings?: number
  fixable?: number
  /** 0–100. */
  percent?: number
  /** Fixes were applied from the merged report. */
  applied?: boolean
  onStopAll?: () => void
  onOpen?: (id: AgentId) => void
  onOpenMerged?: () => void
  onApply?: () => void
  onMic?: () => void
  onBack?: () => void
}

const BADGE: Record<PipelineState, { label: string; tone: MetaBadgeTone }> = {
  done: { label: 'Done', tone: 'success' },
  running: { label: 'Running', tone: 'accent' },
  queued: { label: 'Queued', tone: 'neutral' },
  skipped: { label: 'Skipped', tone: 'neutral' },
}
const BOT_STATE = { done: 'default', running: 'working', queued: 'sleeping', skipped: 'default' } as const

// The Figma "AI Agents · Run all" screen, verbatim.
const FIGMA_ROWS: readonly PipelineRow[] = [
  { agent: agentById('accessibility'), state: 'done', text: '14 issues · 6 fixable with tokens' },
  { agent: agentById('spelling'), state: 'done', text: '3 typos · all fixable' },
  { agent: agentById('writing'), state: 'done', text: '9 suggestions · 2 button labels, 7 error messages' },
  { agent: agentById('content'), state: 'running', text: 'Replacing placeholder names · 5 of 9 layers' },
  { agent: agentById('design-system'), state: 'queued', text: 'Waits for Content to finish' },
  { agent: agentById('localization'), state: 'skipped', text: 'Not available yet' },
]

/** Figma "Agents body" on "AI Agents · Run all" (40000299:18411): every ready agent, one after another, merged. */
export function AgentsRunAll({
  rows = FIGMA_ROWS, subtitle = RUN_ALL_COPY.subtitle('Selection', 'Checkout flow', 3),
  done = 3, total = 5, findings = 26, fixable = 12, percent = 75, applied = false,
  onStopAll, onOpen, onOpenMerged, onApply, onMic, onBack,
}: AgentsRunAllProps) {
  const finished = done >= total
  return (
    <div class="bb-agents-run-all">
      <BackLink class="bb-agents-run-all__back" onBack={onBack} />
      <header class="bb-agents-run-all__header">
        <div class="bb-agents-run-all__title">
          <h2 class="bb-agents-run-all__heading">{RUN_ALL_COPY.title}</h2>
          <p class="bb-agents-run-all__caption">{subtitle}</p>
        </div>
        <Button variant="secondary" disabled={finished} onClick={onStopAll}>Stop all</Button>
      </header>

      <section class="bb-agents-run-all__overall" aria-label="Overall progress">
        <div class="bb-agents-run-all__head">
          <span class="bb-agents-run-all__label">{`${done} of ${total} agents done · ${findings} findings so far`}</span>
          <span class="bb-agents-run-all__percent">{Math.round(percent)}%</span>
        </div>
        <ProgressBar class="bb-agents-run-all__bar" value={percent} tone="success" aria-label="All agents progress" />
      </section>

      <div class="bb-agents-run-all__pipeline" role="list" aria-label="Pipeline">
        {rows.map(({ agent, state, text }) => (
          <div key={agent.id} role="listitem" class="bb-agents-run-all__row" data-state={state} data-agent={agent.id}>
            <BotAvatar class="bb-agents-run-all__bot" agent={agent.bot} state={BOT_STATE[state]} label="" />
            <div class="bb-agents-run-all__text">
              <span class="bb-agents-run-all__label">{agent.name}</span>
              <span class="bb-agents-run-all__caption">{text}</span>
            </div>
            <MetaBadge tone={BADGE[state].tone}>{BADGE[state].label}</MetaBadge>
            {state === 'done' && <LinkButton onClick={() => onOpen?.(agent.id)} aria-label={`Open ${agent.name} results`}>Open</LinkButton>}
          </div>
        ))}
      </div>

      <div class="bb-agents-run-all__merged">
        <span class="bb-agents-run-all__caption">{`Merged report: ${findings} findings · ${fixable} auto-fixable · grouped by layer`}</span>
        <div class="bb-agents-run-all__actions">
          <Button variant="secondary" onClick={onOpenMerged}>Open merged report</Button>
          <Button class="bb-agents-run-all__apply" disabled={!finished || applied} onClick={onApply}>
            {applied ? `${fixable} safe fixes applied` : `Apply ${fixable} safe fixes`}
          </Button>
        </div>
      </div>
      {!finished && <p class="bb-agents-run-all__caption bb-agents-run-all__note">{RUN_ALL_COPY.note}</p>}

      <VoiceBar class="bb-agents-run-all__voice" state="idle" micLabel="Talk to the agents" onToggle={onMic} />
    </div>
  )
}
