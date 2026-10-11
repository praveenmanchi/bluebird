import { SelectionPreview } from '@shared/ui'
import { NODES, SELECTION, type BoundVariable, type PanelMode } from '../fixtures'
import { ChatBody } from './ChatBody'
import { VariablesPanel } from './VariablesPanel'
import type { ChatScreenProps } from './types'
import './UxaiSelection.css'

export interface UxaiSelectionProps extends ChatScreenProps {
  /** Rows of the Variables panel; a row whose `value` differs from its `token` reads Changed. */
  variables: readonly BoundVariable[]
  /** Footer mode tabs: Swap binding / Edit value. */
  panelMode: PanelMode
  onPanelMode?: (mode: PanelMode) => void
  onSwap?: (index: number, value: string) => void
  onDiscard?: () => void
  onApply?: () => void
}

/** Figma "UX AI · Selection" body (40000291:6087): the Selection Preview on top, then a thread whose
 *  answer lists the selection's bound variables with a Swap per row. */
export function UxaiSelection({
  variables, panelMode, onPanelMode, onSwap, onDiscard, onApply,
  turns, sources, draft, onDraft, onSend, onStop, onManageSources, onUseSelection, onFocusNode,
}: UxaiSelectionProps) {
  return (
    <ChatBody
      class="bb-uxai-selection"
      top={<SelectionPreview class="bb-uxai-selection__preview" name={SELECTION.name} meta={SELECTION.meta} onSelectOnCanvas={() => onFocusNode?.(NODES.ticketRow)} />}
      variablesPanel={<VariablesPanel variables={variables} mode={panelMode} onMode={onPanelMode} onSwap={onSwap} onDiscard={onDiscard} onApply={onApply} />}
      withSelection
      turns={turns}
      sources={sources}
      draft={draft}
      onDraft={onDraft}
      onSend={onSend}
      onStop={onStop}
      onManageSources={onManageSources}
      onUseSelection={onUseSelection}
      onFocusNode={onFocusNode}
    />
  )
}
