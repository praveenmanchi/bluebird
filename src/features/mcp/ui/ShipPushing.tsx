import { Notice, PublishStep, SectionTitle, type PublishStepStatus } from '@shared/ui'
import type { ShipStepFixture } from '../fixtures'
import { github, linkedIssue, selection, shipProgress, steps } from '../state'
import { ActionBar } from './ActionBar'
import { Card, IssueRow } from './cards'
import './ShipPushing.css'

export interface ShipStepsCardProps {
  steps: readonly ShipStepFixture[]
  /** Where row `index` is: done, running, queued or failed. */
  status: (index: number) => PublishStepStatus
}

/** Figma "Ship steps": one Publish Step per push stage (also on PR link and Push rejected). */
export function ShipStepsCard({ steps: list, status }: ShipStepsCardProps) {
  return (
    <Card label="Ship steps">
      <SectionTitle title="Ship steps" showCount={false} showAction={false} />
      <ol class="bb-mcp-handoff__steps" aria-live="polite">
        {list.map((s, i) => {
          const st = status(i)
          return <li key={s.id}><PublishStep status={st} title={s.title} detail={s.detail} time={st === 'queued' ? '—' : s.time} /></li>
        })}
      </ol>
    </Card>
  )
}

/** Figma "MCP v2 · 5 Ship · Pushing": the steps walking forward, the linked issue and "Keep the plugin open". */
export function ShipPushing() {
  const at = shipProgress.value
  const issue = linkedIssue.value
  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <ShipStepsCard steps={steps.value} status={(i) => i < at ? 'done' : i === at ? 'running' : 'queued'} />
        {issue && (
          <Card label="Linked issue">
            <SectionTitle title="Linked Jira issue" showCount={false} showAction={false} />
            <IssueRow issue={issue} />
            <Notice tone="info" title="Keep the plugin open">Bluebird pushes through the GitHub API from this plugin. It usually takes under 10 seconds.</Notice>
          </Card>
        )}
      </div>
      <ActionBar summary={`Shipping ${selection.value?.frame ?? 'the selection'} to ${github.value.repo}…`} primary={{ label: 'Opening PR…', disabled: true, loading: true }} />
    </>
  )
}
