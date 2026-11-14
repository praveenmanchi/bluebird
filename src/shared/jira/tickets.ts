// The two Jira calls other tabs need: the project's open tickets (to pick one)
// and a comment on a ticket. One connection from Settings › Jira integration.
import { textToAdf } from './adf'
import { configFromSettings, createRequest, isConfig, problemMessage, type HttpFetch, type JiraConfig } from './http'
import type { IntegrationValues } from '@shared/integrations'

export interface OpenTicket {
  key: string
  title: string
  /** Jira's status name, e.g. "In Progress". */
  status: string
}

/** Tickets the picker lists. */
export const MAX_TICKETS = 50

/** Open tickets in the project from Settings, newest change first; without a project, the person's own. */
export function openTicketsJql(projectKey: string): string {
  const key = projectKey.replace(/"/g, '').trim()
  const scope = key ? `project = "${key}"` : 'assignee = currentUser()'
  return `${scope} AND statusCategory != Done ORDER BY updated DESC`
}

interface RawIssue { key?: string; fields?: { summary?: string; status?: { name?: string } } }

export type JiraConnection = { config: JiraConfig } | { problem: string }

/** The connection Settings describe, or the sentence that says what is missing. */
export function jiraConnection(settings: IntegrationValues<'jira'>): JiraConnection {
  const config = configFromSettings(settings)
  return isConfig(config) ? { config } : { problem: problemMessage(config) }
}

export async function searchOpenTickets(config: JiraConfig, fetchImpl: HttpFetch): Promise<OpenTicket[]> {
  const request = createRequest(config, fetchImpl)
  const body = { jql: openTicketsJql(config.projectKey), fields: ['summary', 'status'], maxResults: MAX_TICKETS }
  // Cloud removed POST /search; Server / Data Center still has it.
  const page = await request<{ issues?: RawIssue[] }>('POST', config.flavor === 'cloud' ? '/search/jql' : '/search', body)
  return (page?.issues ?? []).flatMap((i) => i.key ? [{ key: i.key, title: (i.fields?.summary ?? '').slice(0, 200), status: (i.fields?.status?.name ?? '').slice(0, 40) }] : [])
}

/** Adds `text` as a comment on `key`. Links in the text stay clickable. */
export async function postComment(config: JiraConfig, fetchImpl: HttpFetch, key: string, text: string): Promise<void> {
  const request = createRequest(config, fetchImpl)
  await request('POST', `/issue/${encodeURIComponent(key)}/comment`, { body: config.flavor === 'cloud' ? textToAdf(text) : text })
}
