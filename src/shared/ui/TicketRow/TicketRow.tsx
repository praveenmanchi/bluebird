import type { ComponentChildren, JSX } from 'preact'
import { Avatar } from '../Avatar/Avatar'
import { IssueType, type IssueTypeKind } from '../IssueType/IssueType'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import { PriorityIcon, type Priority } from '../PriorityIcon/PriorityIcon'
import { StoryPoints } from '../StoryPoints/StoryPoints'
import './TicketRow.css'

export interface TicketRowProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'type' | 'onSelect'> {
  /** Figma "Key" — the issue key. */
  issueKey?: string
  /** Figma "Title" — the issue summary (one line, ellipsised). */
  title?: ComponentChildren
  /** Nested "Issue Type" instance's Type. */
  issueType?: IssueTypeKind
  /** Nested "Status" Meta Badge's Label. */
  status?: ComponentChildren
  /** Nested "Status" Meta Badge's Tone. */
  statusTone?: MetaBadgeTone
  /** Nested "Priority" instance's Priority. */
  priority?: Priority
  /** Nested "Story Points" instance's Points. */
  points?: ComponentChildren
  /** Nested "Assignee" Avatar's Initials. */
  assignee?: ComponentChildren
  /** Assignee's full name, the Avatar's accessible name. */
  assigneeName?: string
  /** Figma "Show assignee" (default off): the "Assignee" Avatar. */
  showAssignee?: boolean
  /** Figma State=Selected. */
  selected?: boolean
  /** Force State=Hover (stories, visual regression). Real hover comes from :hover. */
  state?: 'default' | 'hover'
  /** Called with the issue key when the row is clicked. */
  onSelect?: (issueKey: string) => void
}

/** Figma "Ticket Row" (40000267:8055): one Jira issue in the ticket list. */
export function TicketRow({
  issueKey = 'BB-142',
  title = 'Follow the updated WCAG card set in the accessibility tab',
  issueType = 'story', status = 'IN PROGRESS', statusTone = 'accent',
  priority = 'high', points = '5', assignee = 'PM', assigneeName, showAssignee = false,
  selected = false, state = 'default', onSelect, onClick, class: cls, ...rest
}: TicketRowProps) {
  const handleClick = (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    onSelect?.(issueKey)
  }
  return (
    <button
      {...rest}
      type="button"
      class={`bb-ticket-row ${cls ?? ''}`}
      data-state={selected ? 'selected' : state}
      aria-pressed={selected}
      onClick={handleClick}
    >
      <span class="bb-ticket-row__top">
        <span class="bb-ticket-row__meta">
          <IssueType type={issueType} />
          <span class="bb-ticket-row__key">{issueKey}</span>
          <MetaBadge tone={statusTone}>{status}</MetaBadge>
        </span>
        <span class="bb-ticket-row__signals">
          <PriorityIcon priority={priority} />
          <StoryPoints>{points}</StoryPoints>
          {showAssignee && <Avatar size="sm" name={assigneeName}>{assignee}</Avatar>}
        </span>
      </span>
      <span class="bb-ticket-row__title">{title}</span>
    </button>
  )
}
