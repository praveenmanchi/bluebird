import { useState } from 'preact/hooks'
import { ChatInput, ContextChip } from '@shared/ui'
import { SELECTION, type Source } from '../fixtures'
import { answerFor } from '../chat'
import type { Turn } from '../state'
import { SourceChips } from './SourcesBar'

export interface ComposerProps {
  sources: readonly Source[]
  draft: string
  /** The turn being answered; while set the field shows its prompt and offers Stop. */
  thinking?: Turn
  /** Show the Selection chip (Figma: hidden except on the Selection screen). */
  withSelection?: boolean
  onDraft?: (value: string) => void
  onSend?: (prompt: string) => void
  onStop?: () => void
  onAddSource?: () => void
  onUseSelection?: () => void
  /** "Manage sources" in the expanded Sources bar. */
  onManageSources?: () => void
}

/** Figma "Chat Input" instance at the bottom of every UX AI body. The "N sources" chip expands the
 *  field into its Sources bar (Figma State "source expend"); Manage sources or Send folds it again. */
export function Composer({ sources, draft, thinking, withSelection = false, onDraft, onSend, onStop, onAddSource, onUseSelection, onManageSources }: ComposerProps) {
  const [expanded, setExpanded] = useState(false)
  const count = sources.filter((s) => s.selected).length
  const context = [
    withSelection && <ContextChip key="selection" type="selection">{SELECTION.chip}</ContextChip>,
    <button key="sources" type="button" class="bb-uxai-composer__sources" aria-expanded={false} onClick={() => setExpanded(true)}>
      <ContextChip type="source">{`${count} ${count === 1 ? 'source' : 'sources'}`}</ContextChip>
    </button>,
  ]
  const manage = () => {
    setExpanded(false)
    onManageSources?.()
  }
  const send = (prompt: string) => {
    setExpanded(false)
    onSend?.(prompt)
  }
  return (
    <ChatInput
      class="bb-uxai-composer"
      state={thinking ? 'generating' : expanded ? 'sources' : 'idle'}
      context={context}
      sources={<SourceChips sources={sources} />}
      onManageSources={manage}
      value={thinking ? thinking.prompt : draft}
      hint={thinking ? answerFor(thinking).hint : undefined}
      onInput={onDraft}
      onSend={send}
      onStop={onStop}
      onAddSource={onAddSource}
      onUseSelection={onUseSelection}
    />
  )
}
