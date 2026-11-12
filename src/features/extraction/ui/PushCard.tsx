import { Button, ConnectionRow, Input, SectionTitle, SegmentedControl, TextArea, Toggle } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import {
  baseBranch, branchMode, branches, canPush, hasBranches, message, newBranch, newBranchProblem, notify, pushPhase, status, targetBranch, ticket, ticketValid,
  type BranchMode,
} from '../state'
import { BranchSelect } from './BranchSelect'

export interface PushCardProps {
  onPush: (pullRequest: boolean) => void
  onRefresh: () => void
}

const CHANNELS = [['devTeam', 'Dev team'], ['designSystem', 'Design system']] as const

/** Figma "Extraction v2 · 3 Results" › "Push and pull request". */
export function PushCard({ onPush, onRefresh }: PushCardProps) {
  const s = status.value!
  const pushing = pushPhase.value === 'pushing'
  const defaultBranch = s.defaultBranch
  // A pull request merges into the default branch, so it needs a different branch to come from.
  const target = branchMode.value === 'existing' ? targetBranch.value : newBranch.value.trim()
  const canOpenPr = canPush.value && hasBranches.value && target !== defaultBranch
  return (
    <section class="bb-extraction__card" aria-label="Push and pull request">
      <SectionTitle title="Push and pull request" showCount={false} showAction actionLabel="Refresh branches" onAction={onRefresh} />
      <SegmentedControl
        class="bb-extraction__filters"
        aria-label="Branch"
        options={[{ value: 'existing' as BranchMode, label: 'Existing branch' }, { value: 'new' as BranchMode, label: 'New branch' }]}
        value={branchMode.value}
        disabled={!hasBranches.value}
        onChange={(mode) => { branchMode.value = mode }}
      />
      {branchMode.value === 'existing'
        ? <BranchSelect label="Target branch" value={targetBranch.value || null} branches={branches.value} onChange={(b) => { targetBranch.value = b }} />
        : (
          <>
            <Input
              label="New branch name"
              placeholder="extraction/button-refresh"
              value={newBranch.value}
              error={!!newBranchProblem.value}
              helperText={newBranchProblem.value ?? undefined}
              onValueChange={(v) => { newBranch.value = v }}
            />
            {hasBranches.value && <BranchSelect label="Create from" value={baseBranch.value || defaultBranch} branches={branches.value} onChange={(b) => { baseBranch.value = b }} />}
          </>
        )}
      <TextArea
        label="Commit message"
        value={message.value}
        helperText="Also used as the pull request title and the channel message."
        onValueChange={(v) => { message.value = v }}
      />
      <Input
        label="Jira ticket (optional)"
        placeholder="BB-342"
        value={ticket.value}
        error={!ticketValid.value}
        helperText={ticketValid.value ? 'Added to the commit message and the pull request.' : 'A Jira key looks like BB-342.'}
        onValueChange={(v) => { ticket.value = v.toUpperCase() }}
      />
      <SectionTitle title="Notify on push" showCount={false} showAction actionLabel="Manage in Settings" onAction={requestSettings} />
      <div class="bb-extraction__list">
        {CHANNELS.map(([key, name]) => {
          const set = s.channels[key]
          return (
            <div key={key} class="bb-extraction__channel">
              <ConnectionRow class="bb-extraction__grow" name={name} status={set ? 'good' : 'issue'} detail={set ? 'Teams webhook from Settings › Notifications' : 'No webhook in Settings › Notifications'} showAction={false} />
              <Toggle label={`Notify ${name}`} checked={set && notify.value[key]} disabled={!set} onChange={(on) => { notify.value = { ...notify.value, [key]: on } }} />
            </div>
          )
        })}
      </div>
      <div class="bb-extraction__actions">
        <Button variant="secondary" disabled={!canPush.value} loading={pushing} onClick={() => onPush(false)}>Push to branch</Button>
        <Button variant="primary" disabled={!canOpenPr} loading={pushing} onClick={() => onPush(true)}>Create pull request</Button>
      </div>
      {canPush.value && !canOpenPr && hasBranches.value && (
        <p class="bb-extraction__hint">A pull request merges into {defaultBranch}, so pick or create another branch to open one.</p>
      )}
    </section>
  )
}
