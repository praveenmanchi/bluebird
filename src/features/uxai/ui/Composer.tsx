import { ChatInput, ContextChip } from '@shared/ui'
import { SELECTION, type Source } from '../fixtures'
import { answerFor } from '../chat'
import type { Turn } from '../state'

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
}

/** Figma "Chat Input" instance at the bottom of every UX AI body. */
export function Composer({ sources, draft, thinking, withSelection = false, onDraft, onSend, onStop, onAddSource, onUseSelection }: ComposerProps) {
  const count = sources.filter((s) => s.selected).length
  const context = [
    withSelection && <ContextChip key="selection" type="selection">{SELECTION.chip}</ContextChip>,
    <ContextChip key="sources" type="source">{`${count} ${count === 1 ? 'source' : 'sources'}`}</ContextChip>,
  ]
  return (
    <ChatInput
      class="bb-uxai-composer"
      state={thinking ? 'generating' : 'idle'}
      context={context}
      value={thinking ? thinking.prompt : draft}
      hint={thinking ? answerFor(thinking).hint : undefined}
      onInput={onDraft}
      onSend={onSend}
      onStop={onStop}
      onAddSource={onAddSource}
      onUseSelection={onUseSelection}
    />
  )
}
