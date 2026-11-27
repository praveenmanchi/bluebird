// The changelog's sandbox handlers, built from injected dependencies so they
// run the same in Figma (handler.ts), in tests and with fixtures.
//
// Generate compares the open Figma branch with its main file over the Figma
// REST API (the key from Settings › Dual File Mode). Submit saves the result
// to the team History as "under review"; Approve marks it done and adds it to
// the shared changelog file beside the history folder.
import type { HandlerMap } from '@shared/bridge'
import type { IntegrationValues } from '@shared/integrations'
import { diffSnapshots } from '@shared/design/diff'
import type { Change, Snapshot } from '@shared/design/types'
import { readBranchInfo, readMainSnapshot } from '@shared/figma/branch'
import { CodeHostError as GithubError, createCodeHost, type CodeHost, type HostFetch as GithubFetch } from '@shared/codehost'
import { isStorageProblem, resolveStorage, type HistoryStorage } from '@shared/history/config'
import { APPEND_ATTEMPTS, appendEntry } from '@shared/history/github'
import { dayOf, newEntryId, parseDay } from '@shared/history/store'
import type { HistoryEntry } from '@shared/history/types'
import { createFigmaGet, type FigmaGet, type HttpFetch } from '@shared/libraries/rest'
import { postWebhooks } from '@shared/integrations/webhooks'
import { channelCard } from '@shared/integrations/card'
import { jiraConnection, postComment, searchOpenTickets } from '@shared/jira/tickets'
import { approveEntry, changelogEntry, changelogMarkdown, changelogPath, draftTitle, isPending, prependChangelog } from '../changelog'
import { BRANCH_FACT, approvalComment, branchUrl, reviewLines, submitComment } from '../review'
import {
  CHANGELOG, approveRequestSchema, submitRequestSchema, type ApproveResult, type ChangelogContext, type ChangelogDraft, type ReviewChannels, type SubmitResult, type TicketsResult,
} from '../messages'

export interface ChangelogDeps {
  readSnapshot(): Promise<Snapshot>
  readDualFile(): Promise<IntegrationValues<'dualFile'>>
  readGithub(): Promise<IntegrationValues<'github'>>
  readStorage(): Promise<IntegrationValues<'storage'>>
  readJira(): Promise<IntegrationValues<'jira'>>
  readNotifications(): Promise<IntegrationValues<'notifications'>>
  /** Figma REST, GitHub REST, Jira REST and the reviewer webhooks; the sandbox's fetch in Figma. */
  fetch: GithubFetch & HttpFetch
  sleep(ms: number): Promise<void>
  now(): Date
  /** The signed-in Figma user's name. */
  user(): string
  /** The person's team (their persona). */
  team(): Promise<string>
  /** figma.fileKey; null where Figma doesn't give the plugin the key. */
  fileKey(): string | null
  fileName(): string
  pageName(): string
  /** Draws the changelog card on the current page. */
  drawCard(entry: HistoryEntry): Promise<void>
}

export const NO_KEY = 'Figma didn’t give the plugin this file’s key, so it can’t tell whether this is a branch. Run the plugin from your organisation’s plugins (or as a development plugin).'
export const NO_TOKEN = 'Add a Figma API key in Settings › Dual File Mode. It is what reads the main file to compare with.'
export const NOT_A_BRANCH = 'This file is not a branch. Open the branch you made your changes in, then generate the changelog there.'

interface Place { context: ChangelogContext; get?: FigmaGet; mainKey?: string; branch?: string }

/** Settings › Notifications: Teams = the design-system channel, Outlook = the reviewers' Outlook webhook. */
const reviewTargets = (n: IntegrationValues<'notifications'>, pick: ReviewChannels) => [
  ...(pick.teams && n.designSystemWebhook.trim() ? [{ name: 'Microsoft Teams', url: n.designSystemWebhook.trim() }] : []),
  ...(pick.outlook && n.outlookWebhook.trim() ? [{ name: 'Outlook', url: n.outlookWebhook.trim() }] : []),
]

const and = (names: readonly string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

export function createChangelogHandlers(deps: ChangelogDeps): HandlerMap {
  /** The compare behind the last Generate; a submit must name it so it never saves something the designer did not see. */
  let last: { id: string; changes: readonly Change[]; context: ChangelogContext; warnings: readonly string[]; time: string; branch: string } | null = null

  /** Which reviewer webhooks are set and whether Jira is connected: said in the pop-up before anything is sent. */
  async function reach(): Promise<Pick<ChangelogContext, 'channels' | 'jira'>> {
    const [n, jira] = await Promise.all([deps.readNotifications(), deps.readJira()])
    const conn = jiraConnection(jira)
    return {
      channels: { teams: !!n.designSystemWebhook.trim(), outlook: !!n.outlookWebhook.trim() },
      jira: 'config' in conn ? { connected: true } : { connected: false, problem: conn.problem },
    }
  }

  /** Where the person is and, on a branch, how to read its main file. */
  async function place(): Promise<Place> {
    const base = { file: deps.fileName(), page: deps.pageName(), user: deps.user(), main: null, ...await reach() }
    const key = deps.fileKey()
    if (!key) return { context: { ...base, problem: NO_KEY } }
    // One Dual File token opens this file, its main file and every library.
    const token = (await deps.readDualFile()).token.trim()
    if (!token) return { context: { ...base, problem: NO_TOKEN } }
    try {
      const info = await readBranchInfo(createFigmaGet(token, 'This file', deps.fetch, deps.sleep), key)
      if (!info.mainFileKey) return { context: { ...base, problem: NOT_A_BRANCH } }
      const get = createFigmaGet(token, 'The main file', deps.fetch, deps.sleep)
      const main = await get<{ file?: { name?: string } }>(`/files/${encodeURIComponent(info.mainFileKey)}/meta`, 'meta').then((r) => r.file?.name ?? '', () => '')
      return { context: { ...base, main: main || 'the main file' }, get, mainKey: info.mainFileKey, branch: branchUrl(info.mainFileKey, key, info.name || base.file) }
    } catch (e) {
      return { context: { ...base, problem: e instanceof Error ? e.message : 'Couldn’t read this file from Figma.' } }
    }
  }

  async function generate(): Promise<ChangelogDraft> {
    const where = await place()
    if (!where.get || !where.mainKey) throw new Error(where.context.problem ?? NOT_A_BRANCH)
    const local = await deps.readSnapshot()
    const { snapshot, warnings } = await readMainSnapshot(where.get, where.mainKey, local)
    const changes = diffSnapshots(snapshot, local)
    const now = deps.now()
    const id = `c${now.getTime().toString(36)}`
    last = { id, changes, context: where.context, warnings, time: now.toISOString().slice(11, 16), branch: where.branch ?? '' }
    return { draftId: id, context: where.context, title: draftTitle(changes, where.context.file), changes, warnings, branch: where.branch ?? '' }
  }

  async function storage(): Promise<{ where: HistoryStorage; client: CodeHost }> {
    const [github, store] = await Promise.all([deps.readGithub(), deps.readStorage()])
    const where = resolveStorage(store, github)
    if (isStorageProblem(where)) throw new Error(`${where.problem}. The changelog is saved there for the team to review.`)
    return { where, client: createCodeHost(where.config, deps.fetch, deps.sleep) }
  }

  async function tickets(): Promise<TicketsResult> {
    const conn = jiraConnection(await deps.readJira())
    if (!('config' in conn)) return { tickets: [], problem: conn.problem }
    try {
      return { tickets: await searchOpenTickets(conn.config, deps.fetch) }
    } catch (e) {
      return { tickets: [], problem: e instanceof Error ? e.message : 'Couldn’t read the Jira tickets.' }
    }
  }

  /** Posts a Jira comment; a failure is said, never thrown: what it reports on is already saved. */
  async function comment(key: string, text: string, what: string): Promise<string> {
    const conn = jiraConnection(await deps.readJira())
    if (!('config' in conn)) return ` ${key} was not updated: ${conn.problem}`
    try {
      await postComment(conn.config, deps.fetch, key, text)
      return ` ${key} got a Jira comment with ${what}${text.includes('Figma branch:') ? ' and the Figma branch link' : ''}.`
    } catch (e) {
      return ` ${key} was not updated: ${e instanceof Error ? e.message : 'Jira didn’t accept the comment.'}`
    }
  }

  async function submit(payload: unknown): Promise<SubmitResult> {
    const req = submitRequestSchema.parse(payload)
    if (!last || last.id !== req.draftId) throw new Error('Generate the changelog again before submitting — the file has been compared since.')
    const draft = last
    const { where, client } = await storage()
    const now = deps.now()
    const by = deps.user()
    const base = changelogEntry({
      changes: draft.changes, title: req.title, notes: req.notes, ticket: req.ticket, by, team: await deps.team().catch(() => ''),
      file: draft.context.file, main: draft.context.main ?? 'the main file', page: draft.context.page, warnings: draft.warnings, time: draft.time,
    })
    const facts = [...(base.details?.facts ?? []), ...(draft.branch ? [{ label: BRANCH_FACT, value: draft.branch }] : [])].slice(0, 12)
    const entry: HistoryEntry = { ...base, details: { ...base.details, facts }, schema: 1, id: newEntryId(now), at: now.toISOString() }
    await appendEntry(client, where.config.branch, where.folder, entry)
    last = null // submitted: the next one needs a fresh compare
    let card = false
    if (req.addCard) {
      // The entry is already saved; a card that can't be drawn doesn't undo it.
      card = await deps.drawCard(entry).then(() => true, () => false)
    }
    const drawn = req.addCard ? (card ? ' The changelog card is on this page.' : ' The card could not be drawn on this page.') : ''
    const told = { title: entry.title, notes: req.notes, file: draft.context.file, main: draft.context.main ?? 'the main file', by, changes: draft.changes, branch: draft.branch }
    const jira = req.postToJira && req.ticket ? await comment(req.ticket, submitComment(told), 'the changes') : ''
    const targets = reviewTargets(await deps.readNotifications(), req.notify)
    let notified = ''
    if (targets.length) {
      const sent = await postWebhooks(targets, channelCard(`Changelog for review: ${entry.title}`, reviewLines(told, req.ticket), draft.branch || undefined, 'Open the Figma branch'), deps.fetch)
      notified = `${sent.posted.length ? ` ${and(sent.posted)} ${sent.posted.length === 1 ? 'was' : 'were'} notified.` : ''}${sent.failed.length ? ` ${and(sent.failed)} could not be reached.` : ''}`
    }
    return { id: entry.id, card, message: `Submitted for review. Your team sees it in History as Under review.${drawn}${jira}${notified}` }
  }

  /** Puts the entry on top of the shared changelog file; retried when a teammate wrote it first. */
  async function publish(client: CodeHost, where: HistoryStorage, entry: HistoryEntry): Promise<string> {
    const path = changelogPath(where.folder)
    for (let attempt = 1; ; attempt++) {
      const current = await client.readFileWithSha(path, where.config.branch)
      try {
        await client.putFile(path, prependChangelog(current?.text ?? null, changelogMarkdown(entry)), `docs(changelog): ${entry.title}`.slice(0, 120), where.config.branch, current?.sha)
        return path
      } catch (e) {
        const conflict = e instanceof GithubError && (e.kind === 'rejected' || e.kind === 'exists')
        if (!conflict || attempt >= APPEND_ATTEMPTS) throw e
      }
    }
  }

  async function approve(payload: unknown): Promise<ApproveResult> {
    const req = approveRequestSchema.parse(payload)
    const { where, client } = await storage()
    const day = await client.readFileWithSha(`${where.folder}/${dayOf(req.at)}.json`, where.config.branch)
    const entry = parseDay(day?.text ?? null).find((e) => e.id === req.id)
    if (!entry) throw new Error('That changelog is no longer in the team history. Refresh and try again.')
    if (!isPending(entry)) throw new Error(entry.review ? `${entry.review.by} already approved this changelog.` : 'This entry is not waiting for review.')
    const by = deps.user()
    // The changelog file's page on whichever host the team uses (GitHub, an Enterprise host, or Bitbucket).
    const web = client.fileUrl(changelogPath(where.folder), where.config.branch)
    const approved = approveEntry(entry, { by, at: deps.now().toISOString(), ...(web ? { link: { url: web, label: 'Open the changelog' } } : {}) })
    // The changelog file first: if it fails, the entry stays under review and Approve can be pressed again.
    const path = await publish(client, where, approved)
    await appendEntry(client, where.config.branch, where.folder, approved)
    const jira = req.postToJira && entry.ticket ? await comment(entry.ticket, approvalComment(approved, by, web), 'the approval') : ''
    return { message: `Approved. “${entry.title}” is now in ${where.config.repo} · ${path}.${jira}` }
  }

  return {
    [CHANGELOG.context]: async () => (await place()).context,
    [CHANGELOG.generate]: async () => generate(),
    [CHANGELOG.tickets]: async () => tickets(),
    [CHANGELOG.submit]: async (payload: unknown) => submit(payload),
    [CHANGELOG.approve]: async (payload: unknown) => approve(payload),
  }
}
