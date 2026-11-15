import { branch, goTo, startOver, target, trackPhase, trackResult } from '../state'
import { ActionBar } from './ActionBar'
import { ShipPushing } from './ShipPushing'
import { ShippedStep } from './ShippedStep'
import './ShipStep.css'

export interface ShipStepProps {
  onCopyPrompt: () => void
  /** Ask GitHub for the pull request now. Absent in stories: the fixture state stays. */
  onTrack?: () => void
  onOpenUrl: (url: string) => void
  onCopyLink: (url: string) => void
}

/** Figma "MCP v3 · 4 Track": waiting for the developer's pull request, then showing it. Bluebird pushes nothing itself. */
export function ShipStep({ onCopyPrompt, onTrack, onOpenUrl, onCopyLink }: ShipStepProps) {
  const pull = trackResult.value
  const found = pull !== null && pull.state !== 'waiting'
  const checking = trackPhase.value === 'checking'
  const copy = { label: 'Copy prompt again', onClick: onCopyPrompt }

  return (
    <>
      <div class="bb-mcp-handoff__panels">
        {found ? <ShippedStep pull={pull} onOpenUrl={onOpenUrl} onCopyLink={onCopyLink} /> : <ShipPushing />}
      </div>
      {found ? (
        <ActionBar summary={pull.pulls ? `${pull.pulls.length} pull requests in ${pull.repo}` : `Pull request #${pull.number} in ${pull.repo}`} secondary={[copy]} primary={{ label: 'New handoff', onClick: startOver }} />
      ) : (
        <ActionBar
          summary={checking ? `Asking ${target.value.repo}…` : pull?.pulls ? `${pull.pulls.filter((p) => p.state !== 'waiting').length} of ${pull.pulls.length} pull requests opened…` : `Waiting for ${branch.value}…`}
          secondary={[copy, { label: 'Back', onClick: () => goTo(2) }]}
          primary={{ label: 'Check now', loading: checking, disabled: checking, onClick: onTrack }}
        />
      )}
    </>
  )
}
