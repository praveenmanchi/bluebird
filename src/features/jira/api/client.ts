// Jira operations the board needs, on top of one connection (http.ts).
// Each write returns the issue re-read from Jira, so the UI always shows what
// Jira stored rather than what it hoped to store.
import type { Ticket, TicketStatus } from '../types'
import { textToAdf } from './adf'
import { createRequest, JiraError, type HttpFetch, type JiraConfig } from './http'
import {
  activeSprintName, toComment, toFigmaLinks, toHistoryEntries, toStatus, toTicket, toWorklogEntry,
  type FieldIds, type JiraComment, type JiraHistory, type JiraIssue, type JiraRemoteLink, type JiraStatus, type JiraUser, type JiraWorklog,
} from './map'

const BASE_FIELDS = ['summary', 'status', 'priority', 'issuetype', 'assignee', 'reporter', 'labels', 'duedate', 'fixVersions', 'parent', 'subtasks', 'watches', 'description']
const PAGE_SIZE = 100
/** The board stops reading after this many issues and says so (BoardSnapshot.truncated). */
export const MAX_ISSUES = 500
/** Story points live in a custom field whose name depends on the project type. */
const POINTS_FIELD_NAMES = ['story point estimate', 'story points']
const SPRINT_SCHEMA = 'com.pyxis.greenhopper.jira:gh-sprint'

interface JiraField { id: string; name?: string; schema?: { custom?: string } }
interface Transition { id: string; name?: string; to?: JiraStatus }

export interface BoardSnapshot {
  me: JiraUser & { displayName?: string }
  tickets: Ticket[]
  /** The active sprint's name, for the default sprint filter; null when there is no sprint field or none is active. */
  activeSprint: string | null
  /** More issues matched than MAX_ISSUES; the board shows the most recently updated. */
  truncated: boolean
}

export interface FigmaLinkInput { url: string; frame: string; path: string }

/** Picks the story-points and sprint custom fields from GET /field. */
export function findFieldIds(fields: readonly JiraField[]): FieldIds {
  const byName = (name: string) => fields.find((f) => (f.name ?? '').trim().toLowerCase() === name)?.id
  const points = POINTS_FIELD_NAMES.map(byName).find(Boolean)
  const sprint = fields.find((f) => f.schema?.custom === SPRINT_SCHEMA)?.id
  return { ...(points ? { points } : {}), ...(sprint ? { sprint } : {}) }
}

/** Everything the signed-in user is assigned, reported or watches; open work plus the last two weeks of done. */
export function boardJql(projectKey: string): string {
  const project = projectKey ? `project = "${projectKey.replace(/"/g, '')}" AND ` : ''
  return `${project}(assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser()) AND (statusCategory != Done OR updated >= -14d) ORDER BY updated DESC`
}

/** The transition that lands the issue in `target`, preferring one whose name says so. */
export function pickTransition(transitions: readonly Transition[], target: TicketStatus): Transition | undefined {
  const matching = transitions.filter((t) => toStatus(t.to) === target)
  return matching.find((t) => toStatus({ ...t.to, name: t.name }) === target) ?? matching[0]
}

export function createJiraClient(config: JiraConfig, fetchImpl: HttpFetch, now: () => number = Date.now) {
  const request = createRequest(config, fetchImpl)
  const cloud = config.flavor === 'cloud'
  let meCache: Promise<JiraUser> | null = null
  let fieldsCache: Promise<FieldIds> | null = null

  const me = () => (meCache ??= request<JiraUser>('GET', '/myself').catch((e: unknown) => { meCache = null; throw e }))
  const fieldIds = () => (fieldsCache ??= request<JiraField[]>('GET', '/field').then(findFieldIds).catch((e: unknown) => { fieldsCache = null; throw e }))
  const fieldList = (ids: FieldIds) => [...BASE_FIELDS, ...(ids.points ? [ids.points] : []), ...(ids.sprint ? [ids.sprint] : [])]
  const path = (key: string) => `/issue/${encodeURIComponent(key)}`
  const body = (text: string) => (cloud ? textToAdf(text) : text)

  async function search(): Promise<BoardSnapshot> {
    const [user, ids] = await Promise.all([me(), fieldIds()])
    const base = { jql: boardJql(config.projectKey), fields: fieldList(ids), maxResults: PAGE_SIZE }
    const issues: JiraIssue[] = []
    let truncated = false
    // Cloud pages with nextPageToken (/search/jql); Server / DC with startAt + total (/search).
    for (let token: string | undefined, startAt = 0; ;) {
      const page = await request<{ issues?: JiraIssue[]; nextPageToken?: string; total?: number }>(
        'POST', cloud ? '/search/jql' : '/search', cloud ? { ...base, ...(token ? { nextPageToken: token } : {}) } : { ...base, startAt },
      )
      const batch = page?.issues ?? []
      issues.push(...batch)
      startAt += batch.length
      token = page?.nextPageToken
      const more = cloud ? !!token : batch.length > 0 && startAt < (page?.total ?? 0)
      if (!more) break
      if (issues.length >= MAX_ISSUES) { truncated = true; break }
    }
    const ctx = { me: user, fields: ids, now: now() }
    return { me: user, tickets: issues.slice(0, MAX_ISSUES).map((i) => toTicket(i, ctx)), activeSprint: activeSprintName(issues, ids), truncated }
  }

  /** One issue with its detail: comments, history, work log and Figma links. */
  async function issue(key: string): Promise<Ticket> {
    const [user, ids] = await Promise.all([me(), fieldIds()])
    const [raw, comments, worklogs, remote] = await Promise.all([
      request<JiraIssue>('GET', `${path(key)}?fields=${fieldList(ids).join(',')}&expand=changelog`),
      request<{ comments?: JiraComment[] }>('GET', `${path(key)}/comment?orderBy=-created&maxResults=50`),
      request<{ worklogs?: JiraWorklog[] }>('GET', `${path(key)}/worklog`),
      request<JiraRemoteLink[]>('GET', `${path(key)}/remotelink`),
    ])
    const t = now()
    const histories: JiraHistory[] = raw.changelog?.histories ?? []
    return {
      ...toTicket(raw, { me: user, fields: ids, now: t }),
      comments: [...(comments?.comments ?? [])].sort((a, b) => Date.parse(b.created ?? '') - Date.parse(a.created ?? '')).map((c) => toComment(c, t)),
      history: [...histories].sort((a, b) => Date.parse(b.created ?? '') - Date.parse(a.created ?? '')).flatMap((h) => toHistoryEntries(h, t)),
      worklog: [...(worklogs?.worklogs ?? [])].reverse().map((w) => toWorklogEntry(w, t)),
      links: toFigmaLinks(remote ?? []),
    }
  }

  async function transition(key: string, target: TicketStatus): Promise<void> {
    const { transitions = [] } = await request<{ transitions?: Transition[] }>('GET', `${path(key)}/transitions`)
    const next = pickTransition(transitions, target)
    if (!next) throw new JiraError(`${key} has no workflow transition to that status from where it is now.`, 400)
    await request('POST', `${path(key)}/transitions`, { transition: { id: next.id } })
  }

  return {
    /** Who the token belongs to — the connection test. */
    me,
    search,
    issue,
    async setStatus(key: string, status: TicketStatus): Promise<Ticket> {
      await transition(key, status)
      return issue(key)
    },
    async setPoints(key: string, points: number): Promise<Ticket> {
      const ids = await fieldIds()
      if (!ids.points) throw new JiraError('This Jira site has no Story points field.', 400)
      await request('PUT', path(key), { fields: { [ids.points]: points } })
      return issue(key)
    },
    async addComment(key: string, text: string): Promise<Ticket> {
      await request('POST', `${path(key)}/comment`, { body: body(text) })
      return issue(key)
    },
    async editComment(key: string, id: string, text: string): Promise<Ticket> {
      await request('PUT', `${path(key)}/comment/${encodeURIComponent(id)}`, { body: body(text) })
      return issue(key)
    },
    async deleteComment(key: string, id: string): Promise<Ticket> {
      await request('DELETE', `${path(key)}/comment/${encodeURIComponent(id)}`)
      return issue(key)
    },
    async logWork(key: string, seconds: number): Promise<Ticket> {
      await request('POST', `${path(key)}/worklog`, { timeSpentSeconds: seconds })
      return issue(key)
    },
    async addFigmaLink(key: string, link: FigmaLinkInput): Promise<Ticket> {
      await request('POST', `${path(key)}/remotelink`, {
        object: { url: link.url, title: link.frame, summary: link.path, icon: { url16x16: 'https://static.figma.com/app/icon/1/favicon.png', title: 'Figma' } },
      })
      return issue(key)
    },
    /** Ticks or unticks a subtask by moving it to Done / To do, then re-reads the parent. */
    async setSubtaskDone(key: string, subtaskKey: string, done: boolean): Promise<Ticket> {
      await transition(subtaskKey, done ? 'done' : 'todo')
      return issue(key)
    },
  }
}

export type JiraClient = ReturnType<typeof createJiraClient>
