import { useEffect, useRef } from 'preact/hooks'
import { Stepper } from '@shared/ui'
import { STEPS, buildPrompt, mcpSetup } from '../fixtures'
import {
  branch, checks, commit, fileKey, fileName, framework, include, linkedIssue, localMcp, notice, path, rejectNextPush, selection, shipPhase,
  shipProgress, step, steps, styling,
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
  /** Run the readiness checks over a node (entering Check, and Retry). Absent in stories: the fixture checks stay. */
  onCheck?: (nodeId: string) => void
  /** "Use current selection": read the canvas again. Absent in stories: the fixture selection returns. */
  onUseSelection?: () => void
}

/** "Push to new branch": the next free name after the rejected one (feat/x → feat/x-2 → feat/x-3). */
export function nextBranchName(name: string): string {
  const m = /^(.*)-(\d+)$/.exec(name)
  return m ? `${m[1]}-${Number(m[2]) + 1}` : `${name}-2`
}

/** The Claude Code prompt for the current selection, options and checks. */
export function currentPrompt(): string | null {
  const s = selection.value
  if (!s) return null
  return buildPrompt({
    selection: s, fileName: fileName.value, fileKey: fileKey.value, checks: checks.value,
    framework: framework.value, styling: styling.value, path: path.value, include: include.value,
    issue: linkedIssue.value, branch: branch.value, commit: commit.value,
  })
}

/**
 * Figma "MCP flow v2 · 600": a Stepper (Select → Check → Generate → Ship) over one
 * scrolling column of cards and a sticky action bar. Select and Check read the
 * canvas; generation and the Git push run on fixtures, and Push walks the Ship
 * steps on a timer.
 */
export function McpHandoff({ onOpenNode, onOpenUrl, onCheck, onUseSelection }: McpHandoffProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => stop, [])

  async function copy(text: string, done: string) {
    notice.value = (await copyText(text)) ? done : 'Copying is blocked in this window. Select the text and copy it by hand.'
  }

  const copyPrompt = () => {
    const prompt = currentPrompt()
    if (!prompt) { notice.value = 'Select a frame first — the prompt describes it.'; return }
    void copy(prompt, 'Prompt copied — paste it into Claude Code.')
  }
  const copySetup = () => copy(mcpSetup(localMcp.value), `MCP setup copied — registers the ${localMcp.value ? 'desktop' : 'remote'} Figma MCP server in Claude Code.`)
  const copyNodeId = (nodeId: string) => copy(nodeId, `Copied the node id ${nodeId}.`)
  const copyLink = (url: string) => copy(url, 'Pull request link copied.')

  function startCheck() {
    const s = selection.value
    if (!s) return
    step.value = 1
    notice.value = null
    onCheck?.(s.nodeId)
  }

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
    : step.value === 0 ? <SelectStep onOpenNode={onOpenNode} onCopyLink={copyNodeId} onCheck={startCheck} onCopySetup={copySetup} onUseSelection={onUseSelection} />
      : step.value === 1 ? <CheckStep onOpenNode={onOpenNode} onCopyLink={copyNodeId} onRetry={startCheck} />
        : step.value === 2 ? <GenerateStep onCopyPrompt={copyPrompt} />
          : <ShipStep onCopyPrompt={copyPrompt} onPush={push} onPushNewBranch={pushNewBranch} />

  return (
    <div class="bb-mcp-handoff">
      <Stepper class="bb-mcp-handoff__stepper" steps={STEPS} current={phase === 'pushed' ? STEPS.length : step.value} aria-label="Handoff steps" />
      {screen}
    </div>
  )
}
