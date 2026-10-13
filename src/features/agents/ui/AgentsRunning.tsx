import { AgentHeader, Button, FindingRow, ProgressBar, ThinkingStep, type FindingAction, type ThinkingStepStatus } from '@shared/ui'
import { agentById, type AgentDef } from '../agents'
import { SAMPLE_FINDINGS } from '../fixtures'
import type { AgentFinding } from '../messages'
import { BackLink } from './parts'
import './AgentsRunning.css'

export interface RunningStep { label: string; status: ThinkingStepStatus }

export interface AgentsRunningProps {
  agent?: AgentDef
  /** 0–100. */
  percent?: number
  /** "Checking 8 of 12 frames · 96 of 148 layers · 5 brand modes". */
  progressLabel?: string
  steps?: readonly RunningStep[]
  /** Findings streamed in so far (newest last). */
  findings?: readonly AgentFinding[]
  /** "FOUND SO FAR · n"; defaults to the number of findings shown. */
  foundCount?: number
  onStop?: () => void
  onFindingAction?: (finding: AgentFinding, action: FindingAction) => void
  onBack?: () => void
}

// The Figma "AI Agents · Running" screen, verbatim.
const FIGMA_STEPS: readonly RunningStep[] = [
  { label: 'Loaded rule pack · WCAG 2.2 AA (6 of 7 rules on)', status: 'done' },
  { label: 'Resolved Brand UI tokens in 5 brand modes', status: 'done' },
  { label: 'Checked contrast · 3 frames × 5 modes', status: 'done' },
  { label: 'Checking target size and spacing exceptions…', status: 'running' },
]
const FIGMA_FINDINGS: readonly AgentFinding[] = [SAMPLE_FINDINGS.accessibility[0]!, SAMPLE_FINDINGS.accessibility[2]!, SAMPLE_FINDINGS.accessibility[3]!]

/** Figma "Agents body" on "AI Agents · Running" (40000298:6038): progress, reasoning steps, findings as they stream in. */
export function AgentsRunning({
  agent = agentById('accessibility'), percent = 64,
  progressLabel = 'Checking 8 of 12 frames · 96 of 148 layers · 5 brand modes',
  steps = FIGMA_STEPS, findings = FIGMA_FINDINGS, foundCount, onStop, onFindingAction, onBack,
}: AgentsRunningProps) {
  const pct = Math.round(percent)
  return (
    <div class="bb-agents-running">
      <BackLink class="bb-agents-running__back" onBack={onBack} />
      <AgentHeader
        class="bb-agents-running__header"
        name={agent.title}
        purpose={agent.headerPurpose}
        agent={agent.bot}
        botState="working"
        chips={agent.headerChips}
        status={`Running ${pct}%`}
        statusTone="accent"
      />

      <section class="bb-agents-running__progress" aria-label="Progress">
        <div class="bb-agents-running__head">
          <span class="bb-agents-running__label">{progressLabel}</span>
          <span class="bb-agents-running__percent">{pct}%</span>
        </div>
        <ProgressBar class="bb-agents-running__bar" value={pct} tone="success" aria-label={`${agent.title} progress`} />
        <div class="bb-agents-running__steps">
          {steps.map((s) => <ThinkingStep key={s.label} status={s.status}>{s.label}</ThinkingStep>)}
        </div>
      </section>

      <section class="bb-agents-running__found" aria-label="Found so far">
        <div class="bb-agents-running__found-head">
          <h3 class="bb-agents-running__caption bb-agents-running__caption--strong">FOUND SO FAR · {foundCount ?? findings.length}</h3>
          <span class="bb-agents-running__caption">Results stream in as each frame finishes</span>
        </div>
        <div class="bb-agents-running__list">
          {findings.map((f) => (
            <FindingRow
              key={f.id}
              class="bb-agents-running__finding"
              severity={f.severity}
              title={f.title}
              meta={f.meta}
              fix={f.fixLabel}
              onAction={(action) => onFindingAction?.(f, action)}
            />
          ))}
        </div>
      </section>

      <footer class="bb-agents-running__footer">
        <span class="bb-agents-running__caption">{agent.runningNote}</span>
        <Button variant="secondary" onClick={onStop}>Stop agent</Button>
      </footer>
    </div>
  )
}
