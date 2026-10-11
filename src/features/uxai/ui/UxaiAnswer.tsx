import { ChatBody } from './ChatBody'
import type { ChatScreenProps } from './types'
import './UxaiAnswer.css'

export type UxaiAnswerProps = ChatScreenProps

/** Figma "UX AI · Answer" body (40000288:8351): a colour answer — reasoning, the assistant text, the Color Artifact and follow-up Prompt Chips. */
export function UxaiAnswer({ turns, sources, draft, onDraft, onSend, onStop, onManageSources, onUseSelection, onFocusNode, onOpenUrl }: UxaiAnswerProps) {
  return (
    <ChatBody
      class="bb-uxai-answer"
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
