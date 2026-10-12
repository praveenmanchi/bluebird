import type { ComponentChildren, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { ContextChip } from '../ContextChip/ContextChip'
import { LinkButton } from '../LinkButton/LinkButton'
import { ChatInputToolbar } from './ChatInputToolbar'
import './ChatInput.css'

/** `sources` is Figma State "source expend": an idle field whose Sources bar replaces the context row. */
export type ChatInputState = 'idle' | 'active' | 'generating' | 'sources'

const HINT: Record<ChatInputState, string> = {
  idle: 'Answers cite your sources',
  active: 'Answers cite your sources',
  generating: 'Reading Brand UI…',
  sources: 'Answers cite your sources',
}

/** The Figma Context frame: a Selection chip and a Sources chip. */
const DEFAULT_CONTEXT = [
  <ContextChip key="selection" type="selection">Ticket Row · State=Selected</ContextChip>,
  <ContextChip key="sources" type="source">5 sources</ContextChip>,
]

/** The Figma "source expend" Sources bar: four Source chips, the rest folded into "+2". */
const DEFAULT_SOURCES = [
  <ContextChip key="brand-ui" type="source" icon="variables">Brand UI variables</ContextChip>,
  <ContextChip key="components" type="source" icon="component">Components</ContextChip>,
  <ContextChip key="icons" type="source" icon="layers">Icons</ContextChip>,
  <ContextChip key="type" type="source" icon="text">Type styles</ContextChip>,
  <ContextChip key="more" type="source" icon="folder">+2</ContextChip>,
]

export interface ChatInputProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'value' | 'defaultValue' | 'placeholder' | 'onInput'> {
  /** Figma "State": Idle / Active (focused — the Beam) / Generating (Beam + Stop) / source expend (`sources`: the Sources bar).
   *  Focus on an idle or sources field shows the Active look. */
  state?: ChatInputState
  /** Figma "Show context" — the row of Context Chips above the text. */
  showContext?: boolean
  /** The Context Chips to show (Figma: Selection "Ticket Row · State=Selected" + Source "5 sources"). */
  context?: ComponentChildren
  /** The prompt text (controlled). Omit to let the field keep its own draft. */
  value?: string
  /** Initial draft when uncontrolled. */
  defaultValue?: string
  /** Figma "Text" in Idle / Active — the placeholder. */
  placeholder?: string
  /** The Sources bar chips in the `sources` state (Figma: Source chips, overflow as "+N"). */
  sources?: ComponentChildren
  /** "Manage sources" in the Sources bar; the link is drawn only with a handler. */
  onManageSources?: () => void
  /** Figma "Hint" beside the tools; defaults per state. */
  hint?: ComponentChildren
  /** Accessible name of the text field. */
  label?: string
  /** Fires with the text on every keystroke. */
  onInput?: (value: string) => void
  /** Fires with the text when Send is pressed or Enter is typed (Shift+Enter adds a newline). Not while generating. */
  onSend?: (value: string) => void
  /** Fires when Stop is pressed while generating. */
  onStop?: () => void
  /** The "Add source" tool (Tab Icon=file). */
  onAddSource?: () => void
  /** The "Use selection" tool (Tab Icon=component select). */
  onUseSelection?: () => void
}

/** Figma "Chat Input" (40000284:8166): the UX AI prompt field with context, tools and the Beam. */
export function ChatInput({
  state = 'idle', showContext = true, context = DEFAULT_CONTEXT, sources = DEFAULT_SOURCES, onManageSources, value, defaultValue = '',
  placeholder = 'Ask about colours, type, components, icons… or your selection', hint, label = 'Ask UX AI',
  onInput, onSend, onStop, onAddSource, onUseSelection, class: cls, ...rest
}: ChatInputProps) {
  const [draft, setDraft] = useState(defaultValue)
  const text = value ?? draft
  const generating = state === 'generating'
  const canSend = !generating && text.trim().length > 0

  const send = () => {
    if (!canSend) return
    onSend?.(text)
    if (value === undefined) setDraft('')
  }
  const handleInput = (e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
    const next = e.currentTarget.value
    if (value === undefined) setDraft(next)
    onInput?.(next)
  }
  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
    e.preventDefault()
    send()
  }

  return (
    <div {...rest} class={`bb-chat-input ${cls ?? ''}`} data-state={state}>
      {state === 'sources' ? (
        <div class="bb-chat-input__sources-bar">
          <div class="bb-chat-input__sources" aria-label="Sources in use">
            <span class="bb-chat-input__sources-label">Sources</span>
            {sources}
          </div>
          {onManageSources && <LinkButton onClick={onManageSources}>Manage sources</LinkButton>}
        </div>
      ) : showContext && <div class="bb-chat-input__context">{context}</div>}
      <textarea
        class="bb-chat-input__field"
        rows={1}
        value={text}
        placeholder={placeholder}
        aria-label={label}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      />
      <ChatInputToolbar
        generating={generating}
        hint={hint ?? HINT[state]}
        canSend={canSend}
        onSend={send}
        onStop={onStop}
        onAddSource={onAddSource}
        onUseSelection={onUseSelection}
      />
    </div>
  )
}
