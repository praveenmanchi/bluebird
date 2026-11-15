import { useEffect } from 'preact/hooks'
import { PublishEmptyState, SegmentedControl, useRpc } from '@shared/ui'
import { loadPages, refreshSelection } from '../actions'
import { MSG, type Progress } from '../messages'
import { handoffPhase, mode, progress, reset } from '../state'
import type { DocMode } from '../types'
import { ComponentsMode } from './ComponentsMode'
import { HandoffMode } from './HandoffMode'
import './documentation.css'

const PANEL_ID = 'bb-docs-panel'

export interface DocumentationTabProps {
  /** Skip the selection read on mount (stories that preload state). */
  preloaded?: boolean
}

/**
 * Documentation tab — Figma "Documentation · 600" (page 40002314:10780). Components
 * documents the selected component from its properties and bound variables; Hand-off
 * checks whole pages and drafts a hand-off page for developers. Style guide is on hold.
 */
export function DocumentationTab({ preloaded = false }: DocumentationTabProps) {
  const rpc = useRpc()
  useEffect(() => {
    if (!preloaded) void refreshSelection(rpc)
    const offProgress = rpc.on<Progress>(MSG.progress, (p) => { progress.value = p.steps })
    const offSelection = rpc.on('shell:selection', () => { void refreshSelection(rpc) })
    return () => { offProgress(); offSelection(); reset() }
  }, [])

  const pick = (next: DocMode) => {
    mode.value = next
    if (next === 'handoff' && handoffPhase.value === 'loading') void loadPages(rpc)
  }

  return (
    <div class="bb-docs">
      <SegmentedControl
        class="bb-docs__modes"
        aria-label="Documentation mode"
        controls={PANEL_ID}
        options={[
          { value: 'components', label: 'Components', icon: 'ui-toolbar-component' },
          { value: 'handoff', label: 'Handoff', icon: 'ui-toolbar-dev-brackets' },
          { value: 'styleguide', label: 'Style guide', icon: 'ui-variable-color' },
        ]}
        value={mode.value}
        onChange={pick}
      />
      <div id={PANEL_ID} class="bb-docs__panel" role="tabpanel">
        {mode.value === 'components' && <ComponentsMode />}
        {mode.value === 'handoff' && <HandoffMode />}
        {mode.value === 'styleguide' && (
          <div class="bb-docs__scroll">
            <section class="bb-docs__card bb-docs__card--fill">
              <PublishEmptyState state="no-changes" icon="ui-variable-color" title="Style guide is on hold" body="A style guide built from this file’s variables is designed but not built yet. Components and Handoff are ready to use." actions={[]} />
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

/** Shell entry: the registry renders tabs without props. */
export function Tab() {
  return <DocumentationTab />
}
