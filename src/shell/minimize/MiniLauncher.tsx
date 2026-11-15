import { Bird } from '../persona/Bird'
import { personaCopy } from '../persona/copy'
import './MiniLauncher.css'

export interface MiniLauncherProps {
  /** Whose bird sits on the launcher (the active persona). */
  personaId: string
  onRestore: () => void
}

/**
 * Figma "Mini Launcher" (40002969:7868): the plugin minimized. The whole 64 × 64 window is
 * one button, the persona's bird on the brand colour; pressing it restores the window to
 * the size it had. Figma keeps its own title bar above it.
 */
export function MiniLauncher({ personaId, onRestore }: MiniLauncherProps) {
  return (
    <button type="button" class="bb-mini-launcher" aria-label="Open Bluebird" title="Open Bluebird" onClick={onRestore}>
      <span class="bb-mini-launcher__bubble">
        <Bird kind={personaCopy(personaId).kind} class="bb-mini-launcher__bird" />
      </span>
    </button>
  )
}
