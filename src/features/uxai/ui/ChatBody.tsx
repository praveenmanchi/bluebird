import type { ComponentChildren } from 'preact'
import type { ChatScreenProps } from './types'
import { SourcesBar } from './SourcesBar'
import { Thread } from './Thread'
import { Composer } from './Composer'
import './uxai.css'

export interface ChatBodyProps extends ChatScreenProps {
  /** The screen's root class; its CSS maps that Figma frame's bindings onto the shared layout. */
  class: string
  /** Replaces the Sources bar (the Selection screen shows its Selection Preview there). */
  top?: ComponentChildren
  variablesPanel?: ComponentChildren
  withSelection?: boolean
}

/** The UX AI body every chat screen shares: Sources bar (or Selection Preview), Thread, Chat Input. */
export function ChatBody({ class: cls, top, variablesPanel, withSelection, turns, sources, draft, onDraft, onSend, onStop, onManageSources, onUseSelection, onFocusNode, onOpenUrl }: ChatBodyProps) {
  const thinking = turns.find((t) => t.status === 'thinking')
  return (
    <div class={`bb-uxai-screen ${cls}`}>
      {top ?? <SourcesBar sources={sources} onManage={onManageSources} />}
      <Thread turns={turns} variablesPanel={variablesPanel} onSend={onSend} onFocusNode={onFocusNode} onOpenUrl={onOpenUrl} />
      <Composer
        sources={sources}
        draft={draft}
        thinking={thinking}
        withSelection={withSelection}
        onDraft={onDraft}
        onSend={onSend}
        onStop={onStop}
        onAddSource={onManageSources}
        onManageSources={onManageSources}
        onUseSelection={onUseSelection}
      />
    </div>
  )
}
