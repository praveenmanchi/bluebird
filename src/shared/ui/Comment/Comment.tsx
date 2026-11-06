import type { ComponentChildren, JSX } from 'preact'
import { Avatar } from '../Avatar/Avatar'
import { LinkButton } from '../LinkButton/LinkButton'
import './Comment.css'

export interface CommentProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Figma "Author". */
  author?: ComponentChildren
  /** Figma "Time" — relative time shown beside the author. */
  time?: ComponentChildren
  /** Machine-readable timestamp for the <time> element. */
  dateTime?: string
  /** Figma "Body". */
  children?: ComponentChildren
  /** Nested Avatar's Initials. */
  initials?: ComponentChildren
  /** Figma "Show actions" — the Reply / Edit / Delete links. */
  showActions?: boolean
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

/** Figma "Comment" (40000268:8025): one Jira comment — author avatar, header, body and actions. */
export function Comment({
  author = 'Anika Kumar', time = '2 hours ago', dateTime, initials = 'AK',
  children = 'Dev handoff is blocked on the hover state. Can you attach the frame for Brand=Ikea so I can check the focus ring token?',
  showActions = true, onReply, onEdit, onDelete, class: cls, ...rest
}: CommentProps) {
  return (
    <article {...rest} class={`bb-comment ${cls ?? ''}`}>
      <Avatar size="md">{initials}</Avatar>
      <div class="bb-comment__content">
        <header class="bb-comment__header">
          <span class="bb-comment__author">{author}</span>
          <time class="bb-comment__time" dateTime={dateTime}>{time}</time>
        </header>
        <p class="bb-comment__body">{children}</p>
        {showActions && (
          <div class="bb-comment__actions">
            <LinkButton onClick={onReply}>Reply</LinkButton>
            <LinkButton onClick={onEdit}>Edit</LinkButton>
            <LinkButton class="bb-comment__delete" onClick={onDelete}>Delete</LinkButton>
          </div>
        )}
      </div>
    </article>
  )
}
