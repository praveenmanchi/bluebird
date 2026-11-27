// The Jira tab's sandbox handlers, built from injected dependencies so the
// same code runs in Figma (handler.ts wires figma.*) and in the dev harness
// (mock-live.ts wires the browser). Owns the Jira connection: Settings ›
// Jira Integration in, board-shaped data out. No module-level side effects.
import type { HandlerMap } from '@shared/bridge'
import type { ConnectionTestResult, IntegrationValues } from '@shared/integrations'
import { createJiraClient, type JiraClient } from '../api/client'
import { configForTest, configFromSettings, isConfig, JiraError, problemMessage, type HttpFetch } from '../api/http'
import { toPerson } from '../api/map'
import {
  MSG, commentDeleteRequestSchema, commentEditRequestSchema, commentRequestSchema, keyRequestSchema,
  openRequestSchema, pointsRequestSchema, statusRequestSchema, subtaskRequestSchema, worklogRequestSchema,
  type LoadResult, type SelectionLink,
} from '../messages'

export interface JiraSandboxDeps {
  readSettings: () => Promise<IntegrationValues<'jira'>>
  fetch: HttpFetch
  openExternal: (url: string) => void
  /** The first selected layer as a link, null when nothing is selected. */
  selection: () => Promise<SelectionLink | null>
  /** Select and scroll to a linked frame. */
  focus: (payload: unknown) => Promise<void>
  now?: () => number
}

export function createJiraHandlers(deps: JiraSandboxDeps): HandlerMap {
  const now = deps.now ?? Date.now
  // One client per distinct connection, so /myself and /field are fetched once until Settings change.
  let cached: { signature: string; client: JiraClient; site: string } | null = null

  async function connect(): Promise<{ client: JiraClient; site: string }> {
    const config = configFromSettings(await deps.readSettings())
    if (!isConfig(config)) throw new JiraError(problemMessage(config), 0)
    const signature = JSON.stringify(config)
    if (cached?.signature !== signature) cached = { signature, client: createJiraClient(config, deps.fetch, now), site: config.site }
    return cached
  }

  async function load(): Promise<LoadResult> {
    const config = configFromSettings(await deps.readSettings())
    if (!isConfig(config)) return { status: 'not-connected', reason: config.reason, missing: config.missing }
    const { client, site } = await connect()
    const board = await client.search()
    return { status: 'connected', site, me: toPerson(board.me), tickets: board.tickets, activeSprint: board.activeSprint, syncedAt: now(), truncated: board.truncated }
  }

  /** Settings › Test Connection: a fresh client (never the cached one) asks Jira who the token belongs to. */
  async function test(payload: unknown): Promise<ConnectionTestResult> {
    const config = configForTest(payload)
    const user = await createJiraClient(config, deps.fetch, now).me()
    const host = config.site.replace(/^https:\/\//, '')
    const via = config.endpoint === config.target ? '' : ' through the proxy'
    return { message: `Connected to ${host}${via} as ${user.displayName || 'your Jira account'}.` }
  }

  async function link(payload: unknown) {
    const { key } = keyRequestSchema.parse(payload)
    const selected = await deps.selection()
    if (!selected) throw new JiraError('Select a frame in Figma, then attach it.', 0)
    if (!selected.url) throw new JiraError('Figma doesn’t share this file’s link with plugins here, so the frame can’t be linked from Jira.', 0)
    const { client } = await connect()
    return client.addFigmaLink(key, { url: selected.url, frame: selected.frame, path: selected.path })
  }

  return {
    [MSG.load]: load,
    [MSG.issue]: async (p: unknown) => (await connect()).client.issue(keyRequestSchema.parse(p).key),
    [MSG.status]: async (p: unknown) => { const r = statusRequestSchema.parse(p); return (await connect()).client.setStatus(r.key, r.status) },
    [MSG.points]: async (p: unknown) => { const r = pointsRequestSchema.parse(p); return (await connect()).client.setPoints(r.key, r.points) },
    [MSG.comment]: async (p: unknown) => { const r = commentRequestSchema.parse(p); return (await connect()).client.addComment(r.key, r.body) },
    [MSG.commentEdit]: async (p: unknown) => { const r = commentEditRequestSchema.parse(p); return (await connect()).client.editComment(r.key, r.id, r.body) },
    [MSG.commentDelete]: async (p: unknown) => { const r = commentDeleteRequestSchema.parse(p); return (await connect()).client.deleteComment(r.key, r.id) },
    [MSG.worklog]: async (p: unknown) => { const r = worklogRequestSchema.parse(p); return (await connect()).client.logWork(r.key, r.seconds) },
    [MSG.subtask]: async (p: unknown) => { const r = subtaskRequestSchema.parse(p); return (await connect()).client.setSubtaskDone(r.key, r.subtaskKey, r.done) },
    [MSG.link]: link,
    [MSG.test]: test,
    [MSG.open]: async (p: unknown) => {
      const { url } = openRequestSchema.parse(p)
      // Only the Jira site and Figma: the URL comes from the UI, so it is not trusted to point anywhere else.
      const config = configFromSettings(await deps.readSettings())
      const allowed = [...(isConfig(config) ? [`${config.site}/`] : []), 'https://www.figma.com/']
      if (!allowed.some((prefix) => url.startsWith(prefix))) throw new JiraError('That link isn’t on your Jira site or Figma.', 0)
      deps.openExternal(url)
    },
    [MSG.selection]: deps.selection,
    [MSG.focus]: deps.focus,
  }
}
