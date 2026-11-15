import { Button, ConnectionRow, Icon, Input, SectionTitle } from '@shared/ui'
import type { TrackedPull, TrackResult } from '../messages'
import { chosenScreens, target } from '../state'
import { Card } from './cards'
import { ShipStepsCard, trackRows } from './ShipPushing'
import './ShippedStep.css'

export interface ShippedStepProps {
  /** The pull request GitHub answered with (never `waiting`). */
  pull: TrackResult
  onOpenUrl: (url: string) => void
  onCopyLink: (url: string) => void
}

const STATE = { open: 'is open', merged: 'is merged', closed: 'was closed' } as const

/** A library update with one pull request per screen: every one of them, each with Open. */
function PullList({ pulls, repo, onOpenUrl }: { pulls: readonly TrackedPull[]; repo: string; onOpenUrl: (url: string) => void }) {
  const names = chosenScreens.value.map((s) => s.name)
  const merged = pulls.every((p) => p.state === 'merged')
  return (
    <Card label="Pull requests">
      <div class="bb-mcp-handoff__success">
        <h3 class="bb-mcp-handoff__success-title">
          <Icon name="status-good" class="bb-mcp-handoff__success-icon" />
          {pulls.length} pull requests {merged ? 'are merged' : 'are open'}
        </h3>
        <p class="bb-mcp-handoff__caption">One per screen · {repo}</p>
      </div>
      <ul class="bb-mcp-handoff__stack">
        {pulls.map((p, i) => (
          <li key={p.branch}>
            <ConnectionRow
              name={`${names[i] ?? p.branch} · PR #${p.number}`}
              detail={`${p.title ?? p.branch} · ${STATE[p.state as keyof typeof STATE]}`}
              status={p.state === 'closed' ? 'issue' : 'good'}
              actionLabel="Open"
              onAction={() => { if (p.url) onOpenUrl(p.url) }}
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Figma "MCP v3 · 5 Track · Pull request open": the developer's pull request, with its link. */
export function ShippedStep({ pull, onOpenUrl, onCopyLink }: ShippedStepProps) {
  const { rows, status } = trackRows()
  if (pull.pulls) {
    return (
      <>
        <PullList pulls={pull.pulls} repo={pull.repo} onOpenUrl={onOpenUrl} />
        <ShipStepsCard steps={rows} status={status} />
      </>
    )
  }
  const url = pull.url ?? ''
  return (
    <>
      <Card label="Pull request">
        <div class="bb-mcp-handoff__success">
          <h3 class="bb-mcp-handoff__success-title">
            <Icon name={pull.state === 'closed' ? 'status-issue' : 'status-good'} class="bb-mcp-handoff__success-icon" />
            PR #{pull.number} {STATE[pull.state as keyof typeof STATE]}
          </h3>
          <p class="bb-mcp-handoff__caption">{pull.branch} → {target.value.branch} · {pull.repo}</p>
          <div class="bb-mcp-handoff__buttons">
            <Button onClick={() => onOpenUrl(url)}>Open PR</Button>
            <Button variant="secondary" onClick={() => onCopyLink(url)}>Copy link</Button>
          </div>
        </div>
        <SectionTitle title="Pull request link" showCount={false} showAction={false} />
        <Input label="Share it with your team" value={url} readOnly />
        <p class="bb-mcp-handoff__caption">Claude Code opened this pull request from the copied prompt. Bluebird matched it by its branch name.</p>
      </Card>
      <ShipStepsCard steps={rows} status={status} />
    </>
  )
}
