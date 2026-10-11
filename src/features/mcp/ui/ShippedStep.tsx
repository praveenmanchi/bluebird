import { Button, ConnectionRow, Icon, Input, SectionTitle } from '@shared/ui'
import { PULL_REQUEST, REVIEWER, issueUrl } from '../fixtures'
import { afterPush, branch, files, linkedIssue, scenario, startOver, steps } from '../state'
import { ActionBar } from './ActionBar'
import { Card } from './cards'
import { ShipStepsCard } from './ShipPushing'
import './ShippedStep.css'

export interface ShippedStepProps {
  onOpenUrl: (url: string) => void
  onCopyLink: (url: string) => void
  onCopyPrompt: () => void
}

/** Sum of the fixture step timings ("1s", "2s", …) — the "Shipped in" figure. */
export function shippedSeconds(times: readonly string[]): number {
  return times.reduce((sum, t) => sum + (Number.parseInt(t, 10) || 0), 0)
}

/** Figma "MCP v2 · 6 Ship · PR link": the PR is open, with its link and what else changed. */
export function ShippedStep({ onOpenUrl, onCopyLink, onCopyPrompt }: ShippedStepProps) {
  const pr = PULL_REQUEST
  const issue = linkedIssue.value
  const opts = afterPush.value
  const list = steps.value
  const updated = [
    issue && opts.moveIssue && { name: `Jira · ${issue.key}`, detail: `Moved to In review${opts.linkPr && opts.openPr ? ` · PR #${pr.number} linked` : ''}` },
    { name: 'Figma', detail: `${scenario.value.selection.frame} marked Ready for dev` },
    opts.openPr && { name: 'GitHub', detail: `Review requested from ${REVIEWER}` },
  ].filter((u): u is { name: string; detail: string } => Boolean(u))

  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Pull request">
          <div class="bb-mcp-handoff__success">
            <h3 class="bb-mcp-handoff__success-title">
              <Icon name="status-good" class="bb-mcp-handoff__success-icon" />
              {opts.openPr ? `PR #${pr.number} is open` : `${branch.value} is pushed`}
            </h3>
            <p class="bb-mcp-handoff__caption">{branch.value} → main · {files.value.length} files · +{pr.additions} lines</p>
            <div class="bb-mcp-handoff__buttons">
              {opts.openPr && <Button onClick={() => onOpenUrl(pr.url)}>Open PR</Button>}
              {issue && <Button variant="secondary" onClick={() => onOpenUrl(issueUrl(issue.key))}>View {issue.key}</Button>}
            </div>
          </div>
          {opts.openPr && (
            <>
              <SectionTitle title="Pull request link" showCount={false} showAction={false} />
              <Input label="Share it with your developer" value={pr.url} readOnly />
              <div class="bb-mcp-handoff__buttons">
                <Button onClick={() => onCopyLink(pr.url)}>Copy link</Button>
                <Button variant="secondary" onClick={() => onOpenUrl(pr.url)}>Open pull request</Button>
                <Button variant="secondary" onClick={onCopyPrompt}>Copy prompt</Button>
              </div>
              <p class="bb-mcp-handoff__caption">The PR description carries the frame link and a Claude Code prompt, so a developer can pull the same selection through the Figma MCP server.</p>
            </>
          )}
          <SectionTitle title="Also updated" showCount={false} showAction={false} />
          <ul class="bb-mcp-handoff__stack">
            {updated.map((u) => <li key={u.name}><ConnectionRow name={u.name} detail={u.detail} showAction={false} /></li>)}
          </ul>
        </Card>
        <ShipStepsCard steps={list} status={() => 'done'} />
      </div>
      <ActionBar
        summary={`Shipped in ${shippedSeconds(list.map((s) => s.time))} s`}
        secondary={[{ label: 'New handoff', onClick: startOver }]}
        primary={{ label: 'Done', onClick: startOver }}
      />
    </>
  )
}
