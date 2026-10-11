// The Jira tab's ticket model. The sandbox maps Jira REST issues into it
// (api/map.ts); the fixtures (fixtures.ts) are written in it directly.
import type { IssueTypeKind, Priority } from '@shared/ui'

export type TicketStatus = 'todo' | 'in-progress' | 'in-review' | 'done'
/** Figma "Scope tabs": Assigned to me / Reported / Watching. */
export type TicketScope = 'assigned' | 'reported' | 'watching'

export interface Person { name: string; initials: string }

export interface FigmaLink {
  id: string
  nodeId: string
  /** Figma Link Card "Frame". */
  frame: string
  /** Figma Link Card "Path". */
  path: string
  /** The figma.com URL stored on the Jira remote link (live data only). */
  url?: string
}

export interface Subtask { id: string; label: string; done: boolean }

/** One entry under Activity — a comment, a history line or a work-log line. */
export interface ActivityEntry {
  id: string
  author: Person
  time: string
  body: string
}

export interface Ticket {
  key: string
  title: string
  type: IssueTypeKind
  status: TicketStatus
  priority: Priority
  points: number
  assignee: Person
  reporter: Person
  /** Sprint name; empty when the issue is in no sprint. */
  sprint: string
  /** "Oct 17"; empty when unknown. */
  sprintEnds: string
  labels: readonly string[]
  dueDate: string
  fixVersion: string
  /** Epic / parent issue for the breadcrumb; null when the issue has none. */
  parent: { key: string; title: string; type: IssueTypeKind } | null
  description: string
  links: readonly FigmaLink[]
  subtasks: readonly Subtask[]
  comments: readonly ActivityEntry[]
  history: readonly ActivityEntry[]
  worklog: readonly ActivityEntry[]
  scopes: readonly TicketScope[]
}
