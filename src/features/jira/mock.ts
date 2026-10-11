// Browser-only handlers (?mode=mock, stories, UI tests): fixture data in
// memory. mock-live.ts layers the real Jira calls on top for the dev harness.
import type { HandlerMap } from '@shared/bridge'
import { configForTest } from './api/http'
import { updateTicket, withComment, withLink, withPoints, withStatus, withSubtaskToggled, withWorkLogged, withoutComment } from './board'
import { CURRENT_SPRINT, ME, SAMPLE_SELECTION, SAMPLE_SITE, TICKETS } from './fixtures'
import {
  MSG, commentDeleteRequestSchema, commentEditRequestSchema, commentRequestSchema, keyRequestSchema, pointsRequestSchema,
  statusRequestSchema, subtaskRequestSchema, worklogRequestSchema, type LoadResult, type SelectionLink,
} from './messages'
import type { Ticket } from './types'

/**
 * `empty-selection`: nothing selected, so "Attach Figma link" has nothing to attach.
 * `not-connected` / `error` / `no-tickets`: the board's non-happy states.
 */
export type MockScenario = 'default' | 'empty-selection' | 'not-connected' | 'error' | 'no-tickets'

export interface MockOptions {
  scenario?: MockScenario
  /** Clock for "Synced 2m ago" (tests). */
  now?: () => number
}

const TWO_MINUTES = 2 * 60_000

function fixtureHandlers(scenario: MockScenario, now: () => number): HandlerMap {
  let tickets: readonly Ticket[] = scenario === 'no-tickets' ? [] : TICKETS
  let synced = now() - TWO_MINUTES
  const find = (key: string) => {
    const ticket = tickets.find((t) => t.key === key)
    if (!ticket) throw new Error(`${key} isn’t on the board.`)
    return ticket
  }
  const edit = (key: string, update: (t: Ticket) => Ticket): Ticket => {
    find(key)
    tickets = updateTicket(tickets, key, update)
    return find(key)
  }
  const selection = async (): Promise<SelectionLink | null> => (scenario === 'empty-selection' ? null : { ...SAMPLE_SELECTION })

  return {
    [MSG.load]: async (): Promise<LoadResult> => {
      if (scenario === 'not-connected') return { status: 'not-connected', reason: 'incomplete', missing: ['Site URL', 'Jira API Key', 'Email ID'] }
      if (scenario === 'error') throw new Error('The Jira API didn’t respond. Check your token or network and try again.')
      const result: LoadResult = { status: 'connected', site: SAMPLE_SITE, me: ME, tickets: [...tickets], activeSprint: CURRENT_SPRINT, syncedAt: synced, truncated: false }
      synced = now()
      return result
    },
    [MSG.issue]: async (p: unknown) => find(keyRequestSchema.parse(p).key),
    [MSG.status]: async (p: unknown) => { const r = statusRequestSchema.parse(p); return edit(r.key, (t) => withStatus(t, r.status, ME)) },
    [MSG.points]: async (p: unknown) => { const r = pointsRequestSchema.parse(p); return edit(r.key, (t) => withPoints(t, r.points, ME)) },
    [MSG.comment]: async (p: unknown) => { const r = commentRequestSchema.parse(p); return edit(r.key, (t) => withComment(t, r.body, ME)) },
    [MSG.commentEdit]: async (p: unknown) => {
      const r = commentEditRequestSchema.parse(p)
      return edit(r.key, (t) => ({ ...t, comments: t.comments.map((c) => (c.id === r.id ? { ...c, body: r.body.trim() } : c)) }))
    },
    [MSG.commentDelete]: async (p: unknown) => { const r = commentDeleteRequestSchema.parse(p); return edit(r.key, (t) => withoutComment(t, r.id)) },
    [MSG.worklog]: async (p: unknown) => { const r = worklogRequestSchema.parse(p); return edit(r.key, (t) => withWorkLogged(t, `Logged ${Math.round(r.seconds / 3600) || 1}h`, ME)) },
    [MSG.subtask]: async (p: unknown) => { const r = subtaskRequestSchema.parse(p); return edit(r.key, (t) => withSubtaskToggled(t, r.subtaskKey, r.done)) },
    [MSG.link]: async (p: unknown) => {
      const { key } = keyRequestSchema.parse(p)
      const link = await selection()
      if (!link) throw new Error('Select a frame in Figma, then attach it.')
      return edit(key, (t) => withLink(t, link))
    },
    // The fixture can't reach Jira; it checks the values the way the real test does and says so.
    [MSG.test]: async (p: unknown) => {
      const config = configForTest(p)
      return { message: `Settings look right for ${config.site.replace(/^https:\/\//, '')}; sample data, Jira not called.` }
    },
    [MSG.open]: async () => undefined,
    [MSG.focus]: async () => undefined,
    [MSG.selection]: selection,
  }
}

export function createMockHandlers(options: MockOptions | MockScenario = {}): HandlerMap {
  const { scenario = 'default', now = Date.now } = typeof options === 'string' ? { scenario: options } : options
  return fixtureHandlers(scenario, now)
}

export const mockHandlers: HandlerMap = createMockHandlers()
