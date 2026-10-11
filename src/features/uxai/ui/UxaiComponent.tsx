import { ChatBody } from './ChatBody'
import type { ChatScreenProps } from './types'
import './UxaiComponent.css'

export type UxaiComponentProps = ChatScreenProps

/** Figma "UX AI · Component" body (40000289:5737): a component answer with the live Component Artifact. */
export function UxaiComponent({ turns, sources, draft, onDraft, onSend, onStop, onManageSources, onUseSelection, onFocusNode, onOpenUrl }: UxaiComponentProps) {
  return (
    <ChatBody
      class="bb-uxai-component"
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
