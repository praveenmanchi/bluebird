import { useMemo, useRef } from 'preact/hooks'
import { Avatar, Button, ContextChip, IssueType, MetaBadge, TicketRow } from '@shared/ui'
import { Stage, Swap, reveal, type CursorStop } from '../stage'
import type { SceneProps } from './types'

const TICKETS = [
  { key: 'KAN-12', title: 'Onboarding tour for every tab' },
  { key: 'KAN-9', title: 'Jira tab: ticket detail view' },
  { key: 'KAN-7', title: 'Token coverage report export' },
] as const

const ticket = (key: string, title: string, selected = false) => (
  <TicketRow issueKey={key} title={title} issueType="story" status="In progress" statusTone="accent" points="5" assignee="PM" showAssignee selected={selected} />
)

/** Figma "Scene · Jira": sprint tickets slide in, one opens, "Link to selection" ties it to the frame. */
export function JiraScene({ still }: SceneProps) {
  const first = useRef<HTMLDivElement>(null)
  const link = useRef<HTMLDivElement>(null)
  const stops = useMemo<CursorStop[]>(() => [
    { at: 1800, target: first, fx: 0.55, click: true },
    { at: 3400, target: link, click: true },
  ], [])
  const [head, ...rest] = TICKETS
  return (
    <Stage still={still} stops={stops} label="A Jira ticket is opened and linked to the selected frame">
      <div class="bb-ob-scene">
        <div {...reveal(300, 'up', 'bb-ob-row')}>
          <span class="bb-ob-label">KAN board · Sprint 14</span>
          <MetaBadge tone="accent">3 assigned to you</MetaBadge>
        </div>
        <div class="bb-ob-list">
          <div ref={first}>
            <Swap enter={450} at={1900} kind="left" before={ticket(head.key, head.title)} after={ticket(head.key, head.title, true)} />
          </div>
          {rest.map((t, k) => <div key={t.key} {...reveal(570 + k * 120, 'left')}>{ticket(t.key, t.title)}</div>)}
        </div>
        <div {...reveal(2100, 'up', 'bb-ob-card')}>
          <span class="bb-ob-row bb-ob-row--start"><IssueType type="story" /><span class="bb-ob-label bb-ob-label--accent">{head.key}</span></span>
          <span class="bb-ob-heading-text">{head.title}</span>
          <span class="bb-ob-row bb-ob-row--start">
            <MetaBadge tone="accent">In progress</MetaBadge>
            <MetaBadge>5 pts</MetaBadge>
            <Avatar name="Assignee">PM</Avatar>
          </span>
          <span class="bb-ob-meta">Explain each tab with a short demo and a one-line summary.</span>
          <div ref={link} class="bb-ob-start"><Button variant="secondary">Link to selection</Button></div>
        </div>
        <ContextChip type="selection" {...reveal(3600, 'pop')}>Linked · Onboarding · Accessibility</ContextChip>
      </div>
    </Stage>
  )
}
