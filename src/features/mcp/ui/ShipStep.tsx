import { Checkbox, CodeSnippet, ConnectionRow, Input, PublishEmptyState, SectionTitle } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { rejectedLog } from '../fixtures'
import {
  afterPush, branch, canPush, commit, files, github, githubConnected, goTo, linkedIssue, path, selection, shipPhase, shipProgress, steps,
  type AfterPushOption,
} from '../state'
import { ActionBar } from './ActionBar'
import { Card } from './cards'
import { ShipPushing, ShipStepsCard } from './ShipPushing'
import './ShipStep.css'

export interface ShipStepProps {
  onCopyPrompt: () => void
  onPush: () => void
  /** "Push to new branch" on Push rejected: retry under a fresh branch name. */
  onPushNewBranch: () => void
}

function afterPushLabels(issueKey: string | undefined): readonly { id: AfterPushOption; label: string }[] {
  const labels: { id: AfterPushOption; label: string }[] = [{ id: 'openPr', label: 'Open a pull request' }]
  if (issueKey) labels.push({ id: 'linkPr', label: `Add PR link to ${issueKey}` }, { id: 'moveIssue', label: `Move ${issueKey} to In review` })
  return labels
}

function FilesCard() {
  const list = files.value
  return (
    <Card label="Files to push">
      <SectionTitle title="Files to push" count={String(list.length)} showAction={false} />
      <ul class="bb-mcp-handoff__stack">
        {list.map((f) => <li key={f.name}><ConnectionRow name={`${path.value}/${f.name}`} detail={f.detail} showAction={false} /></li>)}
      </ul>
    </Card>
  )
}

function ShipForm() {
  const issueKey = linkedIssue.value?.key
  return (
    <Card label="Ship to Git">
      <SectionTitle title="Ship to Git" showCount={false} showAction={false} />
      <div class="bb-mcp-handoff__fields">
        <Input class="bb-mcp-handoff__field" label="Branch" value={branch.value} onValueChange={(v) => { branch.value = v }} />
        <Input class="bb-mcp-handoff__field" label="Commit message" value={commit.value} onValueChange={(v) => { commit.value = v }} />
      </div>
      <div class="bb-mcp-handoff__toggles">
        {afterPushLabels(issueKey).map(({ id, label }) => (
          <Checkbox
            key={id}
            label={label}
            checked={afterPush.value[id]}
            onChange={(checked) => { afterPush.value = { ...afterPush.value, [id]: checked } }}
          />
        ))}
      </div>
    </Card>
  )
}

/** Figma "MCP v2 · 4 Ship", "Empty · GitHub not connected" and "Error · Push rejected"; hands "5 Ship · Pushing" to ShipPushing. */
export function ShipStep({ onCopyPrompt, onPush, onPushNewBranch }: ShipStepProps) {
  const phase = shipPhase.value
  const at = shipProgress.value
  const issue = linkedIssue.value
  const repo = github.value
  const frame = selection.value?.frame ?? 'Selection'
  const copy = { label: 'Copy prompt for Claude Code', onClick: onCopyPrompt }
  const back = { label: 'Back', onClick: () => goTo(2) }

  if (phase === 'pushing') return <ShipPushing />

  if (phase === 'rejected') {
    return (
      <>
        <div class="bb-mcp-handoff__panels">
          <Card label="Push result">
            <SectionTitle title={`${frame} · not shipped`} showCount={false} showAction={false} />
            <PublishEmptyState
              state="failed"
              icon="git-merg"
              title="Push rejected"
              body={`${branch.value} already exists on origin with commits you don’t have. Push to a new branch, or pull those commits and try again.`}
              actions={[{ label: 'Copy prompt', variant: 'secondary', onClick: onCopyPrompt }, { label: 'Push to new branch', variant: 'primary', onClick: onPushNewBranch }]}
            />
            <SectionTitle title="Git output" showCount={false} showAction={false} />
            <CodeSnippet language="Log" code={rejectedLog(repo.repo, branch.value)} />
          </Card>
          <ShipStepsCard steps={steps.value} status={(i) => i < at ? 'done' : i === at ? 'failed' : 'queued'} />
        </div>
        <ActionBar summary={`Nothing was pushed${issue ? ` · ${issue.key} unchanged` : ''}`} secondary={[back]} primary={{ label: 'Retry push', onClick: onPush }} />
      </>
    )
  }

  return (
    <>
      <div class="bb-mcp-handoff__panels">
        {githubConnected.value ? <ShipForm /> : (
          <Card label="Ship to Git">
            <SectionTitle title="Ship to Git" showCount={false} showAction={false} />
            <PublishEmptyState
              state="not-connected"
              title="Connect GitHub to push"
              body={`${repo.problem ?? 'Add the repository and a personal access token in Settings › MCP + code sync'} to push branches and open pull requests. You can still copy the prompt and ship from Claude Code.`}
              actions={[{ label: 'Open Settings', variant: 'primary', onClick: requestSettings }]}
            />
          </Card>
        )}
        <FilesCard />
      </div>
      <ActionBar
        summary={githubConnected.value ? `${files.value.length} files → ${repo.repo} · base ${repo.branch}` : 'GitHub isn’t connected.'}
        secondary={[copy, back]}
        primary={{ label: 'Push and open PR', disabled: !canPush.value, onClick: onPush }}
      />
    </>
  )
}
