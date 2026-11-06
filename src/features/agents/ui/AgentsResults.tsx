import { AgentHeader, Button, FindingRow, LinkButton, MetaBadge, Notice, ReadinessMeter, type FindingAction, type IconName, type MetaBadgeTone, type ReadinessMeterTone } from '@shared/ui'
import { agentById, type AgentDef } from '../agents'
import { SAMPLE_FINDINGS } from '../fixtures'
import type { AgentFinding } from '../messages'
import { filterCounts, matchesFilter } from '../run'
import type { FindingFilter, FindingStatus, Notice as RunNotice } from '../state'
import { BackLink, SelecterRow } from './parts'
import './AgentsResults.css'

export interface AgentsResultsProps {
  agent?: AgentDef
  /** Open findings (applied and ignored ones are gone). */
  findings?: readonly AgentFinding[]
  filter?: FindingFilter
  /** Conformance score 0–100. */
  score?: number
  /** The Readiness Meter caption. */
  caption?: string
  /** Per-finding outcome: a failed Apply keeps the row with its reason. */
  status?: Readonly<Record<string, FindingStatus>>
  /** The latest Apply / report / annotation outcome. */
  notice?: RunNotice | null
  /** Where the model came in, for the header chip ("Reviewed by claude-opus-5-5"). */
  modelNote?: string
  onFilter?: (filter: FindingFilter) => void
  onFindingAction?: (finding: AgentFinding, action: FindingAction) => void
  onApplySafe?: () => void
  /** "Export report": the report frame on the canvas plus the Markdown/JSON download. */
  onExport?: () => void
  /** "Annotate in Dev Mode": write every open finding into Figma's annotations. */
  onAnnotate?: () => void
  onCreateJira?: () => void
  onRerun?: () => void
  onBack?: () => void
}

const FILTERS: readonly { id: FindingFilter; label: string; icon: IconName }[] = [
  { id: 'all', label: 'All', icon: 'ui-general-show-as-list' },
  { id: 'critical', label: 'Critical', icon: 'ui-share-attention' },
  { id: 'serious', label: 'Serious', icon: 'ui-share-attention' },
  { id: 'moderate', label: 'Moderate', icon: 'ui-share-attention' },
  { id: 'minor', label: 'Minor', icon: 'ui-share-attention' },
  { id: 'fixable', label: 'Fixable', icon: 'ui-ai-feature-wand' },
]

const SEVERITY_BADGES: readonly { id: 'critical' | 'serious' | 'moderate' | 'minor'; tone: MetaBadgeTone }[] = [
  { id: 'critical', tone: 'danger' },
  { id: 'serious', tone: 'warning' },
  { id: 'moderate', tone: 'accent' },
  { id: 'minor', tone: 'neutral' },
]

export function scoreTone(score: number): ReadinessMeterTone {
  if (score >= 90) return 'success'
  return score >= 60 ? 'warning' : 'danger'
}

/** Figma "Agents body" on "AI Agents · Results" (40000299:6101): summary, severity filters, findings, bulk actions. */
export function AgentsResults({
  agent = agentById('accessibility'), findings = SAMPLE_FINDINGS[agent.id], filter = 'all', score = 70,
  caption = '14 issues in 3 frames across 8 brand modes · 6 can be fixed with tokens',
  status = {}, notice = null, modelNote,
  onFilter, onFindingAction, onApplySafe, onExport, onAnnotate, onCreateJira, onRerun, onBack,
}: AgentsResultsProps) {
  const counts = filterCounts(findings)
  const shown = findings.filter((f) => matchesFilter(f, filter))
  const manual = counts.all - counts.fixable
  return (
    <div class="bb-agents-results">
      <div class="bb-agents-results__nav">
        <BackLink class="bb-agents-results__back" onBack={onBack} />
        {onRerun && <LinkButton onClick={onRerun}>Run again</LinkButton>}
      </div>
      <AgentHeader
        class="bb-agents-results__header"
        name={agent.title}
        purpose={agent.headerPurpose}
        agent={agent.bot}
        botState="default"
        chips={modelNote ? [...agent.headerChips, modelNote] : agent.headerChips}
        status={counts.all ? `Done · ${counts.all} ${counts.all === 1 ? 'issue' : 'issues'}` : 'Done · no issues'}
        statusTone={counts.all ? 'warning' : 'success'}
      />
      {notice && <Notice tone={notice.tone} title={notice.tone === 'error' ? 'Something didn’t land' : 'Done'}>{notice.text}</Notice>}

      <section class="bb-agents-results__summary" aria-label="Summary">
        <ReadinessMeter class="bb-agents-results__meter" tone={scoreTone(score)} value={score} label={agent.scoreLabel} caption={caption} />
        <div class="bb-agents-results__severity">
          {SEVERITY_BADGES.map((b) => <MetaBadge key={b.id} tone={b.tone}>{`${counts[b.id]} ${b.id}`}</MetaBadge>)}
        </div>
      </section>

      <SelecterRow
        class="bb-agents-results__filters"
        label="Filter findings"
        options={FILTERS.map((f) => ({ ...f, label: `${f.label} ${counts[f.id]}` }))}
        value={filter}
        onChange={(f) => onFilter?.(f)}
      />

      <div class="bb-agents-results__findings" aria-label="Findings" role="list">
        {shown.map((f) => (
          <div key={f.id} role="listitem" class="bb-agents-results__item">
            <FindingRow
              class="bb-agents-results__finding"
              severity={f.severity}
              title={f.title}
              meta={status[f.id] === 'failed' ? `${f.meta} · couldn’t apply` : f.meta}
              fix={f.fixLabel}
              onAction={(action) => onFindingAction?.(f, action)}
            />
          </div>
        ))}
        {shown.length === 0 && <p class="bb-agents-results__empty">{counts.all === 0 ? 'Nothing to fix here. The agent found no issues in this scope.' : 'Nothing left in this filter.'}</p>}
      </div>

      <div class="bb-agents-results__actions">
        <Button variant="secondary" disabled={counts.all === 0} onClick={onExport}>Export report</Button>
        <Button variant="secondary" disabled={counts.all === 0} onClick={onAnnotate}>Annotate in Dev Mode</Button>
        <Button variant="secondary" disabled={manual === 0} onClick={onCreateJira}>{`Copy ${manual} for Jira`}</Button>
        <Button disabled={counts.fixable === 0} onClick={onApplySafe}>{`Apply ${counts.fixable} safe ${counts.fixable === 1 ? 'fix' : 'fixes'}`}</Button>
      </div>
    </div>
  )
}
