// Pure board logic: filtering, grouping and immutable ticket updates.
// Kept free of signals and Preact so it is unit-testable on its own.
import type { MetaBadgeTone, Priority } from '@shared/ui'
import type { ActivityEntry, FigmaLink, Ticket, TicketScope, TicketStatus } from './types'

export interface StatusMeta {
  /** Ticket Row status badge and list group heading. */
  badge: string
  /** Detail Status dropdown and Status filter. */
  option: string
  tone: MetaBadgeTone
}

/** Group order follows the Figma list: In progress, In review, To do — Done last. */
export const STATUS_ORDER: readonly TicketStatus[] = ['in-progress', 'in-review', 'todo', 'done']

export const STATUS_META: Record<TicketStatus, StatusMeta> = {
  'in-progress': { badge: 'IN PROGRESS', option: 'In progress', tone: 'accent' },
  'in-review': { badge: 'IN REVIEW', option: 'In review', tone: 'warning' },
  todo: { badge: 'TO DO', option: 'To do', tone: 'neutral' },
  done: { badge: 'DONE', option: 'Done', tone: 'success' },
}

export const PRIORITY_ORDER: readonly Priority[] = ['highest', 'high', 'medium', 'low', 'lowest']

export const PRIORITY_LABEL: Record<Priority, string> = {
  highest: 'Highest', high: 'High', medium: 'Medium', low: 'Low', lowest: 'Lowest',
}

export const SCOPE_LABEL: Record<TicketScope, string> = {
  assigned: 'Assigned to me',
  reported: 'Reported',
  watching: 'Watching',
}

export type StatusFilter = TicketStatus | 'all'
export type PriorityFilter = Priority | 'all'

export interface BoardFilters {
  scope: TicketScope
  query: string
  status: StatusFilter
  /** A sprint name, or ALL_SPRINTS. */
  sprint: string
  priority: PriorityFilter
}

export const ALL_SPRINTS = 'All sprints'

/** The board opens on everything; loading the board narrows `sprint` to the active one (boardDefaults). */
export const DEFAULT_FILTERS: BoardFilters = {
  scope: 'assigned', query: '', status: 'all', sprint: ALL_SPRINTS, priority: 'all',
}

/** The filters a fresh board starts on: the active sprint, but only when it has tickets to show. */
export function boardDefaults(activeSprint: string | null, tickets: readonly Ticket[]): BoardFilters {
  // Opening on a sprint none of `tickets` are in leaves the board empty with nothing to undo:
  // `refined` measures against these defaults, so the Filters button stays unlit and the empty
  // state reads "no tickets" rather than "no match". Show every sprint instead.
  const sprint = activeSprint && tickets.some((t) => t.sprint === activeSprint) ? activeSprint : ALL_SPRINTS
  return { ...DEFAULT_FILTERS, sprint }
}

const SCOPE_ORDER: readonly TicketScope[] = ['assigned', 'reported', 'watching']

/** The scope a fresh board opens on: `preferred` when it has tickets, else the first scope that does. */
export function openingScope(tickets: readonly Ticket[], preferred: TicketScope): TicketScope {
  if (tickets.some((t) => t.scopes.includes(preferred))) return preferred
  return SCOPE_ORDER.find((s) => tickets.some((t) => t.scopes.includes(s))) ?? preferred
}

/** Sprint filter options: every sprint on the board, newest-looking first, then "All sprints". */
export function sprintOptions(tickets: readonly Ticket[], current: string): string[] {
  const names = new Set(tickets.map((t) => t.sprint).filter(Boolean))
  if (current !== ALL_SPRINTS) names.add(current)
  return [...[...names].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), ALL_SPRINTS]
}

/** Search matches the key, the title or any label (Figma "Search by key, title or label"). */
export function matchesQuery(ticket: Ticket, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return ticket.key.toLowerCase().includes(q)
    || ticket.title.toLowerCase().includes(q)
    || ticket.labels.some((label) => label.toLowerCase().includes(q))
}

export function filterTickets(tickets: readonly Ticket[], f: BoardFilters): Ticket[] {
  return tickets.filter((t) => t.scopes.includes(f.scope)
    && matchesQuery(t, f.query)
    && (f.status === 'all' || t.status === f.status)
    && (f.sprint === ALL_SPRINTS || t.sprint === f.sprint)
    && (f.priority === 'all' || t.priority === f.priority))
}

export interface TicketGroup {
  status: TicketStatus
  /** "IN PROGRESS · 2". */
  heading: string
  tickets: Ticket[]
}

export function groupByStatus(tickets: readonly Ticket[]): TicketGroup[] {
  return STATUS_ORDER
    .map((status) => {
      const inGroup = tickets.filter((t) => t.status === status)
      return { status, heading: `${STATUS_META[status].badge} · ${inGroup.length}`, tickets: inGroup }
    })
    .filter((g) => g.tickets.length > 0)
}

/** Anything narrowed beyond the board's defaults (`defaults.sprint` is the active sprint). */
export function hasActiveFilters(f: BoardFilters, defaults: BoardFilters = DEFAULT_FILTERS): boolean {
  return f.query.trim() !== '' || refined(f, defaults)
}

/** Status / sprint / priority differ from the defaults (the filter panel's own state). */
export function refined(f: BoardFilters, defaults: BoardFilters = DEFAULT_FILTERS): boolean {
  return f.status !== defaults.status || f.sprint !== defaults.sprint || f.priority !== defaults.priority
}

/** "Synced just now" / "Synced 5m ago" / "Synced 2h ago". */
export function syncedLabel(syncedAt: number | null, now: number): string {
  if (syncedAt === null) return 'Not synced yet'
  const minutes = Math.max(0, Math.floor((now - syncedAt) / 60_000))
  if (minutes < 1) return 'Synced just now'
  if (minutes < 60) return `Synced ${minutes}m ago`
  return `Synced ${Math.floor(minutes / 60)}h ago`
}

/** Returns a new list with `key` replaced by `update(ticket)`. */
export function updateTicket(tickets: readonly Ticket[], key: string, update: (t: Ticket) => Ticket): Ticket[] {
  return tickets.map((t) => (t.key === key ? update(t) : t))
}

let sequence = 0
/** Local ids for entries created in the UI (not persisted anywhere yet). */
export function localId(prefix: string): string {
  sequence += 1
  return `${prefix}-local-${sequence}`
}

export function withStatus(ticket: Ticket, status: TicketStatus, actor: ActivityEntry['author']): Ticket {
  if (ticket.status === status) return ticket
  const entry: ActivityEntry = {
    id: localId('h'), author: actor, time: 'Just now',
    body: `changed Status from ${STATUS_META[ticket.status].option} to ${STATUS_META[status].option}`,
  }
  return { ...ticket, status, history: [entry, ...ticket.history] }
}

export function withPoints(ticket: Ticket, points: number, actor: ActivityEntry['author']): Ticket {
  if (ticket.points === points) return ticket
  const entry: ActivityEntry = {
    id: localId('h'), author: actor, time: 'Just now',
    body: `changed Story points from ${ticket.points} to ${points}`,
  }
  return { ...ticket, points, history: [entry, ...ticket.history] }
}

export function withSubtaskToggled(ticket: Ticket, id: string, done: boolean): Ticket {
  return { ...ticket, subtasks: ticket.subtasks.map((s) => (s.id === id ? { ...s, done } : s)) }
}

export function withComment(ticket: Ticket, body: string, author: ActivityEntry['author']): Ticket {
  const entry: ActivityEntry = { id: localId('c'), author, time: 'Just now', body: body.trim() }
  return { ...ticket, comments: [entry, ...ticket.comments] }
}

export function withoutComment(ticket: Ticket, id: string): Ticket {
  return { ...ticket, comments: ticket.comments.filter((c) => c.id !== id) }
}

export function withLink(ticket: Ticket, link: Omit<FigmaLink, 'id' | 'url'> & { url?: string | null }): Ticket {
  if (ticket.links.some((l) => l.nodeId === link.nodeId)) return ticket
  const { url, ...rest } = link
  return { ...ticket, links: [...ticket.links, { ...rest, ...(url ? { url } : {}), id: localId('l') }] }
}

export function withWorkLogged(ticket: Ticket, body: string, author: ActivityEntry['author']): Ticket {
  const entry: ActivityEntry = { id: localId('w'), author, time: 'Just now', body }
  return { ...ticket, worklog: [entry, ...ticket.worklog] }
}

export function subtaskProgress(ticket: Ticket): string {
  return `${ticket.subtasks.filter((s) => s.done).length}/${ticket.subtasks.length}`
}

export function withSubtask(ticket: Ticket, label: string): Ticket {
  return { ...ticket, subtasks: [...ticket.subtasks, { id: localId('s'), label, done: false }] }
}
