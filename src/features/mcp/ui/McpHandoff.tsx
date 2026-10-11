import { useEffect, useRef } from 'preact/hooks'
import { Stepper } from '@shared/ui'
import { STEPS, buildPrompt } from '../fixtures'
import {
  branch, commit, framework, include, linkedIssue, notice, path, rejectNextPush, scenario, shipPhase, shipProgress, step, steps, styling,
} from '../state'
import { CheckStep } from './CheckStep'
import { GenerateStep } from './GenerateStep'
import { SelectStep } from './SelectStep'
import { ShipStep } from './ShipStep'
import { ShippedStep } from './ShippedStep'
import { copyText } from './clipboard'
import './McpHandoff.css'

/** How long each fixture Ship step pretends to take. */
export const SHIP_STEP_MS = 300
/** The fixture rejects the push at "Push branch" (row 2) when the branch moved on origin. */
const REJECTED_AT = 1

export interface McpHandoffProps {
  /** Figma Link Card "Open in Figma": select and reveal the frame. */
  onOpenNode?: (nodeId: string) => void
  /** Open a pull request or Jira issue in the browser. */
  onOpenUrl?: (url: string) => void
}

/** "Push to new branch": the next free name after the rejected one (feat/x → feat/x-2 → feat/x-3). */
export function nextBranchName(name: string): string {
  const m = /^(.*)-(\d+)$/.exec(name)
  return m ? `${m[1]}-${Number(m[2]) + 1}` : `${name}-2`
}

/**
 * Figma "MCP flow v2 · 600": a Stepper (Select → Check → Generate → Ship) over one
 * scrolling column of cards and a sticky action bar. UI only: generation, Git and
 * Jira run on fixtures; Push walks the Ship steps on a timer.
 */
export function McpHandoff({ onOpenNode, onOpenUrl }: McpHandoffProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => stop, [])

  async function copy(text: string, done: string) {
    notice.value = (await copyText(text)) ? done : 'Copying is blocked in this window. Select the text and copy it by hand.'
  }

  const copyPrompt = () => copy(buildPrompt(scenario.value, {
    framework: framework.value, styling: styling.value, path: path.value, include: include.value,
    issue: linkedIssue.value, branch: branch.value, commit: commit.value,
  }), 'Prompt copied — paste it into Claude Code.')
  const copyNodeId = (nodeId: string) => copy(nodeId, `Copied the node id ${nodeId}.`)
  const copyLink = (url: string) => copy(url, 'Pull request link copied.')

  function advance() {
    timer.current = setTimeout(() => {
      if (shipPhase.value !== 'pushing') return // left the flow mid-push
      if (rejectNextPush.value && shipProgress.value === REJECTED_AT) { shipPhase.value = 'rejected'; return }
      if (shipProgress.value + 1 >= steps.value.length) {
        shipProgress.value = steps.value.length
        shipPhase.value = 'pushed'
        return
      }
      shipProgress.value += 1
      advance()
    }, SHIP_STEP_MS)
  }

  function push() {
    if (shipPhase.value === 'pushing' || !branch.value.trim() || !commit.value.trim()) return
    stop()
    shipPhase.value = 'pushing'
    shipProgress.value = 0
    notice.value = null
    advance()
  }

  function pushNewBranch() {
    branch.value = nextBranchName(branch.value)
    rejectNextPush.value = false
    push()
  }

  const phase = shipPhase.value
  const screen = phase === 'pushed'
    ? <ShippedStep onOpenUrl={(url) => onOpenUrl?.(url)} onCopyLink={copyLink} onCopyPrompt={copyPrompt} />
    : step.value === 0 ? <SelectStep onOpenNode={onOpenNode} onCopyLink={copyNodeId} />
      : step.value === 1 ? <CheckStep onOpenNode={onOpenNode} onCopyLink={copyNodeId} />
        : step.value === 2 ? <GenerateStep onCopyPrompt={copyPrompt} />
          : <ShipStep onCopyPrompt={copyPrompt} onPush={push} onPushNewBranch={pushNewBranch} />

  return (
    <div class="bb-mcp-handoff">
      <Stepper class="bb-mcp-handoff__stepper" steps={STEPS} current={phase === 'pushed' ? STEPS.length : step.value} aria-label="Handoff steps" />
      {screen}
    </div>
  )
}
