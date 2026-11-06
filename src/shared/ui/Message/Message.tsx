import type { ComponentChildren, JSX } from 'preact'
import { UxaiBot, type UxaiBotState } from '../UxaiBot/UxaiBot'
import './Message.css'

export type MessageRole = 'user' | 'assistant'

export interface MessageProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Figma "Role": User (right-aligned bubble) / Assistant (bot + text). */
  role?: MessageRole
  /** Figma "Text" — the message copy. */
  text?: ComponentChildren
  /** Rich content rendered below the text (artifacts, citations, thinking steps). Not drawn in Figma. */
  children?: ComponentChildren
  /** Assistant only: the bot's state (Figma instance override; Ready at rest, Answering while streaming). */
  botState?: UxaiBotState
}

/** Figma "Message" (40000284:8190): one turn in the UX AI chat. */
export function Message({ role = 'user', text = 'What is our primary colour?', children, botState = 'ready', class: cls, ...rest }: MessageProps) {
  const copy = <p class="bb-message__text">{text}</p>
  return (
    <div {...rest} class={`bb-message ${cls ?? ''}`} data-role={role}>
      {role === 'user' ? (
        <div class="bb-message__bubble">{copy}{children}</div>
      ) : (
        <>
          <UxaiBot state={botState} size="20" class="bb-message__bot" />
          <div class="bb-message__body">{copy}{children}</div>
        </>
      )}
    </div>
  )
}
