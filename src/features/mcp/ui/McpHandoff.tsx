import { Stepper } from '@shared/ui'
import { copyText } from '@shared/clipboard'
import { LIBRARY_STEPS, STEPS } from '../fixtures'
import { mcpSetup } from '../prompt'
import { copiedAt, goTo, impactPhase, kind, localMcp, mcpConnected, notice, prompt, selection, step, target } from '../state'
import { CheckStep } from './CheckStep'
import { ChangesStep } from './library/ChangesStep'
import { ImpactStep } from './library/ImpactStep'
import { LibraryHandOff } from './library/LibraryHandOff'
import { GenerateStep } from './GenerateStep'
import { ScenarioSwitch } from './cards'
import { SelectStep } from './SelectStep'
import { ShipStep } from './ShipStep'
import './McpHandoff.css'

export interface McpHandoffProps {
  /** Figma Link Card "Open in Figma": select and reveal the frame. */
  onOpenNode?: (nodeId: string) => void
  /** Open a pull request in the browser. */
  onOpenUrl?: (url: string) => void
  /** Run the readiness checks over a node (entering Check, and Retry). Absent in stories: the fixture checks stay. */
  onCheck?: (nodeId: string) => void
  /** "Use current selection": read the canvas again. Absent in stories: the fixture selection returns. */
  onUseSelection?: () => void
  /** Ask GitHub whether the hand-off's pull request exists (entering Track, and "Check now"). Absent in stories. */
  onTrack?: () => void
  /** Library update: read the releases from the team History again. Absent in stories. */
  onReleases?: () => void
  /** Library update: scan the file for screens that use the release's components. Absent in stories. */
  onImpact?: () => void
}

/** "14:02": when the prompt left the plugin. */
export const clock = (d: Date): string => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/**
 * Figma "MCP flow v3 · 600": the Scenario switch (first step only, full width), then a Stepper (Select → Check → Hand off → Track) over one scrolling
 * column of cards and a sticky action bar. Select and Check read the canvas, Hand off builds the
 * prompt, and Track looks for the developer's pull request on GitHub. No code is written here.
 */
export function McpHandoff({ onOpenNode, onOpenUrl, onCheck, onUseSelection, onTrack, onReleases, onImpact }: McpHandoffProps) {
  async function copy(text: string, done: string): Promise<boolean> {
    const ok = await copyText(text)
    notice.value = ok ? done : 'Copying is blocked in this window. Select the text and copy it by hand.'
    return ok
  }

  /** Copies the prompt. From Hand off that starts tracking; on Track it only copies again. */
  const copyPrompt = async () => {
    const text = prompt.value
    if (!text) { notice.value = 'Select a frame first — the prompt describes it.'; return }
    const ok = await copy(text, `Prompt copied — paste it into Claude Code in ${target.value.repo}.`)
    if (!ok) return
    copiedAt.value = clock(new Date())
    if (step.value === 2) { step.value = 3; onTrack?.() }
  }
  const copySetup = () => { void copy(mcpSetup(localMcp.value), `MCP setup copied — registers the ${localMcp.value ? 'desktop' : 'remote'} Figma MCP server in Claude Code.`) }
  const copyNodeId = (nodeId: string) => { void copy(nodeId, `Copied the node id ${nodeId}.`) }
  const copyLink = (url: string) => { void copy(url, 'Pull request link copied.') }

  function startCheck() {
    const s = selection.value
    if (!s) return
    goTo(1)
    onCheck?.(s.nodeId)
  }

  const library = kind.value === 'library'
  const toTrack = () => { goTo(3); onTrack?.() }
  const libraryReady = library && mcpConnected.value && target.value.connected
  // Back from Impact to Changes and on again: keep the scan unless another release was picked.
  const toImpact = () => { goTo(1); if (impactPhase.value !== 'done') onImpact?.() }
  const screen = libraryReady && step.value === 0 ? <ChangesStep onImpact={toImpact} onReload={() => onReleases?.()} onOpenUrl={(url) => onOpenUrl?.(url)} />
    : libraryReady && step.value === 1 ? <ImpactStep onRescan={() => onImpact?.()} onOpenNode={(id) => onOpenNode?.(id)} />
      : libraryReady && step.value === 2 ? <LibraryHandOff onCopyPrompt={() => { void copyPrompt() }} onSkip={toTrack} />
        : step.value === 0 ? <SelectStep onOpenNode={onOpenNode} onCopyLink={copyNodeId} onCheck={startCheck} onCopySetup={copySetup} onUseSelection={onUseSelection} />
    : step.value === 1 ? <CheckStep onOpenNode={onOpenNode} onCopyLink={copyNodeId} onRetry={startCheck} />
      : step.value === 2 ? <GenerateStep onCopyPrompt={() => { void copyPrompt() }} onSkip={toTrack} />
        : <ShipStep onCopyPrompt={() => { void copyPrompt() }} onTrack={onTrack} onOpenUrl={(url) => onOpenUrl?.(url)} onCopyLink={copyLink} />

  return (
    <div class="bb-mcp-handoff">
      {step.value === 0 && <ScenarioSwitch />}
      <Stepper class="bb-mcp-handoff__stepper" steps={library ? LIBRARY_STEPS : STEPS} current={step.value} aria-label="Handoff steps" />
      {screen}
    </div>
  )
}
