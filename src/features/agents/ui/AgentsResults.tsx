import { AgentHeader, Button, FindingRow, MetaBadge, ReadinessMeter, type FindingAction, type MetaBadgeTone, type ReadinessMeterTone } from '@shared/ui'
import { agentById, type AgentDef, type AgentFinding } from '../fixtures'
import { filterCounts, matchesFilter } from '../run'
import type { FindingFilter } from '../state'
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
  onFilter?: (filter: FindingFilter) => void
  onFindingAction?: (finding: AgentFinding, action: FindingAction) => void
  onApplySafe?: () => void
  onExport?: () => void
  onCreateJira?: () => void
  onBack?: () => void
}

const FILTERS: readonly { id: FindingFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'serious', label: 'Serious' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'minor', label: 'Minor' },
  { id: 'fixable', label: 'Fixable' },
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
  agent = agentById('accessibility'), findings = agent.findings, filter = 'all', score = agent.score,
  caption = '14 issues in 3 frames across 5 brand modes · 6 can be fixed with tokens',
  onFilter, onFindingAction, onApplySafe, onExport, onCreateJira, onBack,
}: AgentsResultsProps) {
  const counts = filterCounts(findings)
  const shown = findings.filter((f) => matchesFilter(f, filter))
  const manual = counts.all - counts.fixable
  return (
    <div class="bb-agents-results">
      <BackLink class="bb-agents-results__back" onBack={onBack} />
      <AgentHeader
        class="bb-agents-results__header"
        name={agent.title}
        purpose={agent.headerPurpose}
        agent={agent.bot}
        botState="default"
        chips={agent.headerChips}
        status={counts.all ? `Done · ${counts.all} issues` : 'Done · no issues'}
        statusTone={counts.all ? 'warning' : 'success'}
      />

      <section class="bb-agents-results__summary" aria-label="Summary">
        <ReadinessMeter class="bb-agents-results__meter" tone={scoreTone(score)} value={score} label={agent.scoreLabel} caption={caption} />
        <div class="bb-agents-results__severity">
          {SEVERITY_BADGES.map((b) => <MetaBadge key={b.id} tone={b.tone}>{`${counts[b.id]} ${b.id}`}</MetaBadge>)}
        </div>
      </section>

      <SelecterRow
        class="bb-agents-results__filters"
        label="Filter findings"
        options={FILTERS.map((f) => ({ id: f.id, label: `${f.label} ${counts[f.id]}` }))}
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
              meta={f.meta}
              fix={f.fix}
              onAction={(action) => onFindingAction?.(f, action)}
            />
          </div>
        ))}
        {shown.length === 0 && <p class="bb-agents-results__empty">Nothing left in this filter.</p>}
      </div>

      <div class="bb-agents-results__actions">
        <Button variant="secondary" onClick={onExport}>Export report</Button>
        <Button variant="secondary" disabled={manual === 0} onClick={onCreateJira}>{`Create ${manual} Jira issues`}</Button>
        <Button disabled={counts.fixable === 0} onClick={onApplySafe}>{`Apply ${counts.fixable} safe fixes`}</Button>
      </div>
    </div>
  )
}
