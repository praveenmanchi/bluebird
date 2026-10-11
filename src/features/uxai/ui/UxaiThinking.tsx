import { ChatBody } from './ChatBody'
import type { ChatScreenProps } from './types'
import './UxaiThinking.css'

export type UxaiThinkingProps = ChatScreenProps

/** Figma "UX AI · Thinking" body (40000290:6023): an answer in progress — searching orb, running Thinking Step, Chat Input Generating with Stop. */
export function UxaiThinking({ turns, sources, draft, onDraft, onSend, onStop, onManageSources, onUseSelection, onFocusNode, onOpenUrl }: UxaiThinkingProps) {
  return (
    <ChatBody
      class="bb-uxai-thinking-screen"
      turns={turns}
      sources={sources}
      draft={draft}
      onDraft={onDraft}
      onSend={onSend}
      onStop={onStop}
      onManageSources={onManageSources}
      onUseSelection={onUseSelection}
      onFocusNode={onFocusNode}
      onOpenUrl={onOpenUrl}
    />
  )
}
