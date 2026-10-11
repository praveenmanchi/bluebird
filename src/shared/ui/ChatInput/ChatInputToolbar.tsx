import type { ComponentChildren } from 'preact'
import { Icon } from '../Icon/Icon'

export interface ChatInputToolbarProps {
  generating: boolean
  hint: ComponentChildren
  canSend: boolean
  onSend: () => void
  onStop?: () => void
  onAddSource?: () => void
  onUseSelection?: () => void
}

/** The Figma "Toolbar" frame of Chat Input: Tools (Add source, Use selection, Hint) and Send / Stop. */
export function ChatInputToolbar({ generating, hint, canSend, onSend, onStop, onAddSource, onUseSelection }: ChatInputToolbarProps) {
  return (
    <div class="bb-chat-input__toolbar">
      <div class="bb-chat-input__tools">
        <button type="button" class="bb-chat-input__tool" aria-label="Add source" onClick={onAddSource}>
          <Icon name="file" tone="default" />
        </button>
        <button type="button" class="bb-chat-input__tool" aria-label="Use selection" onClick={onUseSelection}>
          <Icon name="component-select" tone="default" />
        </button>
        <span class="bb-chat-input__hint">{hint}</span>
      </div>
      {generating ? (
        <button type="button" class="bb-chat-input__action" data-action="stop" aria-label="Stop generating" onClick={onStop}>
          <span class="bb-chat-input__stop-glyph" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" class="bb-chat-input__action" data-action="send" aria-label="Send" aria-disabled={!canSend || undefined} onClick={onSend}>
          <Icon name="arrow" tone="default" class="bb-chat-input__arrow" />
        </button>
      )}
    </div>
  )
}
