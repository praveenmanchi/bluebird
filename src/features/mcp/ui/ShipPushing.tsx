import { Notice, PublishStep, SectionTitle, type PublishStepStatus } from '@shared/ui'
import type { TrackedPull } from '../messages'
import { branch, chosenScreens, copiedAt, kind, release, selection, target, trackError, trackPhase, trackResult, trackedBranches } from '../state'
import { Card } from './cards'
import './ShipPushing.css'

export interface TrackRow { id: string; title: string; detail: string; time: string }

export interface ShipStepsCardProps {
  steps: readonly TrackRow[]
  /** Where row `index` is: done, running, queued or failed. */
  status: (index: number) => PublishStepStatus
}

/** Figma "Handoff progress": one Publish Step per stage of the hand-off. */
export function ShipStepsCard({ steps: list, status }: ShipStepsCardProps) {
  return (
    <Card label="Handoff progress">
      <SectionTitle title="Handoff progress" showCount={false} showAction={false} />
      <ol class="bb-mcp-handoff__steps" aria-live="polite">
        {list.map((s, i) => {
          const st = status(i)
          return <li key={s.id}><PublishStep status={st} title={s.title} detail={s.detail} time={st === 'queued' ? '—' : s.time} /></li>
        })}
      </ol>
    </Card>
  )
}

const PULL_TITLE = { open: 'is open', merged: 'is merged', closed: 'was closed without merging' } as const

const PULL_DONE: Readonly<Record<Exclude<TrackedPull['state'], 'waiting'>, PublishStepStatus>> = { open: 'done', merged: 'done', closed: 'failed' }

/** One row per screen branch (a library update with one pull request per screen). */
function screenRows(branches: readonly string[], pulls: readonly TrackedPull[] | undefined): { rows: TrackRow[]; status: PublishStepStatus[] } {
  const names = chosenScreens.value.map((s) => s.name)
  const failed = trackPhase.value === 'failed'
  const rows = branches.map((b, i) => {
    const pr = pulls?.find((p) => p.branch === b)
    const title = pr && pr.state !== 'waiting' ? `${names[i] ?? b}: PR #${pr.number} ${PULL_TITLE[pr.state]}` : `${names[i] ?? b}: waiting for the pull request`
    return { id: `pull:${b}`, title, detail: b, time: '' }
  })
  const status = branches.map((b): PublishStepStatus => {
    const pr = pulls?.find((p) => p.branch === b)
    if (pr && pr.state !== 'waiting') return PULL_DONE[pr.state]
    return failed ? 'failed' : trackPhase.value === 'idle' ? 'queued' : 'running'
  })
  return { rows, status }
}

/** What the prompt was about: the selection, or the release and its screens. */
function promptSubject(): string {
  if (kind.value !== 'library') return selection.value?.frame ?? 'Selection'
  const n = chosenScreens.value.length
  return `${release.value?.title ?? 'Library update'} · ${n} ${n === 1 ? 'screen' : 'screens'}`
}

/** The rows of a hand-off: the prompt left the plugin, then the developer's pull request(s) show up on GitHub. */
export function trackRows(): { rows: readonly TrackRow[]; status: (index: number) => PublishStepStatus } {
  const pull = trackResult.value
  const phase = trackPhase.value
  const repo = target.value.repo
  const copied: TrackRow = { id: 'copied', title: 'Prompt copied', detail: `${promptSubject()} · paste it into Claude Code in ${repo}`, time: copiedAt.value ?? '—' }
  const copiedStatus: PublishStepStatus = copiedAt.value ? 'done' : 'queued'
  const branches = trackedBranches.value
  if (branches) {
    const each = screenRows(branches, pull?.pulls)
    if (phase === 'failed') each.rows.unshift({ id: 'error', title: 'Couldn’t ask GitHub', detail: trackError.value ?? 'Try again.', time: '' })
    const status = phase === 'failed' ? ['failed' as const, ...each.status] : each.status
    return { rows: [copied, ...each.rows], status: (i) => (i === 0 ? copiedStatus : status[i - 1] ?? 'queued') }
  }
  const found = pull && pull.state !== 'waiting'
  const rows: TrackRow[] = [
    copied,
    found
      ? { id: 'pull', title: `Pull request #${pull.number} ${PULL_TITLE[pull.state as keyof typeof PULL_TITLE]}`, detail: `${pull.title ?? pull.branch} · ${pull.repo}`, time: '' }
      : { id: 'pull', title: phase === 'failed' ? 'Couldn’t ask GitHub' : 'Waiting for the pull request', detail: phase === 'failed' ? (trackError.value ?? 'Try again.') : `Watching ${repo} for ${branch.value}`, time: '' },
  ]
  const pullStatus: PublishStepStatus = found ? (pull.state === 'closed' ? 'failed' : 'done') : phase === 'failed' ? 'failed' : phase === 'idle' ? 'queued' : 'running'
  return { rows, status: (i) => (i === 0 ? copiedStatus : pullStatus) }
}

/** Figma "MCP v3 · 4 Track · Waiting": the progress rows and why the plugin can be closed. */
export function ShipPushing() {
  const { rows, status } = trackRows()
  return (
    <>
      <ShipStepsCard steps={rows} status={status} />
      <Card label="How tracking works">
        <SectionTitle title="How tracking works" showCount={false} showAction={false} />
        <Notice tone="info" title="You can close the plugin">
          Claude Code commits and opens the {trackedBranches.value ? 'pull requests' : 'pull request'} on the developer’s machine. Bluebird finds {trackedBranches.value ? 'them' : 'it'} on GitHub by the branch name while this tab is open.
        </Notice>
      </Card>
    </>
  )
}
