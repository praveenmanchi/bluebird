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
import { GithubError, createGithubClient, type GithubClient, type GithubFetch } from '@shared/github/client'
import { isStorageProblem, resolveStorage, type HistoryStorage } from '@shared/history/config'
import { APPEND_ATTEMPTS, appendEntry } from '@shared/history/github'
import { dayOf, newEntryId, parseDay } from '@shared/history/store'
import type { HistoryEntry } from '@shared/history/types'
import { filesFromSettings } from '@shared/libraries/load'
import { createFigmaGet, type FigmaGet, type HttpFetch } from '@shared/libraries/rest'
import { approveEntry, changelogEntry, changelogMarkdown, changelogPath, draftTitle, isPending, prependChangelog } from '../changelog'
import { CHANGELOG, approveRequestSchema, submitRequestSchema, type ApproveResult, type ChangelogContext, type ChangelogDraft, type SubmitResult } from '../messages'

export interface ChangelogDeps {
  readSnapshot(): Promise<Snapshot>
  readDualFile(): Promise<IntegrationValues<'dualFile'>>
  readGithub(): Promise<IntegrationValues<'github'>>
  readStorage(): Promise<IntegrationValues<'storage'>>
  /** Figma REST and GitHub REST; the sandbox's fetch in Figma. */
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

interface Place { context: ChangelogContext; get?: FigmaGet; mainKey?: string }

export function createChangelogHandlers(deps: ChangelogDeps): HandlerMap {
  /** The compare behind the last Generate; a submit must name it so it never saves something the designer did not see. */
  let last: { id: string; changes: readonly Change[]; context: ChangelogContext; warnings: readonly string[]; time: string } | null = null

  /** Where the person is and, on a branch, how to read its main file. */
  async function place(): Promise<Place> {
    const base = { file: deps.fileName(), page: deps.pageName(), user: deps.user(), main: null }
    const key = deps.fileKey()
    if (!key) return { context: { ...base, problem: NO_KEY } }
    const files = filesFromSettings(await deps.readDualFile())
    const token = files.find((f) => f.token)?.token ?? ''
    if (!token) return { context: { ...base, problem: NO_TOKEN } }
    try {
      const info = await readBranchInfo(createFigmaGet(token, 'This file', deps.fetch, deps.sleep), key)
      if (!info.mainFileKey) return { context: { ...base, problem: NOT_A_BRANCH } }
      // The main file is often one of the Dual File libraries: use that file's own key when it has one.
      const own = files.find((f) => f.fileKey === info.mainFileKey && f.token)?.token ?? token
      const get = createFigmaGet(own, 'The main file', deps.fetch, deps.sleep)
      const main = await get<{ file?: { name?: string } }>(`/files/${encodeURIComponent(info.mainFileKey)}/meta`, 'meta').then((r) => r.file?.name ?? '', () => '')
      return { context: { ...base, main: main || 'the main file' }, get, mainKey: info.mainFileKey }
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
    last = { id, changes, context: where.context, warnings, time: now.toISOString().slice(11, 16) }
    return { draftId: id, context: where.context, title: draftTitle(changes, where.context.file), changes, warnings }
  }

  async function storage(): Promise<{ where: HistoryStorage; client: GithubClient }> {
    const [github, store] = await Promise.all([deps.readGithub(), deps.readStorage()])
    const where = resolveStorage(store, github)
    if (isStorageProblem(where)) throw new Error(`${where.problem}. The changelog is saved there for the team to review.`)
    return { where, client: createGithubClient(where.config, deps.fetch, deps.sleep) }
  }

  async function submit(payload: unknown): Promise<SubmitResult> {
    const req = submitRequestSchema.parse(payload)
    if (!last || last.id !== req.draftId) throw new Error('Generate the changelog again before submitting — the file has been compared since.')
    const draft = last
    const { where, client } = await storage()
    const now = deps.now()
    const entry: HistoryEntry = {
      ...changelogEntry({
        changes: draft.changes, title: req.title, notes: req.notes, ticket: req.ticket, by: deps.user(), team: await deps.team().catch(() => ''),
        file: draft.context.file, main: draft.context.main ?? 'the main file', page: draft.context.page, warnings: draft.warnings, time: draft.time,
      }),
      schema: 1, id: newEntryId(now), at: now.toISOString(),
    }
    await appendEntry(client, where.config.branch, where.folder, entry)
    last = null // submitted: the next one needs a fresh compare
    let card = false
    if (req.addCard) {
      // The entry is already saved; a card that can't be drawn doesn't undo it.
      card = await deps.drawCard(entry).then(() => true, () => false)
    }
    const drawn = req.addCard ? (card ? ' The changelog card is on this page.' : ' The card could not be drawn on this page.') : ''
    return { id: entry.id, card, message: `Submitted for review. Your team sees it in History as Under review.${drawn}` }
  }

  /** Puts the entry on top of the shared changelog file; retried when a teammate wrote it first. */
  async function publish(client: GithubClient, where: HistoryStorage, entry: HistoryEntry): Promise<string> {
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
    // github.com only: an Enterprise host's web address isn't known here, so the entry goes without a link.
    const web = where.config.api === 'https://api.github.com' ? `https://github.com/${where.config.repo}/blob/${encodeURIComponent(where.config.branch)}/${changelogPath(where.folder).split('/').map(encodeURIComponent).join('/')}` : ''
    const approved = approveEntry(entry, { by, at: deps.now().toISOString(), ...(web ? { link: { url: web, label: 'Open the changelog' } } : {}) })
    // The changelog file first: if it fails, the entry stays under review and Approve can be pressed again.
    const path = await publish(client, where, approved)
    await appendEntry(client, where.config.branch, where.folder, approved)
    return { message: `Approved. “${entry.title}” is now in ${where.config.repo} · ${path}.` }
  }

  return {
    [CHANGELOG.context]: async () => (await place()).context,
    [CHANGELOG.generate]: async () => generate(),
    [CHANGELOG.submit]: async (payload: unknown) => submit(payload),
    [CHANGELOG.approve]: async (payload: unknown) => approve(payload),
  }
}
