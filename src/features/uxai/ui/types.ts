import type { Source } from '../fixtures'
import type { Turn } from '../state'

/** What every chat screen (Answer, Component, Thinking, Selection) renders from. */
export interface ChatScreenProps {
  /** The conversation, oldest first. A turn whose status is `thinking` drives the Generating look. */
  turns: readonly Turn[]
  /** All attached sources; the Sources bar and the Chat Input count the selected ones. */
  sources: readonly Source[]
  /** The Chat Input draft. */
  draft: string
  onDraft?: (value: string) => void
  /** Send a prompt (Chat Input, Prompt Chips). */
  onSend?: (prompt: string) => void
  /** The Chat Input's Stop while generating. */
  onStop?: () => void
  /** "Manage sources" and the Chat Input's Add source tool. */
  onManageSources?: () => void
  /** The Chat Input's Use selection tool. */
  onUseSelection?: () => void
  /** Reveal a node in Figma (Go to component, Select on canvas). */
  onFocusNode?: (nodeId: string) => void
  /** Open a library link from a grounded answer. */
  onOpenUrl?: (url: string) => void
}
