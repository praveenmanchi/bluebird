// Jira REST shapes → the board's Ticket model. Every read is defensive: Jira
// sites differ (Cloud vs Server, custom fields, hidden fields), so a missing
// value becomes an empty string or a sensible default rather than a crash.
import type { IssueTypeKind, Priority } from '@shared/ui'
import type { ActivityEntry, FigmaLink, Person, Subtask, Ticket, TicketScope, TicketStatus } from '../types'
import { adfToText } from './adf'

export interface JiraUser { accountId?: string; key?: string; name?: string; displayName?: string }
export interface JiraStatus { name?: string; statusCategory?: { key?: string } }
interface JiraSprint { name?: string; state?: string; endDate?: string }
interface IssueRef { key: string; fields?: { summary?: string; issuetype?: { name?: string; subtask?: boolean }; status?: JiraStatus } }

export interface JiraIssue {
  key: string
  fields: Record<string, unknown> & {
    summary?: string
    status?: JiraStatus
    priority?: { name?: string } | null
    issuetype?: { name?: string; subtask?: boolean }
    assignee?: JiraUser | null
    reporter?: JiraUser | null
    labels?: string[]
    duedate?: string | null
    fixVersions?: { name?: string }[]
    parent?: IssueRef
    subtasks?: IssueRef[]
    watches?: { isWatching?: boolean }
    description?: unknown
  }
  changelog?: { histories?: JiraHistory[] }
}
export interface JiraComment { id: string; author?: JiraUser; created?: string; body?: unknown }
export interface JiraWorklog { id: string; author?: JiraUser; started?: string; timeSpent?: string; comment?: unknown }
export interface JiraHistory { id: string; author?: JiraUser; created?: string; items?: { field?: string; fromString?: unknown; toString?: unknown }[] }
export interface JiraRemoteLink { id: number | string; object?: { url?: string; title?: string; summary?: string } }

/** Custom field ids that differ per site (from GET /field). */
export interface FieldIds { points?: string; sprint?: string }

/** Everything mapping needs besides the issue: who "me" is and when "now" is. */
export interface MapContext { me: JiraUser; fields: FieldIds; now: number }

/** The id Jira compares users by: accountId on Cloud, key / name on Server. */
export function userId(u: JiraUser | null | undefined): string {
  return u?.accountId ?? u?.key ?? u?.name ?? ''
}

export function toPerson(u: JiraUser | null | undefined): Person {
  const name = u?.displayName?.trim() || 'Unassigned'
  const words = name.split(/\s+/).filter(Boolean)
  const initials = (words.length > 1 ? `${words[0]![0]}${words[words.length - 1]![0]}` : name.slice(0, 2)).toUpperCase()
  return { name, initials }
}

/** Jira status → the board's four columns. Review is told apart from in-progress by name. */
export function toStatus(s: JiraStatus | undefined): TicketStatus {
  const category = s?.statusCategory?.key
  if (category === 'done') return 'done'
  if (category === 'new') return 'todo'
  if (/\b(review|qa|testing|test)\b/i.test(s?.name ?? '')) return 'in-review'
  return category === 'indeterminate' ? 'in-progress' : 'todo'
}

const PRIORITY_ALIASES: Record<string, Priority> = {
  highest: 'highest', blocker: 'highest', critical: 'highest',
  high: 'high', major: 'high',
  medium: 'medium', normal: 'medium',
  low: 'low', minor: 'low',
  lowest: 'lowest', trivial: 'lowest',
}

export function toPriority(name: string | undefined): Priority {
  return PRIORITY_ALIASES[(name ?? '').trim().toLowerCase()] ?? 'medium'
}

export function toIssueType(t: { name?: string; subtask?: boolean } | undefined): IssueTypeKind {
  if (t?.subtask) return 'subtask'
  const name = (t?.name ?? '').toLowerCase()
  if (name.includes('bug')) return 'bug'
  if (name.includes('epic')) return 'epic'
  if (name.includes('story')) return 'story'
  if (name.includes('sub')) return 'subtask'
  return 'task'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Oct 17" or "Oct 17, 2026" from an ISO date / datetime; empty when absent or invalid. */
export function formatDate(iso: string | null | undefined, withYear = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return ''
  const month = MONTHS[Number(m[2]) - 1]
  if (!month) return ''
  return withYear ? `${month} ${Number(m[3])}, ${m[1]}` : `${month} ${Number(m[3])}`
}

/** "Just now" / "5 minutes ago" / "2 hours ago" / "Yesterday" / "3 days ago" / "Oct 17, 2026". */
export function relativeTime(iso: string | undefined, now: number): string {
  const at = Date.parse(iso ?? '')
  if (Number.isNaN(at)) return ''
  const minutes = Math.max(0, Math.round((now - at) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(iso)
}

/** The sprint to show: the active one, else the latest listed. */
function pickSprint(value: unknown): JiraSprint | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const sprints = value.filter((s): s is JiraSprint => !!s && typeof s === 'object')
  return sprints.find((s) => s.state === 'active') ?? sprints[sprints.length - 1] ?? null
}

/** Names of sprints marked active across the issues — the board's default sprint filter. */
export function activeSprintName(issues: readonly JiraIssue[], fields: FieldIds): string | null {
  if (!fields.sprint) return null
  for (const issue of issues) {
    const sprint = pickSprint(issue.fields[fields.sprint])
    if (sprint?.state === 'active' && sprint.name) return sprint.name
  }
  return null
}

function scopesOf(issue: JiraIssue, me: JiraUser): TicketScope[] {
  const id = userId(me)
  const scopes: TicketScope[] = []
  if (id && userId(issue.fields.assignee) === id) scopes.push('assigned')
  if (id && userId(issue.fields.reporter) === id) scopes.push('reported')
  if (issue.fields.watches?.isWatching) scopes.push('watching')
  return scopes
}

function toSubtask(ref: IssueRef): Subtask {
  return { id: ref.key, label: ref.fields?.summary ?? ref.key, done: toStatus(ref.fields?.status) === 'done' }
}

/** A board ticket from a search or issue result. Activity lists start empty; issue detail fills them. */
export function toTicket(issue: JiraIssue, ctx: MapContext): Ticket {
  const f = issue.fields
  const sprint = ctx.fields.sprint ? pickSprint(f[ctx.fields.sprint]) : null
  const points = ctx.fields.points ? Number(f[ctx.fields.points]) : NaN
  return {
    key: issue.key,
    title: f.summary ?? issue.key,
    type: toIssueType(f.issuetype),
    status: toStatus(f.status),
    priority: toPriority(f.priority?.name),
    points: Number.isFinite(points) ? points : 0,
    assignee: toPerson(f.assignee),
    reporter: toPerson(f.reporter),
    sprint: sprint?.name ?? '',
    sprintEnds: formatDate(sprint?.endDate, false),
    labels: f.labels ?? [],
    dueDate: formatDate(f.duedate),
    fixVersion: (f.fixVersions ?? []).map((v) => v.name).filter(Boolean).join(', '),
    parent: f.parent ? { key: f.parent.key, title: f.parent.fields?.summary ?? '', type: toIssueType(f.parent.fields?.issuetype) } : null,
    description: adfToText(f.description),
    links: [],
    subtasks: (f.subtasks ?? []).map(toSubtask),
    comments: [],
    history: [],
    worklog: [],
    scopes: scopesOf(issue, ctx.me),
  }
}

export function toComment(c: JiraComment, now: number): ActivityEntry {
  return { id: String(c.id), author: toPerson(c.author), time: relativeTime(c.created, now), body: adfToText(c.body) }
}

export function toWorklogEntry(w: JiraWorklog, now: number): ActivityEntry {
  const note = adfToText(w.comment)
  return { id: String(w.id), author: toPerson(w.author), time: relativeTime(w.started, now), body: `Logged ${w.timeSpent ?? 'time'}${note ? ` — ${note}` : ''}` }
}

/** `toString` is also Object.prototype.toString, so read string fields by type, not truthiness. */
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function toHistoryEntries(h: JiraHistory, now: number): ActivityEntry[] {
  return (h.items ?? []).map((item, i) => ({
    id: `${h.id}-${i}`,
    author: toPerson(h.author),
    time: relativeTime(h.created, now),
    body: `changed ${item.field ?? 'a field'} from ${str(item.fromString) || 'None'} to ${str(item.toString) || 'None'}`,
  }))
}

/** "1:2" from a figma.com URL's node-id=1-2 (or 1%3A2); empty when there is none. */
export function nodeIdFromUrl(url: string): string {
  const m = /[?&]node-id=([^&#]+)/.exec(url)
  return m ? decodeURIComponent(m[1]!).replace('-', ':') : ''
}

/** Remote links that point at Figma, as Figma Link Cards. */
export function toFigmaLinks(links: readonly JiraRemoteLink[]): FigmaLink[] {
  return links
    .filter((l) => /^https:\/\/(www\.)?figma\.com\//.test(l.object?.url ?? ''))
    .map((l) => ({
      id: String(l.id),
      nodeId: nodeIdFromUrl(l.object!.url!),
      frame: l.object?.title || 'Figma frame',
      path: l.object?.summary || 'Figma',
      url: l.object!.url!,
    }))
}
